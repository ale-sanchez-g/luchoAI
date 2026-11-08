/**
 * End-to-end scenarios A-I from the Project Sentinel brief. Each one runs the real pull-request
 * evaluation pipeline on a fixture repository: real Jest runs produce the evidence, discovery,
 * usage, impact, remediation verification, coverage intelligence and governance run unchanged,
 * and a stateful GitHub fake records what Sentinel does to the pull request.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import type { MergeDecision } from '../src/contracts/types';
import type { LoadedConfig } from '../src/config/load-config';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import type { SentinelConfig } from '../src/config/types';
import { digestOf } from '../src/core/hash';
import { readReport } from '../src/core/report-io';
import type { PrEvaluationResult, TrustedChecks } from '../src/pipeline/pr-evaluation';
import { evaluatePullRequest } from '../src/pipeline/pr-evaluation';
import { runValidation } from '../src/validation/runner';
import { StaticRegistry } from '../src/vulnerabilities/registry';
import { FakeGitHub } from './fake-github';
import { fixturePath, removeDir, testContext } from './helpers';

const FIXTURE = fixturePath('scenario-app');
const FAKE_NPM = fixturePath('fake-npm', 'npm.js');
const JEST = require.resolve('jest/bin/jest');
const R = 'https://registry.npmjs.org';
const OLD = '2026-01-01T00:00:00.000Z';
const SHA_1 = '1'.repeat(40);
const SHA_2 = '2'.repeat(40);
const LOCK_FILES = ['package-lock.json', 'package.json'];

let work: string;
let reporter: string;
let npmScenario: string;

beforeAll(() => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-scenarios-'));
  reporter = path.join(work, 'attribution-reporter.js');
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
  npmScenario = path.join(work, 'npm.json');
  fs.writeFileSync(npmScenario, JSON.stringify({ commands: [{ match: 'ls', stdout: '{}' }] }));
});

afterAll(() => {
  if (process.env.SENTINEL_KEEP_SCENARIOS) {
    process.stdout.write(`scenario output kept in ${work}\n`);
  } else {
    removeDir(work);
  }
});

interface Advisory {
  pkg: string;
  ghsa: string;
  range: string;
  severity: string;
  id: number;
}

function audit(advisories: Advisory[]): string {
  const vulnerabilities: Record<string, unknown> = {};
  for (const a of advisories) {
    const entry = (vulnerabilities[a.pkg] ?? {
      name: a.pkg,
      severity: a.severity,
      isDirect: true,
      via: [],
      effects: [],
      range: a.range,
      nodes: [`node_modules/${a.pkg}`],
      fixAvailable: true,
    }) as { via: unknown[] };
    entry.via.push({
      source: a.id,
      name: a.pkg,
      dependency: a.pkg,
      title: `${a.pkg} advisory ${a.id}`,
      url: `https://github.com/advisories/${a.ghsa}`,
      severity: a.severity,
      cwe: [],
      cvss: { score: 7.5, vectorString: null },
      range: a.range,
    });
    vulnerabilities[a.pkg] = entry;
  }
  return JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: advisories.length,
        critical: 0,
        total: advisories.length,
      },
    },
  });
}

const VULN_LIB: Advisory = {
  pkg: 'vuln-lib',
  ghsa: 'GHSA-2222-3333-4444',
  range: '<1.0.1',
  severity: 'high',
  id: 1,
};

const registry = new StaticRegistry({
  'vuln-lib': {
    time: { '1.0.0': OLD, '1.0.1': OLD, '2.0.0': OLD },
    versions: { '1.0.0': {}, '1.0.1': {}, '2.0.0': {} },
  },
  'ghost-lib': { time: { '1.0.0': OLD, '1.0.1': OLD }, versions: { '1.0.0': {}, '1.0.1': {} } },
});

function bump(dir: string, pkg: string, version: string): void {
  const lockFile = path.join(dir, 'package-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  lock.packages[`node_modules/${pkg}`] = {
    version,
    resolved: `${R}/${pkg}/-/${pkg}-${version}.tgz`,
    integrity: `sha512-${pkg}${version}`,
    license: 'MIT',
  };
  lock.packages[''].dependencies[pkg] = `^${version}`;
  fs.writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`);
  const manifestFile = path.join(dir, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.dependencies[pkg] = `^${version}`;
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
}

interface Scenario {
  name: string;
  overlay?: Record<string, string>;
  codeowners?: string | null;
  baseAdvisories?: Advisory[];
  headAdvisories?: Advisory[];
  bumps?: [string, string][];
  config?: (c: SentinelConfig) => SentinelConfig;
  changedFiles?: string[];
  headSha?: string;
  evidenceSha?: string;
  mutateEvidence?: (dir: string) => void;
  github?: FakeGitHub;
}

interface ScenarioRun {
  result: PrEvaluationResult;
  decision: MergeDecision;
  github: FakeGitHub;
  outDir: string;
}

async function runScenario(s: Scenario): Promise<ScenarioRun> {
  const root = path.join(work, s.name);
  const trustedDir = path.join(root, 'base');
  const prDir = path.join(root, 'head');
  const evidenceDir = path.join(root, 'evidence');
  const outDir = path.join(root, 'out');
  fs.cpSync(FIXTURE, trustedDir, { recursive: true });
  if (s.codeowners !== null) {
    fs.mkdirSync(path.join(trustedDir, '.github'), { recursive: true });
    fs.writeFileSync(
      path.join(trustedDir, '.github', 'CODEOWNERS'),
      s.codeowners ?? '* @acme/core\n',
    );
  }
  fs.cpSync(trustedDir, prDir, { recursive: true });
  for (const [pkg, version] of s.bumps ?? [['vuln-lib', '1.0.1']]) bump(prDir, pkg, version);
  for (const [file, content] of Object.entries(s.overlay ?? {})) {
    fs.mkdirSync(path.dirname(path.join(prDir, file)), { recursive: true });
    fs.writeFileSync(path.join(prDir, file), content);
  }

  const base = s.config ?? ((c) => c);
  const config = base({
    ...DEFAULT_CONFIG,
    tests: {
      jest: {
        command: [process.execPath, JEST, '--config', path.join(prDir, 'jest.config.js'), '--ci'],
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
      ],
      npmAudit: 'disabled',
      auditSignatures: 'disabled',
    },
  });
  const loaded: LoadedConfig = {
    config,
    digest: digestOf(config),
    source: 'scenario',
    usedDefaults: false,
  };
  const headSha = s.headSha ?? SHA_1;
  const env: NodeJS.ProcessEnv = { ...process.env, FAKE_NPM_SCENARIO: npmScenario };
  delete env.JEST_WORKER_ID;
  await runValidation({
    root: prDir,
    ctx: testContext({
      repository: {
        slug: 'acme/app',
        commitSha: s.evidenceSha ?? headSha,
        ref: 'refs/pull/7/merge',
      },
    }),
    config,
    env,
    evidenceDir,
    reporterPath: reporter,
    npm: [process.execPath, FAKE_NPM],
  });
  s.mutateEvidence?.(evidenceDir);

  const github = s.github ?? new FakeGitHub(headSha, s.changedFiles ?? LOCK_FILES);
  github.state.pr.headSha = headSha;
  github.state.pr.files = s.changedFiles ?? LOCK_FILES;
  const baseLock = fs.readFileSync(path.join(trustedDir, 'package-lock.json'), 'utf8');
  const baseAudit = audit(s.baseAdvisories ?? [VULN_LIB]);
  const headAudit = audit(s.headAdvisories ?? []);
  const checks: TrustedChecks = {
    audit: async (_manifest, lock) => ({
      text: lock === baseLock ? baseAudit : headAudit,
      error: null,
    }),
    lockfile: async () => ({
      status: 'PASS',
      detail: 'npm ls --package-lock-only reports no problems',
    }),
  };
  const result = await evaluatePullRequest({
    ctx: testContext({
      repository: { slug: 'acme/app', commitSha: headSha, ref: 'refs/pull/7/merge' },
    }),
    loaded,
    api: github,
    slug: 'acme/app',
    prNumber: 7,
    prDir,
    trustedDir,
    evidenceDir,
    evidenceJobResult: 'success',
    registry,
    env,
    outDir,
    apply: true,
    runUrl: 'https://github.com/acme/app/actions/runs/1',
    checks,
  });
  return { result, decision: result.decision, github, outDir };
}

const attention = (d: MergeDecision): string[] =>
  d.reasons.filter((r) => r.effect !== 'INFO').map((r) => `${r.effect}:${r.code}`);

describe('scenario A: vulnerable dependency with complete test coverage', () => {
  let run: ScenarioRun;
  beforeAll(async () => {
    run = await runScenario({ name: 'a' });
  }, 120_000);

  it('auto-merges through GitHub auto-merge, pinned to the evaluated commit', () => {
    expect(attention(run.decision)).toEqual([]);
    expect(run.decision.decision).toBe('AUTO_MERGE');
    expect(run.result.prReport?.finalOutcome).toBe('AUTO_MERGE');
    expect(run.github.state.pr.autoMerge).toEqual({ method: 'SQUASH', expectedHeadOid: SHA_1 });
    expect([...run.github.state.labels].sort()).toEqual([
      'security/coverage-complete',
      'security/dependency-update',
    ]);
    expect(run.github.state.reviewers).toEqual([]);
    expect(run.result.exitCode).toBe(0);
  });

  it('records the attributable evidence behind the decision', () => {
    const coverage = readReport<import('../src/contracts/types').CoverageReport>(
      path.join(run.outDir, 'coverage-report.json'),
      'coverage-report',
    );
    expect(coverage.files.find((f) => f.file === 'src/lib/http.js')).toMatchObject({
      status: 'TESTED_AND_COVERED',
      associatedTests: [
        expect.objectContaining({
          testFile: 'tests/http.test.js',
          executionStrength: 'EXERCISED',
          result: 'PASSED',
        }),
      ],
    });
    expect(run.github.state.comments).toHaveLength(1);
    expect(run.github.state.comments[0].body).toContain('<!-- sentinel:decision -->');
    expect(fs.existsSync(path.join(run.outDir, 'execution-summary.json'))).toBe(true);
  });
});

describe('scenario B: one impacted file lacks test coverage', () => {
  it("requires human review and requests that file's CODEOWNERS", async () => {
    const run = await runScenario({
      name: 'b',
      overlay: {
        'src/lib/render.js':
          "const vuln = require('vuln-lib');\n\n" +
          'function render(x) {\n  return vuln.fetch(x);\n}\n\nmodule.exports = { render };\n',
      },
      codeowners: '* @acme/core\n/src/lib/render.js @alice\n',
    });
    expect(run.decision.decision).toBe('HUMAN_REVIEW');
    expect(attention(run.decision)).toEqual(['REVIEW:FILE_NOT_TESTED']);
    expect(run.decision.reasons[0].subjects).toEqual(['src/lib/render.js']);
    expect(run.github.state.reviewers).toEqual([
      { reviewers: ['alice'], team_reviewers: ['core'] },
    ]);
    expect(run.github.state.assignees).toEqual([['alice']]);
    expect(run.github.state.pr.autoMerge).toBeNull();
    expect([...run.github.state.labels].sort()).toEqual([
      'security/coverage-incomplete',
      'security/dependency-update',
      'security/manual-review',
    ]);
  }, 120_000);
});

describe('scenario C: all tests pass but an impacted file has no coverage evidence', () => {
  it('requires human review rather than treating the gap as covered', async () => {
    const run = await runScenario({
      name: 'c',
      overlay: {
        'src/lib/worker.mjs':
          "import vuln from 'vuln-lib';\n\nexport function work(x) {\n  return vuln.fetch(x);\n}\n",
      },
    });
    const validation = readReport<import('../src/contracts/types').ValidationReport>(
      path.join(run.outDir, 'validation-report.json'),
      'validation-report',
    );
    expect(validation.summary.requiredPassed).toBe(true);
    expect(run.decision.decision).toBe('HUMAN_REVIEW');
    expect(attention(run.decision)).toEqual(['REVIEW:FILE_INSTRUMENTATION_UNSUPPORTED']);
    expect(run.decision.reasons[0].subjects).toEqual(['src/lib/worker.mjs']);
  }, 120_000);
});

describe('scenario D: tests fail after remediation', () => {
  it('blocks, fails the check and never enables auto-merge', async () => {
    const run = await runScenario({
      name: 'd',
      overlay: {
        'tests/regression.test.js':
          "jest.mock('vuln-lib', () => ({ fetch: () => 'changed behaviour' }), " +
          '{ virtual: true });\n' +
          "const { get } = require('../src/lib/http');\n\n" +
          "it('keeps the response format', () => {\n" +
          "  expect(get('/a')).toBe('fetched /a');\n});\n",
      },
    });
    expect(run.decision.decision).toBe('BLOCKED');
    expect(attention(run.decision)).toEqual(expect.arrayContaining(['BLOCK:TESTS_FAILED']));
    expect(run.result.exitCode).toBe(1);
    expect(run.github.state.pr.autoMerge).toBeNull();
    expect(run.github.state.labels.has('security/validation-failed')).toBe(true);
  }, 120_000);
});

describe('scenario E: a major-version upgrade is required', () => {
  it('applies the safe fix but requires human review for the major one', async () => {
    const major: Advisory = {
      pkg: 'vuln-lib',
      ghsa: 'GHSA-5555-6666-7777',
      range: '<2.0.0',
      severity: 'high',
      id: 2,
    };
    const run = await runScenario({
      name: 'e',
      baseAdvisories: [VULN_LIB, major],
      headAdvisories: [major],
    });
    expect(run.decision.decision).toBe('HUMAN_REVIEW');
    expect(attention(run.decision)).toEqual(['REVIEW:MAJOR_UPGRADE_REQUIRED']);
    expect(run.decision.reasons[0].message).toContain(
      'lowest fixed version 2.0.0 is a major upgrade from 1.0.0',
    );
    const remediation = readReport<import('../src/contracts/types').RemediationReport>(
      path.join(run.outDir, 'remediation-report.json'),
      'remediation-report',
    );
    expect(remediation.verification).toMatchObject({
      resolved: ['GHSA-2222-3333-4444|vuln-lib'],
      remaining: [],
      introduced: [],
    });
  }, 120_000);
});

describe('scenario F: dependency usage cannot be established', () => {
  it('requires human review instead of assuming the package is unused', async () => {
    const ghost: Advisory = {
      pkg: 'ghost-lib',
      ghsa: 'GHSA-qqqq-rrrr-vvvv',
      range: '<1.0.1',
      severity: 'high',
      id: 3,
    };
    const run = await runScenario({
      name: 'f',
      baseAdvisories: [VULN_LIB, ghost],
      bumps: [
        ['vuln-lib', '1.0.1'],
        ['ghost-lib', '1.0.1'],
      ],
    });
    expect(run.decision.decision).toBe('HUMAN_REVIEW');
    expect(attention(run.decision)).toEqual(['REVIEW:USAGE_UNKNOWN', 'REVIEW:IMPACT_UNKNOWN']);
    expect(run.decision.gates.find((g) => g.id === 'G2')?.status).toBe('UNKNOWN');
  }, 120_000);
});

describe('scenario G: impacted files have different CODEOWNERS', () => {
  it('requests every relevant owner, and the fallback team for unowned files', async () => {
    const run = await runScenario({
      name: 'g',
      overlay: {
        'src/lib/render.js':
          "const vuln = require('vuln-lib');\nmodule.exports = { render: (x) => vuln.fetch(x) };\n",
        'src/lib/upload.js':
          "const vuln = require('vuln-lib');\nmodule.exports = { upload: (x) => vuln.fetch(x) };\n",
      },
      codeowners: '/src/lib/http.js @acme/http-team\n/src/lib/render.js @alice\n',
      config: (c) => ({
        ...c,
        codeowners: { ...c.codeowners, fallbackOwners: ['@acme/security'] },
      }),
    });
    expect(run.decision.decision).toBe('HUMAN_REVIEW');
    const ownership = run.decision.ownership;
    expect(ownership.assignments.map((a) => `${a.file}:${a.source}:${a.owners.join(',')}`)).toEqual(
      [
        'src/lib/http.js:codeowners:@acme/http-team',
        'src/lib/render.js:codeowners:@alice',
        'src/lib/upload.js:fallback:@acme/security',
        'tests/http.test.js:fallback:@acme/security',
      ],
    );
    expect(run.github.state.reviewers).toEqual([
      { reviewers: ['alice'], team_reviewers: ['http-team', 'security'] },
    ]);
    expect(attention(run.decision)).toEqual(
      expect.arrayContaining(['REVIEW:OWNERSHIP_UNRESOLVED', 'REVIEW:FILE_NOT_TESTED']),
    );
  }, 120_000);
});

describe('scenario H: coverage reports are missing or malformed', () => {
  it('never auto-merges when coverage is missing', async () => {
    const run = await runScenario({
      name: 'h-missing',
      mutateEvidence: (dir) =>
        fs.rmSync(path.join(dir, 'coverage'), { recursive: true, force: true }),
    });
    expect(run.decision.decision).toBe('HUMAN_REVIEW');
    expect(attention(run.decision)).toEqual(['REVIEW:FILE_COVERAGE_UNAVAILABLE']);
  }, 120_000);

  it('blocks when coverage is malformed', async () => {
    const run = await runScenario({
      name: 'h-malformed',
      mutateEvidence: (dir) =>
        fs.writeFileSync(
          path.join(dir, 'coverage', 'coverage-final.json'),
          '{"src/lib/http.js": {"s": "tampered"}}',
        ),
    });
    expect(run.decision.decision).toBe('BLOCKED');
    expect(attention(run.decision)).toEqual(
      expect.arrayContaining(['BLOCK:COVERAGE_REPORT_MALFORMED']),
    );
    expect(run.result.exitCode).toBe(1);
  }, 120_000);
});

describe('scenario I: a later commit changes the remediation PR', () => {
  it('invalidates earlier evidence, re-runs tests and switches auto-merge off', async () => {
    const first = await runScenario({ name: 'i-first' });
    expect(first.decision.decision).toBe('AUTO_MERGE');
    expect(first.github.state.pr.autoMerge?.expectedHeadOid).toBe(SHA_1);
    const commentId = first.github.state.comments[0].id;

    first.github.calls.length = 0;
    const second = await runScenario({
      name: 'i-second',
      github: first.github,
      headSha: SHA_2,
      overlay: {
        'src/lib/http.js':
          "const vuln = require('vuln-lib');\n\n" +
          'function get(url) {\n  return vuln.fetch(url);\n}\n\n' +
          'module.exports = { get };\n// tweaked by hand\n',
      },
      changedFiles: [...LOCK_FILES, 'src/lib/http.js'],
    });
    expect(second.decision.pullRequest.headSha).toBe(SHA_2);
    expect(second.decision.decision).toBe('HUMAN_REVIEW');
    expect(attention(second.decision)).toEqual(['REVIEW:UNEXPECTED_FILES_CHANGED']);
    const disableAt = second.github.calls.indexOf('GRAPHQL disable');
    const firstWrite = second.github.calls.findIndex((c) => /^(POST|PATCH|DELETE) /.test(c));
    expect(disableAt).toBeGreaterThan(-1);
    expect(firstWrite === -1 || disableAt < firstWrite).toBe(true);
    expect(second.github.state.pr.autoMerge).toBeNull();
    expect(second.github.state.comments).toHaveLength(1);
    expect(second.github.state.comments[0].id).toBe(commentId);
    expect(second.github.state.comments[0].body).toContain(SHA_2.slice(0, 12));
  }, 240_000);

  it('blocks when the evidence belongs to an earlier commit', async () => {
    const run = await runScenario({ name: 'i-stale', headSha: SHA_2, evidenceSha: SHA_1 });
    expect(run.decision.decision).toBe('BLOCKED');
    expect(attention(run.decision)).toEqual(['BLOCK:EVIDENCE_STALE']);
    expect(run.github.state.pr.autoMerge).toBeNull();
  }, 120_000);
});
