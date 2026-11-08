import semver from 'semver';
import type {
  FixStatus,
  Limitation,
  RequiredBy,
  Severity,
  SourceStatus,
  Vulnerability,
  VulnerabilityReport,
  VulnerableInstance,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';
import type { DependencyGraph } from '../graph/lockfile';
import { dependencyPaths, directDependencies } from '../graph/lockfile';
import type { FixAvailable } from './npm-audit';
import type { BulkAdvisory, RegistryClient } from './registry';
import type { AdvisoryDetails, SourcedAdvisory } from './sources';
import { advisoryIdentity } from './sources';
import type { InstanceContext, KnownAdvisory, SuggestionCheck } from './fix-assessment';
import {
  affects,
  assessAdvisory,
  assessSuggestion,
  groupKnownAdvisories,
  planInstance,
} from './fix-assessment';
import {
  classifyUpgrade,
  inVulnerableRange,
  isAllowedUpgrade,
  newerVersions,
} from './semver-utils';

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  info: 0,
};

const FIX_ORDER: FixStatus[] = [
  'UNKNOWN',
  'NO_FIX_AVAILABLE',
  'MAJOR_UPGRADE_REQUIRED',
  'PARENT_UPGRADE_REQUIRED',
];
const MAX_CANDIDATES = 300;

export interface InventoryInput {
  ctx: RunContext;
  config: SentinelConfig;
  graph: DependencyGraph;
  lockfilePath: string;
  advisories: SourcedAdvisory[];
  fixAvailable: Map<string, FixAvailable>;
  sourceStatuses: SourceStatus[];
  details: Map<string, AdvisoryDetails>;
  registry: RegistryClient;
  limitations: Limitation[];
}

function aggregateFixStatus(instances: VulnerableInstance[]): FixStatus {
  if (instances.every((i) => i.fix.status === 'FIXABLE')) {
    return 'FIXABLE';
  }
  return FIX_ORDER.find((status) => instances.some((i) => i.fix.status === status)) ?? 'UNKNOWN';
}

function bulkKey(advisory: BulkAdvisory, pkg: string): string {
  return `${advisory.ghsa ?? advisory.key}|${pkg}`;
}

/**
 * Checks npm's suggested parent version against the registry: does that version of the parent
 * still declare a range of the package that resolves to a vulnerable version?
 */
async function checkSuggestion(
  input: InventoryInput,
  instance: InstanceContext,
  fix: FixAvailable,
  current: KnownAdvisory[],
  versions: readonly string[] | null,
  allowed: readonly string[],
): Promise<SuggestionCheck | null> {
  if (typeof fix !== 'object') return null;
  const parentEdge = (input.graph.out.get('') ?? []).find((e) => e.name === fix.name);
  if (!parentEdge?.to || !instance.parentRanges.some((p) => p.location === parentEdge.to)) {
    return {
      verified: null,
      reason:
        `${fix.name} is not the direct parent of ${instance.location}; ` +
        'verified after remediation',
    };
  }
  const manifest = await input.registry.versionManifest(fix.name, fix.version);
  if (!manifest) {
    return {
      verified: null,
      reason: `registry metadata for ${fix.name}@${fix.version} unavailable`,
    };
  }
  const declared = manifest.dependencies[instance.name];
  if (declared === undefined) {
    return {
      verified: true,
      reason: `${fix.name}@${fix.version} no longer depends on ${instance.name}`,
    };
  }
  const pick = versions ? semver.maxSatisfying([...versions], declared) : null;
  if (!pick || current.some((a) => affects(a, pick))) {
    return {
      verified: false,
      reason:
        `${fix.name}@${fix.version} still requires ${instance.name} ${declared}` +
        (pick ? ` (resolves to ${pick}, still vulnerable)` : ''),
    };
  }
  if (pick !== instance.version && !isAllowedUpgrade(instance.version, pick, allowed)) {
    return {
      verified: false,
      reason:
        `${fix.name}@${fix.version} allows ${instance.name} ${declared}, but ` +
        `${instance.version} -> ${pick} is a ${classifyUpgrade(instance.version, pick)} upgrade`,
    };
  }
  return {
    verified: true,
    reason:
      `${fix.name}@${fix.version} requires ${instance.name} ${declared} ` + `(resolves to ${pick})`,
  };
}

/**
 * Builds the vulnerability inventory: one entry per root-cause advisory and package, with every
 * installed instance it affects, how that instance is reached, and how (or whether) it can be
 * fixed under the policy. Candidate versions are checked against the registry's advisories so a
 * fix does not knowingly trade one advisory for another.
 */
export async function buildVulnerabilityReport(
  input: InventoryInput,
): Promise<VulnerabilityReport> {
  const { graph, config } = input;
  const allowed = config.remediation.allowedUpgradeTypes;
  const limitations = [...input.limitations];
  const direct = directDependencies(graph);
  const byPackage = new Map<string, SourcedAdvisory[]>();
  for (const advisory of input.advisories) {
    byPackage.set(advisory.package, [...(byPackage.get(advisory.package) ?? []), advisory]);
  }
  const packageNames = [...byPackage.keys()].sort();

  const contextsByPackage = new Map<string, InstanceContext[]>();
  const versionsByPackage = new Map<string, string[] | null>();
  const candidates: Record<string, string[]> = {};
  for (const pkgName of packageNames) {
    const installed = [...graph.packages.values()].filter(
      (p) => p.name === pkgName && p.location !== '' && !p.link,
    );
    const contexts = installed.map((pkg) => ({
      location: pkg.location,
      name: pkg.name,
      version: pkg.version,
      direct: direct.get(pkgName)?.to === pkg.location,
      parentRanges: (graph.in.get(pkg.location) ?? [])
        .filter((e) => e.from !== '')
        .map((e) => ({
          location: e.from,
          name: graph.packages.get(e.from)?.name ?? e.from,
          range: e.range,
        })),
    }));
    contextsByPackage.set(pkgName, contexts);
    const info = await input.registry.packageInfo(pkgName);
    const versions = info?.versions ?? null;
    versionsByPackage.set(pkgName, versions);
    if (!versions) {
      limitations.push({
        code: 'REGISTRY_UNAVAILABLE',
        message: `No version list for ${pkgName}; fixes cannot be assessed`,
        subject: pkgName,
      });
      continue;
    }
    const set = new Set<string>(contexts.map((c) => c.version));
    for (const c of contexts) {
      for (const v of newerVersions(c.version, versions)) {
        if (isAllowedUpgrade(c.version, v, allowed)) set.add(v);
      }
    }
    candidates[pkgName] = [...set].slice(-MAX_CANDIDATES);
  }

  const bulk = await input.registry.advisoriesFor(candidates);
  if (!bulk) {
    limitations.push({
      code: 'CANDIDATE_ADVISORIES_UNAVAILABLE',
      message:
        'Registry bulk advisory endpoint unreachable; target versions were only checked ' +
        'against advisories that affect the installed versions',
    });
  }

  const vulnerabilities: Vulnerability[] = [];
  for (const pkgName of packageNames) {
    const advisories = byPackage.get(pkgName) as SourcedAdvisory[];
    const contexts = contextsByPackage.get(pkgName) as InstanceContext[];
    const versions = versionsByPackage.get(pkgName) ?? null;
    const known = groupKnownAdvisories([
      ...advisories.map((a) => ({
        key: advisoryIdentity(a),
        range: a.range,
        severity: a.severity,
      })),
      ...(bulk?.get(pkgName) ?? []).map((b) => ({
        key: bulkKey(b, pkgName),
        range: b.range,
        severity: b.severity,
      })),
    ]);
    const plans = new Map(
      contexts.map((c) => [c.location, planInstance(c, known, versions, allowed)]),
    );
    const fixAvailable = input.fixAvailable.get(pkgName) ?? false;
    const suggestions = new Map<string, ReturnType<typeof assessSuggestion>>();
    for (const c of contexts) {
      const current = known.filter((a) => affects(a, c.version));
      const check = c.direct
        ? null
        : await checkSuggestion(input, c, fixAvailable, current, versions, allowed);
      suggestions.set(c.location, assessSuggestion(graph, fixAvailable, allowed, check));
    }

    for (const advisory of advisories) {
      const details = advisory.ghsa ? input.details.get(advisory.ghsa) : undefined;
      if (details?.withdrawn) {
        limitations.push({
          code: 'ADVISORY_WITHDRAWN',
          message: `${advisory.ghsa} has been withdrawn; ignored`,
          subject: advisory.ghsa ?? undefined,
        });
        continue;
      }
      const knownAdvisory = known.find(
        (k) => k.key === advisoryIdentity(advisory),
      ) as KnownAdvisory;
      const affected = contexts.filter((c) => inVulnerableRange(c.version, advisory.range));
      if (affected.length === 0) {
        limitations.push({
          code: 'NO_VULNERABLE_INSTANCE',
          message:
            `${advisory.ghsa ?? advisory.title} reported for ${pkgName} ` +
            `but no installed copy is in ${advisory.range}`,
          subject: pkgName,
        });
        continue;
      }
      const instances: VulnerableInstance[] = affected.map((c) => {
        const pkg = graph.packages.get(c.location);
        const { paths, truncated } = dependencyPaths(
          graph,
          c.location,
          config.remediation.maxDependencyPaths,
        );
        const requiredBy: RequiredBy[] = (graph.in.get(c.location) ?? []).map((e) => ({
          location: e.from,
          name: e.from === '' ? graph.rootName : (graph.packages.get(e.from)?.name ?? e.from),
          version: e.from === '' ? graph.rootVersion : (graph.packages.get(e.from)?.version ?? ''),
          range: e.range,
        }));
        return {
          location: c.location,
          version: c.version,
          direct: c.direct,
          dev: pkg?.dev === true,
          optional: pkg?.optional === true || pkg?.devOptional === true,
          dependencyPaths: paths,
          pathsTruncated: truncated,
          requiredBy: requiredBy.sort((a, b) => a.location.localeCompare(b.location)),
          fix: assessAdvisory(
            c,
            knownAdvisory,
            plans.get(c.location) as ReturnType<typeof planInstance>,
            versions,
            suggestions.get(c.location) ?? null,
            graph,
          ),
        };
      });
      const cves = new Set<string>();
      if (details?.cve) cves.add(details.cve);
      advisory.aliases.filter((a) => /^CVE-\d{4}-\d+$/.test(a)).forEach((a) => cves.add(a));
      const aliases = new Set<string>([
        ...(details?.aliases ?? []),
        ...advisory.aliases.filter((a) => !cves.has(a)),
      ]);
      if (advisory.osvId && advisory.osvId !== advisory.ghsa) aliases.add(advisory.osvId);
      if (advisory.sourceId !== null) aliases.add(`npm-${advisory.sourceId}`);
      const devOnly = instances.every((i) => i.dev);
      const prodOnly = instances.every((i) => !i.dev);
      vulnerabilities.push({
        key: advisoryIdentity(advisory),
        ids: { ghsa: advisory.ghsa, cve: [...cves].sort(), aliases: [...aliases].sort() },
        title: advisory.title,
        url: advisory.url,
        severity: advisory.severity,
        cvss: { score: advisory.cvssScore, vector: advisory.cvssVector },
        cwe: advisory.cwe,
        package: pkgName,
        vulnerableRange: advisory.range,
        sources: advisory.sources,
        instances,
        isDirect: instances.some((i) => i.direct),
        scope: devOnly ? 'development' : prodOnly ? 'production' : 'mixed',
        fixStatus: aggregateFixStatus(instances),
        inScope: SEVERITY_RANK[advisory.severity] >= SEVERITY_RANK[config.severity.minimum],
        priority: 0,
      });
    }
  }

  vulnerabilities.sort(
    (a, b) =>
      Number(b.inScope) - Number(a.inScope) ||
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      (b.cvss.score ?? 0) - (a.cvss.score ?? 0) ||
      Number(b.isDirect) - Number(a.isDirect) ||
      a.package.localeCompare(b.package) ||
      a.key.localeCompare(b.key),
  );
  vulnerabilities.forEach((v, i) => {
    v.priority = i + 1;
  });

  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };
  const byFixStatus: Record<FixStatus, number> = {
    FIXABLE: 0,
    MAJOR_UPGRADE_REQUIRED: 0,
    PARENT_UPGRADE_REQUIRED: 0,
    NO_FIX_AVAILABLE: 0,
    UNKNOWN: 0,
  };
  for (const v of vulnerabilities) {
    bySeverity[v.severity] += 1;
    byFixStatus[v.fixStatus] += 1;
  }

  return {
    ...makeHeader(input.ctx, 'vulnerability-report', limitations),
    ecosystem: 'npm',
    lockfile: {
      path: input.lockfilePath,
      lockfileVersion: graph.lockfileVersion,
      packages: graph.packages.size - 1,
    },
    sources: input.sourceStatuses,
    summary: {
      total: vulnerabilities.length,
      bySeverity,
      direct: vulnerabilities.filter((v) => v.isDirect).length,
      transitive: vulnerabilities.filter((v) => !v.isDirect).length,
      inScope: vulnerabilities.filter((v) => v.inScope).length,
      byFixStatus,
    },
    vulnerabilities,
  };
}
