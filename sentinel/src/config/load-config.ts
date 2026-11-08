import fs from 'node:fs';
import { parseDocument } from 'yaml';
import { formatSchemaErrors, validateWithSchema } from '../contracts/schemas';
import { digestOf } from '../core/hash';
import { DEFAULT_CONFIG } from './defaults';
import type { SentinelConfig, ValidationCommandConfig } from './types';

/** Raised for any configuration problem; callers must stop rather than guess. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface LoadedConfig {
  config: SentinelConfig;
  digest: string;
  source: string;
  usedDefaults: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : override) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = (base as Record<string, unknown>)[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out as T;
}

function normaliseCommands(commands: unknown[]): ValidationCommandConfig[] {
  return commands.map((raw) => {
    const c = raw as Partial<ValidationCommandConfig> & { id: string; kind: 'jest' | 'command' };
    return {
      id: c.id,
      kind: c.kind,
      category: c.category ?? (c.kind === 'jest' ? 'test' : 'other'),
      run: c.run ?? [],
      env: c.env ?? {},
      required: c.required ?? true,
      timeoutMinutes: c.timeoutMinutes ?? 30,
    };
  });
}

/** Cross-field rules the schema cannot express. Returns human-readable problems. */
export function semanticProblems(config: SentinelConfig): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  let jestCount = 0;
  for (const command of config.validation.commands) {
    if (ids.has(command.id)) {
      problems.push(`validation.commands: duplicate id "${command.id}"`);
    }
    ids.add(command.id);
    if (command.kind === 'command' && command.run.length === 0) {
      problems.push(`validation.commands.${command.id}: kind "command" needs a non-empty "run"`);
    }
    if (command.kind === 'jest') {
      jestCount += 1;
      if (command.run.length > 0) {
        problems.push(
          `validation.commands.${command.id}: kind "jest" uses tests.jest.command; remove "run"`,
        );
      }
    }
  }
  if (jestCount > 1) {
    problems.push('validation.commands: at most one command of kind "jest" is supported');
  }
  for (const rule of config.coverage.configurationEvidence) {
    for (const id of rule.satisfiedBy) {
      if (!ids.has(id)) {
        problems.push(`coverage.configurationEvidence: unknown validation command "${id}"`);
      }
    }
  }
  if (config.remediation.branch.includes('..') || config.remediation.branch.endsWith('/')) {
    problems.push('remediation.branch is not a valid branch name');
  }
  if (config.governance.allowedChangedFiles.length === 0) {
    problems.push('governance.allowedChangedFiles must not be empty');
  }
  return problems;
}

/**
 * Parses and validates YAML configuration text. Duplicate keys, YAML errors, unknown keys, wrong
 * types and inconsistent references all raise `ConfigError`; nothing is silently ignored.
 */
export function parseConfig(text: string, source: string): LoadedConfig {
  const doc = parseDocument(text, { strict: true, uniqueKeys: true, prettyErrors: true });
  if (doc.errors.length > 0) {
    throw new ConfigError(
      `${source}: invalid YAML\n${doc.errors.map((e) => `  - ${e.message}`).join('\n')}`,
    );
  }
  if (doc.warnings.length > 0) {
    throw new ConfigError(
      `${source}: YAML warnings are treated as errors\n` +
        doc.warnings.map((w) => `  - ${w.message}`).join('\n'),
    );
  }
  const raw: unknown = doc.toJS() ?? {};
  if (!isPlainObject(raw)) {
    throw new ConfigError(`${source}: the top level must be a mapping`);
  }
  const errors = validateWithSchema('config', raw);
  if (errors.length > 0) {
    throw new ConfigError(
      `${source}: configuration does not match the schema\n${formatSchemaErrors(errors)}`,
    );
  }
  const merged = deepMerge(DEFAULT_CONFIG, raw);
  const validation = raw.validation as Record<string, unknown> | undefined;
  if (validation && Array.isArray(validation.commands)) {
    merged.validation.commands = normaliseCommands(validation.commands);
  }
  const problems = semanticProblems(merged);
  if (problems.length > 0) {
    throw new ConfigError(
      `${source}: inconsistent configuration\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
  }
  return { config: merged, digest: digestOf(merged), source, usedDefaults: false };
}

/**
 * Loads the policy file. A missing file yields the (strict) defaults; any other problem throws.
 */
export function loadConfig(file: string): LoadedConfig {
  if (!fs.existsSync(file)) {
    return {
      config: DEFAULT_CONFIG,
      digest: digestOf(DEFAULT_CONFIG),
      source: 'defaults',
      usedDefaults: true,
    };
  }
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) {
    throw new ConfigError(`${file}: not a regular file`);
  }
  return parseConfig(fs.readFileSync(file, 'utf8'), file);
}
