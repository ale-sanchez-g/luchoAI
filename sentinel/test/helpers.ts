import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { RunContext } from '../src/core/report-io';

export const FIXED_NOW = new Date('2026-11-07T00:00:00.000Z');

/** Deterministic run context for tests. */
export function testContext(overrides: Partial<RunContext> = {}): RunContext {
  return {
    executionId: 'test-run',
    repository: { slug: 'acme/app', commitSha: 'a'.repeat(40), ref: 'refs/heads/main' },
    now: () => FIXED_NOW,
    ...overrides,
  };
}

/** Creates a temporary directory populated with the given files (paths are POSIX, relative). */
export function makeTempRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sentinel-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return root;
}

/** Copies a fixture directory from `test/fixtures/<name>` into a fresh temporary directory. */
export function copyFixture(name: string): string {
  const source = path.join(__dirname, 'fixtures', name);
  const target = fs.mkdtempSync(path.join(os.tmpdir(), `sentinel-${name.replace(/\W/g, '-')}-`));
  fs.cpSync(source, target, { recursive: true });
  return target;
}

export function fixturePath(...parts: string[]): string {
  return path.join(__dirname, 'fixtures', ...parts);
}

export function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
