import fs from 'node:fs';
import path from 'node:path';
import type { Limitation, SourceStatus, VulnerabilityReport } from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { runCommand } from '../core/exec';
import { log } from '../core/log';
import type { RunContext } from '../core/report-io';
import type { GitHubApi } from '../github/client';
import type { DependencyGraph } from '../graph/lockfile';
import { parseLockfile } from '../graph/lockfile';
import { buildVulnerabilityReport } from '../vulnerabilities/inventory';
import type { FixAvailable, ParsedAudit } from '../vulnerabilities/npm-audit';
import { AuditUnavailableError, parseNpmAudit } from '../vulnerabilities/npm-audit';
import type { RegistryClient } from '../vulnerabilities/registry';
import type { AdvisoryDetails, SourcedAdvisory } from '../vulnerabilities/sources';
import {
  fetchAdvisory,
  fetchDependabotAdvisories,
  mergeAdvisories,
  parseOsvReport,
} from '../vulnerabilities/sources';

export interface ScanOptions {
  root: string;
  ctx: RunContext;
  config: SentinelConfig;
  /** Pre-recorded `npm audit --json` output; when absent npm audit runs in `root`. */
  auditJsonPath: string | null;
  registry: RegistryClient;
  github: GitHubApi | null;
  repoSlug: string | null;
  env: NodeJS.ProcessEnv;
}

export interface ScanResult {
  report: VulnerabilityReport;
  graph: DependencyGraph;
  audit: ParsedAudit | null;
}

/** Runs `npm audit --json --package-lock-only` and returns its stdout (exit code 1 is normal). */
export async function runNpmAudit(root: string, env: NodeJS.ProcessEnv): Promise<string> {
  const result = await runCommand(['npm', 'audit', '--json', '--package-lock-only'], {
    cwd: root,
    env,
    timeoutMs: 5 * 60 * 1000,
  });
  if (result.stdout.trim() === '') {
    throw new AuditUnavailableError(
      `npm audit produced no output (exit ${result.exitCode}): ` +
        (result.error ?? result.stderr.slice(-300)),
    );
  }
  return result.stdout;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Vulnerability discovery: audit, optional extra sources, enrichment and fix assessment. */
export async function runScan(options: ScanOptions): Promise<ScanResult> {
  const { config, root } = options;
  const lockfilePath = config.ecosystems.npm.lockfile;
  const graph = parseLockfile(fs.readFileSync(path.join(root, lockfilePath), 'utf8'));
  const statuses: SourceStatus[] = [];
  const limitations: Limitation[] = [];
  const lists: SourcedAdvisory[][] = [];
  const fixAvailable = new Map<string, FixAvailable>();
  let audit: ParsedAudit | null = null;

  if (config.sources.npmAudit) {
    try {
      const text = options.auditJsonPath
        ? fs.readFileSync(options.auditJsonPath, 'utf8')
        : await runNpmAudit(root, options.env);
      audit = parseNpmAudit(text);
      lists.push(
        audit.advisories.map((a) => ({ ...a, osvId: null, aliases: [], sources: ['npm-audit'] })),
      );
      for (const entry of audit.entries.values()) {
        fixAvailable.set(entry.name, entry.fixAvailable);
      }
      statuses.push({
        source: 'npm-audit',
        status: 'OK',
        detail: 'npm audit (GitHub Advisory Database via the npm registry)',
        findings: audit.advisories.length,
      });
    } catch (error) {
      statuses.push({
        source: 'npm-audit',
        status: 'ERROR',
        detail: (error as Error).message,
        findings: 0,
      });
      limitations.push({
        code: 'AUDIT_UNAVAILABLE',
        message: `npm audit unavailable: ${(error as Error).message}`,
      });
    }
  } else {
    statuses.push({
      source: 'npm-audit',
      status: 'DISABLED',
      detail: 'disabled by configuration',
      findings: 0,
    });
  }

  if (config.sources.dependabotAlerts) {
    if (!options.github || !options.repoSlug) {
      statuses.push({
        source: 'dependabot-alerts',
        status: 'UNAVAILABLE',
        detail: 'no GitHub API access',
        findings: 0,
      });
    } else {
      try {
        const alerts = await fetchDependabotAdvisories(options.github, options.repoSlug);
        lists.push(alerts);
        statuses.push({
          source: 'dependabot-alerts',
          status: 'OK',
          detail: 'open npm alerts',
          findings: alerts.length,
        });
      } catch (error) {
        statuses.push({
          source: 'dependabot-alerts',
          status: 'UNAVAILABLE',
          detail: (error as Error).message,
          findings: 0,
        });
      }
    }
  } else {
    statuses.push({
      source: 'dependabot-alerts',
      status: 'DISABLED',
      detail: 'disabled by configuration',
      findings: 0,
    });
  }

  if (config.sources.osvScanner.enabled) {
    const file = path.join(root, config.sources.osvScanner.reportPath);
    try {
      const osv = parseOsvReport(fs.readFileSync(file, 'utf8'));
      lists.push(osv);
      statuses.push({
        source: 'osv-scanner',
        status: 'OK',
        detail: config.sources.osvScanner.reportPath,
        findings: osv.length,
      });
    } catch (error) {
      statuses.push({
        source: 'osv-scanner',
        status: 'UNAVAILABLE',
        detail: (error as Error).message,
        findings: 0,
      });
    }
  } else {
    statuses.push({
      source: 'osv-scanner',
      status: 'DISABLED',
      detail: 'disabled by configuration',
      findings: 0,
    });
  }

  const advisories = mergeAdvisories(lists);
  const details = new Map<string, AdvisoryDetails>();
  if (config.sources.githubAdvisoryDatabase) {
    const ghsas = [
      ...new Set(advisories.map((a) => a.ghsa).filter((g): g is string => g !== null)),
    ].sort();
    if (!options.github) {
      statuses.push({
        source: 'github-advisory-database',
        status: 'UNAVAILABLE',
        detail: 'no GitHub API access; CVE ids not resolved',
        findings: 0,
      });
      limitations.push({
        code: 'CVE_IDS_UNAVAILABLE',
        message: 'GitHub advisory API not reachable; CVE identifiers are missing',
      });
    } else {
      let failures = 0;
      let lastError = '';
      await mapLimit(ghsas, 5, async (ghsa) => {
        try {
          const d = await fetchAdvisory(options.github as GitHubApi, ghsa);
          if (d) details.set(ghsa, d);
        } catch (error) {
          failures += 1;
          lastError = (error as Error).message;
        }
      });
      const status =
        failures === 0
          ? 'OK'
          : failures === ghsas.length && ghsas.length > 0
            ? 'UNAVAILABLE'
            : 'ERROR';
      statuses.push({
        source: 'github-advisory-database',
        status,
        detail:
          failures === 0
            ? `${details.size} advisories enriched`
            : `${failures} lookups failed: ${lastError}`,
        findings: details.size,
      });
      if (status === 'UNAVAILABLE') {
        limitations.push({
          code: 'CVE_IDS_UNAVAILABLE',
          message: `GitHub advisory API lookups failed (${lastError}); CVE identifiers are missing`,
        });
      } else if (failures > 0) {
        limitations.push({
          code: 'CVE_IDS_INCOMPLETE',
          message: `${failures} advisory lookups failed; some CVE identifiers are missing`,
        });
      }
    }
  } else {
    statuses.push({
      source: 'github-advisory-database',
      status: 'DISABLED',
      detail: 'disabled by configuration',
      findings: 0,
    });
  }

  const okSources = statuses.filter((s) => s.status === 'OK').length;
  log.info(`scan: ${advisories.length} advisories from ${okSources} sources`);
  const report = await buildVulnerabilityReport({
    ctx: options.ctx,
    config,
    graph,
    lockfilePath,
    advisories,
    fixAvailable,
    sourceStatuses: statuses,
    details,
    registry: options.registry,
    limitations,
  });
  return { report, graph, audit };
}
