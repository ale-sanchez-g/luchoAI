import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import { assertReport, writeReport } from '../src/core/report-io';
import { parseLockfile } from '../src/graph/lockfile';
import { analyseImpact } from '../src/impact/impact-analysis';
import { PublishError, publishRemediation } from '../src/pipeline/publish';
import { runScan } from '../src/pipeline/scan';
import { applyRemediation } from '../src/remediation/remediation';
import { analyseUsage } from '../src/usage/usage-analysis';
import { StaticRegistry } from '../src/vulnerabilities/registry';
import { FakeGitHub } from './fake-github';
import { fixturePath, removeDir, testContext } from './helpers';

const R = 'https://registry.npmjs.org';
const FAKE_NPM = fixturePath('fake-npm', 'npm.js');
const BRANCH = DEFAULT_CONFIG.remediation.branch;

function git(cwd: string, ...args: string[]): string {
  return execFileSync(
    'git',
    [
      '-c',
      'user.email=dev@example.com',
      '-c',
      'user.name=dev',
      '-c',
      'init.defaultBranch=main',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  ).trim();
}

const lockVersion = (name: string, location: string, version: string) => [
  { file: 'package-lock.json', path: ['packages', location, 'version'], value: version },
  {
    file: 'package-lock.json',
    path: ['packages', location, 'resolved'],
    value: `${R}/${name}/-/${name}-${version}.tgz`,
  },
  {
    file: 'package-lock.json',
    path: ['packages', location, 'integrity'],
    value: `sha512-${name}${version}`,
  },
];

describe('publishing the weekly remediation', () => {
  let work: string;
  let origin: string;
  let planDir: string;
  const clone = (name: string): string => {
    const dir = path.join(work, name);
    execFileSync('git', ['clone', '-q', origin, dir]);
    return dir;
  };
  const publish = (repoDir: string, github: FakeGitHub, plan = planDir) =>
    publishRemediation({
      ctx: testContext(),
      config: DEFAULT_CONFIG,
      api: github,
      slug: 'acme/app',
      repoDir,
      baseBranch: 'main',
      planDir: plan,
      env: process.env,
      dispatchWorkflow: 'sentinel-pr-validation.yml',
      gitUser: {
        name: 'github-actions[bot]',
        email: '41898282+github-actions[bot]@users.noreply.github.com',
      },
    });

  beforeAll(async () => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-publish-'));
    origin = path.join(work, 'origin.git');
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
    const seed = path.join(work, 'seed');
    fs.cpSync(fixturePath('vuln-basic'), seed, { recursive: true });
    git(seed, 'init', '-q', '-b', 'main');
    git(seed, 'add', '-A');
    git(seed, 'commit', '-qm', 'base');
    git(seed, 'remote', 'add', 'origin', origin);
    git(seed, 'push', '-q', 'origin', 'main');

    const planning = clone('planning');
    const ctx = testContext();
    const registry = new StaticRegistry(
      JSON.parse(fs.readFileSync(path.join(planning, 'registry.json'), 'utf8')),
    );
    const { report: vulnerabilities } = await runScan({
      root: planning,
      ctx,
      config: DEFAULT_CONFIG,
      auditJsonPath: path.join(planning, 'npm-audit.json'),
      registry,
      github: null,
      repoSlug: null,
      env: process.env,
    });
    const graph = parseLockfile(fs.readFileSync(path.join(planning, 'package-lock.json'), 'utf8'));
    const usage = analyseUsage({
      root: planning,
      ctx,
      config: DEFAULT_CONFIG,
      graph,
      vulnerabilities,
    });
    const impact = await analyseImpact({
      ctx,
      config: DEFAULT_CONFIG,
      graph,
      vulnerabilities,
      usage,
      registry,
    });
    const scenario = path.join(work, 'npm.json');
    fs.writeFileSync(
      scenario,
      JSON.stringify({
        commands: [
          {
            match: 'install alpha@1.1.0',
            edits: [
              { file: 'package.json', path: ['dependencies', 'alpha'], value: '^1.1.0' },
              ...lockVersion('alpha', 'node_modules/alpha', '1.1.0'),
            ],
          },
          {
            match: 'install tool@2.3.2',
            edits: [
              { file: 'package.json', path: ['devDependencies', 'tool'], value: '2.3.2' },
              ...lockVersion('tool', 'node_modules/tool', '2.3.2'),
            ],
          },
          {
            match: 'update beta gamma',
            edits: [
              ...lockVersion('beta', 'node_modules/beta', '2.2.0'),
              ...lockVersion('gamma', 'node_modules/gamma', '1.0.1'),
            ],
          },
          {
            match: 'audit --json',
            stdout: JSON.stringify({
              auditReportVersion: 2,
              vulnerabilities: {},
              metadata: { vulnerabilities: {} },
            }),
            exitCode: 0,
          },
          { match: 'ls', stdout: '{}' },
        ],
      }),
    );
    planDir = path.join(work, 'plan');
    const { report: remediation } = await applyRemediation({
      root: planning,
      ctx,
      config: DEFAULT_CONFIG,
      vulnerabilities,
      env: { ...process.env, FAKE_NPM_SCENARIO: scenario },
      npm: [process.execPath, FAKE_NPM],
      patchFile: path.join(planDir, 'remediation.patch'),
    });
    for (const report of [vulnerabilities, usage.report, impact, remediation])
      writeReport(planDir, report);
  }, 120_000);

  afterAll(() => removeDir(work));

  it('pushes, opens the PR and dispatches validation; a rerun changes nothing', async () => {
    const github = new FakeGitHub('0'.repeat(40), []);
    const first = await publish(clone('first'), github);
    assertReport(first);
    expect(first.actions.map((a) => `${a.action}:${a.status}`)).toEqual([
      'push:DONE',
      'create-pull-request:DONE',
      'labels:DONE',
      'dispatch-validation:DONE',
    ]);
    const message = git(origin, 'log', '-1', '--format=%B', BRANCH);
    expect(message).toMatch(/^fix\(deps\): remediate vulnerable dependencies/);
    expect(message).toContain('Sentinel-Patch: ');
    expect(git(origin, 'diff', '--name-only', 'main', BRANCH).split('\n').sort()).toEqual([
      'package-lock.json',
      'package.json',
    ]);
    expect(github.created[0]).toMatchObject({ head: BRANCH, base: 'main' });
    expect(String(github.created[0].body)).toContain('Project Sentinel dependency remediation');
    expect(github.dispatches).toEqual([
      { workflow: 'sentinel-pr-validation.yml', ref: BRANCH, inputs: { pr: '7' } },
    ]);

    const pushed = git(origin, 'rev-parse', BRANCH);
    const second = await publish(clone('second'), github);
    expect(second.actions.map((a) => `${a.action}:${a.status}`)).toEqual([
      'push:SKIPPED',
      'update-pull-request:DONE',
      'labels:DONE',
    ]);
    expect(git(origin, 'rev-parse', BRANCH)).toBe(pushed);
    expect(github.openPulls).toEqual([7]);
    expect(github.dispatches).toHaveLength(1);
  });

  it('never overwrites commits that people added to the Sentinel branch', async () => {
    const human = clone('human');
    git(human, 'checkout', '-q', BRANCH);
    fs.appendFileSync(path.join(human, 'package.json'), '\n');
    git(human, 'commit', '-qam', 'fix the build by hand');
    git(human, 'push', '-q', 'origin', BRANCH);
    const before = git(origin, 'rev-parse', BRANCH);
    const result = await publish(clone('after-human'), new FakeGitHub('0'.repeat(40), []));
    expect(result.actions).toEqual([
      {
        action: 'push',
        status: 'SKIPPED',
        detail: `${BRANCH} has commits not made by Sentinel; leaving it for people to resolve`,
      },
    ]);
    expect(git(origin, 'rev-parse', BRANCH)).toBe(before);
  });

  it('refuses a tampered plan before pushing anything', async () => {
    const tampered = path.join(work, 'tampered-plan');
    fs.cpSync(planDir, tampered, { recursive: true });
    fs.appendFileSync(path.join(tampered, 'remediation.patch'), '\n');
    await expect(
      publish(clone('tampered'), new FakeGitHub('0'.repeat(40), []), tampered),
    ).rejects.toThrow(PublishError);

    const evil = path.join(work, 'evil-plan');
    fs.cpSync(planDir, evil, { recursive: true });
    const patch = fs
      .readFileSync(path.join(evil, 'remediation.patch'), 'utf8')
      .replace(
        /diff --git a\/package.json b\/package.json/,
        'diff --git a/.github/workflows/x.yml b/.github/workflows/x.yml',
      );
    fs.writeFileSync(path.join(evil, 'remediation.patch'), patch);
    const report = JSON.parse(fs.readFileSync(path.join(evil, 'remediation-report.json'), 'utf8'));
    report.patch.sha256 = createHash('sha256').update(patch).digest('hex');
    fs.writeFileSync(path.join(evil, 'remediation-report.json'), JSON.stringify(report));
    await expect(publish(clone('evil'), new FakeGitHub('0'.repeat(40), []), evil)).rejects.toThrow(
      /not an allowed file/,
    );
  });
});
