import path from 'node:path';

/** Converts a path to forward slashes. */
export function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

/**
 * Returns `absolute` relative to `root` in POSIX form, or null when it lies outside `root`.
 * Reports only ever contain repository-relative paths.
 */
export function relativeTo(root: string, absolute: string): string | null {
  const rel = path.relative(path.resolve(root), path.resolve(absolute));
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    return rel === '' ? '' : null;
  }
  return toPosix(rel);
}

/** True when `candidate` resolves to `root` or a path inside it. */
export function isInside(root: string, candidate: string): boolean {
  return relativeTo(root, candidate) !== null;
}

/** File extension in lower case, including the dot (`.tsx`), or '' when there is none. */
export function extensionOf(file: string): string {
  return path.extname(file).toLowerCase();
}
