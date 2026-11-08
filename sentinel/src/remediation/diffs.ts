import type { ManifestChange, PackageChange } from '../contracts/types';
import type { DependencyGraph } from '../graph/lockfile';
import { descendantsOf } from '../graph/lockfile';
import { classifyUpgrade } from '../vulnerabilities/semver-utils';

const SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'overrides',
] as const;

/**
 * Every package-level difference between two lockfiles, each attributed: targeted by the
 * remediation, a dependency of a targeted package (added, removed or moved because a targeted
 * package changed), or unrelated.
 */
export function diffLockfiles(
  before: DependencyGraph,
  after: DependencyGraph,
  targeted: ReadonlySet<string>,
  keysByPackage: ReadonlyMap<string, string[]>,
): PackageChange[] {
  const reach = (graph: DependencyGraph): Map<string, Set<string>> => {
    const owners = new Map<string, Set<string>>();
    for (const pkg of graph.packages.values()) {
      if (!targeted.has(pkg.name) || pkg.location === '') continue;
      for (const descendant of descendantsOf(graph, pkg.location)) {
        owners.set(descendant, new Set([...(owners.get(descendant) ?? []), pkg.name]));
      }
    }
    return owners;
  };
  const ownersAfter = reach(after);
  const ownersBefore = reach(before);
  const locations = [...new Set([...before.packages.keys(), ...after.packages.keys()])]
    .filter((l) => l !== '')
    .sort();
  const changes: PackageChange[] = [];
  for (const location of locations) {
    const a = before.packages.get(location);
    const b = after.packages.get(location);
    if (
      a &&
      b &&
      a.version === b.version &&
      a.resolved === b.resolved &&
      a.integrity === b.integrity
    )
      continue;
    const name = (b ?? a)!.name;
    const changeType: PackageChange['changeType'] = !a ? 'added' : !b ? 'removed' : 'updated';
    const owners = [...(ownersAfter.get(location) ?? []), ...(ownersBefore.get(location) ?? [])];
    let relation: PackageChange['relation'] = 'unrelated';
    let relatedTo: string[] = [];
    if (targeted.has(name)) {
      relation = 'targeted';
      relatedTo = keysByPackage.get(name) ?? [];
    } else if (owners.length > 0) {
      relation = 'dependency-of-targeted';
      relatedTo = [...new Set(owners)].sort();
    }
    const kind = a && b ? classifyUpgrade(a.version, b.version) : null;
    changes.push({
      name,
      location,
      changeType,
      from: a?.version ?? null,
      to: b?.version ?? null,
      upgradeType: kind === 'none' ? null : kind,
      relation,
      relatedTo,
      dev: (b ?? a)!.dev,
      hasInstallScript: b?.hasInstallScript ?? false,
      license: b?.license ?? null,
      previousLicense: a?.license ?? null,
    });
  }
  return changes;
}

/**
 * Differences between two package.json documents. Only the version spec of a targeted package in
 * a dependency section is an allowed change; anything else (scripts, new packages, other fields)
 * is reported as not allowed.
 */
export function diffManifests(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  targeted: ReadonlySet<string>,
): ManifestChange[] {
  const changes: ManifestChange[] = [];
  for (const section of SECTIONS) {
    const a = (before[section] ?? {}) as Record<string, unknown>;
    const b = (after[section] ?? {}) as Record<string, unknown>;
    for (const name of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      const from = a[name] === undefined ? null : JSON.stringify(a[name]).replace(/^"|"$/g, '');
      const to = b[name] === undefined ? null : JSON.stringify(b[name]).replace(/^"|"$/g, '');
      if (from === to) continue;
      const allowed =
        section !== 'overrides' &&
        section !== 'peerDependencies' &&
        from !== null &&
        to !== null &&
        targeted.has(name);
      changes.push({ field: section, package: name, from, to, allowed });
    }
  }
  const others = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((k) => !(SECTIONS as readonly string[]).includes(k))
    .sort();
  for (const field of others) {
    const from = before[field] === undefined ? null : JSON.stringify(before[field]);
    const to = after[field] === undefined ? null : JSON.stringify(after[field]);
    if (from !== to) {
      changes.push({
        field,
        package: '',
        from: from?.slice(0, 200) ?? null,
        to: to?.slice(0, 200) ?? null,
        allowed: false,
      });
    }
  }
  return changes;
}
