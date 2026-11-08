#!/usr/bin/env node
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { ConfigError } from './config/load-config';
import type { MergeDecision, RemediationReport, VulnerabilityReport } from './contracts/types';
import { log } from './core/log';
import { readReport, ReportContractError, writeReport } from './core/report-io';
import { discoverRepository } from './discovery/repo-discovery';
import { LockfileError, parseLockfile } from './graph/lockfile';
import { analyseImpact } from './impact/impact-analysis';
import { analyseUsage } from './usage/usage-analysis';
import { applyRemediation } from './remediation/remediation';
import { runCommand } from './core/exec';
import { runValidation } from './validation/runner';
import { evaluate } from './pipeline/evaluate';
import { buildExecutionSummary } from './pipeline/summary';
import { evaluateWeekly, planWeekly } from './pipeline/weekly';
import { publishRemediation, PublishError } from './pipeline/publish';
import { evaluatePullRequest } from './pipeline/pr-evaluation';
import type { StageEnv } from './pipeline/context';
import { buildStageEnv, resolveOptions } from './pipeline/context';
import { runScan } from './pipeline/scan';

/** Exit codes: 0 ok, 1 decision BLOCKED, 2 configuration, 3 contract/evidence, 4 internal error. */
export const EXIT = { OK: 0, BLOCKED: 1, CONFIG: 2, CONTRACT: 3, INTERNAL: 4 } as const;

const OPTIONS = {
  repo: { type: 'string' },
  'trusted-dir': { type: 'string' },
  config: { type: 'string' },
  out: { type: 'string' },
  'repo-slug': { type: 'string' },
  sha: { type: 'string' },
  ref: { type: 'string' },
  'audit-json': { type: 'string' },
  vulnerabilities: { type: 'string' },
  evidence: { type: 'string' },
  'base-dir': { type: 'string' },
  decision: { type: 'string' },
  plan: { type: 'string' },
  pr: { type: 'string' },
  'base-branch': { type: 'string' },
  'dispatch-workflow': { type: 'string' },
  'evidence-result': { type: 'string' },
  'no-apply': { type: 'boolean' },
  offline: { type: 'boolean' },
  help: { type: 'boolean' },
} as const;

type Values = ReturnType<
  typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>
>['values'];

const USAGE = `Usage: sentinel <command> [options]

Commands:
  discover-repo   Inspect languages, package managers, tests, CI and CODEOWNERS
  scan            Vulnerability discovery and fix assessment
  usage           Dependency usage discovery (needs a vulnerability report)
  impact          Usage plus impact analysis and upgrade compatibility
  remediate       Apply patch/minor fixes to the lockfile (no install scripts) and write the patch
  validate        Run tests with coverage and attribution, build/lint/e2e and security checks
  decide          Coverage intelligence, CODEOWNERS and the merge decision from collected evidence
  gate            Exit 1 when a merge decision is BLOCKED (use as the required status check)

Workflow commands:
  weekly-plan     scan + usage + impact + lockfile remediation; writes the plan and the patch
  weekly-evaluate coverage and a preliminary decision from validation evidence (--plan, --evidence)
  publish         verify the plan artifact, push the Sentinel branch, create or update the PR
  pr-evaluate     re-evaluate a pull request from its own evidence and act on the decision

Common options:
  --repo DIR          Repository to analyse (default: .)
  --trusted-dir DIR   Trusted checkout for config and npm registry access (default: --repo)
  --config FILE       Policy file (default: <trusted-dir>/.github/sentinel/config.yml)
  --out DIR           Report directory (default: sentinel-reports)
  --audit-json FILE   Use recorded npm audit output instead of running npm audit
  --vulnerabilities F  Vulnerability report to analyse (default: <out>/vulnerability-report.json)
  --evidence DIR      Evidence directory written by validate (default: <out>/evidence)
  --base-dir DIR      Base-branch checkout to audit as well (pull request mode)
  --decision FILE     Merge decision for gate (default: <out>/merge-decision.json)
  --plan DIR          Plan artifact directory (weekly-evaluate, publish)
  --pr N              Pull request number (pr-evaluate)
  --base-branch NAME  Base branch for the pull request (publish; default: main)
  --dispatch-workflow F  Workflow to dispatch after publishing with GITHUB_TOKEN
  --evidence-result R Result of the evidence job (success, failure, cancelled, skipped)
  --no-apply          Evaluate a pull request without changing it on GitHub
  --offline           Never call the GitHub API
`;

type Command = (stage: StageEnv, values: Values) => Promise<number>;

function loadVulnerabilities(stage: StageEnv, values: Values): VulnerabilityReport {
  const file =
    values.vulnerabilities ?? path.join(stage.options.outDir, 'vulnerability-report.json');
  return readReport<VulnerabilityReport>(file, 'vulnerability-report');
}

function lockGraph(stage: StageEnv): ReturnType<typeof parseLockfile> {
  const lockfile = path.join(stage.options.repoDir, stage.loaded.config.ecosystems.npm.lockfile);
  return parseLockfile(fs.readFileSync(lockfile, 'utf8'));
}

const COMMANDS: Record<string, Command> = {
  'discover-repo': async (stage) => {
    const report = discoverRepository(
      stage.options.repoDir,
      stage.ctx,
      stage.loaded.config.analysis.excludedPaths,
    );
    log.info(`wrote ${writeReport(stage.options.outDir, report)}`);
    return EXIT.OK;
  },
  scan: async (stage, values) => {
    const { report } = await runScan({
      root: stage.options.repoDir,
      ctx: stage.ctx,
      config: stage.loaded.config,
      auditJsonPath: values['audit-json'] ?? null,
      registry: stage.registry,
      github: stage.github,
      repoSlug: stage.options.repoSlug,
      env: stage.childEnv,
    });
    log.info(`wrote ${writeReport(stage.options.outDir, report)}`);
    return EXIT.OK;
  },
  usage: async (stage, values) => {
    const usage = analyseUsage({
      root: stage.options.repoDir,
      ctx: stage.ctx,
      config: stage.loaded.config,
      graph: lockGraph(stage),
      vulnerabilities: loadVulnerabilities(stage, values),
    });
    log.info(`wrote ${writeReport(stage.options.outDir, usage.report)}`);
    return EXIT.OK;
  },
  remediate: async (stage, values) => {
    const files = [
      stage.loaded.config.ecosystems.npm.manifest,
      stage.loaded.config.ecosystems.npm.lockfile,
    ];
    const status = await runCommand(['git', 'status', '--porcelain', '--', ...files], {
      cwd: stage.options.repoDir,
      env: stage.childEnv,
    });
    if (status.exitCode !== 0 || status.stdout.trim() !== '') {
      log.error(
        `refusing to remediate: ${files.join(', ')} must be committed and unmodified ` +
          `(${status.stdout.trim() || status.stderr.trim()})`,
      );
      return EXIT.CONTRACT;
    }
    const { report, changed } = await applyRemediation({
      root: stage.options.repoDir,
      ctx: stage.ctx,
      config: stage.loaded.config,
      vulnerabilities: loadVulnerabilities(stage, values),
      env: stage.childEnv,
      patchFile: path.join(stage.options.outDir, 'remediation.patch'),
    });
    log.info(`wrote ${writeReport(stage.options.outDir, report)}`);
    log.info(
      changed
        ? `lockfile changed; patch at ${report.patch.file}`
        : 'no dependency changes were needed',
    );
    return EXIT.OK;
  },
  validate: async (stage, values) => {
    const evidenceDir = values.evidence ?? path.join(stage.options.outDir, 'evidence');
    const report = await runValidation({
      root: stage.options.repoDir,
      ctx: stage.ctx,
      config: stage.loaded.config,
      env: stage.childEnv,
      evidenceDir,
      baseDir: values['base-dir'] ?? null,
    });
    const reportFile = writeReport(stage.options.outDir, report);
    const verdict = report.summary.requiredPassed ? 'passed' : 'did not pass';
    log.info(`wrote ${reportFile} (required checks ${verdict})`);
    return EXIT.OK;
  },
  decide: async (stage, values) => {
    const graph = lockGraph(stage);
    const vulnerabilities = loadVulnerabilities(stage, values);
    const config = stage.loaded.config;
    const usage = analyseUsage({
      root: stage.options.repoDir,
      ctx: stage.ctx,
      config,
      graph,
      vulnerabilities,
    });
    const impact = await analyseImpact({
      ctx: stage.ctx,
      config,
      graph,
      vulnerabilities,
      usage,
      registry: stage.registry,
    });
    const remediation = readReport<RemediationReport>(
      path.join(stage.options.outDir, 'remediation-report.json'),
      'remediation-report',
    );
    const result = evaluate({
      ctx: stage.ctx,
      config,
      configDigest: stage.loaded.digest,
      repoDir: stage.options.repoDir,
      trustedDir: stage.options.trustedDir,
      evidenceDir: values.evidence ?? path.join(stage.options.outDir, 'evidence'),
      vulnerabilities,
      usage,
      impact,
      remediation,
      pr: null,
      repo: null,
      evidenceJobResult: null,
    });
    const written = [
      usage.report,
      impact,
      result.decision,
      ...(result.coverage ? [result.coverage] : []),
    ].map((r) => writeReport(stage.options.outDir, r));
    const summary = buildExecutionSummary(
      stage.ctx,
      'decide',
      {
        vulnerabilities,
        impact,
        coverage: result.coverage,
        remediation,
        validation: result.validation,
        decision: result.decision,
      },
      written.map((f) => path.basename(f)),
    );
    writeReport(stage.options.outDir, summary);
    const attention = result.decision.reasons.filter((r) => r.effect !== 'INFO').length;
    log.info(`decision: ${result.decision.decision} (${attention} blocking or review reasons)`);
    return EXIT.OK;
  },
  'weekly-plan': async (stage) => {
    const { changed } = await planWeekly(stage);
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `has-changes=${changed}\n`);
    return EXIT.OK;
  },
  'weekly-evaluate': async (stage, values) => {
    const planDir = values.plan ?? stage.options.outDir;
    await evaluateWeekly(
      stage,
      planDir,
      values.evidence ?? path.join(stage.options.outDir, 'evidence'),
    );
    return EXIT.OK;
  },
  publish: async (stage, values) => {
    if (!stage.github || !stage.options.repoSlug) {
      log.error('publish needs GitHub API access (a token and the repository slug)');
      return EXIT.CONFIG;
    }
    try {
      const report = await publishRemediation({
        ctx: stage.ctx,
        config: stage.loaded.config,
        api: stage.github,
        slug: stage.options.repoSlug,
        repoDir: stage.options.repoDir,
        baseBranch: values['base-branch'] ?? 'main',
        planDir: values.plan ?? stage.options.outDir,
        env: process.env,
        dispatchWorkflow: values['dispatch-workflow'] ?? null,
        gitUser: {
          name: process.env.SENTINEL_GIT_NAME ?? 'github-actions[bot]',
          email:
            process.env.SENTINEL_GIT_EMAIL ??
            '41898282+github-actions[bot]@users.noreply.github.com',
        },
      });
      log.info(`wrote ${writeReport(stage.options.outDir, report)}`);
      for (const a of report.actions) log.info(`  ${a.action}: ${a.status} ${a.detail}`);
      return EXIT.OK;
    } catch (error) {
      if (error instanceof PublishError) {
        log.error(`publish refused: ${error.message}`);
        return EXIT.CONTRACT;
      }
      throw error;
    }
  },
  'pr-evaluate': async (stage, values) => {
    const number = values.pr ? Number(values.pr) : NaN;
    if (!Number.isInteger(number) || number < 1) {
      log.error('--pr must be a pull request number');
      return EXIT.CONFIG;
    }
    const allowed = ['success', 'failure', 'cancelled', 'skipped'] as const;
    const evidenceResult = allowed.find((r) => r === values['evidence-result']) ?? null;
    const server = process.env.GITHUB_SERVER_URL;
    const runUrl =
      server && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? `${server}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null;
    const result = await evaluatePullRequest({
      ctx: stage.ctx,
      loaded: stage.loaded,
      api: stage.github,
      slug: stage.options.repoSlug,
      prNumber: number,
      prDir: stage.options.repoDir,
      trustedDir: stage.options.trustedDir,
      evidenceDir: values.evidence ?? null,
      evidenceJobResult: evidenceResult,
      registry: stage.registry,
      env: stage.childEnv,
      outDir: stage.options.outDir,
      apply: !values['no-apply'],
      runUrl,
    });
    return result.exitCode === 0 ? EXIT.OK : EXIT.BLOCKED;
  },
  gate: async (stage, values) => {
    const file = values.decision ?? path.join(stage.options.outDir, 'merge-decision.json');
    const decision = readReport<MergeDecision>(file, 'merge-decision');
    log.info(`Sentinel decision: ${decision.decision}`);
    for (const reason of decision.reasons.filter((r) => r.effect !== 'INFO')) {
      log.info(`  [${reason.effect}] ${reason.gate} ${reason.code}: ${reason.message}`);
    }
    return decision.decision === 'BLOCKED' ? EXIT.BLOCKED : EXIT.OK;
  },
  impact: async (stage, values) => {
    const graph = lockGraph(stage);
    const vulnerabilities = loadVulnerabilities(stage, values);
    const usage = analyseUsage({
      root: stage.options.repoDir,
      ctx: stage.ctx,
      config: stage.loaded.config,
      graph,
      vulnerabilities,
    });
    const impact = await analyseImpact({
      ctx: stage.ctx,
      config: stage.loaded.config,
      graph,
      vulnerabilities,
      usage,
      registry: stage.registry,
    });
    log.info(`wrote ${writeReport(stage.options.outDir, usage.report)}`);
    log.info(`wrote ${writeReport(stage.options.outDir, impact)}`);
    return EXIT.OK;
  },
};

/** CLI entry point; returns the process exit code. */
export async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (error) {
    log.error((error as Error).message);
    process.stderr.write(USAGE);
    return EXIT.CONFIG;
  }
  const [command] = parsed.positionals;
  if (parsed.values.help || !command || !COMMANDS[command]) {
    process.stderr.write(USAGE);
    return command && !parsed.values.help ? EXIT.CONFIG : EXIT.OK;
  }
  try {
    const stage = buildStageEnv(
      resolveOptions({
        repoDir: parsed.values.repo,
        trustedDir: parsed.values['trusted-dir'],
        configPath: parsed.values.config,
        outDir: parsed.values.out,
        repoSlug: parsed.values['repo-slug'],
        sha: parsed.values.sha,
        ref: parsed.values.ref,
        offline: parsed.values.offline,
      }),
    );
    if (stage.loaded.usedDefaults) {
      log.warn(`no policy file at ${stage.options.configPath}; using the strict defaults`);
    }
    return await COMMANDS[command](stage, parsed.values);
  } catch (error) {
    if (error instanceof ConfigError) {
      log.error(error.message);
      return EXIT.CONFIG;
    }
    if (error instanceof ReportContractError || error instanceof LockfileError) {
      log.error(error.message);
      return EXIT.CONTRACT;
    }
    log.error(`internal error: ${(error as Error).stack ?? String(error)}`);
    return EXIT.INTERNAL;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    () => {
      process.exitCode = EXIT.INTERNAL;
    },
  );
}
