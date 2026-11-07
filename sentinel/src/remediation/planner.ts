import semver from 'semver';
import type { Escalation, VulnerabilityReport } from '../contracts/types';
import type { DependencyGraph } from '../graph/lockfile';
import { isSafePackageName } from '../vulnerabilities/registry';

export type SaveType = 'prod' | 'dev' | 'optional';

export interface PlannedAction {
  id: string;
  kind: 'npm-install' | 'npm-update';
  /** For installs the package; for updates a space-separated list of names. */
  package: string;
  spec: string;
  argv: string[];
  targets: string[];
}

export interface RemediationPlan {
  actions: PlannedAction[];
  escalations: Escalation[];
  /** Package names whose lockfile changes count as targeted. */
  targetedPackages: Set<string>;
  /** Vulnerability keys with at least one instance Sentinel will change. */
  targetedKeys: Set<string>;
}

const COMMON_FLAGS = ['--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'];

interface ManifestSections {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** Which manifest section declares `name`, and with what spec. */
export function declaredSpec(
  manifest: ManifestSections,
  name: string,
): { saveType: SaveType | 'peer'; spec: string } | null {
  if (manifest.optionalDependencies?.[name] !== undefined)
    return { saveType: 'optional', spec: manifest.optionalDependencies[name] };
  if (manifest.dependencies?.[name] !== undefined)
    return { saveType: 'prod', spec: manifest.dependencies[name] };
  if (manifest.devDependencies?.[name] !== undefined)
    return { saveType: 'dev', spec: manifest.devDependencies[name] };
  if (manifest.peerDependencies?.[name] !== undefined)
    return { saveType: 'peer', spec: manifest.peerDependencies[name] };
  return null;
}

/**
 * npm flags that make `npm install name@version` keep the manifest's range style: an exact pin
 * stays exact, `~` stays `~`, `^` stays `^`. Other specs (tags, URLs, `*`, complex ranges) are not
 * rewritten automatically.
 */
export function styleFlags(spec: string): string[] | null {
  const trimmed = spec.trim();
  if (semver.valid(trimmed)) return ['--save-exact'];
  if (/^\^\d+\.\d+\.\d+(-[\w.]+)?$/.test(trimmed)) return [];
  if (/^~\d+\.\d+\.\d+(-[\w.]+)?$/.test(trimmed)) return ['--save-prefix=~'];
  return null;
}

/**
 * Turns the fixable, in-scope instances of the vulnerability report into npm commands:
 * `npm install <direct>@<version>` (range style preserved) for direct and parent updates, then one
 * `npm update` for transitive packages, including children of updated parents (npm keeps a locked
 * child that still satisfies the new parent range unless it is updated explicitly).
 * Everything else becomes an escalation with its reason.
 */
export function planRemediation(
  report: VulnerabilityReport,
  manifest: ManifestSections,
): RemediationPlan {
  const installs = new Map<string, { version: string; targets: Set<string> }>();
  const updates = new Map<string, Set<string>>();
  const escalations: Escalation[] = [];
  const targetedKeys = new Set<string>();
  const escalate = (e: Escalation): void => {
    if (
      !escalations.some(
        (x) => x.vulnerabilityKey === e.vulnerabilityKey && x.location === e.location,
      )
    )
      escalations.push(e);
  };
  const wantInstall = (name: string, version: string, key: string): void => {
    const current = installs.get(name);
    if (!current) {
      installs.set(name, { version, targets: new Set([key]) });
    } else {
      if (semver.gt(version, current.version)) current.version = version;
      current.targets.add(key);
    }
  };
  const wantUpdate = (name: string, key: string): void => {
    updates.set(name, new Set([...(updates.get(name) ?? []), key]));
  };

  for (const v of report.vulnerabilities) {
    for (const instance of v.instances) {
      const fix = instance.fix;
      if (!v.inScope) {
        escalate({
          vulnerabilityKey: v.key,
          package: v.package,
          location: instance.location,
          reason: 'OUT_OF_SCOPE',
          detail: `severity ${v.severity} is below the policy minimum`,
        });
        continue;
      }
      if (fix.status !== 'FIXABLE') {
        escalate({
          vulnerabilityKey: v.key,
          package: v.package,
          location: instance.location,
          reason: fix.status,
          detail: fix.reason,
        });
        continue;
      }
      if (fix.strategy === 'transitive-update') {
        wantUpdate(v.package, v.key);
      } else if (fix.strategy === 'direct-update' && fix.targetVersion) {
        wantInstall(v.package, fix.targetVersion, v.key);
      } else if (fix.strategy === 'parent-update' && fix.parent) {
        wantInstall(fix.parent.name, fix.parent.to, v.key);
        wantUpdate(v.package, v.key);
      } else {
        escalate({
          vulnerabilityKey: v.key,
          package: v.package,
          location: instance.location,
          reason: 'UNKNOWN',
          detail: 'fixable instance without a usable strategy',
        });
        continue;
      }
      targetedKeys.add(v.key);
    }
  }

  const actions: PlannedAction[] = [];
  const targetedPackages = new Set<string>();
  for (const name of [...installs.keys()].sort()) {
    const { version, targets } = installs.get(name) as { version: string; targets: Set<string> };
    const declared = declaredSpec(manifest, name);
    const flags = declared && declared.saveType !== 'peer' ? styleFlags(declared.spec) : null;
    if (
      !isSafePackageName(name) ||
      !semver.valid(version) ||
      !declared ||
      declared.saveType === 'peer' ||
      flags === null
    ) {
      for (const key of targets) {
        targetedKeys.delete(key);
        escalate({
          vulnerabilityKey: key,
          package: name,
          location: `node_modules/${name}`,
          reason: 'MANIFEST_SPEC_UNSUPPORTED',
          detail: declared
            ? `${name} is declared as "${declared.spec}" in ` +
              `${declared.saveType === 'peer' ? 'peerDependencies' : 'the manifest'}; ` +
              'not rewritten automatically'
            : `${name} is not declared in the manifest`,
        });
      }
      continue;
    }
    const saveFlag =
      declared.saveType === 'dev'
        ? '--save-dev'
        : declared.saveType === 'optional'
          ? '--save-optional'
          : '--save-prod';
    targetedPackages.add(name);
    actions.push({
      id: `install-${name}`,
      kind: 'npm-install',
      package: name,
      spec: version,
      argv: ['npm', 'install', `${name}@${version}`, saveFlag, ...flags, ...COMMON_FLAGS],
      targets: [...targets].sort(),
    });
  }
  const updateNames = [...updates.keys()].filter((n) => isSafePackageName(n)).sort();
  if (updateNames.length > 0) {
    updateNames.forEach((n) => targetedPackages.add(n));
    actions.push({
      id: 'update-transitive',
      kind: 'npm-update',
      package: updateNames.join(' '),
      spec: 'within declared ranges',
      argv: ['npm', 'update', ...updateNames, ...COMMON_FLAGS],
      targets: [...new Set(updateNames.flatMap((n) => [...(updates.get(n) ?? [])]))].sort(),
    });
  }
  return {
    actions,
    escalations: escalations.sort(
      (a, b) =>
        a.package.localeCompare(b.package) || a.vulnerabilityKey.localeCompare(b.vulnerabilityKey),
    ),
    targetedPackages,
    targetedKeys,
  };
}

/** Root manifest sections recorded in the lockfile, used when package.json is unavailable. */
export function manifestFromGraph(graph: DependencyGraph): ManifestSections {
  const root = graph.packages.get('');
  return {
    dependencies: root?.dependencies,
    devDependencies: root?.devDependencies,
    optionalDependencies: root?.optionalDependencies,
    peerDependencies: root?.peerDependencies,
  };
}
