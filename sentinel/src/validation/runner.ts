import fs from 'node:fs';
import path from 'node:path';
import type { CommandResult, CommandStatus, ValidationReport } from '../contracts/types';
import type { SentinelConfig, ValidationCommandConfig } from '../config/types';
import type { ExecResult } from '../core/exec';
import { outputTail, runCommand } from '../core/exec';
import { log } from '../core/log';
import { redact } from '../core/redact';
import type { RunContext } from '../core/report-io';
import { makeHeader, writeReport } from '../core/report-io';
import { relativiseIstanbul } from '../coverage/istanbul';
import {
  normaliseJestResults,
  normaliseListTests,
  parseJestResults,
} from '../coverage/jest-evidence';
import { parseSignatures } from '../remediation/integrity';

export interface ValidationInput {
  root: string;
  ctx: RunContext;
  config: SentinelConfig;
  env: NodeJS.ProcessEnv;
  /** Evidence directory; everything written here is repository-relative. */
  evidenceDir: string;
  /** Compiled attribution reporter; defaults to the copy next to this file in dist/. */
  reporterPath?: string;
  /** A checkout of the base revision; when set, the base lockfile is audited too (PR mode). */
  baseDir?: string | null;
  npm?: string[];
}

function statusOf(result: ExecResult): CommandStatus {
  if (result.timedOut) return 'TIMED_OUT';
  if (result.exitCode === null) return 'ERROR';
  return result.exitCode === 0 ? 'PASSED' : 'FAILED';
}

function saveLog(dir: string, id: string, result: ExecResult): string {
  const file = path.join(dir, 'logs', `${id}.log`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    redact(`$ ${result.argv.join(' ')}\n${result.stdout}\n${result.stderr}\n${result.error ?? ''}`),
  );
  return path.relative(dir, file);
}

/** Keeps LCOV records for files inside the repository, rewriting their paths to be relative. */
export function relativiseLcov(text: string, root: string): string {
  const prefix = root.endsWith('/') ? root : `${root}/`;
  const records = text.split(/^end_of_record\s*$/m).filter((r) => r.trim() !== '');
  const kept: string[] = [];
  for (const record of records) {
    const lines = record.trim().split('\n');
    const sf = lines.findIndex((l) => l.startsWith('SF:'));
    if (sf === -1) continue;
    const file = lines[sf].slice(3).replace(/\\/g, '/');
    if (!file.startsWith(prefix)) continue;
    lines[sf] = `SF:${file.slice(prefix.length)}`;
    kept.push(`${lines.join('\n')}\nend_of_record`);
  }
  return kept.length > 0 ? `${kept.join('\n')}\n` : '';
}

async function runJest(
  input: ValidationInput,
  command: ValidationCommandConfig,
): Promise<CommandResult> {
  const { root, evidenceDir, config } = input;
  const base = config.tests.jest.command;
  const env = { ...input.env, ...command.env };
  const listed = await runCommand([...base, '--listTests', '--json'], {
    cwd: root,
    env,
    timeoutMs: 5 * 60 * 1000,
  });
  try {
    fs.writeFileSync(
      path.join(evidenceDir, 'jest-list-tests.json'),
      JSON.stringify(normaliseListTests(JSON.parse(listed.stdout), root)),
    );
  } catch {
    log.warn('jest --listTests did not produce JSON; test discovery evidence is missing');
  }

  const raw = path.join(evidenceDir, 'raw');
  fs.mkdirSync(raw, { recursive: true });
  const reporter =
    input.reporterPath ?? path.resolve(__dirname, '..', 'coverage', 'attribution-reporter.js');
  const argv = [
    ...base,
    '--coverage',
    '--coverageReporters=json',
    '--coverageReporters=lcov',
    `--coverageDirectory=${path.join(raw, 'coverage')}`,
    ...config.tests.jest.collectCoverageFrom.map((glob) => `--collectCoverageFrom=${glob}`),
    '--json',
    `--outputFile=${path.join(raw, 'jest-results.json')}`,
    '--reporters=default',
    `--reporters=${reporter}`,
  ];
  const result = await runCommand(argv, {
    cwd: root,
    env: { ...env, SENTINEL_ATTRIBUTION_FILE: path.join(evidenceDir, 'jest-attribution.json') },
    timeoutMs: command.timeoutMinutes * 60 * 1000,
  });

  let status = statusOf(result);
  const artifacts: string[] = [saveLog(evidenceDir, command.id, result)];
  const resultsFile = path.join(raw, 'jest-results.json');
  if (fs.existsSync(resultsFile)) {
    const normalised = normaliseJestResults(JSON.parse(fs.readFileSync(resultsFile, 'utf8')), root);
    fs.writeFileSync(path.join(evidenceDir, 'jest-results.json'), JSON.stringify(normalised));
    artifacts.push('jest-results.json');
  } else if (status === 'PASSED') {
    status = 'ERROR';
  }
  const coverageFile = path.join(raw, 'coverage', 'coverage-final.json');
  if (fs.existsSync(coverageFile)) {
    fs.mkdirSync(path.join(evidenceDir, 'coverage'), { recursive: true });
    const relative = relativiseIstanbul(JSON.parse(fs.readFileSync(coverageFile, 'utf8')), root);
    fs.writeFileSync(
      path.join(evidenceDir, 'coverage', 'coverage-final.json'),
      JSON.stringify(relative),
    );
    artifacts.push('coverage/coverage-final.json');
  }
  const lcovFile = path.join(raw, 'coverage', 'lcov.info');
  if (fs.existsSync(lcovFile)) {
    fs.mkdirSync(path.join(evidenceDir, 'coverage'), { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, 'coverage', 'lcov.info'),
      relativiseLcov(fs.readFileSync(lcovFile, 'utf8'), root),
    );
    artifacts.push('coverage/lcov.info');
  }
  if (fs.existsSync(path.join(evidenceDir, 'jest-attribution.json')))
    artifacts.push('jest-attribution.json');
  fs.rmSync(raw, { recursive: true, force: true });
  return {
    id: command.id,
    kind: 'jest',
    category: 'test',
    // Recorded with placeholders so reports are the same on every machine.
    argv: argv.map((a) =>
      a
        .split(evidenceDir)
        .join('<evidence>')
        .split(path.dirname(reporter))
        .join('<sentinel>/coverage')
        .split(root)
        .join('<repo>'),
    ),
    required: command.required,
    status,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    startedAt: result.startedAt,
    outputTail: outputTail(result, 3000),
    artifacts,
  };
}

async function runPlain(
  input: ValidationInput,
  command: ValidationCommandConfig,
): Promise<CommandResult> {
  const result = await runCommand(command.run, {
    cwd: input.root,
    env: { ...input.env, ...command.env },
    timeoutMs: command.timeoutMinutes * 60 * 1000,
  });
  return {
    id: command.id,
    kind: 'command',
    category: command.category,
    argv: command.run,
    required: command.required,
    status: statusOf(result),
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    startedAt: result.startedAt,
    outputTail: outputTail(result, 3000),
    artifacts: [saveLog(input.evidenceDir, command.id, result)],
  };
}

async function runAudit(
  input: ValidationInput,
  dir: string,
  id: string,
  file: string,
): Promise<CommandResult> {
  const npm = input.npm ?? ['npm'];
  const result = await runCommand([...npm, 'audit', '--json', '--package-lock-only'], {
    cwd: dir,
    env: input.env,
    timeoutMs: 5 * 60 * 1000,
  });
  let status: CommandStatus = 'ERROR';
  try {
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    status = parsed.auditReportVersion === 2 && !parsed.error ? 'PASSED' : 'ERROR';
  } catch {
    status = 'ERROR';
  }
  fs.writeFileSync(path.join(input.evidenceDir, file), result.stdout || '{}');
  return {
    id,
    kind: 'npm-audit',
    category: 'security',
    argv: ['npm', 'audit', '--json', '--package-lock-only'],
    required: input.config.validation.npmAudit === 'required',
    status,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    startedAt: result.startedAt,
    outputTail: status === 'PASSED' ? 'audit report recorded' : outputTail(result, 1500),
    artifacts: [file],
  };
}

/**
 * Runs the full required validation: the Jest suite with coverage and per-test attribution, every
 * configured command, npm audit of the resulting lockfile (and of the base lockfile in PR mode),
 * registry signature verification and an installed-tree consistency check.
 */
export async function runValidation(input: ValidationInput): Promise<ValidationReport> {
  const { config, evidenceDir } = input;
  fs.mkdirSync(evidenceDir, { recursive: true });
  const commands: CommandResult[] = [];
  for (const command of config.validation.commands) {
    log.group(`validate: ${command.id}`);
    commands.push(
      command.kind === 'jest' ? await runJest(input, command) : await runPlain(input, command),
    );
    log.info(`${command.id}: ${commands[commands.length - 1].status}`);
    log.endGroup();
  }

  const npm = input.npm ?? ['npm'];
  if (config.validation.npmAudit !== 'disabled') {
    commands.push(await runAudit(input, input.root, 'npm-audit', 'npm-audit.json'));
    if (input.baseDir) {
      commands.push(await runAudit(input, input.baseDir, 'npm-audit-base', 'npm-audit-base.json'));
    }
  }
  if (config.validation.auditSignatures !== 'disabled') {
    const result = await runCommand([...npm, 'audit', 'signatures', '--json'], {
      cwd: input.root,
      env: input.env,
      timeoutMs: 10 * 60 * 1000,
    });
    fs.writeFileSync(
      path.join(evidenceDir, 'audit-signatures.json'),
      JSON.stringify({ exitCode: result.exitCode, stdout: result.stdout }),
    );
    const signatures = parseSignatures(result.stdout, result.exitCode);
    commands.push({
      id: 'audit-signatures',
      kind: 'audit-signatures',
      category: 'security',
      argv: ['npm', 'audit', 'signatures', '--json'],
      required: config.validation.auditSignatures === 'required',
      status:
        signatures.status === 'VERIFIED'
          ? 'PASSED'
          : signatures.status === 'UNAVAILABLE'
            ? 'ERROR'
            : 'FAILED',
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      startedAt: result.startedAt,
      outputTail: signatures.detail,
      artifacts: ['audit-signatures.json'],
    });
  }
  const ls = await runCommand([...npm, 'ls', '--all', '--json'], {
    cwd: input.root,
    env: input.env,
    timeoutMs: 5 * 60 * 1000,
  });
  commands.push({
    id: 'installed-tree',
    kind: 'lockfile-check',
    category: 'integrity',
    argv: ['npm', 'ls', '--all', '--json'],
    required: true,
    status: statusOf(ls),
    exitCode: ls.exitCode,
    durationMs: ls.durationMs,
    startedAt: ls.startedAt,
    outputTail: ls.exitCode === 0 ? 'installed tree matches the lockfile' : outputTail(ls, 1500),
    artifacts: [],
  });

  let tests: ValidationReport['tests'] = {
    framework: null,
    discovered: 0,
    executedFiles: 0,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    todo: 0,
    runtimeErrors: 0,
    durationMs: 0,
    success: null,
    files: [],
  };
  const resultsFile = path.join(evidenceDir, 'jest-results.json');
  if (fs.existsSync(resultsFile)) {
    const run = parseJestResults(fs.readFileSync(resultsFile, 'utf8'), '');
    const listedFile = path.join(evidenceDir, 'jest-list-tests.json');
    const listed = fs.existsSync(listedFile)
      ? (JSON.parse(fs.readFileSync(listedFile, 'utf8')) as string[])
      : [];
    tests = {
      framework: 'jest',
      discovered: listed.length,
      executedFiles: run.files.length,
      ...run.totals,
      durationMs: run.durationMs,
      success: run.success,
      files: run.files,
    };
  }

  const required = commands.filter((c) => c.required);
  const report: ValidationReport = {
    ...makeHeader(input.ctx, 'validation-report'),
    commands,
    tests,
    summary: {
      requiredPassed: required.every((c) => c.status === 'PASSED'),
      failedRequired: required
        .filter((c) => c.status === 'FAILED' || c.status === 'ERROR' || c.status === 'TIMED_OUT')
        .map((c) => c.id),
      notRunRequired: required.filter((c) => c.status === 'NOT_RUN').map((c) => c.id),
    },
  };
  writeReport(evidenceDir, report);
  return report;
}
