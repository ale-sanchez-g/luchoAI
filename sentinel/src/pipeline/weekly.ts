import fs from 'node:fs';
import path from 'node:path';
import type { MergeDecision, RemediationReport, VulnerabilityReport } from '../contracts/types';
import { log } from '../core/log';
import { readReport, writeReport } from '../core/report-io';
import { renderPullRequestBody } from '../github/markdown';
import { readRepoFacts } from '../github/repo-facts';
import { parseLockfile } from '../graph/lockfile';
import { analyseImpact } from '../impact/impact-analysis';
import { applyRemediation } from '../remediation/remediation';
import { analyseUsage } from '../usage/usage-analysis';
import type { StageEnv } from './context';
import { evaluate } from './evaluate';
import { runScan } from './scan';
import { buildExecutionSummary } from './summary';

/**
 * Weekly plan (read-only job, no dependency code runs): discovery, usage, impact and lockfile-only
 * remediation. Produces the reports and the patch that the publish job verifies and pushes.
 */
export async function planWeekly(stage: StageEnv): Promise<{ changed: boolean }> {
  const { options, ctx } = stage;
  const config = stage.loaded.config;
  const { report: vulnerabilities, graph } = await runScan({
    root: options.repoDir,
    ctx,
    config,
    auditJsonPath: null,
    registry: stage.registry,
    github: stage.github,
    repoSlug: options.repoSlug,
    env: stage.childEnv,
  });
  const usage = analyseUsage({ root: options.repoDir, ctx, config, graph, vulnerabilities });
  const impact = await analyseImpact({
    ctx,
    config,
    graph,
    vulnerabilities,
    usage,
    registry: stage.registry,
  });
  const { report: remediation, changed } = await applyRemediation({
    root: options.repoDir,
    ctx,
    config,
    vulnerabilities,
    env: stage.childEnv,
    patchFile: path.join(options.outDir, 'remediation.patch'),
  });
  const written = [vulnerabilities, usage.report, impact, remediation].map((r) =>
    path.basename(writeReport(options.outDir, r)),
  );
  fs.writeFileSync(
    path.join(options.outDir, 'pr-body.md'),
    renderPullRequestBody(
      vulnerabilities,
      usage.report,
      impact,
      remediation,
      config.reporting.commentMaxChars,
    ),
  );
  writeReport(
    options.outDir,
    buildExecutionSummary(ctx, 'weekly-plan', { vulnerabilities, impact, remediation }, written),
  );
  log.info(
    `plan: ${remediation.verification.targeted.length} advisories targeted, ` +
      `${remediation.escalations.length} escalated, changed=${changed}`,
  );
  return { changed };
}

/**
 * Weekly evaluation (read-only job, after the patch is applied and dependencies installed):
 * coverage intelligence and a preliminary decision. The authoritative decision is made per commit
 * by the PR validation workflow.
 */
export async function evaluateWeekly(
  stage: StageEnv,
  planDir: string,
  evidenceDir: string,
): Promise<MergeDecision> {
  const { options, ctx } = stage;
  const config = stage.loaded.config;
  const vulnerabilities = readReport<VulnerabilityReport>(
    path.join(planDir, 'vulnerability-report.json'),
    'vulnerability-report',
  );
  const remediation = readReport<RemediationReport>(
    path.join(planDir, 'remediation-report.json'),
    'remediation-report',
  );
  const graph = parseLockfile(
    fs.readFileSync(path.join(options.repoDir, config.ecosystems.npm.lockfile), 'utf8'),
  );
  const usage = analyseUsage({ root: options.repoDir, ctx, config, graph, vulnerabilities });
  const impact = await analyseImpact({
    ctx,
    config,
    graph,
    vulnerabilities,
    usage,
    registry: stage.registry,
  });
  let repo = null;
  if (stage.github && options.repoSlug) {
    try {
      repo = await readRepoFacts(
        stage.github,
        options.repoSlug,
        process.env.GITHUB_REF_NAME ?? 'main',
      );
    } catch (error) {
      log.warn(`could not read branch protection: ${(error as Error).message}`);
    }
  }
  const result = evaluate({
    ctx,
    config,
    configDigest: stage.loaded.digest,
    repoDir: options.repoDir,
    trustedDir: options.trustedDir,
    evidenceDir,
    vulnerabilities,
    usage,
    impact,
    remediation,
    pr: null,
    repo,
    evidenceJobResult: null,
  });
  const reports = [
    vulnerabilities,
    usage.report,
    impact,
    remediation,
    result.decision,
    ...(result.coverage ? [result.coverage] : []),
    ...(result.validation ? [result.validation] : []),
  ];
  const written = reports.map((r) => path.basename(writeReport(options.outDir, r)));
  writeReport(
    options.outDir,
    buildExecutionSummary(
      ctx,
      'weekly-evaluate',
      {
        vulnerabilities,
        impact,
        coverage: result.coverage,
        remediation,
        validation: result.validation,
        decision: result.decision,
      },
      written,
    ),
  );
  log.info(`preliminary decision: ${result.decision.decision}`);
  return result.decision;
}
