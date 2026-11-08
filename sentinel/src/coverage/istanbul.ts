import type { CoverageMetric, FileMetrics } from '../contracts/types';

/** Istanbul per-file coverage data (`coverage-final.json` values). */
export interface IstanbulFileData {
  path?: string;
  statementMap: Record<string, { start: { line: number }; end: { line: number } }>;
  s: Record<string, number>;
  fnMap: Record<string, unknown>;
  f: Record<string, number>;
  branchMap: Record<string, unknown>;
  b: Record<string, number[]>;
}

/** Raised when a coverage document is structurally invalid (treated as a blocking problem). */
export class CoverageFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoverageFormatError';
  }
}

export function metric(covered: number, total: number): CoverageMetric {
  return { covered, total, pct: total === 0 ? 100 : Math.round((covered / total) * 10000) / 100 };
}

function isFileData(value: unknown): value is IstanbulFileData {
  const v = value as Record<string, unknown> | null;
  return (
    !!v &&
    typeof v.statementMap === 'object' &&
    typeof v.s === 'object' &&
    typeof v.fnMap === 'object' &&
    typeof v.f === 'object' &&
    typeof v.branchMap === 'object' &&
    typeof v.b === 'object'
  );
}

/** Statement, line, function and branch metrics of one Istanbul file entry. */
export function metricsOf(data: IstanbulFileData): FileMetrics {
  const statements = Object.values(data.s);
  const functions = Object.values(data.f);
  const branches = Object.values(data.b).flat();
  const lineHits = new Map<number, number>();
  for (const [id, location] of Object.entries(data.statementMap)) {
    const line = location.start.line;
    lineHits.set(line, Math.max(lineHits.get(line) ?? 0, data.s[id] ?? 0));
  }
  const lines = [...lineHits.values()];
  return {
    statements: metric(statements.filter((n) => n > 0).length, statements.length),
    functions: metric(functions.filter((n) => n > 0).length, functions.length),
    branches: metric(branches.filter((n) => n > 0).length, branches.length),
    lines: metric(lines.filter((n) => n > 0).length, lines.length),
  };
}

/**
 * Parses `coverage-final.json`. Keys must be repository-relative (Sentinel normalises them when
 * it collects evidence); absolute keys are rejected rather than guessed at.
 */
export function parseIstanbulJson(text: string): Map<string, FileMetrics> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new CoverageFormatError('coverage-final.json is not JSON');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new CoverageFormatError('coverage-final.json must be an object keyed by file');
  }
  const out = new Map<string, FileMetrics>();
  for (const [file, value] of Object.entries(raw as Record<string, unknown>)) {
    const data = (value as { data?: unknown })?.data ?? value;
    if (!isFileData(data)) {
      throw new CoverageFormatError(
        `coverage-final.json: entry for ${file} is not Istanbul file coverage`,
      );
    }
    if (file.startsWith('/') || /^[A-Za-z]:[\\/]/.test(file) || file.includes('..')) {
      throw new CoverageFormatError(
        `coverage-final.json: ${file} is not a repository-relative path`,
      );
    }
    out.set(file, metricsOf(data));
  }
  return out;
}

/**
 * Rewrites the absolute file keys Jest writes into repository-relative ones, dropping files
 * outside the repository. Used where the evidence is produced, before it leaves the runner.
 */
export function relativiseIstanbul(
  raw: Record<string, unknown>,
  root: string,
): Record<string, unknown> {
  const prefix = root.endsWith('/') ? root : `${root}/`;
  const out: Record<string, unknown> = {};
  for (const [file, value] of Object.entries(raw)) {
    const normal = file.replace(/\\/g, '/');
    if (!normal.startsWith(prefix)) continue;
    const rel = normal.slice(prefix.length);
    const data = {
      ...((value as { data?: unknown })?.data ?? (value as Record<string, unknown>)),
    } as Record<string, unknown>;
    data.path = rel;
    out[rel] = data;
  }
  return out;
}
