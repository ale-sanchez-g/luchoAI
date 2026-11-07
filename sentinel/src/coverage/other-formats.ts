import type { FileMetrics } from '../contracts/types';
import { CoverageFormatError, metric } from './istanbul';

/**
 * Parses LCOV (`lcov.info`). Lines and branches come from LF/LH and BRF/BRH (or DA/BRDA records
 * when the totals are absent); LCOV has no statement count, so statements mirror lines.
 */
export function parseLcov(text: string, root: string | null = null): Map<string, FileMetrics> {
  const out = new Map<string, FileMetrics>();
  let file: string | null = null;
  let lf: number | null = null;
  let lh: number | null = null;
  let fnf = 0;
  let fnh = 0;
  let brf: number | null = null;
  let brh: number | null = null;
  let da: number[] = [];
  let brda: number[] = [];
  const reset = (): void => {
    file = null;
    lf = lh = brf = brh = null;
    fnf = fnh = 0;
    da = [];
    brda = [];
  };
  reset();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line === 'TN:' || line.startsWith('TN:')) continue;
    if (line === 'end_of_record') {
      if (!file) throw new CoverageFormatError('lcov: end_of_record without SF');
      const linesTotal = lf ?? da.length;
      const linesHit = lh ?? da.filter((n) => n > 0).length;
      const branchTotal = brf ?? brda.length;
      const branchHit = brh ?? brda.filter((n) => n > 0).length;
      const lines = metric(linesHit, linesTotal);
      out.set(file, {
        lines,
        statements: lines,
        functions: metric(fnh, fnf),
        branches: metric(branchHit, branchTotal),
      });
      reset();
      continue;
    }
    const colon = line.indexOf(':');
    if (colon === -1)
      throw new CoverageFormatError(`lcov: unrecognised line "${line.slice(0, 40)}"`);
    const key = line.slice(0, colon);
    const value = line.slice(colon + 1);
    switch (key) {
      case 'SF': {
        let rel = value.replace(/\\/g, '/');
        if (root && rel.startsWith(`${root}/`)) rel = rel.slice(root.length + 1);
        if (rel.startsWith('/') || rel.includes('..')) {
          throw new CoverageFormatError(`lcov: ${value} is not a repository-relative path`);
        }
        file = rel;
        break;
      }
      case 'LF':
        lf = Number(value);
        break;
      case 'LH':
        lh = Number(value);
        break;
      case 'FNF':
        fnf = Number(value);
        break;
      case 'FNH':
        fnh = Number(value);
        break;
      case 'BRF':
        brf = Number(value);
        break;
      case 'BRH':
        brh = Number(value);
        break;
      case 'DA':
        da.push(Number(value.split(',')[1]));
        break;
      case 'BRDA': {
        const taken = value.split(',')[3];
        brda.push(taken === '-' ? 0 : Number(taken));
        break;
      }
      case 'FN':
      case 'FNDA':
      case 'VER':
        break;
      default:
        throw new CoverageFormatError(`lcov: unknown record "${key}"`);
    }
    if ([lf, lh, brf, brh, fnf, fnh].some((n) => n !== null && Number.isNaN(n))) {
      throw new CoverageFormatError(`lcov: non-numeric value in "${line.slice(0, 40)}"`);
    }
  }
  if (file !== null) throw new CoverageFormatError('lcov: last record has no end_of_record');
  return out;
}

/** Parses Coverage.py's `coverage json` output (statements and branches). */
export function parseCoveragePyJson(text: string): Map<string, FileMetrics> {
  let raw: { files?: Record<string, { summary?: Record<string, number> }> };
  try {
    raw = JSON.parse(text);
  } catch {
    throw new CoverageFormatError('coverage.py JSON is not JSON');
  }
  if (!raw.files || typeof raw.files !== 'object') {
    throw new CoverageFormatError('coverage.py JSON has no "files" object');
  }
  const out = new Map<string, FileMetrics>();
  for (const [file, entry] of Object.entries(raw.files)) {
    const s = entry.summary;
    if (!s || typeof s.num_statements !== 'number' || typeof s.covered_lines !== 'number') {
      throw new CoverageFormatError(`coverage.py JSON: ${file} has no summary`);
    }
    const lines = metric(s.covered_lines, s.num_statements);
    out.set(file, {
      lines,
      statements: lines,
      functions: metric(0, 0),
      branches: metric(s.covered_branches ?? 0, s.num_branches ?? 0),
    });
  }
  return out;
}
