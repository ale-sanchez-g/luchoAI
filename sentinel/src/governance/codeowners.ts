import type { OwnershipResult } from '../contracts/types';

export interface CodeownersRule {
  pattern: string;
  owners: string[];
  line: number;
  regex: RegExp;
}

export interface CodeownersFile {
  path: string;
  rules: CodeownersRule[];
  errors: { line: number; message: string }[];
}

const USER = /^@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const TEAM = /^@[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function escapeRegex(ch: string): string {
  return /[.+^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch;
}

/**
 * Compiles a CODEOWNERS pattern with GitHub's gitignore-like rules: a leading or middle slash
 * anchors to the root, a trailing slash matches a directory's contents, a pattern without a slash
 * matches at any depth, and a pattern that names a directory covers everything inside it.
 * Character ranges are literal (GitHub does not support them).
 */
export function compileCodeownersPattern(raw: string): RegExp {
  let pattern = raw;
  const dirOnly = pattern.endsWith('/');
  if (dirOnly) pattern = pattern.slice(0, -1);
  const anchored = pattern.startsWith('/') || pattern.includes('/');
  if (pattern.startsWith('/')) pattern = pattern.slice(1);
  let body = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        const atStart = i === 0 || pattern[i - 1] === '/';
        const atEnd = i + 2 === pattern.length || pattern[i + 2] === '/';
        if (atStart && atEnd) {
          if (pattern[i + 2] === '/') {
            body += '(?:.*/)?';
            i += 2;
          } else {
            body += '.*';
            i += 1;
          }
          continue;
        }
      }
      body += '[^/]*';
    } else if (ch === '?') {
      body += '[^/]';
    } else {
      body += escapeRegex(ch);
    }
  }
  // A wildcard in the last segment ("docs/*", "*.js") matches entries at that level only; GitHub
  // documents that "docs/*" does not cover docs/sub/file. A literal name also covers a directory.
  const last = pattern.split('/').pop() ?? '';
  const wildcardLast = last.includes('*') && last !== '**';
  const prefix = anchored ? '^' : '^(?:.*/)?';
  const suffix = dirOnly ? '/.*$' : wildcardLast ? '$' : '(?:/.*)?$';
  return new RegExp(`${prefix}${body}${suffix}`);
}

/** Parses CODEOWNERS text; unsupported syntax is reported, not guessed at. */
export function parseCodeowners(path: string, text: string): CodeownersFile {
  const rules: CodeownersRule[] = [];
  const errors: { line: number; message: string }[] = [];
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const content = rawLine.replace(/\s+#.*$/, '').trim();
    if (!content || content.startsWith('#')) return;
    const [pattern, ...tokens] = content.split(/\s+/);
    if (pattern.startsWith('!')) {
      errors.push({
        line,
        message: `negation "${pattern}" is not supported by CODEOWNERS; rule ignored`,
      });
      return;
    }
    if (pattern.startsWith('\\#')) {
      errors.push({
        line,
        message: 'escaped "#" patterns are not supported by CODEOWNERS; rule ignored',
      });
      return;
    }
    if (/\[.*\]/.test(pattern)) {
      errors.push({
        line,
        message: `character ranges in "${pattern}" are not supported; matched literally`,
      });
    }
    const owners: string[] = [];
    for (const token of tokens) {
      if (USER.test(token) || TEAM.test(token) || EMAIL.test(token)) {
        owners.push(token);
      } else {
        errors.push({ line, message: `invalid owner "${token}"` });
      }
    }
    rules.push({ pattern, owners, line, regex: compileCodeownersPattern(pattern) });
  });
  return { path, rules, errors };
}

/** Owners of a file: the last matching rule wins; a matching rule with no owners means unowned. */
export function ownersFor(
  file: CodeownersFile,
  target: string,
): { owners: string[]; rule: CodeownersRule | null } {
  for (let i = file.rules.length - 1; i >= 0; i -= 1) {
    if (file.rules[i].regex.test(target)) {
      return { owners: file.rules[i].owners, rule: file.rules[i] };
    }
  }
  return { owners: [], rule: null };
}

/**
 * Resolves owners for impacted files. Files without an owner are never dropped: they are listed
 * as unresolved and assigned the configured fallback owners when there are any.
 */
export function resolveOwnership(
  files: readonly string[],
  codeowners: CodeownersFile | null,
  fallback: readonly string[],
): OwnershipResult {
  const assignments: OwnershipResult['assignments'] = [];
  const unresolvedFiles: string[] = [];
  for (const file of [...new Set(files)].sort()) {
    const match = codeowners ? ownersFor(codeowners, file) : { owners: [], rule: null };
    if (match.owners.length > 0) {
      assignments.push({
        file,
        owners: match.owners,
        source: 'codeowners',
        rule: `${codeowners?.path}:${match.rule?.line} ${match.rule?.pattern}`,
      });
      continue;
    }
    unresolvedFiles.push(file);
    assignments.push({
      file,
      owners: [...fallback],
      source: fallback.length > 0 ? 'fallback' : 'none',
      rule: match.rule
        ? `${codeowners?.path}:${match.rule.line} ${match.rule.pattern} (no owners)`
        : null,
    });
  }
  const owners = [...new Set(assignments.flatMap((a) => a.owners))].sort();
  return {
    codeownersFile: codeowners?.path ?? null,
    owners,
    users: owners.filter((o) => USER.test(o)).map((o) => o.slice(1)),
    teams: owners.filter((o) => TEAM.test(o)).map((o) => o.slice(1)),
    emails: owners.filter((o) => EMAIL.test(o)),
    assignments,
    unresolvedFiles,
    fallbackApplied: unresolvedFiles.length > 0 && fallback.length > 0,
  };
}
