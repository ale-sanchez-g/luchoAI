/**
 * Guards for Next.js upgrades. The site only works on GitHub Pages as a static export, and a
 * framework major can silently change defaults, drop CLI commands or rename config. These tests
 * pin what the site relies on so an upgrade fails here instead of in production.
 */
import fs from 'fs';
import path from 'path';
import type { NextConfig } from 'next';
import type { Metadata, MetadataRoute } from 'next';

const ROOT = path.resolve(__dirname, '../..');

interface PackageJson {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function readPackageJson(): PackageJson {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as PackageJson;
}

function loadWithBasePath<T extends object>(modulePath: string, basePath: string | undefined): T {
  const saved = process.env.NEXT_PUBLIC_BASE_PATH;
  if (basePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
  else process.env.NEXT_PUBLIC_BASE_PATH = basePath;
  try {
    // The base path is read when the module loads, so each load needs a fresh module registry.
    jest.resetModules();
    return jest.requireActual<T>(modulePath);
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = saved;
  }
}

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('next.config.ts', () => {
  const load = (basePath?: string): NextConfig =>
    loadWithBasePath<{ default: NextConfig }>('../../next.config', basePath).default;

  it('builds a static export for GitHub Pages', () => {
    expect(load().output).toBe('export');
  });

  it('keeps images unoptimized, which a static export requires', () => {
    expect(load().images?.unoptimized).toBe(true);
  });

  it('uses trailing slashes so /coach/ maps to coach/index.html on Pages', () => {
    expect(load().trailingSlash).toBe(true);
  });

  it('takes the base path from NEXT_PUBLIC_BASE_PATH and defaults to none', () => {
    expect(load('/luchoAI').basePath).toBe('/luchoAI');
    expect(load(undefined).basePath).toBe('');
  });

  it('bakes in the free key under the name the app reads', () => {
    expect(load().env).toHaveProperty('NEXT_PUBLIC_FREE_KEY_ENC');
  });

  it('declares no server-only features that a static export cannot serve', () => {
    const config = load() as Record<string, unknown>;
    for (const key of ['rewrites', 'redirects', 'headers', 'middleware']) {
      expect(config[key]).toBeUndefined();
    }
  });
});

describe('framework tooling', () => {
  const pkg = readPackageJson();

  it('lints with the ESLint CLI, since Next 16 removed `next lint`', () => {
    expect(pkg.scripts.lint).not.toMatch(/next lint/);
    expect(pkg.scripts.lint).toMatch(/^eslint\b/);
    expect(pkg.scripts.lint).toMatch(/\bsrc\b/);
    expect(pkg.scripts.lint).toMatch(/\bsentinel\b/);
  });

  it('keeps eslint-config-next on the same version as next', () => {
    expect(pkg.devDependencies['eslint-config-next']).toBe(pkg.dependencies.next);
  });

  it('runs the all-routes smoke test as part of the e2e suite', () => {
    expect(pkg.scripts['test:e2e']).toMatch(/e2e\/routes-smoke\.mjs/);
  });

  it('gives every set-state-in-effect exception a reason', () => {
    const offenders = listSourceFiles(path.join(ROOT, 'src')).flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.includes('set-state-in-effect') && !line.includes(' -- '))
        .map((line) => `${path.relative(ROOT, file)}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});

describe('app/manifest.ts', () => {
  const load = (basePath?: string): MetadataRoute.Manifest =>
    loadWithBasePath<{ default: () => MetadataRoute.Manifest }>('@/app/manifest', basePath)
      .default();

  it('describes an installable app in the brand colour', () => {
    const manifest = load();
    expect(manifest.short_name).toBe('LuchoAI');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#1a7f3c');
    expect(manifest.background_color).toBe('#1a7f3c');
  });

  it('has an "any" and a "maskable" icon that both exist in public/', () => {
    const icons = load().icons ?? [];
    expect(icons.map((icon) => icon.purpose).sort()).toEqual(['any', 'maskable']);
    for (const icon of icons) {
      expect(fs.existsSync(path.join(ROOT, 'public', icon.src))).toBe(true);
    }
  });

  it('prefixes start URL, scope and icons with the GitHub Pages base path', () => {
    const manifest = load('/luchoAI');
    expect(manifest.start_url).toBe('/luchoAI/');
    expect(manifest.scope).toBe('/luchoAI/');
    for (const icon of manifest.icons ?? []) expect(icon.src).toMatch(/^\/luchoAI\//);
  });

  it('is pre-rendered at build time', () => {
    expect(loadWithBasePath<{ dynamic: string }>('@/app/manifest', '').dynamic).toBe(
      'force-static',
    );
  });
});

describe('page metadata', () => {
  it.each([
    ['@/app/games/page', 'Games — LuchoAI'],
    ['@/app/wellbeing/page', 'Wellbeing — LuchoAI'],
  ])('%s sets the tab title', (modulePath, title) => {
    const { metadata } = loadWithBasePath<{ metadata: Metadata }>(modulePath, '');
    expect(metadata.title).toBe(title);
  });
});
