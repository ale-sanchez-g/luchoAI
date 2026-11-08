import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import type { CoverageReport, FileClass, ImpactReport, ImpactedFile } from '../src/contracts/types';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import type { SentinelConfig } from '../src/config/types';
import { runCommand } from '../src/core/exec';
import { assertReport, makeHeader } from '../src/core/report-io';
import type { CoverageEvidence } from '../src/coverage/coverage-intelligence';
import { assessCoverage, loadCoverageEvidence } from '../src/coverage/coverage-intelligence';
import {
  CoverageFormatError,
  parseIstanbulJson,
  relativiseIstanbul,
} from '../src/coverage/istanbul';
import {
  normaliseJestResults,
  normaliseListTests,
  parseAttribution,
  parseJestResults,
  strengthOf,
} from '../src/coverage/jest-evidence';
import { parseCoveragePyJson, parseLcov } from '../src/coverage/other-formats';
import { ImportGraph } from '../src/impact/import-graph';
import { parseModule } from '../src/usage/ast-imports';
import { LocalResolver } from '../src/usage/module-resolution';
import { fixturePath, removeDir, testContext } from './helpers';

const PROJECT = fixturePath('jest-project');

function impactedFile(
  file: string,
  fileClass: FileClass = 'production',
  evidenceRequired = true,
): ImpactedFile {
  return {
    file,
    fileClass,
    impactKinds: ['DIRECT'],
    packages: ['pkg'],
    confidence: 'CONFIRMED',
    traces: [
      [{ from: 'package:pkg', to: file, relationship: 'DIRECT_IMPORT', evidence: `${file}:1` }],
    ],
    evidenceRequired,
    evidenceReason: 'test',
  };
}

function impactReport(files: ImpactedFile[]): ImpactReport {
  return {
    ...makeHeader(testContext(), 'impact-report'),
    coverageScope: 'direct',
    packages: [],
    impactedFiles: files,
  };
}

function graphFor(root: string, files: string[]): ImportGraph {
  const resolver = new LocalResolver(root, new Set(files), null);
  const graph = new ImportGraph();
  for (const file of files.filter((f) => f.endsWith('.js'))) {
    const parsed = parseModule(file, fs.readFileSync(path.join(root, file), 'utf8'));
    for (const ref of parsed.references) {
      const target = resolver.resolve(file, ref.specifier).file;
      if (target)
        graph.add({ from: file, to: target, typeOnly: false, line: ref.line, text: ref.text });
    }
  }
  return graph;
}

const projectConfig: SentinelConfig = {
  ...DEFAULT_CONFIG,
  tests: { jest: { command: [], collectCoverageFrom: ['src/**/*.js'] } },
};

describe('coverage intelligence on a real Jest run', () => {
  let evidenceDir: string;
  let report: CoverageReport;
  const byFile = (file: string) => report.files.find((f) => f.file === file);

  beforeAll(async () => {
    evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-evidence-'));
    // Load the reporter exactly as CI does, but from a fresh transpile of the source.
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/coverage/attribution-reporter.ts'),
      'utf8',
    );
    const reporter = path.join(evidenceDir, 'attribution-reporter.js');
    fs.writeFileSync(
      reporter,
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
    );
    const jest = require.resolve('jest/bin/jest');
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      SENTINEL_ATTRIBUTION_FILE: path.join(evidenceDir, 'jest-attribution.json'),
    };
    delete env.JEST_WORKER_ID;
    const config = path.join(PROJECT, 'jest.config.js');
    const run = await runCommand(
      [
        process.execPath,
        jest,
        '--config',
        config,
        '--ci',
        '--coverage',
        '--coverageReporters=json',
        `--coverageDirectory=${path.join(evidenceDir, 'raw-coverage')}`,
        '--json',
        `--outputFile=${path.join(evidenceDir, 'raw-results.json')}`,
        '--reporters=default',
        `--reporters=${reporter}`,
      ],
      { cwd: PROJECT, env, timeoutMs: 120_000 },
    );
    expect(run.exitCode).toBe(1); // tests/broken.test.js fails on purpose
    const list = await runCommand(
      [process.execPath, jest, '--config', config, '--listTests', '--json'],
      { cwd: PROJECT, env, timeoutMs: 60_000 },
    );

    fs.mkdirSync(path.join(evidenceDir, 'coverage'));
    const rawCoverage = JSON.parse(
      fs.readFileSync(path.join(evidenceDir, 'raw-coverage', 'coverage-final.json'), 'utf8'),
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'coverage', 'coverage-final.json'),
      JSON.stringify(relativiseIstanbul(rawCoverage, PROJECT)),
    );
    const rawResults = JSON.parse(
      fs.readFileSync(path.join(evidenceDir, 'raw-results.json'), 'utf8'),
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'jest-results.json'),
      JSON.stringify(normaliseJestResults(rawResults, PROJECT)),
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'jest-list-tests.json'),
      JSON.stringify(normaliseListTests(JSON.parse(list.stdout), PROJECT)),
    );

    const files = [
      'src/math.js',
      'src/partial.js',
      'src/data.js',
      'src/format.js',
      'src/untested.js',
      'src/broken.js',
      'tests/math.test.js',
      'tests/loaded.test.js',
      'tests/skipped.test.js',
      'tests/broken.test.js',
    ];
    const classes = new Map<string, FileClass>(
      files.map((f) => [f, f.startsWith('tests/') ? 'test' : 'production']),
    );
    report = assessCoverage({
      ctx: testContext(),
      config: projectConfig,
      impact: impactReport(files.filter((f) => f.startsWith('src/')).map((f) => impactedFile(f))),
      importGraph: graphFor(PROJECT, files),
      classes,
      evidence: loadCoverageEvidence(evidenceDir),
      repoThresholds: null,
      repoThresholdSource: null,
    });
    assertReport(report);
  }, 180_000);

  afterAll(() => removeDir(evidenceDir));

  it('attributes execution to the test files that actually ran each module', () => {
    expect(report.attribution).toMatchObject({ available: true, granularity: 'test-file' });
    expect(report.tests.discovered).toEqual([
      'tests/broken.test.js',
      'tests/loaded.test.js',
      'tests/math.test.js',
      'tests/skipped.test.js',
    ]);
    expect(report.tests.notExecuted).toEqual([]);
    const math = byFile('src/math.js');
    expect(math?.status).toBe('TESTED_AND_COVERED');
    expect(
      math?.associatedTests.map(
        (t) => `${t.testFile}:${t.association}:${t.executionStrength}:${t.result}`,
      ),
    ).toEqual([
      'tests/math.test.js:BOTH:EXERCISED:PASSED',
      'tests/skipped.test.js:BOTH:LOADED_ONLY:PASSED',
    ]);
    expect(math?.limitations.map((l) => l.code)).toEqual(['ASSOCIATED_TESTS_SKIPPED']);
  });

  it('does not count a module that was only imported as tested', () => {
    expect(byFile('src/format.js')?.status).toBe('NOT_TESTED');
    expect(byFile('src/format.js')?.evidence).toContain(
      'only loaded (no function called) by tests/loaded.test.js',
    );
  });

  it('treats a pure data module loaded by a passing test as exercised', () => {
    expect(byFile('src/data.js')?.status).toBe('TESTED_AND_COVERED');
  });

  it('flags tested files below the threshold, untested files and failing tests', () => {
    expect(byFile('src/partial.js')).toMatchObject({ status: 'TESTED_INSUFFICIENT_COVERAGE' });
    expect(byFile('src/partial.js')?.metrics?.lines.pct).toBeLessThan(80);
    expect(byFile('src/untested.js')).toMatchObject({ status: 'NOT_TESTED', associatedTests: [] });
    expect(byFile('src/broken.js')?.status).toBe('TEST_FAILED');
    expect(report.summary.byStatus).toMatchObject({
      TESTED_AND_COVERED: 2,
      TESTED_INSUFFICIENT_COVERAGE: 1,
      NOT_TESTED: 2,
      TEST_FAILED: 1,
    });
  });
});

describe('coverage statuses that need synthetic evidence', () => {
  const graph = new ImportGraph();
  graph.add({
    from: 'src/__tests__/a.test.ts',
    to: 'src/a.ts',
    typeOnly: false,
    line: 1,
    text: "import './a'",
  });
  const classes = new Map<string, FileClass>([
    ['src/__tests__/a.test.ts', 'test'],
    ['src/a.ts', 'production'],
  ]);
  const base: CoverageEvidence = {
    inputs: [],
    metrics: new Map(),
    malformed: false,
    attribution: { provider: 'babel', available: true, tests: [] },
    run: {
      success: true,
      totals: { total: 0, passed: 0, failed: 0, skipped: 0, todo: 0, runtimeErrors: 0 },
      durationMs: 0,
      files: [],
    },
    listed: ['src/__tests__/a.test.ts'],
    commands: [],
  };
  const assess = (
    evidence: CoverageEvidence,
    files: ImpactedFile[],
    config: SentinelConfig = DEFAULT_CONFIG,
    repo: number | null = null,
  ) =>
    assessCoverage({
      ctx: testContext(),
      config,
      impact: impactReport(files),
      importGraph: graph,
      classes,
      evidence,
      repoThresholds:
        repo === null ? null : { lines: repo, branches: null, functions: null, statements: null },
      repoThresholdSource: repo === null ? null : 'jest.config.js',
    });

  it('reports missing coverage as unavailable, never as covered', () => {
    expect(assess({ ...base, metrics: null }, [impactedFile('src/a.ts')]).files[0].status).toBe(
      'COVERAGE_UNAVAILABLE',
    );
  });

  it('reports files the coverage tool cannot instrument', () => {
    expect(assess(base, [impactedFile('src/app/globals.css')]).files[0].status).toBe(
      'INSTRUMENTATION_UNSUPPORTED',
    );
  });

  it('reports discovered tests that never ran', () => {
    const result = assess(base, [impactedFile('src/a.ts')]);
    expect(result.files[0].status).toBe('TEST_NOT_EXECUTED');
    expect(result.tests.notExecuted).toEqual(['src/__tests__/a.test.ts']);
  });

  it('validates configuration files through the commands mapped to them', () => {
    const config: SentinelConfig = {
      ...DEFAULT_CONFIG,
      coverage: {
        ...DEFAULT_CONFIG.coverage,
        configurationEvidence: [{ files: ['next.config.ts'], satisfiedBy: ['unit-tests'] }],
      },
    };
    const command = {
      id: 'unit-tests',
      kind: 'jest' as const,
      category: 'test' as const,
      argv: [],
      required: true,
      exitCode: 0,
      durationMs: 1,
      startedAt: null,
      outputTail: '',
      artifacts: [],
    };
    const files = [
      impactedFile('next.config.ts', 'configuration'),
      impactedFile('eslint.config.mjs', 'configuration'),
    ];
    const passed = assess({ ...base, commands: [{ ...command, status: 'PASSED' }] }, files, config);
    expect(passed.files.map((f) => `${f.file}:${f.status}`)).toEqual([
      'eslint.config.mjs:COVERAGE_UNAVAILABLE',
      'next.config.ts:TESTED_AND_COVERED',
    ]);
    const failed = assess({ ...base, commands: [{ ...command, status: 'FAILED' }] }, files, config);
    expect(failed.files[1].status).toBe('TEST_FAILED');
    expect(assess(base, files, config).files[1].status).toBe('TEST_NOT_EXECUTED');
  });

  it('applies the repository threshold when it is stricter than the policy', () => {
    const report = assess(base, [], DEFAULT_CONFIG, 90);
    expect(report.policy.lineThreshold).toBe(90);
    expect(report.policy.thresholdSource).toBe(
      'repository (jest.config.js) is stricter than policy',
    );
    expect(assess(base, [], DEFAULT_CONFIG, 60).policy.lineThreshold).toBe(80);
  });
});

describe('jest results parsing', () => {
  it("derives each file outcome from its assertions, not Jest's file status string", () => {
    const results = {
      success: false,
      numTotalTests: 6,
      startTime: 0,
      testResults: [
        {
          name: 'a.test.ts',
          status: 'focused',
          assertionResults: [{ status: 'pending' }, { status: 'passed' }],
        },
        { name: 'b.test.ts', status: 'failed', assertionResults: [{ status: 'failed' }] },
        {
          name: 'c.test.ts',
          status: 'failed',
          message: 'Cannot find module',
          assertionResults: [],
        },
        {
          name: 'd.test.ts',
          status: 'pending',
          assertionResults: [{ status: 'todo' }, { status: 'pending' }],
        },
      ],
    };
    const run = parseJestResults(JSON.stringify(results), '');
    expect(run.files.map((f) => `${f.testFile}:${f.status}:${f.skipped}:${f.todo}`)).toEqual([
      'a.test.ts:PASSED:1:0',
      'b.test.ts:FAILED:0:0',
      'c.test.ts:ERROR:0:0',
      'd.test.ts:SKIPPED:1:1',
    ]);
  });
});

describe('coverage parsers', () => {
  it('parses LCOV and refuses malformed or absolute records', () => {
    const lcov =
      'TN:\nSF:/repo/src/a.ts\nFNF:2\nFNH:1\nDA:1,1\nDA:2,0\n' +
      'LF:2\nLH:1\nBRF:2\nBRH:1\nend_of_record\n';
    expect(parseLcov(lcov, '/repo').get('src/a.ts')).toMatchObject({
      lines: { covered: 1, total: 2, pct: 50 },
      functions: { pct: 50 },
    });
    expect(() => parseLcov(lcov)).toThrow(/not a repository-relative path/);
    expect(() => parseLcov('SF:a.ts\nLF:x\nend_of_record')).toThrow(CoverageFormatError);
    expect(() => parseLcov('SF:a.ts\nLF:1\n')).toThrow(/no end_of_record/);
  });

  it('parses Coverage.py JSON', () => {
    const json = JSON.stringify({
      files: {
        'app/x.py': {
          summary: { covered_lines: 9, num_statements: 10, num_branches: 4, covered_branches: 2 },
        },
      },
    });
    expect(parseCoveragePyJson(json).get('app/x.py')).toMatchObject({
      lines: { pct: 90 },
      branches: { pct: 50 },
    });
  });

  it('rejects Istanbul data that is malformed or not repository-relative', () => {
    expect(() => parseIstanbulJson('[]')).toThrow(CoverageFormatError);
    expect(() => parseIstanbulJson(JSON.stringify({ 'src/a.ts': { s: {} } }))).toThrow(
      /not Istanbul/,
    );
    const entry = { statementMap: {}, s: {}, fnMap: {}, f: {}, branchMap: {}, b: {} };
    expect(() => parseIstanbulJson(JSON.stringify({ '/abs/a.ts': entry }))).toThrow(
      /repository-relative/,
    );
  });

  it('validates attribution evidence as untrusted input', () => {
    expect(() =>
      parseAttribution(
        JSON.stringify({
          schemaVersion: '1.0.0',
          provider: 'babel',
          available: true,
          tests: [{ testFile: '../../etc/passwd' }],
        }),
      ),
    ).toThrow(CoverageFormatError);
    expect(
      strengthOf({
        file: 'a',
        statements: [3, 5],
        functions: [0, 2],
        branches: [0, 0],
        lines: [3, 5],
      }),
    ).toBe('LOADED_ONLY');
    expect(
      strengthOf({
        file: 'a',
        statements: [3, 3],
        functions: [0, 0],
        branches: [0, 0],
        lines: [3, 3],
      }),
    ).toBe('EXERCISED');
    expect(strengthOf(undefined)).toBe('NONE');
  });
});
