import fs from 'node:fs';
import path from 'node:path';
import type {
  AssociatedTest,
  CommandResult,
  CoverageInput,
  CoverageReport,
  CoverageThresholds,
  FileClass,
  FileCoverage,
  FileCoverageStatus,
  FileMetrics,
  ImpactReport,
  Limitation,
  TestResultStatus,
  ValidationReport,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { matchesAny } from '../core/glob';
import { extensionOf } from '../core/paths';
import type { RunContext } from '../core/report-io';
import { makeHeader, readReport } from '../core/report-io';
import type { ImportGraph } from '../impact/import-graph';
import { parseIstanbulJson } from './istanbul';
import type { Attribution, JestRun } from './jest-evidence';
import { parseAttribution, parseJestResults, parseListTests, strengthOf } from './jest-evidence';
import { parseCoveragePyJson, parseLcov } from './other-formats';

/** Raw evidence files, each with how it was obtained. */
export interface CoverageEvidence {
  inputs: CoverageInput[];
  metrics: Map<string, FileMetrics> | null;
  malformed: boolean;
  attribution: Attribution | null;
  run: JestRun | null;
  listed: string[] | null;
  commands: CommandResult[];
}

const INSTRUMENTABLE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);
const ALL_STATUSES: FileCoverageStatus[] = [
  'TESTED_AND_COVERED',
  'TESTED_INSUFFICIENT_COVERAGE',
  'NOT_TESTED',
  'TEST_NOT_EXECUTED',
  'TEST_FAILED',
  'COVERAGE_UNAVAILABLE',
  'INSTRUMENTATION_UNSUPPORTED',
];

function attempt<T>(
  inputs: CoverageInput[],
  format: CoverageInput['format'],
  file: string,
  parse: (text: string) => T,
): { value: T | null; malformed: boolean } {
  if (!fs.existsSync(file)) {
    inputs.push({
      format,
      path: path.basename(file),
      status: 'MISSING',
      detail: 'file not produced',
    });
    return { value: null, malformed: false };
  }
  try {
    const value = parse(fs.readFileSync(file, 'utf8'));
    inputs.push({ format, path: path.basename(file), status: 'PARSED', detail: 'ok' });
    return { value, malformed: false };
  } catch (error) {
    inputs.push({
      format,
      path: path.basename(file),
      status: 'MALFORMED',
      detail: (error as Error).message.slice(0, 300),
    });
    return { value: null, malformed: true };
  }
}

/**
 * Loads coverage evidence from an evidence directory produced by `sentinel validate` (paths in it
 * are already repository-relative). Missing and malformed files are recorded, never ignored.
 */
export function loadCoverageEvidence(dir: string): CoverageEvidence {
  const inputs: CoverageInput[] = [];
  let malformed = false;
  let metrics: Map<string, FileMetrics> | null = null;
  const formats: [CoverageInput['format'], string, (t: string) => Map<string, FileMetrics>][] = [
    ['istanbul-json', path.join(dir, 'coverage', 'coverage-final.json'), parseIstanbulJson],
    ['lcov', path.join(dir, 'coverage', 'lcov.info'), (t) => parseLcov(t)],
    ['coverage-py-json', path.join(dir, 'coverage', 'coverage.json'), parseCoveragePyJson],
  ];
  for (const [format, file, parse] of formats) {
    if (metrics && !fs.existsSync(file)) continue;
    const result = attempt(inputs, format, file, parse);
    malformed = malformed || result.malformed;
    metrics = metrics ?? result.value;
  }
  const attribution = attempt(
    inputs,
    'jest-attribution',
    path.join(dir, 'jest-attribution.json'),
    parseAttribution,
  );
  const run = attempt(inputs, 'jest-results', path.join(dir, 'jest-results.json'), (t) =>
    parseJestResults(t, ''),
  );
  const listed = attempt(inputs, 'jest-list-tests', path.join(dir, 'jest-list-tests.json'), (t) =>
    parseListTests(t, ''),
  );
  let commands: CommandResult[] = [];
  const validationFile = path.join(dir, 'validation-report.json');
  if (fs.existsSync(validationFile)) {
    commands = readReport<ValidationReport>(validationFile, 'validation-report').commands;
  }
  return {
    inputs,
    metrics,
    malformed: malformed || attribution.malformed || run.malformed || listed.malformed,
    attribution: attribution.value,
    run: run.value,
    listed: listed.value,
    commands,
  };
}

export interface CoverageAssessmentInput {
  ctx: RunContext;
  config: SentinelConfig;
  impact: ImpactReport;
  importGraph: ImportGraph;
  classes: Map<string, FileClass>;
  evidence: CoverageEvidence;
  repoThresholds: CoverageThresholds | null;
  repoThresholdSource: string | null;
}

function mapResult(status: TestResultStatus | undefined): TestResultStatus {
  return status ?? 'NOT_EXECUTED';
}

/**
 * Establishes, for every impacted production or configuration file, whether an executed and
 * passing automated test produced attributable evidence for it, and classifies it into one of
 * seven statuses. Unknown coverage is never treated as complete.
 */
export function assessCoverage(input: CoverageAssessmentInput): CoverageReport {
  const { config, evidence } = input;
  const limitations: Limitation[] = [
    {
      code: 'ATTRIBUTION_GRANULARITY',
      message: 'Execution attribution is per test file, not per test case',
    },
    {
      code: 'COVERAGE_NOT_BEHAVIOUR',
      message:
        'Coverage shows code was executed by passing tests, not that its behaviour is asserted',
    },
  ];
  const repoLines = input.repoThresholds?.lines ?? null;
  const repoBranches = input.repoThresholds?.branches ?? null;
  const lineThreshold = Math.max(config.coverage.lineThreshold, repoLines ?? 0);
  const branchCandidates = [config.coverage.branchThreshold, repoBranches].filter(
    (n): n is number => n !== null,
  );
  const branchThreshold = branchCandidates.length > 0 ? Math.max(...branchCandidates) : null;
  const stricterRepo =
    (repoLines ?? -1) > config.coverage.lineThreshold ||
    (repoBranches ?? -1) > (config.coverage.branchThreshold ?? -1);
  const thresholdSource = stricterRepo
    ? `repository (${input.repoThresholdSource ?? 'jest config'}) is stricter than policy`
    : 'policy';

  const attributionAvailable = !!evidence.attribution?.available;
  if (!attributionAvailable) {
    limitations.push({
      code: 'ATTRIBUTION_UNAVAILABLE',
      message: evidence.attribution
        ? 'Coverage provider does not report per-test coverage (v8)'
        : 'No per-test attribution evidence',
    });
  }
  const results = new Map((evidence.run?.files ?? []).map((f) => [f.testFile, f]));
  const listed = evidence.listed ? new Set(evidence.listed) : null;
  const executedTests = [...results.keys()].sort();
  const discoveredTests = evidence.listed ?? executedTests;
  const notExecuted = discoveredTests.filter((t) => !results.has(t));

  const testFiles = [...input.classes.entries()]
    .filter(([f, c]) => c === 'test' && INSTRUMENTABLE.has(extensionOf(f)))
    .map(([f]) => f);
  const staticClosure = new Map(testFiles.map((t) => [t, input.importGraph.closureOf(t)]));

  const files: FileCoverage[] = [];
  for (const impacted of input.impact.impactedFiles) {
    if (impacted.fileClass !== 'production' && impacted.fileClass !== 'configuration') continue;
    const file = impacted.file;
    const fileLimitations: Limitation[] = [];
    const lines: string[] = [];

    if (impacted.fileClass === 'configuration') {
      const rules = config.coverage.configurationEvidence.filter((r) => matchesAny(file, r.files));
      const ids = [...new Set(rules.flatMap((r) => r.satisfiedBy))];
      let status: FileCoverageStatus;
      if (ids.length === 0) {
        status = 'COVERAGE_UNAVAILABLE';
        lines.push('no validation command is configured as evidence for this configuration file');
      } else {
        const outcomes = ids.map((id) => ({
          id,
          result: evidence.commands.find((c) => c.id === id),
        }));
        outcomes.forEach((o) => lines.push(`${o.id}: ${o.result?.status ?? 'NOT_RUN'}`));
        if (
          outcomes.some(
            (o) => o.result && o.result.status !== 'PASSED' && o.result.status !== 'NOT_RUN',
          )
        ) {
          status = 'TEST_FAILED';
        } else if (outcomes.some((o) => !o.result || o.result.status === 'NOT_RUN')) {
          status = 'TEST_NOT_EXECUTED';
        } else {
          status = 'TESTED_AND_COVERED';
        }
      }
      files.push({
        file,
        fileClass: impacted.fileClass,
        evidenceRequired: impacted.evidenceRequired,
        status,
        metrics: null,
        associatedTests: [],
        validatedBy: ids,
        evidence: lines,
        limitations: fileLimitations,
      });
      continue;
    }

    const associated = new Map<string, AssociatedTest>();
    for (const [test, closure] of staticClosure) {
      if (!closure.has(file)) continue;
      associated.set(test, {
        testFile: test,
        association: 'STATIC_IMPORT',
        discovered: listed ? listed.has(test) : results.has(test),
        executed: results.has(test),
        result: mapResult(results.get(test)?.status),
        executionStrength: attributionAvailable ? 'NONE' : 'UNKNOWN',
        assertions: {
          passed: results.get(test)?.passed ?? 0,
          failed: results.get(test)?.failed ?? 0,
          skipped: results.get(test)?.skipped ?? 0,
        },
      });
    }
    for (const test of evidence.attribution?.tests ?? []) {
      const hit = test.files.find((f) => f.file === file);
      if (!hit) continue;
      const existing = associated.get(test.testFile);
      const strength = strengthOf(hit);
      associated.set(test.testFile, {
        testFile: test.testFile,
        association: existing ? 'BOTH' : 'EXECUTION',
        discovered: listed ? listed.has(test.testFile) : true,
        // Attribution only records test files that ran.
        executed: true,
        result: mapResult(
          results.get(test.testFile)?.status ??
            (test.status === 'passed' ? 'PASSED' : test.status === 'failed' ? 'FAILED' : 'ERROR'),
        ),
        executionStrength: strength,
        assertions: { passed: test.passed, failed: test.failed, skipped: test.skipped },
      });
    }
    const tests = [...associated.values()].sort((a, b) => a.testFile.localeCompare(b.testFile));
    const metrics = evidence.metrics?.get(file) ?? null;
    const exercising = tests.filter(
      (t) => t.executed && t.result === 'PASSED' && t.executionStrength === 'EXERCISED',
    );
    const loadedOnly = tests.filter((t) => t.executionStrength === 'LOADED_ONLY');
    const skipped = tests.filter((t) => t.assertions.skipped > 0 || t.result === 'SKIPPED');
    if (skipped.length > 0 && !config.coverage.allowSkippedTests) {
      fileLimitations.push({
        code: 'ASSOCIATED_TESTS_SKIPPED',
        message: `skipped tests in ${skipped.map((t) => t.testFile).join(', ')}`,
      });
    }

    let status: FileCoverageStatus;
    const instrumentable =
      INSTRUMENTABLE.has(extensionOf(file)) &&
      matchesAny(file, config.tests.jest.collectCoverageFrom);
    if (!instrumentable) {
      status = 'INSTRUMENTATION_UNSUPPORTED';
      lines.push(
        `${extensionOf(file) || 'this file type'} is not instrumented by the configured ` +
          'coverage (tests.jest.collectCoverageFrom)',
      );
    } else if (!evidence.metrics) {
      status = 'COVERAGE_UNAVAILABLE';
      lines.push(
        evidence.malformed ? 'coverage report is malformed' : 'coverage report is missing',
      );
    } else if (tests.some((t) => t.result === 'FAILED' || t.result === 'ERROR')) {
      status = 'TEST_FAILED';
      lines.push(
        `failing associated tests: ${tests
          .filter((t) => t.result === 'FAILED' || t.result === 'ERROR')
          .map((t) => t.testFile)
          .join(', ')}`,
      );
    } else if (
      tests.length > 0 &&
      tests.every((t) => !t.executed || t.result === 'SKIPPED' || t.result === 'NOT_EXECUTED')
    ) {
      status = 'TEST_NOT_EXECUTED';
      lines.push(
        'associated tests were discovered but not executed: ' +
          tests.map((t) => t.testFile).join(', '),
      );
    } else if (!metrics) {
      status = 'COVERAGE_UNAVAILABLE';
      lines.push('file is absent from the coverage report');
    } else if (
      (attributionAvailable && exercising.length === 0) ||
      (!attributionAvailable && metrics.lines.covered === 0)
    ) {
      status = 'NOT_TESTED';
      lines.push(
        loadedOnly.length > 0
          ? `only loaded (no function called) by ${loadedOnly.map((t) => t.testFile).join(', ')}`
          : 'no passing test executed this file',
      );
    } else if (
      metrics.lines.pct < lineThreshold ||
      (branchThreshold !== null &&
        metrics.branches.total > 0 &&
        metrics.branches.pct < branchThreshold)
    ) {
      status = 'TESTED_INSUFFICIENT_COVERAGE';
    } else {
      status = 'TESTED_AND_COVERED';
    }
    if (metrics) {
      const { lines: l, branches: b } = metrics;
      const threshold =
        branchThreshold !== null
          ? `${lineThreshold}% lines / ${branchThreshold}% branches`
          : `${lineThreshold}% lines`;
      lines.unshift(
        `lines ${l.covered}/${l.total} (${l.pct}%), ` +
          `branches ${b.covered}/${b.total} (${b.pct}%), threshold ${threshold}`,
      );
    }
    exercising.forEach((t) =>
      lines.push(`exercised by ${t.testFile} (${t.assertions.passed} passing assertions)`),
    );
    files.push({
      file,
      fileClass: impacted.fileClass,
      evidenceRequired: impacted.evidenceRequired,
      status,
      metrics,
      associatedTests: tests,
      validatedBy: [],
      evidence: lines,
      limitations: fileLimitations,
    });
  }

  const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    FileCoverageStatus,
    number
  >;
  for (const f of files.filter((x) => x.evidenceRequired)) byStatus[f.status] += 1;

  return {
    ...makeHeader(input.ctx, 'coverage-report', limitations),
    policy: {
      lineThreshold,
      branchThreshold,
      thresholdSource,
      scope: config.coverage.scope,
      allowSkippedTests: config.coverage.allowSkippedTests,
      requireAttribution: config.coverage.requireAttribution,
    },
    inputs: evidence.inputs,
    attribution: {
      available: attributionAvailable,
      granularity: attributionAvailable ? 'test-file' : 'none',
      detail: attributionAvailable
        ? `${evidence.attribution?.tests.length ?? 0} test files attributed`
        : 'unavailable',
    },
    tests: { discovered: [...discoveredTests].sort(), executed: executedTests, notExecuted },
    files: files.sort((a, b) => a.file.localeCompare(b.file)),
    summary: {
      evaluated: files.length,
      requiringEvidence: files.filter((f) => f.evidenceRequired).length,
      byStatus,
    },
  };
}
