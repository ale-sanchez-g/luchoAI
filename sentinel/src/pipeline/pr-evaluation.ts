import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { MergeDecision, PrManagementReport, ValidationReport } from '../contracts/types';
import type { LoadedConfig } from '../config/load-config';
import { runCommand } from '../core/exec';
import { log } from '../core/log';
import type { RunContext } from '../core/report-io';
import { readReport, writeReport } from '../core/report-io';
import type { GitHubApi } from '../github/client';
import { paginate, seg } from '../github/client';
import { renderDecisionComment } from '../github/markdown';
import { applyDecision } from '../github/pr-manager';
import { readRepoFacts } from '../github/repo-facts';
import type { PrFacts, RepoFacts } from '../governance/decision';
import { analyseImpact } from '../impact/impact-analysis';
import { verifyRemediation } from '../remediation/remediation';
import { analyseUsage } from '../usage/usage-analysis';
import type { ParsedAudit } from '../vulnerabilities/npm-audit';
import { parseNpmAudit } from '../vulnerabilities/npm-audit';
import type { RegistryClient } from '../vulnerabilities/registry';
import { evaluate } from './evaluate';
import { runScan } from './scan';
import { buildExecutionSummary } from './summary';

export interface PrEvaluationInput {
  ctx: RunContext;
  loaded: LoadedConfig;
  api: GitHubApi | null;
  slug: string | null;
  prNumber: number | null;
  /** PR head checkout, read as data only. */
  prDir: string;
  /** Base checkout: Sentinel's code, policy and CODEOWNERS come from here. */
  trustedDir: string;
  evidenceDir: string | null;
  evidenceJobResult: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  registry: RegistryClient;
  env: NodeJS.ProcessEnv;
  outDir: string;
  /** Act on GitHub (labels, comment, reviewers, auto-merge). */
  apply: boolean;
  runUrl: string | null;
  /** Facts supplied directly (tests and dry runs); fetched from GitHub when absent. */
  prFacts?: PrFacts | null;
  repoFacts?: RepoFacts | null;
  /** Security checks run by this (trusted) job; replaceable in tests. */
  checks?: TrustedChecks;
}

/**
 * Checks the privileged job runs itself rather than trusting the evidence job, which executes PR
 * code: the audits of both lockfiles and lockfile consistency. They read only package.json and
 * package-lock.json, copied into an empty directory so no .npmrc from the PR applies.
 */
export interface TrustedChecks {
  audit(
    manifestText: string,
    lockText: string,
  ): Promise<{ text: string | null; error: string | null }>;
  lockfile(
    manifestText: string,
    lockText: string,
  ): Promise<{ status: 'PASS' | 'FAIL' | 'UNKNOWN'; detail: string }>;
}

async function inIsolatedDir<T>(
  manifestText: string,
  lockText: string,
  fn: (dir: string) => Promise<T>,
): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-lock-'));
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), manifestText);
    fs.writeFileSync(path.join(dir, 'package-lock.json'), lockText);
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Trusted checks implemented with npm in isolated directories. */
export function npmTrustedChecks(env: NodeJS.ProcessEnv): TrustedChecks {
  return {
    audit: (manifestText, lockText) =>
      inIsolatedDir(manifestText, lockText, async (dir) => {
        const result = await runCommand(['npm', 'audit', '--json', '--package-lock-only'], {
          cwd: dir,
          env,
          timeoutMs: 5 * 60 * 1000,
        });
        return result.stdout.trim()
          ? { text: result.stdout, error: null }
          : {
              text: null,
              error: result.error ?? `npm audit exited ${result.exitCode} without output`,
            };
      }),
    lockfile: (manifestText, lockText) =>
      inIsolatedDir(manifestText, lockText, async (dir) => {
        const result = await runCommand(['npm', 'ls', '--all', '--package-lock-only', '--json'], {
          cwd: dir,
          env,
          timeoutMs: 5 * 60 * 1000,
        });
        if (result.exitCode === 0)
          return {
            status: 'PASS' as const,
            detail: 'npm ls --package-lock-only reports no problems',
          };
        return {
          status: result.exitCode === null ? ('UNKNOWN' as const) : ('FAIL' as const),
          detail: (result.stdout + result.stderr).slice(-1500),
        };
      }),
  };
}

export interface PrEvaluationResult {
  decision: MergeDecision;
  prReport: PrManagementReport | null;
  exitCode: number;
}

interface PullResponse {
  head: { sha: string };
  base: { ref: string };
}

async function fetchPrFacts(
  api: GitHubApi,
  slug: string,
  number: number,
  evidenceSha: string | null,
): Promise<PrFacts> {
  const base = `/repos/${seg(slug.split('/')[0])}/${seg(slug.split('/')[1])}`;
  const pr = (await api.request<PullResponse>('GET', `${base}/pulls/${number}`)).data;
  const files = await paginate<{ filename: string }>(api, `${base}/pulls/${number}/files`, 30);
  return {
    number,
    evidenceSha,
    headSha: pr.head.sha,
    liveHeadSha: pr.head.sha,
    baseRef: pr.base.ref,
    changedFiles: files.map((f) => f.filename).sort(),
  };
}

function parseAuditText(result: { text: string | null; error: string | null }): {
  audit: ParsedAudit | null;
  error: string | null;
} {
  if (!result.text) return { audit: null, error: result.error ?? 'no audit output' };
  try {
    return { audit: parseNpmAudit(result.text), error: null };
  } catch (error) {
    return { audit: null, error: (error as Error).message };
  }
}

/**
 * Pull-request evaluation in the privileged job. Everything is recomputed for this PR head: the
 * base vulnerabilities, usage and impact on the PR's files, the lockfile change, coverage from
 * this commit's evidence and the decision. Nothing from the weekly run is reused.
 */
export async function evaluatePullRequest(input: PrEvaluationInput): Promise<PrEvaluationResult> {
  const { loaded, ctx } = input;
  const config = loaded.config;
  const checks = input.checks ?? npmTrustedChecks(input.env);
  const evidence = input.evidenceDir && fs.existsSync(input.evidenceDir) ? input.evidenceDir : null;
  const read = (dir: string, file: string): string => fs.readFileSync(path.join(dir, file), 'utf8');
  const baseManifest = read(input.trustedDir, config.ecosystems.npm.manifest);
  const baseLock = read(input.trustedDir, config.ecosystems.npm.lockfile);
  const headManifest = read(input.prDir, config.ecosystems.npm.manifest);
  const headLock = read(input.prDir, config.ecosystems.npm.lockfile);

  const baseAuditResult = await checks.audit(baseManifest, baseLock);
  const baseAuditFile = path.join(input.outDir, 'npm-audit-base.json');
  fs.mkdirSync(input.outDir, { recursive: true });
  fs.writeFileSync(
    baseAuditFile,
    baseAuditResult.text ?? JSON.stringify({ error: { summary: baseAuditResult.error } }),
  );
  const { report: vulnerabilities, graph } = await runScan({
    root: input.trustedDir,
    ctx,
    config,
    auditJsonPath: baseAuditFile,
    registry: input.registry,
    github: input.api,
    repoSlug: input.slug,
    env: input.env,
  });
  const usage = analyseUsage({ root: input.prDir, ctx, config, graph, vulnerabilities });
  const impact = await analyseImpact({
    ctx,
    config,
    graph,
    vulnerabilities,
    usage,
    registry: input.registry,
  });

  const validationFile = evidence ? path.join(evidence, 'validation-report.json') : null;
  const validation =
    validationFile && fs.existsSync(validationFile)
      ? readReport<ValidationReport>(validationFile, 'validation-report')
      : null;
  const evidenceSha = validation?.repository.commitSha ?? null;
  let pr: PrFacts | null = input.prFacts ?? null;
  if (!pr && input.api && input.slug && input.prNumber) {
    pr = await fetchPrFacts(input.api, input.slug, input.prNumber, evidenceSha);
  }
  let repo: RepoFacts | null = input.repoFacts === undefined ? null : input.repoFacts;
  if (input.repoFacts === undefined && input.api && input.slug && pr) {
    repo = await readRepoFacts(input.api, input.slug, pr.baseRef);
  }

  const headAudit = parseAuditText(await checks.audit(headManifest, headLock));
  const consistency = await checks.lockfile(headManifest, headLock);
  const baseHead = await runCommand(['git', 'rev-parse', 'HEAD'], {
    cwd: input.trustedDir,
    env: input.env,
  });
  const remediation = verifyRemediation({
    ctx,
    config,
    vulnerabilities,
    baseLockText: baseLock,
    headLockText: headLock,
    baseManifestText: baseManifest,
    headManifestText: headManifest,
    headAudit: headAudit.audit,
    headAuditError: headAudit.error,
    lockfileConsistent: consistency.status,
    lockfileDetail: consistency.detail,
    changedFiles: pr?.changedFiles ?? [],
    baseSha:
      baseHead.exitCode === 0 && /^[0-9a-f]{40}$/.test(baseHead.stdout.trim())
        ? baseHead.stdout.trim()
        : null,
    headSha: pr?.headSha ?? null,
  });

  if (pr && input.api && input.slug && input.prNumber && input.prFacts === undefined) {
    const [ownerName, repoName] = input.slug.split('/');
    const live = await input.api.request<PullResponse>(
      'GET',
      `/repos/${seg(ownerName)}/${seg(repoName)}/pulls/${input.prNumber}`,
    );
    pr = { ...pr, liveHeadSha: live.data.head.sha };
  }

  const result = evaluate({
    ctx,
    config,
    configDigest: loaded.digest,
    repoDir: input.prDir,
    trustedDir: input.trustedDir,
    evidenceDir: evidence,
    vulnerabilities,
    usage,
    impact,
    remediation,
    pr,
    repo,
    evidenceJobResult: input.evidenceJobResult,
  });

  const written = [
    vulnerabilities,
    usage.report,
    impact,
    remediation,
    result.decision,
    ...(result.coverage ? [result.coverage] : []),
    ...(result.validation ? [result.validation] : []),
  ].map((r) => path.basename(writeReport(input.outDir, r)));
  let prReport: PrManagementReport | null = null;
  if (input.apply && input.api && input.slug && input.prNumber) {
    prReport = await applyDecision({
      api: input.api,
      slug: input.slug,
      prNumber: input.prNumber,
      ctx,
      config,
      decision: result.decision,
      coverage: result.coverage,
      validation: result.validation,
      remediation,
      runUrl: input.runUrl,
    });
    written.push(path.basename(writeReport(input.outDir, prReport)));
  }
  const summary = buildExecutionSummary(
    ctx,
    'pr-evaluation',
    {
      vulnerabilities,
      impact,
      coverage: result.coverage,
      remediation,
      validation: result.validation,
      decision: result.decision,
      prManagement: prReport,
    },
    written,
  );
  writeReport(input.outDir, summary);
  const markdown = renderDecisionComment(
    result.decision,
    result.coverage,
    result.validation,
    remediation,
    input.runUrl,
    60000,
  );
  fs.writeFileSync(path.join(input.outDir, 'decision.md'), `${markdown}\n`);
  if (input.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(input.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }
  const final = prReport?.finalOutcome ?? result.decision.decision;
  log.info(`decision ${result.decision.decision}, final outcome ${final}`);
  return { decision: result.decision, prReport, exitCode: final === 'BLOCKED' ? 1 : 0 };
}
