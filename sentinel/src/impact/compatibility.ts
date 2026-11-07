import semver from 'semver';
import type { RiskSignal, VulnerabilityReport } from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import type { DependencyGraph } from '../graph/lockfile';
import type { RegistryClient } from '../vulnerabilities/registry';
import { classifyUpgrade, isPrerelease } from '../vulnerabilities/semver-utils';

/** One version change Sentinel proposes to make. */
export interface PlannedUpgrade {
  package: string;
  location: string;
  from: string;
  to: string;
}

/** Version changes implied by the fixable instances of the vulnerability report. */
export function plannedUpgrades(report: VulnerabilityReport): PlannedUpgrade[] {
  const byLocation = new Map<string, PlannedUpgrade>();
  for (const v of report.vulnerabilities) {
    if (!v.inScope) continue;
    for (const instance of v.instances) {
      const fix = instance.fix;
      if (fix.status !== 'FIXABLE') continue;
      const planned =
        fix.strategy === 'parent-update' && fix.parent
          ? {
              package: fix.parent.name,
              location: fix.parent.location,
              from: fix.parent.from,
              to: fix.parent.to,
            }
          : fix.targetVersion
            ? {
                package: v.package,
                location: instance.location,
                from: instance.version,
                to: fix.targetVersion,
              }
            : null;
      if (!planned) continue;
      const existing = byLocation.get(planned.location);
      if (!existing || semver.gt(planned.to, existing.to)) {
        byLocation.set(planned.location, planned);
      }
    }
  }
  return [...byLocation.values()].sort((a, b) => a.location.localeCompare(b.location));
}

function enginesAllow(range: string | undefined, nodeMajor: string): boolean {
  if (!range) return true;
  try {
    return semver.intersects(range, `${nodeMajor}.x`, { loose: true });
  } catch {
    return false;
  }
}

function sameRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k] === b[k]);
}

/**
 * Compatibility and supply-chain signals for each planned upgrade, from the lockfile (current
 * version) and the registry (target version). Keyed by package name.
 */
export async function assessCompatibility(
  planned: readonly PlannedUpgrade[],
  graph: DependencyGraph,
  registry: RegistryClient,
  config: SentinelConfig,
  now: Date,
): Promise<Map<string, RiskSignal[]>> {
  const signals = new Map<string, RiskSignal[]>();
  const add = (pkg: string, signal: RiskSignal): void => {
    signals.set(pkg, [...(signals.get(pkg) ?? []), signal]);
  };
  for (const upgrade of planned) {
    const current = graph.packages.get(upgrade.location);
    const kind = classifyUpgrade(upgrade.from, upgrade.to);
    if (kind === 'major' || kind === 'downgrade') {
      add(upgrade.package, {
        code: 'MAJOR_UPGRADE',
        package: upgrade.package,
        detail: `${upgrade.from} -> ${upgrade.to} is a ${kind}`,
      });
    }
    if (isPrerelease(upgrade.to)) {
      add(upgrade.package, {
        code: 'PRERELEASE_TARGET',
        package: upgrade.package,
        detail: `${upgrade.to} is a pre-release`,
      });
    }
    const target = await registry.versionManifest(upgrade.package, upgrade.to);
    if (!target) {
      add(upgrade.package, {
        code: 'METADATA_UNAVAILABLE',
        package: upgrade.package,
        detail:
          `registry metadata for ${upgrade.package}@${upgrade.to} unavailable; ` +
          'compatibility not assessed',
      });
      continue;
    }
    const at = `${upgrade.package}@${upgrade.to}`;
    if (!enginesAllow(target.engines.node, config.runtime.node)) {
      add(upgrade.package, {
        code: 'ENGINES_INCOMPATIBLE',
        package: upgrade.package,
        detail: `${at} requires node ${target.engines.node}; CI runs node ${config.runtime.node}`,
      });
    } else if ((current?.engines.node ?? '') !== (target.engines.node ?? '')) {
      add(upgrade.package, {
        code: 'ENGINES_CHANGED',
        package: upgrade.package,
        detail:
          `engines.node ${current?.engines.node ?? '(none)'} -> ` +
          (target.engines.node ?? '(none)'),
      });
    }
    if (current && !sameRecord(current.peerDependencies, target.peerDependencies)) {
      add(upgrade.package, {
        code: 'PEER_DEPENDENCIES_CHANGED',
        package: upgrade.package,
        detail: `${at} declares different peer dependencies`,
      });
    }
    if (target.hasInstallScript && !current?.hasInstallScript) {
      add(upgrade.package, {
        code: 'INSTALL_SCRIPT',
        package: upgrade.package,
        detail: `${at} adds an install script`,
      });
    }
    if (current?.license && target.license && current.license !== target.license) {
      add(upgrade.package, {
        code: 'LICENSE_CHANGED',
        package: upgrade.package,
        detail: `license ${current.license} -> ${target.license}`,
      });
    }
    if (target.deprecated) {
      add(upgrade.package, {
        code: 'DEPRECATED_VERSION',
        package: upgrade.package,
        detail: `${at} is deprecated: ${target.deprecated}`,
      });
    }
    if (target.publishedAt) {
      const ageHours = (now.getTime() - Date.parse(target.publishedAt)) / 3_600_000;
      if (ageHours < config.remediation.minimumReleaseAgeHours) {
        add(upgrade.package, {
          code: 'RECENT_RELEASE',
          package: upgrade.package,
          detail:
            `${at} was published ${Math.max(0, Math.floor(ageHours))}h ago ` +
            `(policy minimum ${config.remediation.minimumReleaseAgeHours}h)`,
        });
      }
    } else {
      add(upgrade.package, {
        code: 'METADATA_UNAVAILABLE',
        package: upgrade.package,
        detail: `publish time of ${at} unknown`,
      });
    }
  }
  return signals;
}
