import fs from 'node:fs';
import path from 'node:path';
import { canonicalJson, digestOf } from '../src/core/hash';
import { matchesAny, matchesGlob } from '../src/core/glob';
import { readRepoFile, walkRepository } from '../src/core/fs-walk';
import { redact, registerSecret, sanitizedEnv } from '../src/core/redact';
import { outputTail, runCommand } from '../src/core/exec';
import { relativeTo } from '../src/core/paths';
import { makeTempRepo, removeDir } from './helpers';

describe('canonicalJson', () => {
  it('produces identical text regardless of key order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } })).toBe(
      canonicalJson({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 }),
    );
  });

  it('drops undefined values so optional fields do not change digests', () => {
    expect(digestOf({ a: 1, b: undefined })).toBe(digestOf({ a: 1 }));
  });
});

describe('glob matching', () => {
  it.each([
    ['src/**', 'src/app/page.tsx', true],
    ['src/**', 'sentinel/src/cli.ts', false],
    ['**/*.test.*', 'src/__tests__/a.test.ts', true],
    ['**/__tests__/**', 'src/__tests__/__mocks__/x.ts', true],
    ['*.md', 'docs/deep/readme.md', true],
    ['/*.md', 'docs/readme.md', false],
    ['/*.md', 'README.md', true],
    ['/*.config.{js,cjs,mjs,ts}', 'jest.config.js', true],
    ['/*.config.{js,cjs,mjs,ts}', 'src/jest.config.js', false],
    ['/tsconfig*.json', 'tsconfig.json', true],
    ['docs/*', 'docs/a.md', true],
    ['docs/*', 'docs/b/c.md', false],
    ['a/**/b', 'a/b', true],
    ['a/**/b', 'a/x/y/b', true],
    ['file?.ts', 'file1.ts', true],
    ['[ab].ts', 'c.ts', false],
    ['node_modules/', 'x/node_modules/pkg/index.js', true],
  ])('%s matches %s -> %s', (pattern, file, expected) => {
    expect(matchesGlob(file, pattern)).toBe(expected);
  });

  it('lets a later negation exclude an earlier match', () => {
    const patterns = ['src/**/*.ts', '!src/**/__tests__/**'];
    expect(matchesAny('src/lib/a.ts', patterns)).toBe(true);
    expect(matchesAny('src/__tests__/a.ts', patterns)).toBe(false);
  });
});

describe('walkRepository', () => {
  let root: string;

  beforeEach(() => {
    root = makeTempRepo({
      'src/a.ts': 'export const a = 1;',
      'src/big.ts': 'x'.repeat(5000),
      'node_modules/pkg/index.js': 'module.exports = 1;',
      'out/index.html': '<html></html>',
      '.git/config': '[core]',
      'docs/readme.md': '# hi',
    });
    fs.symlinkSync('/etc/hostname', path.join(root, 'src', 'link.ts'));
  });

  afterEach(() => removeDir(root));

  it('lists regular files, prunes excluded trees and never follows symlinks', () => {
    const result = walkRepository(root, {
      exclude: ['node_modules/**', 'out/**'],
      maxFileSizeBytes: 1000,
    });
    expect(result.files).toEqual(['docs/readme.md', 'src/a.ts']);
    expect(result.skipped).toEqual([
      { file: 'src/big.ts', reason: 'larger than 1000 bytes' },
      { file: 'src/link.ts', reason: 'symbolic link (not followed)' },
    ]);
  });

  it('refuses to read symlinks or paths outside the root', () => {
    expect(readRepoFile(root, 'src/a.ts')).toBe('export const a = 1;');
    expect(readRepoFile(root, 'src/link.ts')).toBeNull();
    expect(readRepoFile(root, '../etc/passwd')).toBeNull();
  });
});

describe('redaction', () => {
  it('removes registered secrets and token shapes', () => {
    registerSecret('super-secret-value-123');
    const text =
      'token super-secret-value-123 ghp_abcdefghijklmnopqrstuvwxyz0123 ' +
      'https://x-access-token:abc@github.com';
    const out = redact(text);
    expect(out).not.toContain('super-secret-value-123');
    expect(out).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123');
    expect(out).not.toContain('x-access-token:abc@');
  });

  it('keeps the header name when redacting authorization values', () => {
    expect(redact('Authorization: Bearer abcdefghijklmnop')).toBe('Authorization: Bearer ***');
  });

  it('strips credential-like variables from child environments', () => {
    const env = sanitizedEnv(
      { PATH: '/bin', GITHUB_TOKEN: 'x', NPM_TOKEN: 'y', MY_API_KEY: 'z', HOME: '/h' },
      { CI: 'true' },
    );
    expect(env).toEqual({ PATH: '/bin', HOME: '/h', CI: 'true' });
  });
});

describe('runCommand', () => {
  it('captures exit code and output without a shell', async () => {
    const result = await runCommand(
      [process.execPath, '-e', 'console.log(process.argv[1]); process.exit(3)', '$(whoami) && ls'],
      {
        cwd: process.cwd(),
        env: process.env,
      },
    );
    expect(result.exitCode).toBe(3);
    expect(result.stdout.trim()).toBe('$(whoami) && ls');
    expect(result.timedOut).toBe(false);
  });

  it('reports a missing executable instead of throwing', async () => {
    const result = await runCommand(['definitely-not-a-real-binary-xyz'], {
      cwd: process.cwd(),
      env: process.env,
    });
    expect(result.exitCode).toBeNull();
    expect(result.error).toMatch(/ENOENT/);
  });

  it('kills commands that exceed their timeout', async () => {
    const result = await runCommand([process.execPath, '-e', 'setTimeout(() => {}, 10000)'], {
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 200,
    });
    expect(result.timedOut).toBe(true);
    expect(outputTail(result)).toBe('');
  });
});

describe('relativeTo', () => {
  it('returns POSIX paths inside the root and null outside it', () => {
    expect(relativeTo('/repo', '/repo/src/a.ts')).toBe('src/a.ts');
    expect(relativeTo('/repo', '/other/a.ts')).toBeNull();
  });
});
