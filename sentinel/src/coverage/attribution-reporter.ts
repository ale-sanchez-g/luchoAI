/**
 * Jest reporter that records which source files each test file executed. Jest runs every test
 * file in its own module registry and hands reporters that file's coverage, so this is real
 * execution attribution at test-file granularity (not per test case).
 *
 * Self-contained on purpose (Node built-ins only) so it can be loaded straight from `dist/`.
 * Output path: reporter option `outputFile`, else SENTINEL_ATTRIBUTION_FILE.
 */
import fs from 'node:fs';
import path from 'node:path';

interface Loc {
  start: { line: number };
}

interface FileData {
  statementMap: Record<string, Loc>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

interface TestResultLike {
  testFilePath: string;
  numPassingTests: number;
  numFailingTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testExecError?: unknown;
  coverage?: Record<string, FileData | { data: FileData }>;
  v8Coverage?: unknown;
}

type Pair = [number, number];

interface FileRow {
  file: string;
  statements: Pair;
  functions: Pair;
  branches: Pair;
  lines: Pair;
}

interface TestRow {
  testFile: string;
  status: 'passed' | 'failed' | 'error';
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  files: FileRow[];
}

function pair(values: number[]): Pair {
  return [values.filter((n) => n > 0).length, values.length];
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

class SentinelAttributionReporter {
  private readonly rows: TestRow[] = [];
  private provider = 'babel';
  private readonly rootDir: string;
  private readonly outputFile: string | undefined;

  constructor(
    globalConfig: { rootDir: string; coverageProvider?: string },
    options: { outputFile?: string } = {},
  ) {
    this.rootDir = globalConfig.rootDir;
    this.provider = globalConfig.coverageProvider ?? 'babel';
    this.outputFile = options.outputFile ?? process.env.SENTINEL_ATTRIBUTION_FILE;
  }

  onTestResult(_test: unknown, result: TestResultLike): void {
    const files: FileRow[] = [];
    for (const [file, value] of Object.entries(result.coverage ?? {})) {
      const data = ('data' in value ? value.data : value) as FileData;
      const statements = Object.values(data.s);
      if (statements.every((n) => n === 0)) continue;
      const lineHits = new Map<number, number>();
      for (const [id, loc] of Object.entries(data.statementMap)) {
        lineHits.set(loc.start.line, Math.max(lineHits.get(loc.start.line) ?? 0, data.s[id] ?? 0));
      }
      const rel = path.relative(this.rootDir, file);
      if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
      files.push({
        file: toPosix(rel),
        statements: pair(statements),
        functions: pair(Object.values(data.f)),
        branches: pair(Object.values(data.b).flat()),
        lines: pair([...lineHits.values()]),
      });
    }
    files.sort((a, b) => a.file.localeCompare(b.file));
    const testFile = toPosix(path.relative(this.rootDir, result.testFilePath));
    this.rows.push({
      testFile,
      status: result.testExecError ? 'error' : result.numFailingTests > 0 ? 'failed' : 'passed',
      passed: result.numPassingTests,
      failed: result.numFailingTests,
      skipped: result.numPendingTests,
      todo: result.numTodoTests,
      files,
    });
  }

  onRunComplete(): void {
    if (!this.outputFile) {
      return;
    }
    this.rows.sort((a, b) => a.testFile.localeCompare(b.testFile));
    const document = {
      schemaVersion: '1.0.0',
      provider: this.provider,
      available: this.provider !== 'v8',
      tests: this.rows,
    };
    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, `${JSON.stringify(document, null, 2)}\n`);
  }

  getLastError(): undefined {
    return undefined;
  }
}

export = SentinelAttributionReporter;
