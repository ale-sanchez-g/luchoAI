import type { ExecutionStrength, TestFileResult, TestResultStatus } from '../contracts/types';
import { validateWithSchema, formatSchemaErrors } from '../contracts/schemas';
import { CoverageFormatError } from './istanbul';

export interface AttributedFile {
  file: string;
  statements: [number, number];
  functions: [number, number];
  branches: [number, number];
  lines: [number, number];
}

export interface AttributedTest {
  testFile: string;
  status: 'passed' | 'failed' | 'error';
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  files: AttributedFile[];
}

export interface Attribution {
  provider: string;
  available: boolean;
  tests: AttributedTest[];
}

/** Parses the attribution reporter output, validating it as untrusted input. */
export function parseAttribution(text: string): Attribution {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new CoverageFormatError('attribution file is not JSON');
  }
  const errors = validateWithSchema('jest-attribution', raw);
  if (errors.length > 0) {
    throw new CoverageFormatError(
      `attribution file violates its schema:\n${formatSchemaErrors(errors)}`,
    );
  }
  return raw as Attribution;
}

/**
 * How strongly a test file exercised a source file: EXERCISED when it called at least one of the
 * file's functions (or ran it at all when the file has no functions, i.e. pure data); LOADED_ONLY
 * when only module-level code ran because the file was imported.
 */
export function strengthOf(file: AttributedFile | undefined): ExecutionStrength {
  if (!file) return 'NONE';
  const [fnCovered, fnTotal] = file.functions;
  const [stCovered] = file.statements;
  if (stCovered === 0) return 'NONE';
  if (fnTotal === 0 || fnCovered > 0) return 'EXERCISED';
  return 'LOADED_ONLY';
}

export interface JestRun {
  success: boolean;
  totals: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    todo: number;
    runtimeErrors: number;
  };
  durationMs: number;
  files: TestFileResult[];
}

/** Parses `jest --json --outputFile` results; paths are made relative to `root`. */
export function parseJestResults(text: string, root: string): JestRun {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new CoverageFormatError('jest results are not JSON');
  }
  if (!Array.isArray(raw.testResults) || typeof raw.numTotalTests !== 'number') {
    throw new CoverageFormatError('jest results are missing testResults/numTotalTests');
  }
  const prefix = root.endsWith('/') ? root : `${root}/`;
  const files: TestFileResult[] = (raw.testResults as Record<string, unknown>[]).map((r) => {
    const assertions = Array.isArray(r.assertionResults)
      ? (r.assertionResults as { status: string }[])
      : [];
    const count = (status: string): number => assertions.filter((a) => a.status === status).length;
    const name = String(r.name ?? '');
    const rel = name.startsWith(prefix) ? name.slice(prefix.length) : name;
    const failureMessage =
      typeof r.message === 'string' && r.message ? r.message.slice(0, 2000) : null;
    // Jest's file-level status is not reliable on its own (a file with it.skip reports "focused"),
    // so the outcome is derived from failures and the individual assertion statuses.
    const notRun = (a: { status: string }): boolean =>
      ['pending', 'skipped', 'todo', 'disabled'].includes(a.status);
    let status: TestResultStatus;
    if (r.status === 'failed' && assertions.length === 0) {
      status = 'ERROR';
    } else if (r.status === 'failed' || count('failed') > 0) {
      status = 'FAILED';
    } else if (assertions.length === 0 || assertions.every(notRun)) {
      status = 'SKIPPED';
    } else {
      status = 'PASSED';
    }
    return {
      testFile: rel,
      status,
      passed: count('passed'),
      failed: count('failed'),
      skipped: count('pending') + count('skipped') + count('disabled'),
      todo: count('todo'),
      durationMs:
        typeof r.endTime === 'number' && typeof r.startTime === 'number'
          ? r.endTime - r.startTime
          : 0,
      failureMessage,
    };
  });
  const start = typeof raw.startTime === 'number' ? raw.startTime : 0;
  const end = Math.max(
    start,
    ...(raw.testResults as Record<string, unknown>[]).map((r) =>
      typeof r.endTime === 'number' ? r.endTime : 0,
    ),
  );
  return {
    success: raw.success === true,
    totals: {
      total: raw.numTotalTests as number,
      passed: Number(raw.numPassedTests ?? 0),
      failed: Number(raw.numFailedTests ?? 0),
      skipped: Number(raw.numPendingTests ?? 0),
      todo: Number(raw.numTodoTests ?? 0),
      runtimeErrors: Number(raw.numRuntimeErrorTestSuites ?? 0),
    },
    durationMs: end - start,
    files: files.sort((a, b) => a.testFile.localeCompare(b.testFile)),
  };
}

/** Parses `jest --listTests --json` (an array of absolute paths). */
export function parseListTests(text: string, root: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new CoverageFormatError('jest --listTests output is not JSON');
  }
  if (!Array.isArray(raw) || raw.some((p) => typeof p !== 'string')) {
    throw new CoverageFormatError('jest --listTests output must be an array of paths');
  }
  const prefix = root.endsWith('/') ? root : `${root}/`;
  return (raw as string[]).map((p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p)).sort();
}

function stripRoot(value: string, root: string): string | null {
  const prefix = root.endsWith('/') ? root : `${root}/`;
  const normal = value.replace(/\\/g, '/');
  return normal.startsWith(prefix) ? normal.slice(prefix.length) : null;
}

/**
 * Rewrites absolute test paths in Jest's JSON results to repository-relative ones and drops the
 * embedded coverage map (it is collected separately). Run where the evidence is produced.
 */
export function normaliseJestResults(
  raw: Record<string, unknown>,
  root: string,
): Record<string, unknown> {
  const testResults = Array.isArray(raw.testResults)
    ? (raw.testResults as Record<string, unknown>[])
    : [];
  const { coverageMap: _coverageMap, ...rest } = raw;
  void _coverageMap;
  return {
    ...rest,
    testResults: testResults
      .map((r) => ({ ...r, name: stripRoot(String(r.name ?? ''), root) }))
      .filter((r) => r.name !== null),
  };
}

/** Repository-relative form of `jest --listTests --json` output. */
export function normaliseListTests(paths: unknown, root: string): string[] {
  if (!Array.isArray(paths)) return [];
  return paths
    .map((p) => stripRoot(String(p), root))
    .filter((p): p is string => p !== null)
    .sort();
}
