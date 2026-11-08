import type { CoverageScope, FileClass, Severity } from '../contracts/types';

export type ReviewPolicy = 'require-review' | 'report';
export type CheckRequirement = 'required' | 'optional' | 'disabled';
export type CommandCategory = 'test' | 'build' | 'lint' | 'security' | 'other';

export interface ValidationCommandConfig {
  id: string;
  kind: 'jest' | 'command';
  category: CommandCategory;
  run: string[];
  env: Record<string, string>;
  required: boolean;
  timeoutMinutes: number;
}

export interface ConfigurationEvidenceRule {
  files: string[];
  satisfiedBy: string[];
}

/** Sentinel policy, loaded from `.github/sentinel/config.yml` and merged over defaults. */
export interface SentinelConfig {
  version: 1;
  runtime: { node: string };
  ecosystems: {
    npm: { manifest: string; lockfile: string; allowedRegistries: string[] };
  };
  sources: {
    npmAudit: boolean;
    githubAdvisoryDatabase: boolean;
    dependabotAlerts: boolean;
    osvScanner: { enabled: boolean; reportPath: string };
  };
  severity: { minimum: Severity };
  remediation: {
    allowedUpgradeTypes: ('patch' | 'minor')[];
    minimumReleaseAgeHours: number;
    branch: string;
    commitMessage: string;
    maxDependencyPaths: number;
  };
  analysis: {
    excludedPaths: string[];
    maxFileSizeBytes: number;
    tsconfig: string;
    classification: Record<Exclude<FileClass, 'other'>, string[]>;
  };
  tests: {
    jest: {
      command: string[];
      collectCoverageFrom: string[];
    };
  };
  coverage: {
    scope: CoverageScope;
    lineThreshold: number;
    branchThreshold: number | null;
    requireAttribution: boolean;
    allowSkippedTests: boolean;
    typeOnlyImportsRequireEvidence: boolean;
    evidenceRequiredFor: FileClass[];
    configurationEvidence: ConfigurationEvidenceRule[];
  };
  validation: {
    commands: ValidationCommandConfig[];
    npmAudit: CheckRequirement;
    auditSignatures: CheckRequirement;
  };
  governance: {
    autoMerge: { enabled: boolean; mergeMethod: 'squash' | 'merge' | 'rebase' };
    majorUpgradeRequired: ReviewPolicy;
    noFixAvailable: ReviewPolicy;
    unresolvedOwnership: ReviewPolicy;
    buildToolUpgrades: ReviewPolicy;
    allowedChangedFiles: string[];
    requiredStatusCheck: string;
  };
  codeowners: {
    fallbackOwners: string[];
    requestReviews: boolean;
    assignOwners: boolean;
  };
  labels: {
    dependencyUpdate: string;
    coverageComplete: string;
    coverageIncomplete: string;
    manualReview: string;
    validationFailed: string;
  };
  reporting: { commentMaxChars: number };
}
