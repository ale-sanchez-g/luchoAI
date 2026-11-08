import fs from 'node:fs';
import path from 'node:path';
import type {
  CoverageReport,
  ImpactReport,
  IntegrityResult,
  MergeDecision,
  RemediationReport,
  ValidationReport,
  VulnerabilityReport,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { readRepoFile } from '../core/fs-walk';
import type { RunContext } from '../core/report-io';
import { readReport } from '../core/report-io';
import { assessCoverage, loadCoverageEvidence } from '../coverage/coverage-intelligence';
import { extractJestThresholds } from '../coverage/repo-thresholds';
import { findCodeowners } from '../discovery/repo-discovery';
import { parseCodeowners, resolveOwnership } from '../governance/codeowners';
import type { PrFacts, RepoFacts } from '../governance/decision';
import { decide } from '../governance/decision';
import { parseSignatures } from '../remediation/integrity';
import type { UsageAnalysis } from '../usage/usage-analysis';

export interface EvaluateInput {
  ctx: RunContext;
  config: SentinelConfig;
  configDigest: string;
  /** Checkout that was analysed (weekly working tree or PR head). */
  repoDir: string;
  /** Trusted checkout whose CODEOWNERS applies (base branch). */
  trustedDir: string;
  evidenceDir: string | null;
  vulnerabilities: VulnerabilityReport;
  usage: UsageAnalysis;
  impact: ImpactReport;
  remediation: RemediationReport;
  pr: PrFacts | null;
  repo: RepoFacts | null;
  evidenceJobResult: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
}

export interface Evaluation {
  validation: ValidationReport | null;
  coverage: CoverageReport | null;
  signatures: IntegrityResult['signatures'];
  decision: MergeDecision;
}

/** Signature verification result recorded by `sentinel validate`. */
export function readSignatures(evidenceDir: string | null): IntegrityResult['signatures'] {
  const file = evidenceDir ? path.join(evidenceDir, 'audit-signatures.json') : null;
  if (!file || !fs.existsSync(file)) {
    return {
      status: 'NOT_RUN',
      invalid: [],
      missing: [],
      detail: 'no signature verification evidence',
    };
  }
  try {
    const recorded = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      exitCode: number | null;
      stdout: string;
    };
    return parseSignatures(
      String(recorded.stdout ?? ''),
      typeof recorded.exitCode === 'number' ? recorded.exitCode : null,
    );
  } catch {
    return {
      status: 'UNAVAILABLE',
      invalid: [],
      missing: [],
      detail: 'signature evidence is unreadable',
    };
  }
}

/** Coverage intelligence, ownership and the merge decision from collected evidence. */
export function evaluate(input: EvaluateInput): Evaluation {
  const { config, evidenceDir } = input;
  const validationFile = evidenceDir ? path.join(evidenceDir, 'validation-report.json') : null;
  const validation =
    validationFile && fs.existsSync(validationFile)
      ? readReport<ValidationReport>(validationFile, 'validation-report')
      : null;

  let coverage: CoverageReport | null = null;
  if (evidenceDir && fs.existsSync(evidenceDir)) {
    const jestConfig = [
      'jest.config.js',
      'jest.config.ts',
      'jest.config.mjs',
      'jest.config.cjs',
      'jest.config.json',
    ].find((f) => fs.existsSync(path.join(input.repoDir, f)));
    const thresholds = jestConfig
      ? extractJestThresholds(jestConfig, readRepoFile(input.repoDir, jestConfig) ?? '')
      : null;
    coverage = assessCoverage({
      ctx: input.ctx,
      config,
      impact: input.impact,
      importGraph: input.usage.importGraph,
      classes: input.usage.classes,
      evidence: loadCoverageEvidence(evidenceDir),
      repoThresholds: thresholds?.thresholds ?? null,
      repoThresholdSource: jestConfig ?? null,
    });
  }

  const trustedFiles = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'].filter((f) =>
    fs.existsSync(path.join(input.trustedDir, f)),
  );
  const codeownersPath = findCodeowners(trustedFiles);
  const codeowners = codeownersPath
    ? parseCodeowners(codeownersPath, readRepoFile(input.trustedDir, codeownersPath) ?? '')
    : null;
  const ownership = resolveOwnership(
    input.impact.impactedFiles.map((f) => f.file),
    codeowners,
    config.codeowners.fallbackOwners,
  );
  const signatures = readSignatures(evidenceDir);
  const decision = decide({
    ctx: input.ctx,
    config,
    configDigest: input.configDigest,
    vulnerabilities: input.vulnerabilities,
    usage: input.usage.report,
    impact: input.impact,
    coverage,
    remediation: input.remediation,
    validation,
    signatures,
    ownership,
    pr: input.pr,
    repo: input.repo,
    evidenceJobResult: input.evidenceJobResult,
  });
  return { validation, coverage, signatures, decision };
}
