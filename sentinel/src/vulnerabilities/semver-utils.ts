import semver from 'semver';
import type { UpgradeType } from '../contracts/types';

export type UpgradeKind = UpgradeType | 'downgrade' | 'none';

/**
 * Classifies a version change. Follows semver's rule that 0.x versions make no compatibility
 * promise: a minor bump of 0.y (or any bump of 0.0.z) is treated as major, matching how npm's
 * caret ranges behave. Unparseable versions are treated as major (the conservative choice).
 */
export function classifyUpgrade(from: string, to: string): UpgradeKind {
  const a = semver.parse(from, { loose: true });
  const b = semver.parse(to, { loose: true });
  if (!a || !b) {
    return 'major';
  }
  const cmp = semver.compare(a, b);
  if (cmp === 0) return 'none';
  if (cmp > 0) return 'downgrade';
  if (b.major !== a.major) return 'major';
  if (a.major === 0) {
    if (b.minor !== a.minor) return 'major';
    if (a.minor === 0 && b.patch !== a.patch) return 'major';
    return 'patch';
  }
  if (b.minor !== a.minor) return 'minor';
  return 'patch';
}

/** True when `to` is an upgrade of an allowed type (never a downgrade). */
export function isAllowedUpgrade(from: string, to: string, allowed: readonly string[]): boolean {
  const kind = classifyUpgrade(from, to);
  return kind !== 'none' && kind !== 'downgrade' && allowed.includes(kind);
}

/**
 * Whether `version` is inside a vulnerable range. Pre-releases are included and an unparseable
 * range counts as matching, so uncertainty always errs towards "vulnerable".
 */
export function inVulnerableRange(version: string, range: string): boolean {
  try {
    if (!semver.validRange(range, { loose: true, includePrerelease: true })) {
      return true;
    }
    return semver.satisfies(version, range, { loose: true, includePrerelease: true });
  } catch {
    return true;
  }
}

/** Whether `version` satisfies a declared dependency range, using npm's resolution rules. */
export function satisfiesDeclared(version: string, range: string): boolean {
  try {
    return semver.satisfies(version, range, { loose: true });
  } catch {
    return false;
  }
}

/** Valid versions sorted ascending. */
export function sortVersions(versions: readonly string[]): string[] {
  return versions
    .filter((v) => semver.valid(v, { loose: true }))
    .sort((a, b) => semver.compare(a, b, true));
}

/** Versions strictly newer than `current`; pre-releases only when `current` is one. */
export function newerVersions(current: string, versions: readonly string[]): string[] {
  const currentIsPre = semver.prerelease(current, { loose: true }) !== null;
  return sortVersions(versions).filter(
    (v) => semver.gt(v, current, true) && (currentIsPre || semver.prerelease(v, true) === null),
  );
}

/** True when the version is a pre-release (`1.0.0-rc.1`). */
export function isPrerelease(version: string): boolean {
  return semver.prerelease(version, { loose: true }) !== null;
}
