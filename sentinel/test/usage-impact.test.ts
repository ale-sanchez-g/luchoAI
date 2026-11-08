import fs from 'node:fs';
import type { ImpactReport, Vulnerability, VulnerabilityReport } from '../src/contracts/types';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import { assertReport, makeHeader } from '../src/core/report-io';
import { parseLockfile } from '../src/graph/lockfile';
import { analyseImpact } from '../src/impact/impact-analysis';
import { parseModule, packageNameOf } from '../src/usage/ast-imports';
import { candidatePackages, configFileOwner } from '../src/usage/config-references';
import { expandScript, parseScripts, summariseCommand } from '../src/usage/scripts';
import { textReferences } from '../src/usage/text-search';
import type { UsageAnalysis } from '../src/usage/usage-analysis';
import { analyseUsage } from '../src/usage/usage-analysis';
import { StaticRegistry } from '../src/vulnerabilities/registry';
import { fixturePath, testContext } from './helpers';

const ROOT = fixturePath('app-basic');

function vuln(
  pkg: string,
  location: string,
  version: string,
  target: string | null,
  direct: boolean,
): Vulnerability {
  return {
    key: `GHSA-2222-3333-4444|${pkg}`,
    ids: { ghsa: 'GHSA-2222-3333-4444', cve: [], aliases: [] },
    title: `${pkg} advisory`,
    url: null,
    severity: 'high',
    cvss: { score: null, vector: null },
    cwe: [],
    package: pkg,
    vulnerableRange: '<9.0.0',
    sources: ['npm-audit'],
    instances: [
      {
        location,
        version,
        direct,
        dev: false,
        optional: false,
        dependencyPaths: [],
        pathsTruncated: false,
        requiredBy: [],
        fix: {
          status: target ? 'FIXABLE' : 'NO_FIX_AVAILABLE',
          fixedVersion: target,
          targetVersion: target,
          upgradeType: target ? 'minor' : null,
          strategy: target ? (direct ? 'direct-update' : 'transitive-update') : null,
          parent: null,
          reason: 'test',
          npmSuggestion: null,
          introduces: [],
        },
      },
    ],
    isDirect: direct,
    scope: 'production',
    fixStatus: target ? 'FIXABLE' : 'NO_FIX_AVAILABLE',
    inScope: true,
    priority: 1,
  };
}

function vulnerabilityReport(): VulnerabilityReport {
  return {
    ...makeHeader(testContext(), 'vulnerability-report'),
    ecosystem: 'npm',
    lockfile: { path: 'package-lock.json', lockfileVersion: 3, packages: 7 },
    sources: [],
    summary: {
      total: 4,
      bySeverity: { critical: 0, high: 4, moderate: 0, low: 0, info: 0 },
      direct: 2,
      transitive: 2,
      inScope: 4,
      byFixStatus: {
        FIXABLE: 3,
        MAJOR_UPGRADE_REQUIRED: 0,
        PARENT_UPGRADE_REQUIRED: 0,
        NO_FIX_AVAILABLE: 1,
        UNKNOWN: 0,
      },
    },
    vulnerabilities: [
      vuln('web-framework', 'node_modules/web-framework', '1.0.0', '1.2.0', true),
      vuln('form-codec', 'node_modules/form-codec', '3.0.0', '3.0.1', false),
      vuln('ts-transform-dep', 'node_modules/ts-transform-dep', '1.0.0', '1.0.1', false),
      vuln('ghost-pkg', 'node_modules/ghost-pkg', '1.0.0', null, true),
    ],
  };
}

describe('AST import extraction', () => {
  it('classifies every kind of module reference and flags non-literal ones', () => {
    const parsed = parseModule(
      'x.ts',
      [
        "import a from 'pkg-a';",
        "import type { T } from 'pkg-b';",
        "import { type U, type V } from 'pkg-c';",
        "import 'pkg-d/side';",
        "export * from 'pkg-e';",
        "import f = require('pkg-f');",
        "const g = require('pkg-g');",
        "const h = await import('pkg-h');",
        "jest.mock('pkg-i');",
        "require.resolve('pkg-j');",
        'const dyn = require(name);',
        'const later = import(`./x/${id}`);',
        "type K = import('pkg-k').K;",
      ].join('\n'),
    );
    expect(parsed.references.map((r) => `${r.kind}:${r.specifier}:${r.line}`)).toEqual([
      'import:pkg-a:1',
      'type-import:pkg-b:2',
      'type-import:pkg-c:3',
      'side-effect:pkg-d/side:4',
      'export-from:pkg-e:5',
      'import-equals:pkg-f:6',
      'require:pkg-g:7',
      'dynamic-import:pkg-h:8',
      'jest-mock:pkg-i:9',
      'require-resolve:pkg-j:10',
      'type-import:pkg-k:13',
    ]);
    expect(parsed.dynamicSites.map((d) => `${d.kind}:${d.line}`)).toEqual([
      'require():11',
      'import():12',
    ]);
  });

  it('does not count import specifiers again as configuration literals', () => {
    const parsed = parseModule(
      'next.config.ts',
      "import type { NextConfig } from 'pkg-a';\nexport default { plugin: 'pkg-b' };",
      true,
    );
    expect(parsed.literals.map((l) => `${l.value}:${l.isPropertyName}`)).toEqual([
      'plugin:true',
      'pkg-b:false',
    ]);
  });

  it('extracts package names from specifiers', () => {
    expect(packageNameOf('@scope/pkg/sub/path')).toBe('@scope/pkg');
    expect(packageNameOf('next/link')).toBe('next');
    expect(packageNameOf('./local')).toBeNull();
    expect(packageNameOf('node:fs')).toBeNull();
  });
});

describe('scripts and commands', () => {
  it('finds binaries behind env assignments and wrappers, and npm script chains', () => {
    expect(
      summariseCommand(
        'NODE_ENV=production cross-env FOO=1 next build && npm run lint; npx --yes jest --ci',
      ),
    ).toEqual({
      bins: ['jest', 'next'],
      npmRuns: ['lint'],
      nodeScripts: [],
    });
    expect(summariseCommand('node e2e/a.mjs && npm test')).toEqual({
      bins: [],
      npmRuns: ['test'],
      nodeScripts: ['e2e/a.mjs'],
    });
    const scripts = parseScripts(
      JSON.stringify({
        scripts: { prebuild: 'gen-types', build: 'next build', ci: 'npm run build && jest' },
      }),
    );
    expect([...expandScript(scripts, 'ci').bins].sort()).toEqual(['gen-types', 'jest', 'next']);
  });

  it('treats ambiguous config paths and config file names as inferred evidence', () => {
    expect(candidatePackages('next/core-web-vitals')[0]).toEqual({
      name: 'next',
      confidence: 'INFERRED',
      rule: 'subpath',
    });
    expect(configFileOwner('postcss.config.mjs')).toBe('postcss');
    expect(configFileOwner('apps/web/next.config.ts')).toBe('next');
    expect(configFileOwner('src/lib/config.ts')).toBeNull();
  });

  it('maps configuration values to packages, marking naming conventions as inferred', () => {
    expect(
      candidatePackages('next/core-web-vitals').filter((c) => c.name === 'eslint-config-next'),
    ).toEqual([
      {
        name: 'eslint-config-next',
        confidence: 'INFERRED',
        rule: 'ESLint shareable config naming',
      },
    ]);
    expect(
      candidatePackages('jsdom').find((c) => c.name === 'jest-environment-jsdom')?.confidence,
    ).toBe('INFERRED');
    expect(candidatePackages('ts-jest')[0]).toEqual({
      name: 'ts-jest',
      confidence: 'CONFIRMED',
      rule: 'literal',
    });
  });

  it('only matches quoted names or npx invocations in text files', () => {
    const hits = textReferences('Next we deploy.\nnpx --yes next build\nconst x = "next/link";\n', [
      'next',
    ]);
    expect(hits.map((h) => h.line)).toEqual([2, 3]);
  });
});

describe('usage and impact analysis', () => {
  let usage: UsageAnalysis;
  let impact: ImpactReport;

  beforeAll(async () => {
    const graph = parseLockfile(fs.readFileSync(`${ROOT}/package-lock.json`, 'utf8'));
    usage = analyseUsage({
      root: ROOT,
      ctx: testContext(),
      config: DEFAULT_CONFIG,
      graph,
      vulnerabilities: vulnerabilityReport(),
    });
    assertReport(usage.report);
    const registry = new StaticRegistry({
      'web-framework': {
        time: { '1.2.0': '2026-11-06T20:00:00.000Z' },
        versions: { '1.2.0': { engines: { node: '>=22' }, license: 'MIT' } },
      },
      'form-codec': {
        time: { '3.0.1': '2026-01-01T00:00:00.000Z' },
        versions: { '3.0.1': { license: 'MIT' } },
      },
      'ts-transform-dep': {
        time: { '1.0.1': '2026-01-01T00:00:00.000Z' },
        versions: { '1.0.1': { license: 'MIT' } },
      },
    });
    impact = await analyseImpact({
      ctx: testContext(),
      config: DEFAULT_CONFIG,
      graph,
      vulnerabilities: vulnerabilityReport(),
      usage,
      registry,
    });
    assertReport(impact);
  });

  const usageOf = (pkg: string) => usage.report.packages.find((p) => p.package === pkg);
  const impactOf = (pkg: string) => impact.packages.find((p) => p.package === pkg);
  const fileOf = (file: string) => impact.impactedFiles.find((f) => f.file === file);

  it('records every reference to a direct dependency with its relationship and line', () => {
    const web = usageOf('web-framework');
    expect(web?.status).toBe('USED_DIRECTLY');
    expect(
      web?.references.map((r) => `${r.file}:${r.line}:${r.relationship}:${r.confidence}`),
    ).toEqual([
      '.github/workflows/ci.yml:9:CI_WORKFLOW:CONFIRMED',
      'package.json:6:BUILD_SCRIPT:CONFIRMED',
      'scripts/deploy.sh:3:TEXT_REFERENCE:INFERRED',
      'src/app/page.tsx:1:TYPE_IMPORT:CONFIRMED',
      'src/components/Header.tsx:1:DIRECT_IMPORT:CONFIRMED',
    ]);
    expect(web?.limitations.map((l) => l.code)).toEqual(['BUILD_TOOL_SCOPE', 'ANALYSIS_PARTIAL']);
  });

  it('reports usage through the direct dependency that installs a transitive package', () => {
    const codec = usageOf('form-codec');
    expect(codec?.status).toBe('USED_TRANSITIVELY');
    expect(codec?.viaDirectDependencies).toEqual(['http-client']);
    expect(
      codec?.references.map((r) => `${r.file}:${r.relationship}:${r.referencedPackage}`),
    ).toEqual([
      'src/__tests__/api.test.ts:TEST_MOCK:http-client',
      'src/lib/api.ts:DIRECT_IMPORT:http-client',
    ]);
  });

  it('treats configuration-only references as tooling usage', () => {
    expect(usageOf('ts-transform-dep')?.status).toBe('TOOLING_ONLY');
    expect(usageOf('ts-transform-dep')?.references[0]).toMatchObject({
      file: 'jest.config.js',
      relationship: 'CONFIGURATION',
      referencedPackage: 'ts-transform',
    });
  });

  it('never reports an unreferenced package as unused', () => {
    expect(usageOf('ghost-pkg')).toMatchObject({
      status: 'UNKNOWN',
      completeness: 'UNKNOWN',
      references: [],
    });
    expect(usageOf('ghost-pkg')?.limitations[0].code).toBe('USAGE_NOT_FOUND');
    expect(impactOf('ghost-pkg')?.unknowns.map((u) => u.code)).toContain('IMPACT_UNKNOWN');
  });

  it('marks analysis partial when production code has non-literal dynamic imports', () => {
    expect(usage.report.dynamicImports).toEqual([
      expect.objectContaining({
        file: 'src/lib/format.ts',
        kind: 'import()',
        fileClass: 'production',
      }),
    ]);
    expect(usageOf('form-codec')?.completeness).toBe('PARTIAL');
  });

  it('builds dependents, entry points and a downstream graph through alias imports', () => {
    const web = impactOf('web-framework');
    expect(web).toMatchObject({
      directFiles: ['src/components/Header.tsx'],
      typeOnlyFiles: ['src/app/page.tsx'],
      dependentModules: ['src/app/page.tsx'],
      entryPoints: ['src/app/page.tsx'],
      components: ['src/app', 'src/components'],
      ciFiles: ['.github/workflows/ci.yml'],
    });
    expect(web?.downstreamGraph.edges).toEqual([
      ['package:web-framework', 'src/components/Header.tsx'],
      ['src/components/Header.tsx', 'src/app/page.tsx'],
    ]);
    expect(impactOf('form-codec')).toMatchObject({
      transitiveFiles: ['src/lib/api.ts'],
      dependentModules: ['src/components/Chat.tsx'],
      testFiles: ['src/__tests__/api.test.ts'],
    });
  });

  it('flags compatibility and supply-chain risk of the proposed upgrade', () => {
    expect(impactOf('web-framework')?.risk.level).toBe('HIGH');
    expect(
      impactOf('web-framework')
        ?.risk.signals.map((s) => s.code)
        .sort(),
    ).toEqual(['BUILD_TOOL', 'ENGINES_INCOMPATIBLE', 'RECENT_RELEASE']);
    expect(impactOf('form-codec')?.risk.level).toBe('LOW');
  });

  it('decides which impacted files need evidence, and explains why', () => {
    expect(fileOf('src/components/Header.tsx')).toMatchObject({
      impactKinds: ['DIRECT'],
      evidenceRequired: true,
      confidence: 'CONFIRMED',
    });
    expect(fileOf('src/lib/api.ts')).toMatchObject({
      impactKinds: ['TRANSITIVE'],
      evidenceRequired: true,
    });
    expect(fileOf('jest.config.js')).toMatchObject({
      impactKinds: ['CONFIGURATION'],
      evidenceRequired: true,
    });
    expect(fileOf('package.json')).toMatchObject({
      impactKinds: ['BUILD_SCRIPT'],
      evidenceRequired: true,
    });
    expect(fileOf('src/app/page.tsx')).toMatchObject({
      impactKinds: ['DEPENDENT_MODULE', 'TYPE_ONLY'],
      evidenceRequired: false,
    });
    expect(fileOf('src/components/Chat.tsx')).toMatchObject({
      impactKinds: ['DEPENDENT_MODULE'],
      evidenceRequired: false,
      confidence: 'INFERRED',
    });
    expect(fileOf('src/__tests__/api.test.ts')?.evidenceRequired).toBe(false);
    expect(fileOf('scripts/deploy.sh')?.evidenceRequired).toBe(false);
    expect(fileOf('README.md')).toBeUndefined();
  });

  it('gives every impacted file a trace back to the package', () => {
    const chat = fileOf('src/components/Chat.tsx');
    expect(chat?.traces[0].map((s) => `${s.from} -> ${s.to} (${s.relationship})`)).toEqual([
      'package:http-client -> src/lib/api.ts (DIRECT_IMPORT)',
      'src/lib/api.ts -> src/components/Chat.tsx (IMPORTED_BY)',
    ]);
    expect(impact.impactedFiles.every((f) => f.traces.length > 0)).toBe(true);
  });
});
