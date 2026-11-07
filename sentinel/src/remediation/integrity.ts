import type { IntegrityResult } from '../contracts/types';
import type { DependencyGraph } from '../graph/lockfile';

type SignatureResult = IntegrityResult['signatures'];

/**
 * Lockfile supply-chain checks: every registry tarball must come from an allowed registry and
 * carry an integrity hash. Links, workspaces and bundled packages have neither and are skipped.
 */
export function checkLockfile(
  graph: DependencyGraph,
  allowedRegistries: readonly string[],
): Pick<IntegrityResult, 'registry' | 'missingIntegrity'> {
  const violations: { location: string; resolved: string }[] = [];
  const missingIntegrity: string[] = [];
  for (const pkg of graph.packages.values()) {
    if (pkg.location === '' || pkg.link || pkg.inBundle || !pkg.location.includes('node_modules/'))
      continue;
    if (!pkg.resolved) {
      missingIntegrity.push(pkg.location);
      continue;
    }
    if (!allowedRegistries.some((r) => pkg.resolved!.startsWith(r))) {
      violations.push({ location: pkg.location, resolved: pkg.resolved.slice(0, 200) });
    }
    if (!pkg.integrity || !/^sha(256|384|512)-/.test(pkg.integrity)) {
      missingIntegrity.push(pkg.location);
    }
  }
  return {
    registry: { allowed: [...allowedRegistries], violations },
    missingIntegrity: missingIntegrity.sort(),
  };
}

/**
 * Interprets `npm audit signatures --json`: `{invalid, missing}` (exit 1 when either is non-empty)
 * or `{error}` when verification could not run. Unreadable output is UNAVAILABLE, never VERIFIED.
 */
export function parseSignatures(stdout: string, exitCode: number | null): SignatureResult {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    return {
      status: 'UNAVAILABLE',
      invalid: [],
      missing: [],
      detail: `unreadable output (exit ${exitCode})`,
    };
  }
  if (raw.error) {
    const err = raw.error as Record<string, unknown>;
    return {
      status: 'UNAVAILABLE',
      invalid: [],
      missing: [],
      detail: `npm audit signatures failed: ${String(err.summary ?? 'unknown error')}`,
    };
  }
  if (!Array.isArray(raw.invalid) || !Array.isArray(raw.missing)) {
    return { status: 'UNAVAILABLE', invalid: [], missing: [], detail: 'unexpected output format' };
  }
  const invalid = (raw.invalid as Record<string, unknown>[]).map((i) => ({
    name: String(i.name),
    version: String(i.version),
    code: String(i.code ?? 'EINVALID'),
  }));
  const missing = (raw.missing as Record<string, unknown>[]).map((m) => ({
    name: String(m.name),
    version: String(m.version),
  }));
  if (invalid.length > 0) {
    return {
      status: 'INVALID',
      invalid,
      missing,
      detail: `${invalid.length} package(s) with invalid registry signatures or attestations`,
    };
  }
  if (missing.length > 0) {
    return {
      status: 'MISSING_SIGNATURES',
      invalid,
      missing,
      detail: `${missing.length} package(s) missing registry signatures`,
    };
  }
  if (exitCode !== 0) {
    return { status: 'UNAVAILABLE', invalid, missing, detail: `exit ${exitCode} without findings` };
  }
  return { status: 'VERIFIED', invalid, missing, detail: 'all registry signatures verified' };
}
