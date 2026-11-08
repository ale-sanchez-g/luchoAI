/**
 * Minimal glob matcher for repository-relative POSIX paths. Supported syntax: `*` (within one
 * path segment), `**` (any number of segments), `?`, character classes `[abc]`, and brace
 * alternatives `{a,b}`. Patterns are anchored to the repository root; a pattern without a slash
 * matches the basename at any depth (`*.md` matches `docs/a.md`).
 */

const cache = new Map<string, RegExp>();

function escapeRegex(ch: string): string {
  return /[.+^$()|\\]/.test(ch) ? `\\${ch}` : ch;
}

function expandBraces(pattern: string): string[] {
  const open = pattern.indexOf('{');
  if (open === -1) {
    return [pattern];
  }
  let depth = 0;
  for (let i = open; i < pattern.length; i += 1) {
    if (pattern[i] === '{') depth += 1;
    if (pattern[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        const inner = pattern.slice(open + 1, i);
        const parts: string[] = [];
        let level = 0;
        let start = 0;
        for (let j = 0; j < inner.length; j += 1) {
          if (inner[j] === '{') level += 1;
          if (inner[j] === '}') level -= 1;
          if (inner[j] === ',' && level === 0) {
            parts.push(inner.slice(start, j));
            start = j + 1;
          }
        }
        parts.push(inner.slice(start));
        const head = pattern.slice(0, open);
        const tail = pattern.slice(i + 1);
        return parts.flatMap((part) => expandBraces(`${head}${part}${tail}`));
      }
    }
  }
  return [pattern];
}

function compileOne(pattern: string): string {
  let re = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        const prevSlash = i === 0 || pattern[i - 1] === '/';
        const nextSlash = pattern[i + 2] === '/' || i + 2 === pattern.length;
        if (prevSlash && nextSlash) {
          if (pattern[i + 2] === '/') {
            re += '(?:.*/)?';
            i += 2;
          } else {
            re += '.*';
            i += 1;
          }
          continue;
        }
        re += '[^/]*';
        i += 1;
        continue;
      }
      re += '[^/]*';
    } else if (ch === '?') {
      re += '[^/]';
    } else if (ch === '[') {
      const close = pattern.indexOf(']', i + 1);
      if (close === -1) {
        re += '\\[';
      } else {
        const body = pattern.slice(i + 1, close).replace(/\\/g, '\\\\');
        re += body.startsWith('!') ? `[^${body.slice(1)}]` : `[${body}]`;
        i = close;
      }
    } else {
      re += escapeRegex(ch);
    }
  }
  return re;
}

/** Compiles a glob into an anchored regular expression. */
export function globToRegExp(pattern: string): RegExp {
  const cached = cache.get(pattern);
  if (cached) {
    return cached;
  }
  let p = pattern.trim();
  let anchored = false;
  if (p.startsWith('./')) {
    p = p.slice(2);
    anchored = true;
  }
  if (p.startsWith('/')) {
    p = p.slice(1);
    anchored = true;
  }
  const variants = expandBraces(p).map((variant) => {
    const hasSlash = anchored || variant.replace(/\/$/, '').includes('/');
    const body = compileOne(variant.endsWith('/') ? `${variant}**` : variant);
    return hasSlash ? body : `(?:.*/)?${body}`;
  });
  const regex = new RegExp(`^(?:${variants.join('|')})$`);
  cache.set(pattern, regex);
  return regex;
}

/** True when the repository-relative POSIX `file` matches `pattern`. */
export function matchesGlob(file: string, pattern: string): boolean {
  return globToRegExp(pattern).test(file);
}

/**
 * Applies an ordered pattern list where entries starting with `!` exclude. A file matches when
 * the last pattern that applies to it is a positive one.
 */
export function matchesAny(file: string, patterns: readonly string[]): boolean {
  let matched = false;
  for (const raw of patterns) {
    const negated = raw.startsWith('!');
    const pattern = negated ? raw.slice(1) : raw;
    if (matchesGlob(file, pattern)) {
      matched = !negated;
    }
  }
  return matched;
}
