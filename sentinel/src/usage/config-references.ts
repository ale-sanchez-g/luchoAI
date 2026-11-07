import ts from 'typescript';
import type { Confidence } from '../contracts/types';
import type { LiteralToken } from './ast-imports';
import { packageNameOf } from './ast-imports';
import { lineOf } from './scripts';

export interface ConfigMatch {
  name: string;
  value: string;
  line: number | null;
  column: number | null;
  confidence: Confidence;
  rule: string;
}

/**
 * Packages a configuration token may refer to. Exact names and `name/subpath` are confirmed; tool
 * naming conventions (Jest environments, ESLint shareable configs and plugins, `@types`, Babel,
 * Prettier) are inferred.
 */
export function candidatePackages(
  value: string,
): { name: string; confidence: Confidence; rule: string }[] {
  const out: { name: string; confidence: Confidence; rule: string }[] = [];
  const trimmed = value.trim();
  if (!/^[@a-z0-9][\w@./:-]*$/i.test(trimmed) || trimmed.length > 214) {
    return out;
  }
  const exact = packageNameOf(trimmed);
  if (exact) {
    // A bare name is unambiguous; a path such as "next/core-web-vitals" may be resolved by the
    // tool to a different package (eslint-config-next), so it is only inferred.
    out.push(
      exact === trimmed
        ? { name: exact, confidence: 'CONFIRMED', rule: 'literal' }
        : { name: exact, confidence: 'INFERRED', rule: 'subpath' },
    );
  }
  const head = trimmed.replace(/^plugin:/, '').split('/')[0];
  const conventions: [string, string][] = [
    [`jest-environment-${trimmed}`, 'jest testEnvironment naming'],
    [`@types/${trimmed}`, 'TypeScript types naming'],
    [`eslint-config-${head}`, 'ESLint shareable config naming'],
    [`eslint-plugin-${head}`, 'ESLint plugin naming'],
    [`babel-preset-${trimmed}`, 'Babel preset naming'],
    [`babel-plugin-${trimmed}`, 'Babel plugin naming'],
    [`prettier-plugin-${trimmed}`, 'Prettier plugin naming'],
  ];
  for (const [name, rule] of conventions) {
    if (name !== exact) out.push({ name, confidence: 'INFERRED', rule });
  }
  return out;
}

/** Package named by a configuration file's own name (`postcss.config.mjs` -> `postcss`). */
export function configFileOwner(file: string): string | null {
  const match = /(?:^|\/)([a-z0-9@][a-z0-9._-]*)\.config\.(?:[cm]?[jt]s|json)$/.exec(file);
  return match ? match[1] : null;
}

/** Matches literal tokens of a configuration file against the packages of interest. */
export function matchTokens(
  tokens: readonly LiteralToken[],
  interest: ReadonlySet<string>,
): ConfigMatch[] {
  const matches: ConfigMatch[] = [];
  for (const token of tokens) {
    for (const candidate of candidatePackages(token.value)) {
      if (!interest.has(candidate.name)) continue;
      matches.push({
        name: candidate.name,
        value: token.value,
        line: token.line,
        column: token.column,
        confidence:
          token.isPropertyName && candidate.confidence === 'CONFIRMED'
            ? 'INFERRED'
            : candidate.confidence,
        rule: token.isPropertyName ? `${candidate.rule} (object key)` : candidate.rule,
      });
    }
  }
  return matches;
}

const DEPENDENCY_FIELDS = new Set([
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'bundleDependencies',
  'bundledDependencies',
  'overrides',
  'resolutions',
  'scripts',
  'name',
  'version',
  'description',
]);

/**
 * String values and keys of a JSON (or JSON-with-comments) configuration file. For package.json,
 * dependency declarations and scripts are skipped: they are handled separately.
 */
export function jsonTokens(file: string, text: string): LiteralToken[] {
  const parsed = ts.parseConfigFileTextToJson(file, text);
  if (parsed.error || parsed.config === undefined) {
    return [];
  }
  const isManifest = file === 'package.json' || file.endsWith('/package.json');
  const tokens: LiteralToken[] = [];
  const push = (value: string, isPropertyName: boolean): void => {
    tokens.push({ value, line: lineOf(text, `"${value}"`) ?? 0, column: 0, isPropertyName });
  };
  const walk = (value: unknown, depth: number): void => {
    if (typeof value === 'string') {
      push(value, false);
    } else if (Array.isArray(value)) {
      value.forEach((v) => walk(v, depth + 1));
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (isManifest && depth === 0 && DEPENDENCY_FIELDS.has(key)) continue;
        push(key, true);
        walk(child, depth + 1);
      }
    }
  };
  walk(parsed.config, 0);
  return tokens;
}
