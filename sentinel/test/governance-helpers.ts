import type {
  CoverageReport,
  DependencyUsageReport,
  ImpactReport,
  RemediationReport,
  ValidationReport,
  VulnerabilityReport,
} from '../src/contracts/types';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import type { SentinelConfig } from '../src/config/types';
import { digestOf } from '../src/core/hash';
import { makeHeader } from '../src/core/report-io';
import type { GovernanceInput } from '../src/governance/decision';
import { testContext } from './helpers';

export const KEY = 'GHSA-2222-3333-4444|lib';
export const SHA = 'a'.repeat(40);

export const GREEN_CONFIG: SentinelConfig = {
  ...DEFAULT_CONFIG,
  coverage: { ...DEFAULT_CONFIG.coverage, configurationEvidence: [] },
};

/** A complete, all-passing governance input; tests change one fact at a time. */
export function greenInput(): GovernanceInput {
  const ctx = testContext();
  const vulnerabilities: VulnerabilityReport = {
    ...makeHeader(ctx, 'vulnerability-report'),
    ecosystem: 'npm',
    lockfile: { path: 'package-lock.json', lockfileVersion: 3, packages: 10 },
    sources: [{ source: 'npm-audit', status: 'OK', detail: 'ok', findings: 1 }],
    summary: {
      total: 1,
      bySeverity: { critical: 0, high: 1, moderate: 0, low: 0, info: 0 },
      direct: 1,
      transitive: 0,
      inScope: 1,
      byFixStatus: {
        FIXABLE: 1,
        MAJOR_UPGRADE_REQUIRED: 0,
        PARENT_UPGRADE_REQUIRED: 0,
        NO_FIX_AVAILABLE: 0,
        UNKNOWN: 0,
      },
    },
    vulnerabilities: [
      {
        key: KEY,
        ids: { ghsa: 'GHSA-2222-3333-4444', cve: ['CVE-2026-0001'], aliases: [] },
        title: 'lib prototype pollution',
        url: 'https://github.com/advisories/GHSA-2222-3333-4444',
        severity: 'high',
        cvss: { score: 7.5, vector: null },
        cwe: [],
        package: 'lib',
        vulnerableRange: '<1.2.0',
        sources: ['npm-audit'],
        instances: [
          {
            location: 'node_modules/lib',
            version: '1.1.0',
            direct: true,
            dev: false,
            optional: false,
            dependencyPaths: [['app@1.0.0', 'lib@1.1.0']],
            pathsTruncated: false,
            requiredBy: [],
            fix: {
              status: 'FIXABLE',
              fixedVersion: '1.2.0',
              targetVersion: '1.2.0',
              upgradeType: 'minor',
              strategy: 'direct-update',
              parent: null,
              reason: 'lib 1.1.0 -> 1.2.0',
              npmSuggestion: null,
              introduces: [],
            },
          },
        ],
        isDirect: true,
        scope: 'production',
        fixStatus: 'FIXABLE',
        inScope: true,
        priority: 1,
      },
    ],
  };
  const usage: DependencyUsageReport = {
    ...makeHeader(ctx, 'dependency-usage-report'),
    scannedFiles: 3,
    skippedFiles: [],
    parseErrors: [],
    dynamicImports: [],
    packages: [
      {
        package: 'lib',
        status: 'USED_DIRECTLY',
        completeness: 'COMPLETE',
        viaDirectDependencies: [],
        binaries: [],
        references: [
          {
            file: 'src/a.ts',
            line: 1,
            column: 1,
            relationship: 'DIRECT_IMPORT',
            confidence: 'CONFIRMED',
            specifier: 'lib',
            referencedPackage: 'lib',
            detector: 'ast',
            fileClass: 'production',
            evidence: "import lib from 'lib'",
          },
        ],
        limitations: [],
      },
    ],
  };
  const impact: ImpactReport = {
    ...makeHeader(ctx, 'impact-report'),
    coverageScope: 'direct',
    packages: [
      {
        package: 'lib',
        vulnerabilityKeys: [KEY],
        usageStatus: 'USED_DIRECTLY',
        directFiles: ['src/a.ts'],
        transitiveFiles: [],
        typeOnlyFiles: [],
        dependentModules: [],
        entryPoints: ['src/a.ts'],
        components: ['src'],
        configurationFiles: [],
        ciFiles: [],
        testFiles: [],
        downstreamGraph: {
          nodes: ['package:lib', 'src/a.ts'],
          edges: [['package:lib', 'src/a.ts']],
        },
        risk: { level: 'LOW', signals: [] },
        unknowns: [],
      },
    ],
    impactedFiles: [
      {
        file: 'src/a.ts',
        fileClass: 'production',
        impactKinds: ['DIRECT'],
        packages: ['lib'],
        confidence: 'CONFIRMED',
        traces: [
          [
            {
              from: 'package:lib',
              to: 'src/a.ts',
              relationship: 'DIRECT_IMPORT',
              evidence: 'src/a.ts:1',
            },
          ],
        ],
        evidenceRequired: true,
        evidenceReason: 'references the vulnerable package directly',
      },
    ],
  };
  const coverage: CoverageReport = {
    ...makeHeader(ctx, 'coverage-report'),
    policy: {
      lineThreshold: 80,
      branchThreshold: null,
      thresholdSource: 'policy',
      scope: 'direct',
      allowSkippedTests: false,
      requireAttribution: true,
    },
    inputs: [
      { format: 'istanbul-json', path: 'coverage-final.json', status: 'PARSED', detail: 'ok' },
    ],
    attribution: { available: true, granularity: 'test-file', detail: '1 test file attributed' },
    tests: {
      discovered: ['src/__tests__/a.test.ts'],
      executed: ['src/__tests__/a.test.ts'],
      notExecuted: [],
    },
    files: [
      {
        file: 'src/a.ts',
        fileClass: 'production',
        evidenceRequired: true,
        status: 'TESTED_AND_COVERED',
        metrics: {
          lines: { covered: 9, total: 10, pct: 90 },
          statements: { covered: 9, total: 10, pct: 90 },
          functions: { covered: 2, total: 2, pct: 100 },
          branches: { covered: 2, total: 2, pct: 100 },
        },
        associatedTests: [
          {
            testFile: 'src/__tests__/a.test.ts',
            association: 'BOTH',
            discovered: true,
            executed: true,
            result: 'PASSED',
            executionStrength: 'EXERCISED',
            assertions: { passed: 3, failed: 0, skipped: 0 },
          },
        ],
        validatedBy: [],
        evidence: ['exercised by src/__tests__/a.test.ts'],
        limitations: [],
      },
    ],
    summary: {
      evaluated: 1,
      requiringEvidence: 1,
      byStatus: {
        TESTED_AND_COVERED: 1,
        TESTED_INSUFFICIENT_COVERAGE: 0,
        NOT_TESTED: 0,
        TEST_NOT_EXECUTED: 0,
        TEST_FAILED: 0,
        COVERAGE_UNAVAILABLE: 0,
        INSTRUMENTATION_UNSUPPORTED: 0,
      },
    },
  };
  const snapshot = (keys: string[]) => ({
    status: 'OK' as const,
    advisoryKeys: keys,
    bySeverity: { critical: 0, high: keys.length, moderate: 0, low: 0, info: 0 },
    severities: Object.fromEntries(keys.map((k) => [k, 'high' as const])),
  });
  const remediation: RemediationReport = {
    ...makeHeader(ctx, 'remediation-report'),
    mode: 'verify',
    baseSha: 'b'.repeat(40),
    headSha: SHA,
    actions: [],
    escalations: [],
    changes: [
      {
        name: 'lib',
        location: 'node_modules/lib',
        changeType: 'updated',
        from: '1.1.0',
        to: '1.2.0',
        upgradeType: 'minor',
        relation: 'targeted',
        relatedTo: [KEY],
        dev: false,
        hasInstallScript: false,
        license: 'MIT',
        previousLicense: 'MIT',
      },
    ],
    manifestChanges: [
      { field: 'dependencies', package: 'lib', from: '^1.1.0', to: '^1.2.0', allowed: true },
    ],
    changedFiles: ['package-lock.json', 'package.json'],
    verification: {
      before: snapshot([KEY]),
      after: snapshot([]),
      targeted: [KEY],
      resolved: [KEY],
      remaining: [],
      introduced: [],
    },
    integrity: {
      lockfileConsistent: 'PASS',
      lockfileDetail: 'ok',
      registry: { allowed: ['https://registry.npmjs.org/'], violations: [] },
      missingIntegrity: [],
      signatures: { status: 'NOT_RUN', invalid: [], missing: [], detail: 'n/a' },
    },
    compatibility: [],
    patch: { file: null, sha256: null },
  };
  const command = (
    id: string,
    category: 'test' | 'build' | 'security' | 'integrity',
    kind: 'jest' | 'command' | 'npm-audit' | 'audit-signatures' | 'lockfile-check',
  ) => ({
    id,
    kind,
    category,
    argv: [],
    required: true,
    status: 'PASSED' as const,
    exitCode: 0,
    durationMs: 1,
    startedAt: null,
    outputTail: '',
    artifacts: [],
  });
  const validation: ValidationReport = {
    ...makeHeader(ctx, 'validation-report'),
    commands: [
      command('unit-tests', 'test', 'jest'),
      command('build', 'build', 'command'),
      command('npm-audit', 'security', 'npm-audit'),
      command('audit-signatures', 'security', 'audit-signatures'),
      command('installed-tree', 'integrity', 'lockfile-check'),
    ],
    tests: {
      framework: 'jest',
      discovered: 1,
      executedFiles: 1,
      total: 3,
      passed: 3,
      failed: 0,
      skipped: 0,
      todo: 0,
      runtimeErrors: 0,
      durationMs: 10,
      success: true,
      files: [],
    },
    summary: { requiredPassed: true, failedRequired: [], notRunRequired: [] },
  };
  return {
    ctx,
    config: GREEN_CONFIG,
    configDigest: digestOf(GREEN_CONFIG),
    vulnerabilities,
    usage,
    impact,
    coverage,
    remediation,
    validation,
    signatures: {
      status: 'VERIFIED',
      invalid: [],
      missing: [],
      detail: 'all registry signatures verified',
    },
    ownership: {
      codeownersFile: '.github/CODEOWNERS',
      owners: ['@org/team'],
      users: [],
      teams: ['org/team'],
      emails: [],
      assignments: [
        {
          file: 'src/a.ts',
          owners: ['@org/team'],
          source: 'codeowners',
          rule: '.github/CODEOWNERS:1 *',
        },
      ],
      unresolvedFiles: [],
      fallbackApplied: false,
    },
    pr: {
      number: 7,
      evidenceSha: SHA,
      headSha: SHA,
      liveHeadSha: SHA,
      baseRef: 'main',
      changedFiles: ['package-lock.json', 'package.json'],
    },
    repo: {
      allowAutoMerge: true,
      baseProtected: true,
      requiredChecks: ['Sentinel decision', 'Test'],
      readError: null,
    },
    evidenceJobResult: 'success',
  };
}
