/**
 * Data contracts shared by every Sentinel module. Each report type has a matching JSON Schema in
 * `sentinel/schemas/` that is enforced before a report is written.
 */

export const SCHEMA_VERSION = '1.0.0';

export type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';
export type Outcome = 'AUTO_MERGE' | 'HUMAN_REVIEW' | 'BLOCKED';
export type UpgradeType = 'patch' | 'minor' | 'major';

export type ReportType =
  | 'repository-discovery'
  | 'vulnerability-report'
  | 'dependency-usage-report'
  | 'impact-report'
  | 'coverage-report'
  | 'remediation-report'
  | 'validation-report'
  | 'merge-decision'
  | 'pr-management-report'
  | 'execution-summary';

export interface Limitation {
  code: string;
  message: string;
  subject?: string;
}

export interface RepositoryRef {
  slug: string | null;
  commitSha: string | null;
  ref: string | null;
}

export interface ReportHeader {
  schemaVersion: string;
  reportType: ReportType;
  executionId: string;
  generatedAt: string;
  repository: RepositoryRef;
  tool: { name: 'project-sentinel'; version: string };
  limitations: Limitation[];
}

/* ------------------------------------------------------------------ repository discovery */

export interface RepositoryDiscovery extends ReportHeader {
  reportType: 'repository-discovery';
  languages: { name: string; files: number }[];
  packageManagers: {
    name: string;
    manifest: string;
    lockfile: string | null;
    lockfileVersion: number | null;
  }[];
  testFrameworks: { name: string; configFile: string | null; command: string | null }[];
  coverage: { configured: boolean; thresholds: CoverageThresholds | null; source: string | null };
  ciWorkflows: string[];
  codeowners: { path: string | null; rules: number };
  securityTools: string[];
}

export interface CoverageThresholds {
  lines: number | null;
  branches: number | null;
  functions: number | null;
  statements: number | null;
}

/* ------------------------------------------------------------------ vulnerabilities */

export type FixStatus =
  | 'FIXABLE'
  | 'MAJOR_UPGRADE_REQUIRED'
  | 'PARENT_UPGRADE_REQUIRED'
  | 'NO_FIX_AVAILABLE'
  | 'UNKNOWN';

export type FixStrategy = 'direct-update' | 'transitive-update' | 'parent-update';

export interface NpmSuggestion {
  name: string;
  version: string;
  isSemVerMajor: boolean;
  accepted: boolean;
  rejectionReason: string | null;
}

export interface InstanceFix {
  status: FixStatus;
  fixedVersion: string | null;
  targetVersion: string | null;
  upgradeType: UpgradeType | null;
  strategy: FixStrategy | null;
  parent: {
    name: string;
    location: string;
    from: string;
    to: string;
    upgradeType: UpgradeType;
  } | null;
  reason: string;
  npmSuggestion: NpmSuggestion | null;
  /** Advisory keys known to affect the target version but not the installed one. */
  introduces: string[];
}

export interface RequiredBy {
  location: string;
  name: string;
  version: string;
  range: string;
}

export interface VulnerableInstance {
  location: string;
  version: string;
  direct: boolean;
  dev: boolean;
  optional: boolean;
  dependencyPaths: string[][];
  pathsTruncated: boolean;
  requiredBy: RequiredBy[];
  fix: InstanceFix;
}

export type DependencyScope = 'production' | 'development' | 'mixed';

export interface Vulnerability {
  key: string;
  ids: { ghsa: string | null; cve: string[]; aliases: string[] };
  title: string;
  url: string | null;
  severity: Severity;
  cvss: { score: number | null; vector: string | null };
  cwe: string[];
  package: string;
  vulnerableRange: string;
  sources: string[];
  instances: VulnerableInstance[];
  isDirect: boolean;
  scope: DependencyScope;
  fixStatus: FixStatus;
  inScope: boolean;
  priority: number;
}

export type SourceName =
  | 'npm-audit'
  | 'github-advisory-database'
  | 'dependabot-alerts'
  | 'osv-scanner';

export interface SourceStatus {
  source: SourceName;
  status: 'OK' | 'UNAVAILABLE' | 'ERROR' | 'DISABLED';
  detail: string;
  findings: number;
}

export interface VulnerabilityReport extends ReportHeader {
  reportType: 'vulnerability-report';
  ecosystem: 'npm';
  lockfile: { path: string; lockfileVersion: number; packages: number };
  sources: SourceStatus[];
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    direct: number;
    transitive: number;
    inScope: number;
    byFixStatus: Record<FixStatus, number>;
  };
  vulnerabilities: Vulnerability[];
}

/* ------------------------------------------------------------------ usage */

export type FileClass =
  | 'production'
  | 'test'
  | 'configuration'
  | 'ci'
  | 'infrastructure'
  | 'tooling'
  | 'documentation'
  | 'other';

export type RelationshipType =
  | 'DIRECT_IMPORT'
  | 'TYPE_IMPORT'
  | 'DYNAMIC_IMPORT'
  | 'REQUIRE'
  | 'TEST_MOCK'
  | 'CONFIGURATION'
  | 'BUILD_SCRIPT'
  | 'CI_WORKFLOW'
  | 'TEXT_REFERENCE';

export type Confidence = 'CONFIRMED' | 'INFERRED';
export type Detector = 'ast' | 'package-json' | 'config' | 'workflow' | 'text-search';

export interface UsageReference {
  file: string;
  line: number | null;
  column: number | null;
  relationship: RelationshipType;
  confidence: Confidence;
  specifier: string;
  /** Package named in the file; differs from the analysed package for transitive usage. */
  referencedPackage: string;
  detector: Detector;
  fileClass: FileClass;
  evidence: string;
}

export type UsageStatus = 'USED_DIRECTLY' | 'USED_TRANSITIVELY' | 'TOOLING_ONLY' | 'UNKNOWN';

export interface PackageUsage {
  package: string;
  status: UsageStatus;
  completeness: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
  viaDirectDependencies: string[];
  binaries: string[];
  references: UsageReference[];
  limitations: Limitation[];
}

export interface DynamicImportSite {
  file: string;
  line: number;
  column: number;
  kind: 'import()' | 'require()' | 'require.resolve()';
  expression: string;
  fileClass: FileClass;
}

export interface DependencyUsageReport extends ReportHeader {
  reportType: 'dependency-usage-report';
  scannedFiles: number;
  skippedFiles: { file: string; reason: string }[];
  parseErrors: { file: string; message: string }[];
  dynamicImports: DynamicImportSite[];
  packages: PackageUsage[];
}

/* ------------------------------------------------------------------ impact */

export type ImpactKind =
  | 'DIRECT'
  | 'TRANSITIVE'
  | 'TYPE_ONLY'
  | 'DEPENDENT_MODULE'
  | 'CONFIGURATION'
  | 'BUILD_SCRIPT'
  | 'CI'
  | 'TEST';

export interface TraceStep {
  from: string;
  to: string;
  relationship: string;
  evidence: string;
}

export interface ImpactedFile {
  file: string;
  fileClass: FileClass;
  impactKinds: ImpactKind[];
  packages: string[];
  confidence: Confidence;
  traces: TraceStep[][];
  evidenceRequired: boolean;
  evidenceReason: string;
}

export type RiskCode =
  | 'MAJOR_UPGRADE'
  | 'ZERO_MAJOR_MINOR_BUMP'
  | 'ZERO_ZERO_PATCH_BUMP'
  | 'PRERELEASE_TARGET'
  | 'ENGINES_INCOMPATIBLE'
  | 'ENGINES_CHANGED'
  | 'PEER_DEPENDENCIES_CHANGED'
  | 'INSTALL_SCRIPT'
  | 'LICENSE_CHANGED'
  | 'DEPRECATED_VERSION'
  | 'RECENT_RELEASE'
  | 'BUILD_TOOL'
  | 'METADATA_UNAVAILABLE';

export interface RiskSignal {
  code: RiskCode;
  package: string;
  detail: string;
}

export interface PackageImpact {
  package: string;
  vulnerabilityKeys: string[];
  usageStatus: UsageStatus;
  directFiles: string[];
  transitiveFiles: string[];
  typeOnlyFiles: string[];
  dependentModules: string[];
  entryPoints: string[];
  components: string[];
  configurationFiles: string[];
  ciFiles: string[];
  testFiles: string[];
  downstreamGraph: { nodes: string[]; edges: [string, string][] };
  risk: { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'; signals: RiskSignal[] };
  unknowns: Limitation[];
}

export interface ImpactReport extends ReportHeader {
  reportType: 'impact-report';
  coverageScope: CoverageScope;
  packages: PackageImpact[];
  impactedFiles: ImpactedFile[];
}

/* ------------------------------------------------------------------ coverage */

export type CoverageScope = 'direct' | 'direct-and-dependents';

export type FileCoverageStatus =
  | 'TESTED_AND_COVERED'
  | 'TESTED_INSUFFICIENT_COVERAGE'
  | 'NOT_TESTED'
  | 'TEST_NOT_EXECUTED'
  | 'TEST_FAILED'
  | 'COVERAGE_UNAVAILABLE'
  | 'INSTRUMENTATION_UNSUPPORTED';

export interface CoverageMetric {
  covered: number;
  total: number;
  pct: number;
}

export interface FileMetrics {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export type ExecutionStrength = 'EXERCISED' | 'LOADED_ONLY' | 'NONE' | 'UNKNOWN';
export type TestResultStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_EXECUTED' | 'ERROR';

export interface AssociatedTest {
  testFile: string;
  association: 'EXECUTION' | 'STATIC_IMPORT' | 'BOTH';
  discovered: boolean;
  executed: boolean;
  result: TestResultStatus;
  executionStrength: ExecutionStrength;
  assertions: { passed: number; failed: number; skipped: number };
}

export interface FileCoverage {
  file: string;
  fileClass: FileClass;
  evidenceRequired: boolean;
  status: FileCoverageStatus;
  metrics: FileMetrics | null;
  associatedTests: AssociatedTest[];
  validatedBy: string[];
  evidence: string[];
  limitations: Limitation[];
}

export interface CoverageInput {
  format:
    | 'istanbul-json'
    | 'lcov'
    | 'coverage-py-json'
    | 'jest-results'
    | 'jest-attribution'
    | 'jest-list-tests';
  path: string;
  status: 'PARSED' | 'MISSING' | 'MALFORMED';
  detail: string;
}

export interface CoverageReport extends ReportHeader {
  reportType: 'coverage-report';
  policy: {
    lineThreshold: number;
    branchThreshold: number | null;
    thresholdSource: string;
    scope: CoverageScope;
    allowSkippedTests: boolean;
    requireAttribution: boolean;
  };
  inputs: CoverageInput[];
  attribution: { available: boolean; granularity: 'test-file' | 'none'; detail: string };
  tests: { discovered: string[]; executed: string[]; notExecuted: string[] };
  files: FileCoverage[];
  summary: {
    evaluated: number;
    requiringEvidence: number;
    byStatus: Record<FileCoverageStatus, number>;
  };
}

/* ------------------------------------------------------------------ remediation */

export interface RemediationAction {
  id: string;
  kind: 'npm-install' | 'npm-update';
  package: string;
  spec: string;
  argv: string[];
  targets: string[];
  status: 'APPLIED' | 'FAILED' | 'SKIPPED';
  exitCode: number | null;
  durationMs: number;
  detail: string;
}

export interface Escalation {
  vulnerabilityKey: string;
  package: string;
  location: string;
  reason: FixStatus | 'OUT_OF_SCOPE' | 'MANIFEST_SPEC_UNSUPPORTED' | 'REMEDIATION_FAILED';
  detail: string;
}

export interface PackageChange {
  name: string;
  location: string;
  changeType: 'updated' | 'added' | 'removed';
  from: string | null;
  to: string | null;
  upgradeType: UpgradeType | 'downgrade' | null;
  relation: 'targeted' | 'dependency-of-targeted' | 'unrelated';
  relatedTo: string[];
  dev: boolean;
  hasInstallScript: boolean;
  license: string | null;
  previousLicense: string | null;
}

export interface ManifestChange {
  field: string;
  package: string;
  from: string | null;
  to: string | null;
  allowed: boolean;
}

export interface AuditSnapshot {
  status: 'OK' | 'UNAVAILABLE' | 'ERROR';
  advisoryKeys: string[];
  bySeverity: Record<Severity, number>;
  /** Severity of each advisory key. */
  severities: Record<string, Severity>;
}

export interface IntegrityResult {
  lockfileConsistent: 'PASS' | 'FAIL' | 'UNKNOWN';
  lockfileDetail: string;
  registry: { allowed: string[]; violations: { location: string; resolved: string }[] };
  missingIntegrity: string[];
  signatures: {
    status: 'VERIFIED' | 'INVALID' | 'MISSING_SIGNATURES' | 'UNAVAILABLE' | 'NOT_RUN';
    invalid: { name: string; version: string; code: string }[];
    missing: { name: string; version: string }[];
    detail: string;
  };
}

export interface RemediationReport extends ReportHeader {
  reportType: 'remediation-report';
  mode: 'apply' | 'verify';
  baseSha: string | null;
  headSha: string | null;
  actions: RemediationAction[];
  escalations: Escalation[];
  changes: PackageChange[];
  manifestChanges: ManifestChange[];
  changedFiles: string[];
  verification: {
    before: AuditSnapshot;
    after: AuditSnapshot;
    targeted: string[];
    resolved: string[];
    remaining: string[];
    introduced: string[];
  };
  integrity: IntegrityResult;
  compatibility: RiskSignal[];
  patch: { file: string | null; sha256: string | null };
}

/* ------------------------------------------------------------------ validation */

export type CommandStatus = 'PASSED' | 'FAILED' | 'ERROR' | 'TIMED_OUT' | 'NOT_RUN';

export interface CommandResult {
  id: string;
  kind: 'jest' | 'command' | 'npm-audit' | 'audit-signatures' | 'lockfile-check';
  category: 'test' | 'build' | 'lint' | 'security' | 'integrity' | 'other';
  argv: string[];
  required: boolean;
  status: CommandStatus;
  exitCode: number | null;
  durationMs: number;
  startedAt: string | null;
  outputTail: string;
  artifacts: string[];
}

export interface TestFileResult {
  testFile: string;
  status: TestResultStatus;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  durationMs: number;
  failureMessage: string | null;
}

export interface ValidationReport extends ReportHeader {
  reportType: 'validation-report';
  commands: CommandResult[];
  tests: {
    framework: string | null;
    discovered: number;
    executedFiles: number;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    todo: number;
    runtimeErrors: number;
    durationMs: number;
    success: boolean | null;
    files: TestFileResult[];
  };
  summary: { requiredPassed: boolean; failedRequired: string[]; notRunRequired: string[] };
}

/* ------------------------------------------------------------------ governance */

export type GateId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8';
export type GateStatus = 'PASS' | 'FAIL' | 'UNKNOWN' | 'NOT_APPLICABLE';
export type ReasonEffect = 'BLOCK' | 'REVIEW' | 'INFO';

export interface DecisionReason {
  code: string;
  gate: GateId;
  effect: ReasonEffect;
  message: string;
  subjects: string[];
}

export interface GateResult {
  id: GateId;
  name: string;
  status: GateStatus;
  reasons: DecisionReason[];
}

export interface OwnerAssignment {
  file: string;
  owners: string[];
  source: 'codeowners' | 'fallback' | 'none';
  rule: string | null;
}

export interface OwnershipResult {
  codeownersFile: string | null;
  owners: string[];
  users: string[];
  teams: string[];
  emails: string[];
  assignments: OwnerAssignment[];
  unresolvedFiles: string[];
  fallbackApplied: boolean;
}

export interface MergeDecision extends ReportHeader {
  reportType: 'merge-decision';
  decision: Outcome;
  gates: GateResult[];
  reasons: DecisionReason[];
  pullRequest: { number: number | null; headSha: string | null; baseRef: string | null };
  ownership: OwnershipResult;
  labels: string[];
  inputs: { digests: Record<string, string>; policyDigest: string; evaluatedAt: string };
  decisionDigest: string;
}

export interface PrActionResult {
  action: string;
  status: 'DONE' | 'SKIPPED' | 'FAILED';
  detail: string;
}

export interface PrManagementReport extends ReportHeader {
  reportType: 'pr-management-report';
  pullRequest: {
    number: number | null;
    url: string | null;
    created: boolean;
    headSha: string | null;
  };
  decision: Outcome | null;
  finalOutcome: Outcome | null;
  actions: PrActionResult[];
}

export interface ExecutionSummary extends ReportHeader {
  reportType: 'execution-summary';
  stage: string;
  vulnerabilities: { key: string; ids: string[]; severity: Severity; package: string }[];
  dependencyChanges: { name: string; from: string | null; to: string | null }[];
  impactedFiles: string[];
  tests: { executed: number; passed: number; failed: number; skipped: number } | null;
  coverage: Record<string, string>;
  gates: { id: GateId; status: GateStatus }[];
  decision: Outcome | null;
  pullRequest: { number: number | null; url: string | null };
  codeownersAssignments: string[];
  reports: string[];
}
