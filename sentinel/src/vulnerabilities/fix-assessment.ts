import type { InstanceFix, NpmSuggestion, Severity } from '../contracts/types';
import type { DependencyGraph } from '../graph/lockfile';
import type { FixAvailable } from './npm-audit';
import {
  classifyUpgrade,
  inVulnerableRange,
  isAllowedUpgrade,
  newerVersions,
  satisfiesDeclared,
} from './semver-utils';

/** Every known vulnerable range of one advisory for one package. */
export interface KnownAdvisory {
  key: string;
  ranges: string[];
  severity: Severity;
}

export interface InstanceContext {
  location: string;
  name: string;
  version: string;
  direct: boolean;
  parentRanges: { location: string; name: string; range: string }[];
}

export interface InstancePlan {
  /** Version every applicable advisory of this instance is assessed against (null: none). */
  target: string | null;
  strategy: 'direct-update' | 'transitive-update' | null;
  /** Advisory keys that affect the target but not the installed version. */
  introduced: string[];
  note: string;
}

/** Merges advisory entries that share a key (npm splits one GHSA into several ranges). */
export function groupKnownAdvisories(
  entries: readonly { key: string; range: string; severity: Severity }[],
): KnownAdvisory[] {
  const rank: Record<Severity, number> = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };
  const map = new Map<string, KnownAdvisory>();
  for (const e of entries) {
    const existing = map.get(e.key);
    if (!existing) {
      map.set(e.key, { key: e.key, ranges: [e.range], severity: e.severity });
    } else {
      if (!existing.ranges.includes(e.range)) existing.ranges.push(e.range);
      if (rank[e.severity] > rank[existing.severity]) existing.severity = e.severity;
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function affects(advisory: KnownAdvisory, version: string): boolean {
  return advisory.ranges.some((range) => inVulnerableRange(version, range));
}

interface Score {
  introduced: KnownAdvisory[];
  remaining: number;
}

function score(
  known: readonly KnownAdvisory[],
  current: readonly KnownAdvisory[],
  version: string,
): Score {
  const hits = known.filter((a) => affects(a, version));
  const introduced = hits.filter((a) => !current.includes(a));
  return { introduced, remaining: hits.length - introduced.length };
}

/**
 * Chooses the version an instance should move to, scoring candidates by (advisories introduced,
 * advisories remaining, version): a target that brings in an advisory the installed version does
 * not have is only chosen when no allowed alternative avoids it. Direct dependencies may move to
 * any allowed version (the manifest is edited). Transitive ones move only the way `npm update`
 * moves them: to the newest version satisfying every parent's declared range.
 */
export function planInstance(
  instance: InstanceContext,
  known: readonly KnownAdvisory[],
  versions: readonly string[] | null,
  allowed: readonly string[],
): InstancePlan {
  if (!versions) {
    return { target: null, strategy: null, introduced: [], note: 'registry metadata unavailable' };
  }
  const current = known.filter((a) => affects(a, instance.version));
  const newer = newerVersions(instance.version, versions);

  if (instance.direct) {
    let best: string | null = null;
    let bestScore: Score | null = null;
    for (const candidate of newer) {
      if (!isAllowedUpgrade(instance.version, candidate, allowed)) continue;
      const s = score(known, current, candidate);
      if (s.remaining >= current.length) continue;
      if (
        !bestScore ||
        s.introduced.length < bestScore.introduced.length ||
        (s.introduced.length === bestScore.introduced.length && s.remaining < bestScore.remaining)
      ) {
        best = candidate;
        bestScore = s;
      }
    }
    if (!best || !bestScore) {
      return {
        target: null,
        strategy: null,
        introduced: [],
        note: 'no allowed version clears any advisory',
      };
    }
    const cleared = current.length - bestScore.remaining;
    return {
      target: best,
      strategy: 'direct-update',
      introduced: bestScore.introduced.map((a) => a.key),
      note: `clears ${cleared} of ${current.length} advisories`,
    };
  }

  const ranges = instance.parentRanges.map((p) => p.range);
  const inRange = newer.filter((v) => ranges.every((r) => satisfiesDeclared(v, r)));
  const npmChoice = inRange.length > 0 ? inRange[inRange.length - 1] : null;
  if (!npmChoice) {
    return {
      target: null,
      strategy: null,
      introduced: [],
      note: "no newer version satisfies the parents' declared ranges",
    };
  }
  if (!isAllowedUpgrade(instance.version, npmChoice, allowed)) {
    const kind = classifyUpgrade(instance.version, npmChoice);
    return {
      target: null,
      strategy: null,
      introduced: [],
      note: `npm update would select ${npmChoice} (${kind}), which policy does not allow`,
    };
  }
  const s = score(known, current, npmChoice);
  if (s.remaining >= current.length) {
    return {
      target: null,
      strategy: null,
      introduced: [],
      note: `npm update would select ${npmChoice}, which clears no advisory`,
    };
  }
  return {
    target: npmChoice,
    strategy: 'transitive-update',
    introduced: s.introduced.map((a) => a.key),
    note: "newest version within the parents' declared ranges (what npm update selects)",
  };
}

/** Outcome of checking a suggested parent version against the registry. */
export interface SuggestionCheck {
  verified: boolean | null;
  reason: string;
}

/**
 * Evaluates npm's suggested fix. Downgrades and major changes are always rejected, and so is a
 * suggestion the registry shows does not help (the suggested parent version still requires a
 * vulnerable range of the package).
 */
export function assessSuggestion(
  graph: DependencyGraph,
  fixAvailable: FixAvailable,
  allowed: readonly string[],
  check: SuggestionCheck | null,
): NpmSuggestion | null {
  if (typeof fixAvailable !== 'object') {
    return null;
  }
  const directEdge = (graph.out.get('') ?? []).find((e) => e.name === fixAvailable.name);
  const installed = directEdge?.to ? (graph.packages.get(directEdge.to)?.version ?? null) : null;
  let rejectionReason: string | null = null;
  if (!directEdge || !installed) {
    rejectionReason = `${fixAvailable.name} is not a direct dependency`;
  } else {
    const kind = classifyUpgrade(installed, fixAvailable.version);
    if (kind === 'downgrade') {
      rejectionReason = `downgrade from ${installed} to ${fixAvailable.version}`;
    } else if (kind === 'none') {
      rejectionReason = `${fixAvailable.name}@${installed} is already installed`;
    } else if (fixAvailable.isSemVerMajor || !allowed.includes(kind)) {
      rejectionReason =
        `${kind} upgrade (${installed} -> ${fixAvailable.version}) ` +
        'is not allowed automatically';
    } else if (check?.verified === false) {
      rejectionReason = check.reason;
    }
  }
  return {
    name: fixAvailable.name,
    version: fixAvailable.version,
    isSemVerMajor: fixAvailable.isSemVerMajor,
    accepted: rejectionReason === null,
    rejectionReason,
  };
}

/** Lowest newer version outside every range of the advisory, ignoring policy. */
export function lowestFixedVersion(
  current: string,
  advisory: KnownAdvisory,
  versions: readonly string[],
): string | null {
  return newerVersions(current, versions).find((v) => !affects(advisory, v)) ?? null;
}

/**
 * Final per-advisory assessment of one instance, combining the instance plan, npm's suggestion
 * and the lowest fixed version.
 */
export function assessAdvisory(
  instance: InstanceContext,
  advisory: KnownAdvisory,
  plan: InstancePlan,
  versions: readonly string[] | null,
  suggestion: NpmSuggestion | null,
  graph: DependencyGraph,
): InstanceFix {
  const base = { npmSuggestion: suggestion, parent: null, introduces: [] as string[] };
  if (!versions) {
    return {
      ...base,
      status: 'UNKNOWN',
      fixedVersion: null,
      targetVersion: null,
      upgradeType: null,
      strategy: null,
      reason: plan.note,
    };
  }
  const fixedVersion = lowestFixedVersion(instance.version, advisory, versions);
  if (plan.target && !affects(advisory, plan.target)) {
    const kind = classifyUpgrade(instance.version, plan.target);
    return {
      ...base,
      introduces: plan.introduced,
      status: 'FIXABLE',
      fixedVersion,
      targetVersion: plan.target,
      upgradeType: kind === 'patch' || kind === 'minor' || kind === 'major' ? kind : null,
      strategy: plan.strategy,
      reason: `${instance.name} ${instance.version} -> ${plan.target} (${plan.note})`,
    };
  }
  if (!instance.direct && suggestion?.accepted) {
    const edge = (graph.out.get('') ?? []).find((e) => e.name === suggestion.name);
    const parentPkg = edge?.to ? graph.packages.get(edge.to) : undefined;
    if (parentPkg) {
      const kind = classifyUpgrade(parentPkg.version, suggestion.version);
      const upgradeType = kind === 'patch' || kind === 'minor' ? kind : 'major';
      return {
        ...base,
        status: 'FIXABLE',
        fixedVersion,
        targetVersion: null,
        upgradeType: upgradeType === 'major' ? null : upgradeType,
        strategy: 'parent-update',
        parent: {
          name: suggestion.name,
          location: parentPkg.location,
          from: parentPkg.version,
          to: suggestion.version,
          upgradeType,
        },
        reason:
          `upgrade direct dependency ${suggestion.name} ` +
          `${parentPkg.version} -> ${suggestion.version} (npm suggestion)`,
      };
    }
  }
  if (!fixedVersion) {
    return {
      ...base,
      status: 'NO_FIX_AVAILABLE',
      fixedVersion: null,
      targetVersion: null,
      upgradeType: null,
      strategy: null,
      reason:
        `no published version of ${instance.name} newer than ${instance.version} ` +
        `is outside ${advisory.ranges.join(' || ')}`,
    };
  }
  const kind = classifyUpgrade(instance.version, fixedVersion);
  if (kind === 'major') {
    return {
      ...base,
      status: 'MAJOR_UPGRADE_REQUIRED',
      fixedVersion,
      targetVersion: null,
      upgradeType: 'major',
      strategy: null,
      reason: `lowest fixed version ${fixedVersion} is a major upgrade from ${instance.version}`,
    };
  }
  const parents = instance.parentRanges.map((p) => `${p.name} (${p.range})`).join(', ');
  const rejected =
    suggestion && !suggestion.accepted
      ? `; npm's suggestion rejected: ${suggestion.rejectionReason}`
      : '';
  return {
    ...base,
    status: 'PARENT_UPGRADE_REQUIRED',
    fixedVersion,
    targetVersion: null,
    upgradeType: kind === 'patch' || kind === 'minor' ? kind : null,
    strategy: null,
    reason: instance.direct
      ? `fixed in ${fixedVersion}, but ${plan.note}`
      : `fixed in ${fixedVersion}, ` +
        `outside the range declared by ${parents || 'its parents'}${rejected}`,
  };
}
