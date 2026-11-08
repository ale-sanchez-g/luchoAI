import type {
  CoverageReport,
  DecisionReason,
  DependencyUsageReport,
  GateId,
  GateResult,
  GateStatus,
  ImpactReport,
  IntegrityResult,
  MergeDecision,
  Outcome,
  OwnershipResult,
  ReasonEffect,
  RemediationReport,
  ReportHeader,
  RiskSignal,
  Severity,
  ValidationReport,
  VulnerabilityReport,
} from '../contracts/types';
import type { ReviewPolicy, SentinelConfig } from '../config/types';
import { matchesAny } from '../core/glob';
import { digestOf } from '../core/hash';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';

export const GATE_NAMES: Record<GateId, string> = {
  G1: 'Vulnerability remediation completed',
  G2: 'Dependency usage analysis completed',
  G3: 'Impact analysis completed',
  G4: 'Impacted files have attributable test coverage',
  G5: 'Required tests executed successfully',
  G6: 'Builds and security validations pass',
  G7: 'No unresolved compatibility or governance restriction',
  G8: 'Branch protection and merge requirements satisfied',
};

interface ReasonSpec {
  gate: GateId;
  effect: ReasonEffect;
  /**
   * True when the reason means "could not be established" rather than "established and failing".
   */
  unknown?: boolean;
}

/** Every reason Sentinel can give, with its gate and default effect. */
export const REASONS: Record<string, ReasonSpec> = {
  AUDIT_UNAVAILABLE: { gate: 'G1', effect: 'BLOCK', unknown: true },
  POST_AUDIT_UNAVAILABLE: { gate: 'G1', effect: 'BLOCK', unknown: true },
  REMEDIATION_COMMAND_FAILED: { gate: 'G1', effect: 'BLOCK' },
  NOTHING_TO_MERGE: { gate: 'G1', effect: 'BLOCK' },
  TARGET_NOT_RESOLVED: { gate: 'G1', effect: 'REVIEW' },
  NEW_VULNERABILITY_INTRODUCED: { gate: 'G1', effect: 'REVIEW' },
  SECURITY_REGRESSION: { gate: 'G1', effect: 'BLOCK' },
  MAJOR_UPGRADE_REQUIRED: { gate: 'G1', effect: 'REVIEW' },
  PARENT_UPGRADE_REQUIRED: { gate: 'G1', effect: 'REVIEW' },
  NO_FIX_AVAILABLE: { gate: 'G1', effect: 'INFO' },
  MANIFEST_SPEC_UNSUPPORTED: { gate: 'G1', effect: 'REVIEW' },
  FIX_UNKNOWN: { gate: 'G1', effect: 'REVIEW', unknown: true },
  OUT_OF_SCOPE: { gate: 'G1', effect: 'INFO' },
  USAGE_UNKNOWN: { gate: 'G2', effect: 'REVIEW', unknown: true },
  USAGE_PARTIAL: { gate: 'G2', effect: 'REVIEW', unknown: true },
  IMPACT_UNKNOWN: { gate: 'G3', effect: 'REVIEW', unknown: true },
  BUILD_TOOL_UPGRADE: { gate: 'G3', effect: 'REVIEW' },
  ENGINES_INCOMPATIBLE: { gate: 'G3', effect: 'REVIEW' },
  PEER_DEPENDENCIES_CHANGED: { gate: 'G3', effect: 'REVIEW' },
  DEPRECATED_VERSION: { gate: 'G3', effect: 'REVIEW' },
  PRERELEASE_TARGET: { gate: 'G3', effect: 'REVIEW' },
  COMPATIBILITY_UNKNOWN: { gate: 'G3', effect: 'REVIEW', unknown: true },
  ENGINES_CHANGED: { gate: 'G3', effect: 'INFO' },
  COVERAGE_REPORT_MISSING: { gate: 'G4', effect: 'REVIEW', unknown: true },
  COVERAGE_REPORT_MALFORMED: { gate: 'G4', effect: 'BLOCK' },
  ATTRIBUTION_UNAVAILABLE: { gate: 'G4', effect: 'REVIEW', unknown: true },
  FILE_NOT_TESTED: { gate: 'G4', effect: 'REVIEW' },
  FILE_INSUFFICIENT_COVERAGE: { gate: 'G4', effect: 'REVIEW' },
  TEST_NOT_EXECUTED: { gate: 'G4', effect: 'REVIEW' },
  ASSOCIATED_TEST_FAILED: { gate: 'G4', effect: 'BLOCK' },
  FILE_COVERAGE_UNAVAILABLE: { gate: 'G4', effect: 'REVIEW', unknown: true },
  FILE_INSTRUMENTATION_UNSUPPORTED: { gate: 'G4', effect: 'REVIEW', unknown: true },
  ASSOCIATED_TESTS_SKIPPED: { gate: 'G4', effect: 'REVIEW' },
  NO_EVIDENCE_REQUIRED: { gate: 'G4', effect: 'INFO' },
  TEST_EVIDENCE_MISSING: { gate: 'G5', effect: 'BLOCK', unknown: true },
  EVIDENCE_JOB_FAILED: { gate: 'G5', effect: 'BLOCK' },
  TESTS_FAILED: { gate: 'G5', effect: 'BLOCK' },
  TEST_RUN_ERROR: { gate: 'G5', effect: 'BLOCK' },
  NO_TESTS_EXECUTED: { gate: 'G5', effect: 'BLOCK' },
  TESTS_NOT_EXECUTED: { gate: 'G5', effect: 'REVIEW' },
  TESTS_SKIPPED: { gate: 'G5', effect: 'REVIEW' },
  VALIDATION_FAILED: { gate: 'G6', effect: 'BLOCK' },
  VALIDATION_NOT_COMPLETED: { gate: 'G6', effect: 'BLOCK', unknown: true },
  OPTIONAL_VALIDATION_FAILED: { gate: 'G6', effect: 'INFO' },
  SIGNATURES_INVALID: { gate: 'G6', effect: 'BLOCK' },
  SIGNATURES_MISSING: { gate: 'G6', effect: 'REVIEW' },
  SIGNATURE_VERIFICATION_UNAVAILABLE: { gate: 'G6', effect: 'REVIEW', unknown: true },
  REGISTRY_NOT_ALLOWED: { gate: 'G6', effect: 'BLOCK' },
  INTEGRITY_MISSING: { gate: 'G6', effect: 'BLOCK' },
  LOCKFILE_INCONSISTENT: { gate: 'G6', effect: 'BLOCK' },
  LOCKFILE_CONSISTENCY_UNKNOWN: { gate: 'G6', effect: 'REVIEW', unknown: true },
  UNEXPECTED_FILES_CHANGED: { gate: 'G7', effect: 'REVIEW' },
  MANIFEST_CHANGE_NOT_ALLOWED: { gate: 'G7', effect: 'REVIEW' },
  UNRELATED_DEPENDENCY_CHANGES: { gate: 'G7', effect: 'REVIEW' },
  MAJOR_UPGRADE_INCLUDED: { gate: 'G7', effect: 'REVIEW' },
  INSTALL_SCRIPT_ADDED: { gate: 'G7', effect: 'REVIEW' },
  LICENSE_CHANGED: { gate: 'G7', effect: 'REVIEW' },
  RELEASE_TOO_RECENT: { gate: 'G7', effect: 'REVIEW' },
  OWNERSHIP_UNRESOLVED: { gate: 'G7', effect: 'REVIEW' },
  AUTO_MERGE_DISABLED: { gate: 'G7', effect: 'REVIEW' },
  NO_PULL_REQUEST: { gate: 'G8', effect: 'REVIEW', unknown: true },
  PROTECTION_UNKNOWN: { gate: 'G8', effect: 'REVIEW', unknown: true },
  BRANCH_NOT_PROTECTED: { gate: 'G8', effect: 'REVIEW' },
  REQUIRED_CHECKS_UNKNOWN: { gate: 'G8', effect: 'REVIEW', unknown: true },
  SENTINEL_CHECK_NOT_REQUIRED: { gate: 'G8', effect: 'REVIEW' },
  AUTO_MERGE_NOT_ALLOWED: { gate: 'G8', effect: 'REVIEW' },
  EVIDENCE_STALE: { gate: 'G8', effect: 'BLOCK' },
};

const RANK: Record<Severity, number> = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };

/** Pull-request facts gathered by the caller (null before a PR exists). */
export interface PrFacts {
  number: number;
  /** Commit the evidence was produced for. */
  evidenceSha: string | null;
  /** The PR head commit this evaluation is for. */
  headSha: string;
  /** The PR head re-read from GitHub just before deciding (null if it could not be read). */
  liveHeadSha: string | null;
  baseRef: string;
  changedFiles: string[];
}

/** Repository settings that decide whether auto-merge can be trusted to wait for Sentinel. */
export interface RepoFacts {
  allowAutoMerge: boolean | null;
  baseProtected: boolean | null;
  requiredChecks: string[] | null;
  readError: string | null;
}

export interface GovernanceInput {
  ctx: RunContext;
  config: SentinelConfig;
  configDigest: string;
  vulnerabilities: VulnerabilityReport;
  usage: DependencyUsageReport;
  impact: ImpactReport;
  coverage: CoverageReport | null;
  remediation: RemediationReport;
  validation: ValidationReport | null;
  signatures: IntegrityResult['signatures'];
  ownership: OwnershipResult;
  pr: PrFacts | null;
  repo: RepoFacts | null;
  evidenceJobResult: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
}

class Reasons {
  readonly list: DecisionReason[] = [];
  constructor(private readonly overrides: Partial<Record<string, ReasonEffect>>) {}

  add(code: string, message: string, subjects: string[] = []): void {
    const spec = REASONS[code];
    if (!spec) throw new Error(`unknown reason code ${code}`);
    const effect = this.overrides[code] ?? spec.effect;
    const existing = this.list.find((r) => r.code === code && r.message === message);
    if (existing) {
      existing.subjects = [...new Set([...existing.subjects, ...subjects])].sort();
      return;
    }
    this.list.push({
      code,
      gate: spec.gate,
      effect,
      message,
      subjects: [...new Set(subjects)].sort(),
    });
  }
}

function policyEffect(policy: ReviewPolicy): ReasonEffect {
  return policy === 'require-review' ? 'REVIEW' : 'INFO';
}

/** Report content without per-run fields, so identical evidence always has the same digest. */
export function contentDigest(report: ReportHeader | null): string {
  if (!report) return digestOf(null);
  return digestOf({ ...report, executionId: undefined, generatedAt: undefined });
}

/** Packages this change touches: targeted advisories and the packages installed to fix them. */
function changedPackages(input: GovernanceInput): Set<string> {
  const targeted = new Set(input.remediation.verification.targeted);
  const names = new Set(
    input.vulnerabilities.vulnerabilities.filter((v) => targeted.has(v.key)).map((v) => v.package),
  );
  input.remediation.changes
    .filter((c) => c.relation === 'targeted')
    .forEach((c) => names.add(c.name));
  return names;
}

function evaluateG1(input: GovernanceInput, r: Reasons): void {
  const { vulnerabilities, remediation } = input;
  const audit = vulnerabilities.sources.find((s) => s.source === 'npm-audit');
  if (!audit || audit.status !== 'OK') {
    r.add(
      'AUDIT_UNAVAILABLE',
      `the vulnerability audit did not complete (${audit?.detail ?? 'not run'})`,
    );
  }
  for (const action of remediation.actions.filter((a) => a.status === 'FAILED')) {
    r.add(
      'REMEDIATION_COMMAND_FAILED',
      `${action.argv.slice(0, 3).join(' ')} failed (exit ${action.exitCode})`,
      [action.package],
    );
  }
  if (remediation.verification.after.status !== 'OK') {
    r.add(
      'POST_AUDIT_UNAVAILABLE',
      'the post-remediation audit is unavailable, ' +
        'so introduced vulnerabilities cannot be ruled out',
    );
  }
  if (remediation.verification.targeted.length === 0 && remediation.changes.length === 0) {
    r.add('NOTHING_TO_MERGE', 'no dependency change remediates an in-scope vulnerability');
  }
  if (remediation.verification.remaining.length > 0) {
    r.add(
      'TARGET_NOT_RESOLVED',
      'targeted vulnerabilities are still present after the change',
      remediation.verification.remaining,
    );
  }
  const introduced = remediation.verification.introduced;
  if (introduced.length > 0) {
    const sev = (keys: string[], map: Record<string, Severity>): number =>
      Math.max(-1, ...keys.map((k) => RANK[map[k] ?? 'critical']));
    const introducedMax = sev(introduced, remediation.verification.after.severities);
    const resolvedMax = sev(
      remediation.verification.resolved,
      remediation.verification.before.severities,
    );
    if (introducedMax > resolvedMax) {
      r.add(
        'SECURITY_REGRESSION',
        'the change introduces a vulnerability more severe than any it resolves',
        introduced,
      );
    } else {
      r.add(
        'NEW_VULNERABILITY_INTRODUCED',
        'the change introduces vulnerabilities while resolving more severe ones',
        introduced,
      );
    }
  }
  for (const e of remediation.escalations) {
    const code =
      e.reason === 'MAJOR_UPGRADE_REQUIRED' ||
      e.reason === 'PARENT_UPGRADE_REQUIRED' ||
      e.reason === 'NO_FIX_AVAILABLE' ||
      e.reason === 'MANIFEST_SPEC_UNSUPPORTED' ||
      e.reason === 'OUT_OF_SCOPE'
        ? e.reason
        : 'FIX_UNKNOWN';
    r.add(code, `${e.package} (${e.location}) is not remediated automatically: ${e.detail}`, [
      e.vulnerabilityKey,
    ]);
  }
}

function evaluateG2(input: GovernanceInput, r: Reasons, changed: Set<string>): void {
  for (const pkg of input.usage.packages.filter((p) => changed.has(p.package))) {
    if (pkg.status === 'UNKNOWN') {
      r.add(
        'USAGE_UNKNOWN',
        `usage of ${pkg.package} could not be established; it is not assumed unused`,
        [pkg.package],
      );
    } else if (pkg.completeness !== 'COMPLETE') {
      const why =
        pkg.limitations.find((l) => l.code === 'ANALYSIS_PARTIAL')?.message ??
        'analysis incomplete';
      r.add('USAGE_PARTIAL', `usage analysis is partial: ${why}`, [pkg.package]);
    }
  }
}

function addSignals(r: Reasons, signals: readonly RiskSignal[], config: SentinelConfig): void {
  const map: Partial<Record<RiskSignal['code'], string>> = {
    ENGINES_INCOMPATIBLE: 'ENGINES_INCOMPATIBLE',
    PEER_DEPENDENCIES_CHANGED: 'PEER_DEPENDENCIES_CHANGED',
    DEPRECATED_VERSION: 'DEPRECATED_VERSION',
    PRERELEASE_TARGET: 'PRERELEASE_TARGET',
    METADATA_UNAVAILABLE: 'COMPATIBILITY_UNKNOWN',
    ENGINES_CHANGED: 'ENGINES_CHANGED',
    MAJOR_UPGRADE: 'MAJOR_UPGRADE_INCLUDED',
    INSTALL_SCRIPT: 'INSTALL_SCRIPT_ADDED',
    LICENSE_CHANGED: 'LICENSE_CHANGED',
    RECENT_RELEASE: 'RELEASE_TOO_RECENT',
  };
  for (const s of signals) {
    if (s.code === 'BUILD_TOOL') {
      if (config.governance.buildToolUpgrades === 'require-review') {
        r.add('BUILD_TOOL_UPGRADE', `${s.package}: ${s.detail}`, [s.package]);
      }
      continue;
    }
    const code = map[s.code];
    if (code) r.add(code, s.detail, [s.package]);
  }
}

function evaluateG3(input: GovernanceInput, r: Reasons, changed: Set<string>): void {
  for (const pkg of input.impact.packages.filter((p) => changed.has(p.package))) {
    if (pkg.unknowns.some((u) => u.code === 'IMPACT_UNKNOWN')) {
      r.add('IMPACT_UNKNOWN', `impacted files of ${pkg.package} are unknown`, [pkg.package]);
    }
    addSignals(r, pkg.risk.signals, input.config);
  }
  addSignals(r, input.remediation.compatibility, input.config);
}

const STATUS_MESSAGE: Partial<Record<string, string>> = {
  NOT_TESTED: 'no passing test exercises this impacted file',
  TESTED_INSUFFICIENT_COVERAGE: 'tested, but coverage is below the policy threshold',
  TEST_NOT_EXECUTED: 'tests associated with this file were discovered but did not run',
  TEST_FAILED: 'a test associated with this file failed',
  COVERAGE_UNAVAILABLE: 'there is no coverage evidence for this impacted file',
  INSTRUMENTATION_UNSUPPORTED:
    'the coverage tool does not instrument this file, so there is no coverage evidence',
};

const STATUS_REASON: Partial<Record<string, string>> = {
  NOT_TESTED: 'FILE_NOT_TESTED',
  TESTED_INSUFFICIENT_COVERAGE: 'FILE_INSUFFICIENT_COVERAGE',
  TEST_NOT_EXECUTED: 'TEST_NOT_EXECUTED',
  TEST_FAILED: 'ASSOCIATED_TEST_FAILED',
  COVERAGE_UNAVAILABLE: 'FILE_COVERAGE_UNAVAILABLE',
  INSTRUMENTATION_UNSUPPORTED: 'FILE_INSTRUMENTATION_UNSUPPORTED',
};

function evaluateG4(input: GovernanceInput, r: Reasons, changed: Set<string>): void {
  const relevant = new Set(
    input.impact.impactedFiles
      .filter((f) => f.evidenceRequired && f.packages.some((p) => changed.has(p)))
      .map((f) => f.file),
  );
  if (!input.coverage) {
    if (relevant.size > 0)
      r.add('COVERAGE_REPORT_MISSING', 'no coverage evidence was produced', [...relevant]);
    return;
  }
  const malformed = input.coverage.inputs.filter((i) => i.status === 'MALFORMED');
  if (malformed.length > 0) {
    r.add(
      'COVERAGE_REPORT_MALFORMED',
      'coverage evidence is malformed: ' +
        malformed.map((m) => `${m.path} (${m.detail})`).join('; '),
    );
  }
  if (relevant.size === 0) {
    r.add('NO_EVIDENCE_REQUIRED', 'no impacted file requires test evidence under the policy');
    return;
  }
  if (!input.coverage.attribution.available && input.config.coverage.requireAttribution) {
    r.add('ATTRIBUTION_UNAVAILABLE', 'per-test execution attribution is unavailable');
  }
  for (const file of relevant) {
    const fc = input.coverage.files.find((f) => f.file === file);
    if (!fc) {
      r.add('FILE_COVERAGE_UNAVAILABLE', 'impacted file is missing from the coverage assessment', [
        file,
      ]);
      continue;
    }
    const code = STATUS_REASON[fc.status];
    if (code) r.add(code, STATUS_MESSAGE[fc.status] ?? fc.status, [file]);
    if (
      fc.limitations.some((l) => l.code === 'ASSOCIATED_TESTS_SKIPPED') &&
      !input.config.coverage.allowSkippedTests
    ) {
      r.add('ASSOCIATED_TESTS_SKIPPED', 'tests associated with the file are skipped', [file]);
    }
  }
}

function evaluateG5(input: GovernanceInput, r: Reasons): void {
  if (input.evidenceJobResult && input.evidenceJobResult !== 'success') {
    r.add('EVIDENCE_JOB_FAILED', `the evidence job finished with "${input.evidenceJobResult}"`);
  }
  const v = input.validation;
  if (!v) {
    r.add('TEST_EVIDENCE_MISSING', 'no validation evidence was produced');
    return;
  }
  const failedCounts = v.tests.failed > 0 ? ` (${v.tests.failed} failing test(s))` : '';
  let reportedFailure = false;
  for (const c of v.commands.filter((x) => x.category === 'test' && x.required)) {
    if (c.status === 'FAILED') {
      r.add('TESTS_FAILED', `${c.id} failed${c.kind === 'jest' ? failedCounts : ''}`, [c.id]);
      reportedFailure = true;
    } else if (c.status !== 'PASSED') {
      r.add('TEST_RUN_ERROR', `${c.id} did not complete (${c.status})`, [c.id]);
    }
  }
  if (v.tests.failed > 0 && !reportedFailure)
    r.add('TESTS_FAILED', `${v.tests.failed} test(s) failed`);
  if (v.tests.runtimeErrors > 0)
    r.add('TEST_RUN_ERROR', `${v.tests.runtimeErrors} test suite(s) could not run`);
  if (v.tests.framework && v.tests.total === 0)
    r.add('NO_TESTS_EXECUTED', 'the test run executed no tests');
  if (input.coverage && input.coverage.tests.notExecuted.length > 0) {
    r.add(
      'TESTS_NOT_EXECUTED',
      'discovered test files were not executed',
      input.coverage.tests.notExecuted,
    );
  }
  if ((v.tests.skipped > 0 || v.tests.todo > 0) && !input.config.coverage.allowSkippedTests) {
    r.add('TESTS_SKIPPED', `${v.tests.skipped} skipped and ${v.tests.todo} todo test(s)`);
  }
}

function evaluateG6(input: GovernanceInput, r: Reasons): void {
  const v = input.validation;
  for (const c of v?.commands ?? []) {
    if (c.category === 'test' || c.kind === 'audit-signatures' || c.kind === 'npm-audit') continue;
    if (c.status === 'PASSED') continue;
    if (!c.required) {
      r.add('OPTIONAL_VALIDATION_FAILED', `${c.id} (optional) ended ${c.status}`, [c.id]);
    } else if (c.status === 'FAILED') {
      r.add('VALIDATION_FAILED', `${c.id} failed`, [c.id]);
    } else {
      r.add('VALIDATION_NOT_COMPLETED', `${c.id} did not complete (${c.status})`, [c.id]);
    }
  }
  const sig = input.signatures;
  if (sig.status === 'INVALID') {
    r.add(
      'SIGNATURES_INVALID',
      sig.detail,
      sig.invalid.map((i) => `${i.name}@${i.version}`),
    );
  } else if (sig.status === 'MISSING_SIGNATURES') {
    r.add(
      'SIGNATURES_MISSING',
      sig.detail,
      sig.missing.map((m) => `${m.name}@${m.version}`),
    );
  } else if (sig.status !== 'VERIFIED' && input.config.validation.auditSignatures === 'required') {
    r.add('SIGNATURE_VERIFICATION_UNAVAILABLE', `registry signatures not verified: ${sig.detail}`);
  }
  const integrity = input.remediation.integrity;
  if (integrity.registry.violations.length > 0) {
    r.add(
      'REGISTRY_NOT_ALLOWED',
      'lockfile resolves packages from a registry outside the allowlist',
      integrity.registry.violations.map((x) => x.location),
    );
  }
  if (integrity.missingIntegrity.length > 0) {
    r.add(
      'INTEGRITY_MISSING',
      'lockfile entries without an integrity hash',
      integrity.missingIntegrity,
    );
  }
  if (integrity.lockfileConsistent === 'FAIL')
    r.add(
      'LOCKFILE_INCONSISTENT',
      `lockfile is inconsistent: ${integrity.lockfileDetail.slice(0, 200)}`,
    );
  else if (integrity.lockfileConsistent === 'UNKNOWN')
    r.add('LOCKFILE_CONSISTENCY_UNKNOWN', 'lockfile consistency could not be checked');
}

function evaluateG7(input: GovernanceInput, r: Reasons): void {
  const changedFiles = input.pr?.changedFiles ?? input.remediation.changedFiles;
  const unexpected = changedFiles.filter(
    (f) => !matchesAny(f, input.config.governance.allowedChangedFiles),
  );
  if (unexpected.length > 0)
    r.add(
      'UNEXPECTED_FILES_CHANGED',
      'files outside the dependency manifest and lockfile changed',
      unexpected,
    );
  const manifest = input.remediation.manifestChanges.filter((m) => !m.allowed);
  if (manifest.length > 0) {
    r.add(
      'MANIFEST_CHANGE_NOT_ALLOWED',
      'package.json changes beyond targeted version specs',
      manifest.map((m) => `${m.field}${m.package ? `.${m.package}` : ''}`),
    );
  }
  const unrelated = input.remediation.changes.filter((c) => c.relation === 'unrelated');
  if (unrelated.length > 0) {
    r.add(
      'UNRELATED_DEPENDENCY_CHANGES',
      'lockfile changes not attributable to a targeted fix',
      unrelated.map((c) => `${c.location}@${c.to ?? 'removed'}`),
    );
  }
  if (input.ownership.unresolvedFiles.length > 0) {
    const fallback = input.ownership.fallbackApplied
      ? ' (fallback owners requested)'
      : ' and no fallback owners are configured';
    r.add(
      'OWNERSHIP_UNRESOLVED',
      `impacted files have no CODEOWNERS owner${fallback}`,
      input.ownership.unresolvedFiles,
    );
  }
  if (!input.config.governance.autoMerge.enabled) {
    r.add('AUTO_MERGE_DISABLED', 'automatic merging is disabled by policy');
  }
}

function evaluateG8(input: GovernanceInput, r: Reasons): void {
  const { pr, repo, config } = input;
  if (!pr) {
    r.add(
      'NO_PULL_REQUEST',
      'evaluated before the pull request exists; ' +
        'the PR validation workflow makes the final decision',
    );
  } else {
    if (pr.evidenceSha && pr.evidenceSha !== pr.headSha) {
      r.add(
        'EVIDENCE_STALE',
        `evidence was produced for ${pr.evidenceSha.slice(0, 12)}, ` +
          `not the PR head ${pr.headSha.slice(0, 12)}`,
      );
    }
    if (pr.liveHeadSha && pr.liveHeadSha !== pr.headSha) {
      r.add(
        'EVIDENCE_STALE',
        `the PR head moved to ${pr.liveHeadSha.slice(0, 12)} during evaluation`,
      );
    }
  }
  if (!repo || repo.readError) {
    r.add(
      'PROTECTION_UNKNOWN',
      `branch protection could not be read${repo?.readError ? `: ${repo.readError}` : ''}`,
    );
    return;
  }
  if (repo.baseProtected === false)
    r.add(
      'BRANCH_NOT_PROTECTED',
      'the base branch has no protection rule; auto-merge would not wait for checks',
    );
  if (repo.requiredChecks === null) {
    r.add('REQUIRED_CHECKS_UNKNOWN', 'required status checks could not be determined');
  } else if (!repo.requiredChecks.includes(config.governance.requiredStatusCheck)) {
    r.add(
      'SENTINEL_CHECK_NOT_REQUIRED',
      `"${config.governance.requiredStatusCheck}" is not a required status check, ` +
        'so a new commit could merge before Sentinel re-evaluates',
    );
  }
  if (repo.allowAutoMerge === false)
    r.add('AUTO_MERGE_NOT_ALLOWED', 'the repository does not allow auto-merge');
  else if (repo.allowAutoMerge === null)
    r.add('PROTECTION_UNKNOWN', 'whether the repository allows auto-merge is unknown');
}

function gateStatus(reasons: DecisionReason[]): GateStatus {
  const blocking = reasons.filter((x) => x.effect !== 'INFO');
  if (blocking.length === 0) return 'PASS';
  return blocking.every((x) => REASONS[x.code]?.unknown) ? 'UNKNOWN' : 'FAIL';
}

/**
 * The merge decision: a pure function of the evidence, the policy and the evaluation time. Any
 * BLOCK reason gives BLOCKED; otherwise any REVIEW reason, or any gate that is not PASS, gives
 * HUMAN_REVIEW; only when all eight gates pass is the outcome AUTO_MERGE.
 */
export function decide(input: GovernanceInput): MergeDecision {
  const overrides: Partial<Record<string, ReasonEffect>> = {
    MAJOR_UPGRADE_REQUIRED: policyEffect(input.config.governance.majorUpgradeRequired),
    PARENT_UPGRADE_REQUIRED: policyEffect(input.config.governance.majorUpgradeRequired),
    NO_FIX_AVAILABLE: policyEffect(input.config.governance.noFixAvailable),
    OWNERSHIP_UNRESOLVED: policyEffect(input.config.governance.unresolvedOwnership),
  };
  const r = new Reasons(overrides);
  const changed = changedPackages(input);
  evaluateG1(input, r);
  evaluateG2(input, r, changed);
  evaluateG3(input, r, changed);
  evaluateG4(input, r, changed);
  evaluateG5(input, r);
  evaluateG6(input, r);
  evaluateG7(input, r);
  evaluateG8(input, r);

  const order = Object.keys(GATE_NAMES) as GateId[];
  const effectRank: Record<ReasonEffect, number> = { BLOCK: 0, REVIEW: 1, INFO: 2 };
  const reasons = r.list.sort(
    (a, b) =>
      order.indexOf(a.gate) - order.indexOf(b.gate) ||
      effectRank[a.effect] - effectRank[b.effect] ||
      a.code.localeCompare(b.code),
  );
  const gates: GateResult[] = order.map((id) => {
    const own = reasons.filter((x) => x.gate === id);
    return { id, name: GATE_NAMES[id], status: gateStatus(own), reasons: own };
  });
  let decision: Outcome;
  if (reasons.some((x) => x.effect === 'BLOCK')) decision = 'BLOCKED';
  else if (reasons.some((x) => x.effect === 'REVIEW') || gates.some((g) => g.status !== 'PASS'))
    decision = 'HUMAN_REVIEW';
  else decision = 'AUTO_MERGE';

  const labels = [input.config.labels.dependencyUpdate];
  labels.push(
    gates[3].status === 'PASS'
      ? input.config.labels.coverageComplete
      : input.config.labels.coverageIncomplete,
  );
  if (decision !== 'AUTO_MERGE') labels.push(input.config.labels.manualReview);
  if (decision === 'BLOCKED') labels.push(input.config.labels.validationFailed);

  const digests = {
    vulnerabilities: contentDigest(input.vulnerabilities),
    usage: contentDigest(input.usage),
    impact: contentDigest(input.impact),
    coverage: contentDigest(input.coverage),
    remediation: contentDigest(input.remediation),
    validation: contentDigest(input.validation),
    facts: digestOf({
      pr: input.pr,
      repo: input.repo,
      ownership: input.ownership,
      signatures: input.signatures,
      evidenceJobResult: input.evidenceJobResult,
    }),
  };
  const evaluatedAt = input.ctx.now().toISOString();
  const pullRequest = {
    number: input.pr?.number ?? null,
    headSha: input.pr?.headSha ?? null,
    baseRef: input.pr?.baseRef ?? null,
  };
  return {
    ...makeHeader(input.ctx, 'merge-decision'),
    decision,
    gates,
    reasons,
    pullRequest,
    ownership: input.ownership,
    labels,
    inputs: { digests, policyDigest: input.configDigest, evaluatedAt },
    decisionDigest: digestOf({
      decision,
      gates,
      labels,
      ownership: input.ownership,
      digests,
      policy: input.configDigest,
      pullRequest,
    }),
  };
}
