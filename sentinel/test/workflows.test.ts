import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { main } from '../src/cli';
import { writeReport } from '../src/core/report-io';
import { decide } from '../src/governance/decision';
import { greenInput } from './governance-helpers';
import { removeDir } from './helpers';

const REPO = path.resolve(__dirname, '..', '..');
const WORKFLOWS = ['weekly-sentinel.yml', 'sentinel-pr-validation.yml'];

interface Step {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  if?: string;
}

interface Job {
  permissions?: Record<string, string>;
  if?: string;
  steps: Step[];
}

function load(name: string): {
  text: string;
  doc: { permissions?: unknown; jobs: Record<string, Job> };
} {
  const text = fs.readFileSync(path.join(REPO, '.github', 'workflows', name), 'utf8');
  return { text, doc: parse(text) };
}

describe.each(WORKFLOWS)('workflow security contract: %s', (name) => {
  const { text, doc } = load(name);
  const jobs = Object.entries(doc.jobs);
  const writes = (job: Job): boolean =>
    Object.values(job.permissions ?? {}).some((p) => p === 'write');

  it('grants nothing by default and declares permissions per job', () => {
    expect(doc.permissions).toEqual({});
    for (const [, job] of jobs) expect(job.permissions).toBeDefined();
  });

  it('pins every action to a full commit SHA with its version noted', () => {
    const uses = text.split('\n').filter((l) => /^\s*(-\s+)?uses:/.test(l));
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    }
  });

  it('never runs package install scripts', () => {
    for (const [, job] of jobs) {
      for (const step of job.steps) {
        if (step.run && /\bnpm (ci|install)\b/.test(step.run))
          expect(step.run).toContain('--ignore-scripts');
      }
    }
  });

  it('does not persist credentials or use caches except where it must push', () => {
    for (const [id, job] of jobs) {
      for (const step of job.steps) {
        if (step.uses?.startsWith('actions/checkout@')) {
          const pushes = id === 'publish';
          expect(step.with?.['persist-credentials']).toBe(pushes);
        }
        if (step.uses?.startsWith('actions/setup-node@'))
          expect(step.with?.['package-manager-cache']).toBe(false);
      }
    }
  });

  it('keeps jobs that execute dependency or pull request code read-only', () => {
    for (const [id, job] of jobs) {
      const executesUntrusted = job.steps.some(
        (s) => s.run && /cli\.js validate|playwright install/.test(s.run),
      );
      if (executesUntrusted) expect(writes(job)).toBe(false);
      if (writes(job))
        expect(job.steps.some((s) => s.run && /cli\.js validate/.test(s.run))).toBe(false);
      void id;
    }
  });

  it('never interpolates expressions into shell scripts', () => {
    for (const [, job] of jobs) {
      for (const step of job.steps) {
        if (step.run) expect(step.run).not.toMatch(/\$\{\{/);
      }
    }
  });

  it('does not act on cancelled runs', () => {
    expect(text).not.toMatch(/\balways\(\)/);
  });
});

describe('pull request decision job', () => {
  const { doc } = load('sentinel-pr-validation.yml');
  const decideJob = doc.jobs.decide;

  it('runs Sentinel from the base revision and reads the PR head only as data', () => {
    const checkouts = decideJob.steps.filter((s) => s.uses?.startsWith('actions/checkout@'));
    expect(checkouts.map((s) => [s.with?.path, s.with?.ref])).toEqual([
      ['trusted', '${{ needs.context.outputs.base-sha }}'],
      ['pr', '${{ needs.context.outputs.head-sha }}'],
    ]);
    const runs = decideJob.steps.filter((s) => s.run).map((s) => s.run as string);
    expect(runs.some((r) => r.includes('node trusted/sentinel/dist/cli.js pr-evaluate'))).toBe(
      true,
    );
    expect(
      runs.some(
        (r) =>
          /\bnpm (ci|install|run)\b/.test(r) &&
          !r.includes('--ignore-scripts') &&
          !r.includes('sentinel:build'),
      ),
    ).toBe(false);
  });

  it('is the required status check named in the policy', () => {
    const config = parse(
      fs.readFileSync(path.join(REPO, '.github', 'sentinel', 'config.yml'), 'utf8'),
    );
    expect((decideJob as unknown as { name: string }).name).toBe(
      config.governance.requiredStatusCheck,
    );
  });
});

describe('command line exit codes', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-cli-'));
  });
  afterEach(() => removeDir(dir));

  it('fails the gate only for BLOCKED decisions', async () => {
    const input = greenInput();
    const config = path.join(REPO, '.github', 'sentinel', 'config.yml');
    writeReport(dir, decide(input));
    await expect(main(['gate', '--offline', '--config', config, '--out', dir])).resolves.toBe(0);
    input.validation!.commands[0].status = 'FAILED';
    writeReport(dir, decide(input));
    await expect(main(['gate', '--offline', '--config', config, '--out', dir])).resolves.toBe(1);
  });

  it('stops with a configuration error instead of guessing', async () => {
    const bad = path.join(dir, 'config.yml');
    fs.writeFileSync(bad, 'version: 1\ncoverage:\n  lineTreshold: 90\n');
    await expect(main(['gate', '--offline', '--config', bad, '--out', dir])).resolves.toBe(2);
  });

  it('rejects a tampered decision file', async () => {
    fs.writeFileSync(
      path.join(dir, 'merge-decision.json'),
      JSON.stringify({ reportType: 'merge-decision', decision: 'AUTO_MERGE' }),
    );
    const config = path.join(REPO, '.github', 'sentinel', 'config.yml');
    await expect(main(['gate', '--offline', '--config', config, '--out', dir])).resolves.toBe(3);
  });
});
