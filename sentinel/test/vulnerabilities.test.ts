import fs from 'node:fs';
import type { Vulnerability } from '../src/contracts/types';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import { assertReport } from '../src/core/report-io';
import {
  ancestorsOf,
  dependencyPaths,
  LockfileError,
  parseLockfile,
  resolveDependency,
  topLevelBins,
  viaDirectDependencies,
} from '../src/graph/lockfile';
import { runScan } from '../src/pipeline/scan';
import {
  advisoryKeys,
  AuditUnavailableError,
  ghsaFrom,
  parseNpmAudit,
} from '../src/vulnerabilities/npm-audit';
import { isSafePackageName, StaticRegistry } from '../src/vulnerabilities/registry';
import {
  classifyUpgrade,
  inVulnerableRange,
  newerVersions,
} from '../src/vulnerabilities/semver-utils';
import type { SourcedAdvisory } from '../src/vulnerabilities/sources';
import { fetchAdvisory, mergeAdvisories, parseOsvReport } from '../src/vulnerabilities/sources';
import type { GitHubApi } from '../src/github/client';
import { GitHubApiError } from '../src/github/client';
import { fixturePath, testContext } from './helpers';

const FIXTURE = fixturePath('vuln-basic');
const read = (file: string): string => fs.readFileSync(`${FIXTURE}/${file}`, 'utf8');
const registry = (): StaticRegistry => new StaticRegistry(JSON.parse(read('registry.json')));

describe('semver classification', () => {
  it.each([
    ['1.2.3', '1.2.4', 'patch'],
    ['1.2.3', '1.3.0', 'minor'],
    ['1.2.3', '2.0.0', 'major'],
    ['0.3.0', '0.3.2', 'patch'],
    ['0.3.0', '0.4.0', 'major'],
    ['0.0.3', '0.0.4', 'major'],
    ['29.7.0', '25.1.0', 'downgrade'],
    ['1.0.0', '1.0.0', 'none'],
    ['1.0.0-beta.1', '1.0.0', 'patch'],
    ['not-a-version', '1.0.0', 'major'],
  ])('%s -> %s is %s', (from, to, kind) => {
    expect(classifyUpgrade(from, to)).toBe(kind);
  });

  it('treats unparseable vulnerable ranges as matching (conservative)', () => {
    expect(inVulnerableRange('1.0.0', 'not a range at all ~~')).toBe(true);
    expect(inVulnerableRange('25.3.0-alpha.1', '>=25.2.0-alpha.86')).toBe(true);
    expect(inVulnerableRange('4.7.10', '3.0.0 - 4.7.9')).toBe(false);
  });

  it('only offers pre-releases when the current version is one', () => {
    expect(newerVersions('1.0.0', ['1.0.1-rc.1', '1.0.1', '0.9.0'])).toEqual(['1.0.1']);
    expect(newerVersions('1.0.1-rc.1', ['1.0.1-rc.2', '1.0.1'])).toEqual(['1.0.1-rc.2', '1.0.1']);
  });
});

describe('lockfile graph', () => {
  const graph = parseLockfile(read('package-lock.json'));

  it("resolves dependencies with Node's nested lookup", () => {
    expect(resolveDependency(graph.packages, 'node_modules/tool', 'beta')).toBe(
      'node_modules/tool/node_modules/beta',
    );
    expect(resolveDependency(graph.packages, 'node_modules/alpha', 'beta')).toBe(
      'node_modules/beta',
    );
    expect(resolveDependency(graph.packages, 'node_modules/tool/node_modules/beta', 'deep')).toBe(
      'node_modules/deep',
    );
    expect(resolveDependency(graph.packages, '', 'missing')).toBeNull();
  });

  it('computes ancestors, entry points and dependency paths', () => {
    expect([...ancestorsOf(graph, 'node_modules/deep')]).toEqual(['node_modules/tool']);
    expect(
      viaDirectDependencies(graph, 'node_modules/tool/node_modules/beta').map((e) => e.name),
    ).toEqual(['tool']);
    expect(dependencyPaths(graph, 'node_modules/beta', 10)).toEqual({
      paths: [['fixture-app@1.0.0', 'alpha@1.0.0', 'beta@2.1.2']],
      truncated: false,
    });
  });

  it('maps top-level binaries to packages', () => {
    expect(topLevelBins(graph).get('tool')).toBe('tool');
  });

  it('rejects lockfiles it cannot interpret', () => {
    expect(() => parseLockfile('{')).toThrow(LockfileError);
    expect(() => parseLockfile(JSON.stringify({ lockfileVersion: 1, dependencies: {} }))).toThrow(
      /Unsupported lockfileVersion 1/,
    );
  });
});

describe('npm audit parsing', () => {
  it('separates root-cause advisories from propagated entries', () => {
    const audit = parseNpmAudit(read('npm-audit.json'));
    expect(audit.entries.get('alpha')?.viaPackages).toEqual(['beta', 'gamma', 'vips', 'zeta']);
    expect(audit.entries.get('alpha')?.advisories).toEqual([]);
    expect(audit.advisories.map((a) => a.package).sort()).toEqual([
      'beta',
      'beta',
      'deep',
      'gamma',
      'lonely',
      'tool',
      'vips',
      'zeta',
    ]);
    expect(advisoryKeys(audit)).toContain('GHSA-2222-3333-4444|beta');
  });

  it('never treats an error payload or an old format as a clean audit', () => {
    expect(() =>
      parseNpmAudit(JSON.stringify({ error: { summary: 'ENOTFOUND registry' } })),
    ).toThrow(AuditUnavailableError);
    expect(() => parseNpmAudit(JSON.stringify({ auditReportVersion: 1, advisories: {} }))).toThrow(
      /auditReportVersion 2/,
    );
    expect(() => parseNpmAudit('')).toThrow(AuditUnavailableError);
  });

  it('normalises GHSA ids', () => {
    expect(ghsaFrom('https://github.com/advisories/ghsa-G5QG-72QW-GW5V')).toBe(
      'GHSA-g5qg-72qw-gw5v',
    );
    expect(ghsaFrom('no id here')).toBeNull();
  });
});

describe('vulnerability inventory', () => {
  let vulns: Vulnerability[];
  const byGhsa = (ghsa: string): Vulnerability =>
    vulns.find((v) => v.ids.ghsa === ghsa) as Vulnerability;

  beforeAll(async () => {
    const { report } = await runScan({
      root: FIXTURE,
      ctx: testContext(),
      config: DEFAULT_CONFIG,
      auditJsonPath: `${FIXTURE}/npm-audit.json`,
      registry: registry(),
      github: null,
      repoSlug: null,
      env: process.env,
    });
    assertReport(report);
    vulns = report.vulnerabilities;
    expect(report.summary.byFixStatus).toEqual({
      FIXABLE: 4,
      MAJOR_UPGRADE_REQUIRED: 2,
      PARENT_UPGRADE_REQUIRED: 1,
      NO_FIX_AVAILABLE: 1,
      UNKNOWN: 0,
    });
    expect(report.sources.find((s) => s.source === 'github-advisory-database')?.status).toBe(
      'UNAVAILABLE',
    );
    expect(report.limitations.map((l) => l.code)).toContain('CVE_IDS_UNAVAILABLE');
  });

  it('orders by severity, then CVSS, then direct before transitive', () => {
    expect(vulns.map((v) => `${v.priority}:${v.package}:${v.severity}`)).toEqual([
      '1:tool:critical',
      '2:beta:high',
      '3:zeta:high',
      '4:beta:moderate',
      '5:gamma:moderate',
      '6:lonely:moderate',
      '7:deep:low',
      '8:vips:low',
    ]);
  });

  it('fixes a direct exact-pinned dependency without trading one advisory for another', () => {
    const tool = byGhsa('GHSA-8888-9999-cccc');
    expect(tool.isDirect).toBe(true);
    expect(tool.scope).toBe('development');
    // 2.3.1 is the lowest fixed version but has its own advisory; 2.3.2 is clean.
    expect(tool.instances[0].fix).toMatchObject({
      status: 'FIXABLE',
      targetVersion: '2.3.2',
      upgradeType: 'minor',
      strategy: 'direct-update',
      fixedVersion: '2.3.1',
      introduces: [],
    });
  });

  it("accepts npm's parent suggestion only when the registry shows it helps", () => {
    const gamma = byGhsa('GHSA-wwww-xxxx-2345');
    expect(gamma.instances[0].fix).toMatchObject({
      status: 'FIXABLE',
      strategy: 'parent-update',
      parent: {
        name: 'alpha',
        location: 'node_modules/alpha',
        from: '1.0.0',
        to: '1.1.0',
        upgradeType: 'minor',
      },
    });
    expect(gamma.instances[0].fix.npmSuggestion?.accepted).toBe(true);
  });

  it("updates each transitive copy inside its parents' declared ranges", () => {
    const high = byGhsa('GHSA-2222-3333-4444');
    expect(high.instances.map((i) => [i.location, i.fix.targetVersion, i.fix.strategy])).toEqual([
      ['node_modules/beta', '2.2.0', 'transitive-update'],
    ]);
    expect(high.instances[0].dependencyPaths).toEqual([
      ['fixture-app@1.0.0', 'alpha@1.0.0', 'beta@2.1.2'],
    ]);
    const moderate = byGhsa('GHSA-5555-6666-7777');
    expect(moderate.instances.map((i) => [i.location, i.fix.targetVersion, i.dev])).toEqual([
      ['node_modules/tool/node_modules/beta', '1.9.0', true],
    ]);
  });

  it("escalates a major-only fix and rejects npm's downgrade suggestion", () => {
    const deep = byGhsa('GHSA-ffff-gggg-hhhh');
    expect(deep.fixStatus).toBe('MAJOR_UPGRADE_REQUIRED');
    expect(deep.instances[0].fix.fixedVersion).toBe('5.0.0');
    expect(deep.instances[0].fix.npmSuggestion).toEqual({
      name: 'tool',
      version: '1.0.0',
      isSemVerMajor: true,
      accepted: false,
      rejectionReason: 'downgrade from 2.0.0 to 1.0.0',
    });
  });

  it('reports a fix blocked by an exact parent pin as a parent upgrade', () => {
    const zeta = byGhsa('GHSA-jjjj-mmmm-pppp');
    expect(zeta.fixStatus).toBe('PARENT_UPGRADE_REQUIRED');
    expect(zeta.instances[0].fix.reason).toBe(
      "fixed in 0.3.2, outside the range declared by alpha (0.3.0); npm's suggestion rejected: " +
        'alpha@1.1.0 still requires zeta 0.3.0 (resolves to 0.3.0, still vulnerable)',
    );
  });

  it('rejects a parent suggestion whose child fix is a breaking 0.x upgrade', () => {
    // Mirrors sharp under next: the new parent allows ^0.35.5, but 0.34 -> 0.35 is breaking.
    const vips = byGhsa('GHSA-hhhh-jjjj-mmmm');
    expect(vips.fixStatus).toBe('MAJOR_UPGRADE_REQUIRED');
    expect(vips.instances[0].fix.npmSuggestion).toMatchObject({
      accepted: false,
      rejectionReason:
        'alpha@1.1.0 allows vips ^0.34.3 || ^0.35.5, but 0.34.5 -> 0.35.5 is a major upgrade',
    });
  });

  it('reports advisories with no fixed release', () => {
    expect(byGhsa('GHSA-qqqq-rrrr-vvvv').fixStatus).toBe('NO_FIX_AVAILABLE');
  });
});

describe('advisory sources', () => {
  const base: SourcedAdvisory = {
    sourceId: 1,
    ghsa: 'GHSA-2222-3333-4444',
    osvId: null,
    url: null,
    title: 't',
    severity: 'moderate',
    cwe: ['CWE-1'],
    cvssScore: 5,
    cvssVector: null,
    range: '<1.0.0',
    package: 'p',
    aliases: [],
    sources: ['npm-audit'],
  };

  it('merges the same advisory from several sources, keeping the highest severity', () => {
    const merged = mergeAdvisories([
      [base],
      [
        {
          ...base,
          sourceId: null,
          severity: 'high',
          range: '>=2.0.0 <2.1.0',
          aliases: ['CVE-2026-1'],
          sources: ['dependabot-alerts'],
        },
      ],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      severity: 'high',
      range: '<1.0.0 || >=2.0.0 <2.1.0',
      sources: ['dependabot-alerts', 'npm-audit'],
      aliases: ['CVE-2026-1'],
    });
  });

  it('converts OSV ranges and flags malicious packages', () => {
    const osv = parseOsvReport(
      JSON.stringify({
        results: [
          {
            packages: [
              {
                package: { name: 'left', version: '1.0.0', ecosystem: 'npm' },
                vulnerabilities: [
                  {
                    id: 'GHSA-2222-3333-4444',
                    aliases: ['CVE-2026-1234'],
                    summary: 'bad',
                    affected: [
                      {
                        package: { name: 'left' },
                        ranges: [
                          {
                            type: 'SEMVER',
                            events: [
                              { introduced: '0' },
                              { fixed: '1.0.5' },
                              { introduced: '2.0.0' },
                              { fixed: '2.0.1' },
                            ],
                          },
                        ],
                      },
                    ],
                    database_specific: { severity: 'HIGH' },
                  },
                  {
                    id: 'MAL-2026-1',
                    summary: 'steals tokens',
                    affected: [{ package: { name: 'left' }, versions: ['1.0.0'] }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(osv[0]).toMatchObject({
      ghsa: 'GHSA-2222-3333-4444',
      range: '<1.0.5 || >=2.0.0 <2.0.1',
      severity: 'high',
      aliases: ['CVE-2026-1234'],
    });
    expect(osv[1]).toMatchObject({
      osvId: 'MAL-2026-1',
      severity: 'critical',
      range: '1.0.0',
      title: 'Malicious package: steals tokens',
    });
  });

  it('enriches with CVE ids from the advisory API and tolerates unknown ids', async () => {
    const api: GitHubApi = {
      request: jest.fn(async (_method, path: string) => {
        if (path.endsWith('GHSA-2222-3333-4444')) {
          return {
            status: 200,
            data: {
              cve_id: 'CVE-2026-0001',
              identifiers: [
                { type: 'GHSA', value: 'GHSA-2222-3333-4444' },
                { type: 'CVE', value: 'CVE-2026-0001' },
              ],
              withdrawn_at: null,
            },
          };
        }
        throw new GitHubApiError(404, path, 'Not Found');
      }) as GitHubApi['request'],
      graphql: jest.fn(),
    };
    await expect(fetchAdvisory(api, 'GHSA-2222-3333-4444')).resolves.toEqual({
      ghsa: 'GHSA-2222-3333-4444',
      cve: 'CVE-2026-0001',
      aliases: [],
      withdrawn: false,
    });
    await expect(fetchAdvisory(api, 'GHSA-5555-6666-7777')).resolves.toBeNull();
  });

  it('only passes safe package names to npm', () => {
    expect(isSafePackageName('@scope/pkg')).toBe(true);
    expect(isSafePackageName('--registry=https://evil')).toBe(false);
    expect(isSafePackageName('-x')).toBe(false);
  });
});
