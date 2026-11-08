import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { RemediationReport, VulnerabilityReport } from '../src/contracts/types';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import { assertReport } from '../src/core/report-io';
import { parseLockfile } from '../src/graph/lockfile';
import { runScan } from '../src/pipeline/scan';
import { diffManifests } from '../src/remediation/diffs';
import { checkLockfile, parseSignatures } from '../src/remediation/integrity';
import { planRemediation, styleFlags } from '../src/remediation/planner';
import { applyRemediation, verifyRemediation } from '../src/remediation/remediation';
import { parseNpmAudit } from '../src/vulnerabilities/npm-audit';
import { StaticRegistry } from '../src/vulnerabilities/registry';
import { copyFixture, fixturePath, removeDir, testContext } from './helpers';

const FAKE_NPM = fixturePath('fake-npm', 'npm.js');
const R = 'https://registry.npmjs.org';

async function scanFixture(root: string): Promise<VulnerabilityReport> {
  const { report } = await runScan({
    root,
    ctx: testContext(),
    config: DEFAULT_CONFIG,
    auditJsonPath: path.join(root, 'npm-audit.json'),
    registry: new StaticRegistry(
      JSON.parse(fs.readFileSync(path.join(root, 'registry.json'), 'utf8')),
    ),
    github: null,
    repoSlug: null,
    env: process.env,
  });
  return report;
}

function gitInit(root: string): void {
  const git = (...args: string[]): void => {
    execFileSync('git', ['-c', 'user.email=test@example.com', '-c', 'user.name=test', ...args], {
      cwd: root,
      stdio: 'ignore',
    });
  };
  git('init', '-q');
  git('add', '-A');
  git('commit', '-qm', 'base');
}

function set(
  file: string,
  pathParts: string[],
  value: unknown,
): { file: string; path: string[]; value: unknown } {
  return { file, path: pathParts, value };
}

function lockVersion(name: string, location: string, version: string): ReturnType<typeof set>[] {
  return [
    set('package-lock.json', ['packages', location, 'version'], version),
    set(
      'package-lock.json',
      ['packages', location, 'resolved'],
      `${R}/${name}/-/${name}-${version}.tgz`,
    ),
    set('package-lock.json', ['packages', location, 'integrity'], `sha512-${name}${version}`),
  ];
}

function afterAudit(root: string, extra: Record<string, unknown> = {}): string {
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'npm-audit.json'), 'utf8'));
  for (const fixed of ['tool', 'beta', 'gamma', 'alpha']) delete audit.vulnerabilities[fixed];
  Object.assign(audit.vulnerabilities, extra);
  return JSON.stringify(audit);
}

const introducedBeta = {
  beta: {
    name: 'beta',
    severity: 'moderate',
    isDirect: false,
    via: [
      {
        source: 2001,
        name: 'beta',
        dependency: 'beta',
        title: 'Beta 2.2.0 regression',
        url: 'https://github.com/advisories/GHSA-pppp-qqqq-rrrr',
        severity: 'moderate',
        cwe: [],
        cvss: { score: 0, vectorString: null },
        range: '>=2.2.0 <2.2.1',
      },
    ],
    effects: [],
    range: '>=2.2.0 <2.2.1',
    nodes: ['node_modules/beta'],
    fixAvailable: true,
  },
};

describe('remediation planning', () => {
  it('keeps the manifest range style', () => {
    expect(styleFlags('15.3.3')).toEqual(['--save-exact']);
    expect(styleFlags('^8.5.3')).toEqual([]);
    expect(styleFlags('~1.2.0')).toEqual(['--save-prefix=~']);
    expect(styleFlags('latest')).toBeNull();
    expect(styleFlags('>=1 <3')).toBeNull();
  });

  it('plans direct installs, parent and transitive updates, and escalates the rest', async () => {
    const root = fixturePath('vuln-basic');
    const report = await scanFixture(root);
    const plan = planRemediation(
      report,
      JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
    );
    const lockOnly = '--package-lock-only --ignore-scripts --no-audit --no-fund';
    expect(plan.actions.map((a) => a.argv.join(' '))).toEqual([
      `npm install alpha@1.1.0 --save-prod ${lockOnly}`,
      `npm install tool@2.3.2 --save-dev --save-exact ${lockOnly}`,
      `npm update beta gamma ${lockOnly}`,
    ]);
    expect(plan.escalations.map((e) => `${e.package}:${e.reason}`)).toEqual([
      'deep:MAJOR_UPGRADE_REQUIRED',
      'lonely:NO_FIX_AVAILABLE',
      'vips:MAJOR_UPGRADE_REQUIRED',
      'zeta:PARENT_UPGRADE_REQUIRED',
    ]);
    expect([...plan.targetedPackages].sort()).toEqual(['alpha', 'beta', 'gamma', 'tool']);
  });

  it('refuses to rewrite manifest specs it cannot preserve', async () => {
    const report = await scanFixture(fixturePath('vuln-basic'));
    const plan = planRemediation(report, {
      devDependencies: { tool: 'latest' },
      dependencies: { alpha: '^1.0.0' },
    });
    expect(plan.escalations.find((e) => e.package === 'tool')).toMatchObject({
      reason: 'MANIFEST_SPEC_UNSUPPORTED',
    });
    expect(plan.actions.some((a) => a.package === 'tool')).toBe(false);
  });
});

describe('applying remediation', () => {
  let root: string;
  let scenarioFile: string;
  let report: RemediationReport;
  let vulnerabilities: VulnerabilityReport;

  const run = async (commands: unknown[]): Promise<RemediationReport> => {
    fs.writeFileSync(scenarioFile, JSON.stringify({ commands }));
    const result = await applyRemediation({
      root,
      ctx: testContext(),
      config: DEFAULT_CONFIG,
      vulnerabilities,
      env: { ...process.env, FAKE_NPM_SCENARIO: scenarioFile },
      npm: [process.execPath, FAKE_NPM],
      patchFile: path.join(root, '..', `${path.basename(root)}.patch`),
    });
    assertReport(result.report);
    return result.report;
  };

  beforeEach(async () => {
    root = copyFixture('vuln-basic');
    gitInit(root);
    scenarioFile = path.join(root, '..', `${path.basename(root)}-scenario.json`);
    vulnerabilities = await scanFixture(root);
  });

  afterEach(() => {
    removeDir(root);
    fs.rmSync(scenarioFile, { force: true });
  });

  it('attributes every change, verifies targets and detects introduced advisories', async () => {
    report = await run([
      {
        match: 'install alpha@1.1.0',
        edits: [
          set('package.json', ['dependencies', 'alpha'], '^1.1.0'),
          ...lockVersion('alpha', 'node_modules/alpha', '1.1.0'),
        ],
      },
      {
        match: 'install tool@2.3.2',
        edits: [
          set('package.json', ['devDependencies', 'tool'], '2.3.2'),
          ...lockVersion('tool', 'node_modules/tool', '2.3.2'),
        ],
      },
      {
        match: 'update beta gamma',
        edits: [
          ...lockVersion('beta', 'node_modules/beta', '2.2.0'),
          ...lockVersion('beta', 'node_modules/tool/node_modules/beta', '1.9.0'),
          ...lockVersion('gamma', 'node_modules/gamma', '1.0.1'),
        ],
      },
      { match: 'audit --json', stdout: afterAudit(root, introducedBeta), exitCode: 1 },
      { match: 'ls', stdout: '{}' },
    ]);
    expect(report.actions.map((a) => `${a.id}:${a.status}`)).toEqual([
      'install-alpha:APPLIED',
      'install-tool:APPLIED',
      'update-transitive:APPLIED',
    ]);
    expect(
      report.changes.map((c) => `${c.location}:${c.from}->${c.to}:${c.upgradeType}:${c.relation}`),
    ).toEqual([
      'node_modules/alpha:1.0.0->1.1.0:minor:targeted',
      'node_modules/beta:2.1.2->2.2.0:minor:targeted',
      'node_modules/gamma:1.0.0->1.0.1:patch:targeted',
      'node_modules/tool:2.0.0->2.3.2:minor:targeted',
      'node_modules/tool/node_modules/beta:1.2.0->1.9.0:minor:targeted',
    ]);
    expect(report.manifestChanges).toEqual([
      { field: 'dependencies', package: 'alpha', from: '^1.0.0', to: '^1.1.0', allowed: true },
      { field: 'devDependencies', package: 'tool', from: '2.0.0', to: '2.3.2', allowed: true },
    ]);
    expect(report.verification).toMatchObject({
      targeted: [
        'GHSA-2222-3333-4444|beta',
        'GHSA-5555-6666-7777|beta',
        'GHSA-8888-9999-cccc|tool',
        'GHSA-wwww-xxxx-2345|gamma',
      ],
      remaining: [],
      introduced: ['GHSA-pppp-qqqq-rrrr|beta'],
    });
    expect(report.verification.resolved).toHaveLength(4);
    expect(report.integrity).toMatchObject({
      lockfileConsistent: 'PASS',
      registry: { violations: [] },
      missingIntegrity: [],
    });
    expect(report.changedFiles).toEqual(['package-lock.json', 'package.json']);
    expect(report.patch.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(report.escalations).toHaveLength(4);
  });

  it('reports failed commands, unrelated changes and disallowed manifest edits', async () => {
    report = await run([
      {
        match: 'install alpha@1.1.0',
        edits: [
          set('package.json', ['dependencies', 'alpha'], '^1.1.0'),
          ...lockVersion('alpha', 'node_modules/alpha', '1.1.0'),
        ],
      },
      { match: 'install tool@2.3.2', stderr: 'npm error ERESOLVE could not resolve', exitCode: 1 },
      {
        match: 'update beta gamma',
        edits: [
          ...lockVersion('beta', 'node_modules/beta', '2.2.0'),
          ...lockVersion('beta', 'node_modules/tool/node_modules/beta', '1.9.0'),
          ...lockVersion('gamma', 'node_modules/gamma', '1.0.1'),
          ...lockVersion('omega', 'node_modules/omega', '3.0.1'),
          set('package.json', ['scripts'], { postinstall: 'node evil.js' }),
        ],
      },
      { match: 'audit --json', stdout: afterAudit(root), exitCode: 1 },
      { match: 'ls', stdout: '{}', exitCode: 1 },
    ]);
    expect(report.actions.find((a) => a.id === 'install-tool')).toMatchObject({
      status: 'FAILED',
      exitCode: 1,
    });
    expect(report.actions.find((a) => a.id === 'install-tool')?.detail).toContain('ERESOLVE');
    expect(report.verification.remaining).toEqual(['GHSA-8888-9999-cccc|tool']);
    expect(report.changes.find((c) => c.name === 'omega')).toMatchObject({
      relation: 'unrelated',
      upgradeType: 'patch',
    });
    expect(report.manifestChanges.find((m) => m.field === 'scripts')).toMatchObject({
      allowed: false,
    });
    expect(report.integrity.lockfileConsistent).toBe('FAIL');
  });

  it('verifies a pull request lockfile without running npm', async () => {
    const baseLock = fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8');
    const baseManifest = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
    const head = JSON.parse(baseLock);
    head.packages['node_modules/tool'].version = '2.3.2';
    head.packages['node_modules/tool'].resolved = `${R}/tool/-/tool-2.3.2.tgz`;
    const headManifest = JSON.parse(baseManifest);
    headManifest.devDependencies.tool = '2.3.2';
    const verify = verifyRemediation({
      ctx: testContext(),
      config: DEFAULT_CONFIG,
      vulnerabilities,
      baseLockText: baseLock,
      headLockText: JSON.stringify(head),
      baseManifestText: baseManifest,
      headManifestText: JSON.stringify(headManifest),
      headAudit: parseNpmAudit(afterAudit(root)),
      headAuditError: null,
      lockfileConsistent: 'PASS',
      lockfileDetail: 'npm ci succeeded',
      changedFiles: ['package-lock.json', 'package.json'],
      baseSha: 'b'.repeat(40),
      headSha: 'c'.repeat(40),
    });
    assertReport(verify);
    expect(verify.mode).toBe('verify');
    expect(verify.actions).toEqual([]);
    expect(verify.verification.resolved).toEqual(['GHSA-8888-9999-cccc|tool']);
    expect(verify.verification.remaining).toEqual([
      'GHSA-2222-3333-4444|beta',
      'GHSA-5555-6666-7777|beta',
      'GHSA-wwww-xxxx-2345|gamma',
    ]);
  });
});

describe('integrity checks', () => {
  it('flags tarballs from unexpected registries and missing integrity hashes', () => {
    const lock = {
      lockfileVersion: 3,
      packages: {
        '': { name: 'x', version: '1.0.0' },
        'node_modules/good': {
          version: '1.0.0',
          resolved: `${R}/good/-/good-1.0.0.tgz`,
          integrity: 'sha512-abc',
        },
        'node_modules/evil': {
          version: '1.0.0',
          resolved: 'https://evil.example.com/evil-1.0.0.tgz',
          integrity: 'sha512-abc',
        },
        'node_modules/nohash': { version: '1.0.0', resolved: `${R}/nohash/-/nohash-1.0.0.tgz` },
        'node_modules/linked': { version: '1.0.0', link: true, resolved: 'packages/linked' },
      },
    };
    const result = checkLockfile(parseLockfile(JSON.stringify(lock)), [`${R}/`]);
    expect(result.registry.violations).toEqual([
      { location: 'node_modules/evil', resolved: 'https://evil.example.com/evil-1.0.0.tgz' },
    ]);
    expect(result.missingIntegrity).toEqual(['node_modules/nohash']);
  });

  it.each([
    [JSON.stringify({ invalid: [], missing: [] }), 0, 'VERIFIED'],
    [
      JSON.stringify({
        invalid: [{ name: 'a', version: '1.0.0', code: 'EINTEGRITYSIGNATURE' }],
        missing: [],
      }),
      1,
      'INVALID',
    ],
    [
      JSON.stringify({ invalid: [], missing: [{ name: 'b', version: '2.0.0' }] }),
      1,
      'MISSING_SIGNATURES',
    ],
    [JSON.stringify({ error: { summary: 'Failed to download' } }), 1, 'UNAVAILABLE'],
    ['not json', 1, 'UNAVAILABLE'],
  ])('interprets npm audit signatures output %#', (stdout, exitCode, status) => {
    expect(parseSignatures(stdout, exitCode).status).toBe(status);
  });

  it('only allows dependency spec changes for targeted packages', () => {
    const changes = diffManifests(
      { dependencies: { a: '^1.0.0', b: '^2.0.0' }, scripts: { test: 'jest' } },
      {
        dependencies: { a: '^1.1.0', b: '^2.1.0', c: '^1.0.0' },
        scripts: { test: 'jest', postinstall: 'x' },
      },
      new Set(['a']),
    );
    expect(changes.map((c) => `${c.field}:${c.package}:${c.allowed}`)).toEqual([
      'dependencies:a:true',
      'dependencies:b:false',
      'dependencies:c:false',
      'scripts::false',
    ]);
  });
});
