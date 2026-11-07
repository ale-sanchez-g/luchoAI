import { parseDocument } from 'yaml';

/** Commands found in one shell command string. */
export interface CommandSummary {
  bins: string[];
  npmRuns: string[];
  nodeScripts: string[];
}

const WRAPPERS = new Set(['npx', 'cross-env', 'time', 'nohup', 'env', 'dotenv', 'exec']);
const NPM_LIFECYCLE: Record<string, string> = {
  test: 'test',
  t: 'test',
  tst: 'test',
  start: 'start',
  stop: 'stop',
  restart: 'restart',
};

function tokens(segment: string): string[] {
  return (
    segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((t) => t.replace(/^["']|["']$/g, '')) ?? []
  );
}

/**
 * Splits a shell command into executed programs: binaries (after env assignments and wrappers
 * such as `npx` or `cross-env`), `npm run`/`npm test` script invocations, and `node <file>`.
 */
export function summariseCommand(command: string): CommandSummary {
  const bins = new Set<string>();
  const npmRuns = new Set<string>();
  const nodeScripts = new Set<string>();
  for (const segment of command.split(/&&|\|\||;|\||\n/)) {
    let words = tokens(segment.trim());
    while (words.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words = words.slice(1);
    while (words.length > 0 && WRAPPERS.has(words[0])) {
      words = words.slice(1);
      while (
        words.length > 0 &&
        (words[0].startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0]))
      )
        words = words.slice(1);
    }
    if (words.length === 0) continue;
    const [program, ...rest] = words;
    if (program === 'npm' || program === 'pnpm' || program === 'yarn') {
      const args = rest.filter((w) => !w.startsWith('-'));
      if ((args[0] === 'run' || args[0] === 'run-script') && args[1]) {
        npmRuns.add(args[1]);
      } else if (args[0] && NPM_LIFECYCLE[args[0]]) {
        npmRuns.add(NPM_LIFECYCLE[args[0]]);
      } else if (args[0] === 'exec' && args[1]) {
        bins.add(args[1]);
      } else if (
        program === 'yarn' &&
        args[0] &&
        !['install', 'add', 'remove', 'ci'].includes(args[0])
      ) {
        npmRuns.add(args[0]);
      }
      continue;
    }
    if (program === 'node') {
      const file = rest.find((w) => !w.startsWith('-'));
      if (file) nodeScripts.add(file);
      continue;
    }
    if (/^[A-Za-z@][\w@./-]*$/.test(program) && !program.includes('/')) {
      bins.add(program);
    }
  }
  return {
    bins: [...bins].sort(),
    npmRuns: [...npmRuns].sort(),
    nodeScripts: [...nodeScripts].sort(),
  };
}

export interface ScriptEntry {
  name: string;
  command: string;
  line: number | null;
  summary: CommandSummary;
}

/** 1-based line of the first occurrence of `needle` in `text`. */
export function lineOf(text: string, needle: string): number | null {
  const index = text.indexOf(needle);
  return index === -1 ? null : text.slice(0, index).split('\n').length;
}

/** The `scripts` of a package.json, each with its line and executed programs. */
export function parseScripts(packageJsonText: string): Map<string, ScriptEntry> {
  const scripts = new Map<string, ScriptEntry>();
  let parsed: { scripts?: Record<string, unknown> };
  try {
    parsed = JSON.parse(packageJsonText) as { scripts?: Record<string, unknown> };
  } catch {
    return scripts;
  }
  for (const [name, value] of Object.entries(parsed.scripts ?? {})) {
    if (typeof value !== 'string') continue;
    scripts.set(name, {
      name,
      command: value,
      line: lineOf(packageJsonText, `"${name}":`),
      summary: summariseCommand(value),
    });
  }
  return scripts;
}

/**
 * Expands a script to everything it eventually runs, following `npm run` chains and npm's
 * pre/post hooks. Cycles are cut.
 */
export function expandScript(
  scripts: Map<string, ScriptEntry>,
  name: string,
  seen = new Set<string>(),
): { bins: Set<string>; chain: string[] } {
  const bins = new Set<string>();
  const chain: string[] = [];
  for (const hook of [`pre${name}`, name, `post${name}`]) {
    const entry = scripts.get(hook);
    if (!entry || seen.has(hook)) continue;
    seen.add(hook);
    chain.push(hook);
    entry.summary.bins.forEach((b) => bins.add(b));
    for (const nested of entry.summary.npmRuns) {
      const sub = expandScript(scripts, nested, seen);
      sub.bins.forEach((b) => bins.add(b));
      chain.push(...sub.chain);
    }
  }
  return { bins, chain };
}

export interface WorkflowCommand {
  job: string;
  line: number | null;
  command: string;
  summary: CommandSummary;
}

/** Every `run:` command of a GitHub Actions workflow file, with its job and line. */
export function parseWorkflowCommands(text: string): WorkflowCommand[] {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) {
    return [];
  }
  const raw = doc.toJS() as { jobs?: Record<string, { steps?: { run?: unknown }[] }> } | null;
  const out: WorkflowCommand[] = [];
  for (const [job, def] of Object.entries(raw?.jobs ?? {})) {
    for (const step of def?.steps ?? []) {
      if (typeof step?.run !== 'string') continue;
      for (const line of step.run.split('\n')) {
        const command = line.trim();
        if (!command || command.startsWith('#')) continue;
        out.push({ job, line: lineOf(text, command), command, summary: summariseCommand(command) });
      }
    }
  }
  return out;
}
