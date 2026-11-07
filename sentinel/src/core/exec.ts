import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { redact } from './redact';

export interface ExecOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export interface ExecResult {
  argv: string[];
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  startedAt: string;
  timedOut: boolean;
  truncated: boolean;
  error: string | null;
}

interface Collector {
  push: (chunk: Buffer) => void;
  text: () => string;
  truncated: () => boolean;
}

const DEFAULT_MAX_OUTPUT = 64 * 1024 * 1024;
const DEFAULT_TIMEOUT = 30 * 60 * 1000;

function collector(limit: number): Collector {
  const chunks: Buffer[] = [];
  let size = 0;
  let cut = false;
  return {
    push(chunk: Buffer): void {
      chunks.push(chunk);
      size += chunk.length;
      while (size > limit && chunks.length > 1) {
        size -= (chunks.shift() as Buffer).length;
        cut = true;
      }
    },
    text: (): string => Buffer.concat(chunks).toString('utf8'),
    truncated: (): boolean => cut,
  };
}

/**
 * Runs a command from an argv array (never through a shell, so arguments cannot be
 * reinterpreted). Never rejects: failures are reported in the result.
 */
export function runCommand(argv: string[], options: ExecOptions): Promise<ExecResult> {
  const startedAt = new Date();
  const limit = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
  const out = collector(limit);
  const err = collector(limit);

  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    const timers: NodeJS.Timeout[] = [];

    const finish = (exitCode: number | null, signal: string | null, error: string | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      timers.forEach((t) => clearTimeout(t));
      resolve({
        argv,
        exitCode,
        signal,
        stdout: out.text(),
        stderr: err.text(),
        durationMs: Date.now() - startedAt.getTime(),
        startedAt: startedAt.toISOString(),
        timedOut,
        truncated: out.truncated() || err.truncated(),
        error: error ? redact(error) : null,
      });
    };

    let child: ChildProcess;
    try {
      child = spawn(argv[0], argv.slice(1), {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      finish(null, null, (error as Error).message);
      return;
    }

    timers.push(
      setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, options.timeoutMs ?? DEFAULT_TIMEOUT),
    );

    child.stdout?.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => err.push(chunk));
    child.on('error', (error) => finish(null, null, error.message));
    child.on('close', (code, signal) => finish(code, signal, null));
  });
}

/** Last `maxChars` characters of combined output, redacted, for inclusion in reports. */
export function outputTail(result: ExecResult, maxChars = 4000): string {
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  const tail = combined.length > maxChars ? combined.slice(combined.length - maxChars) : combined;
  return redact(tail);
}
