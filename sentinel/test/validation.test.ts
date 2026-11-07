import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import type { ValidationReport } from '../src/contracts/types';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import type { SentinelConfig } from '../src/config/types';
import { assertReport, readReport } from '../src/core/report-io';
import { loadCoverageEvidence } from '../src/coverage/coverage-intelligence';
import { relativiseLcov, runValidation } from '../src/validation/runner';
import { fixturePath, removeDir, testContext } from './helpers';

const PROJECT = fixturePath('jest-project');
const FAKE_NPM = fixturePath('fake-npm', 'npm.js');

describe('validation runner', () => {
  let work: string;
  let report: ValidationReport;
  let evidence: string;

  beforeAll(async () => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-validate-'));
    evidence = path.join(work, 'evidence');
    const reporter = path.join(work, 'attribution-reporter.js');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/coverage/attribution-reporter.ts'),
      'utf8',
    );
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
    const scenario = path.join(work, 'npm-scenario.json');
    fs.writeFileSync(scenario, JSON.stringify({ commands: [{ match: 'ls', stdout: '{}' }] }));
    const config: SentinelConfig = {
      ...DEFAULT_CONFIG,
      tests: {
        jest: {
          command: [
            process.execPath,
            require.resolve('jest/bin/jest'),
            '--config',
            path.join(PROJECT, 'jest.config.js'),
            '--ci',
          ],
          collectCoverageFrom: ['src/**/*.js'],
        },
      },
      validation: {
        commands: [
          {
            id: 'unit-tests',
            kind: 'jest',
            category: 'test',
            run: [],
            env: {},
            required: true,
            timeoutMinutes: 5,
          },
          {
            id: 'build',
            kind: 'command',
            category: 'build',
            run: [process.execPath, '-e', 'console.log("built " + process.env.BUILD_MODE)'],
            env: { BUILD_MODE: 'production' },
            required: true,
            timeoutMinutes: 1,
          },
          {
            id: 'lint',
            kind: 'command',
            category: 'lint',
            run: [process.execPath, '-e', 'console.error("2 problems"); process.exit(1)'],
            env: {},
            required: false,
            timeoutMinutes: 1,
          },
        ],
        npmAudit: 'disabled',
        auditSignatures: 'disabled',
      },
    };
    const env: NodeJS.ProcessEnv = { ...process.env, FAKE_NPM_SCENARIO: scenario };
    delete env.JEST_WORKER_ID;
    report = await runValidation({
      root: PROJECT,
      ctx: testContext(),
      config,
      env,
      evidenceDir: evidence,
      reporterPath: reporter,
      npm: [process.execPath, FAKE_NPM],
    });
    assertReport(report);
  }, 180_000);

  afterAll(() => removeDir(work));

  it('runs every command and records its outcome', () => {
    expect(report.commands.map((c) => `${c.id}:${c.kind}:${c.status}:${c.required}`)).toEqual([
      'unit-tests:jest:FAILED:true',
      'build:command:PASSED:true',
      'lint:command:FAILED:false',
      'installed-tree:lockfile-check:PASSED:true',
    ]);
    expect(report.commands[1].outputTail).toContain('built production');
    expect(report.commands[0].argv.join(' ')).not.toMatch(/\/tmp\/|sentinel-validate-/);
    expect(report.commands[0].argv).toContain(
      '--reporters=<sentinel>/coverage/attribution-reporter.js',
    );
    expect(report.summary).toEqual({
      requiredPassed: false,
      failedRequired: ['unit-tests'],
      notRunRequired: [],
    });
  });

  it("summarises the test run from Jest's own results", () => {
    expect(report.tests).toMatchObject({
      framework: 'jest',
      discovered: 4,
      executedFiles: 4,
      failed: 1,
      skipped: 1,
      success: false,
    });
  });

  it('writes repository-relative evidence that the coverage stage can read back', () => {
    const loaded = loadCoverageEvidence(evidence);
    expect(loaded.inputs.filter((i) => i.status !== 'PARSED')).toEqual([]);
    expect([...(loaded.metrics?.keys() ?? [])].sort()).toEqual([
      'src/broken.js',
      'src/data.js',
      'src/format.js',
      'src/math.js',
      'src/partial.js',
      'src/untested.js',
    ]);
    expect(loaded.attribution?.tests.map((t) => t.testFile)).toEqual([
      'tests/broken.test.js',
      'tests/loaded.test.js',
      'tests/math.test.js',
      'tests/skipped.test.js',
    ]);
    expect(loaded.listed).toEqual([
      'tests/broken.test.js',
      'tests/loaded.test.js',
      'tests/math.test.js',
      'tests/skipped.test.js',
    ]);
    expect(loaded.commands.map((c) => c.id)).toContain('unit-tests');
    const text = fs.readFileSync(path.join(evidence, 'coverage', 'coverage-final.json'), 'utf8');
    expect(text).not.toContain(PROJECT);
    expect(readReport(path.join(evidence, 'validation-report.json'), 'validation-report')).toEqual(
      report,
    );
    expect(fs.readdirSync(path.join(evidence, 'logs')).sort()).toEqual([
      'build.log',
      'lint.log',
      'unit-tests.log',
    ]);
  });

  it('drops LCOV records for files outside the repository', () => {
    const lcov =
      'SF:/repo/src/a.js\nLF:1\nLH:1\nend_of_record\n' +
      'SF:/elsewhere/b.js\nLF:1\nLH:0\nend_of_record\n';
    expect(relativiseLcov(lcov, '/repo')).toBe('SF:src/a.js\nLF:1\nLH:1\nend_of_record\n');
  });
});
