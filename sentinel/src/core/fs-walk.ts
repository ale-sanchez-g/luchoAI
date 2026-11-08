import fs from 'node:fs';
import path from 'node:path';
import { matchesAny } from './glob';

export interface WalkOptions {
  exclude: readonly string[];
  maxFileSizeBytes: number;
}

export interface SkippedFile {
  file: string;
  reason: string;
}

export interface WalkResult {
  files: string[];
  skipped: SkippedFile[];
}

const PROBE = '__sentinel_probe__/__sentinel_probe__';

/**
 * Lists regular files under `root` as sorted repository-relative POSIX paths. Symbolic links are
 * never followed (a crafted link could otherwise pull files from outside the checkout into
 * reports), `.git` is always skipped, excluded trees are pruned and oversized files are skipped.
 */
export function walkRepository(root: string, options: WalkOptions): WalkResult {
  const files: string[] = [];
  const skipped: SkippedFile[] = [];
  const stack: string[] = [''];

  while (stack.length > 0) {
    const relDir = stack.pop() as string;
    const absDir = path.join(root, relDir);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch (error) {
      skipped.push({
        file: relDir || '.',
        reason: `unreadable directory: ${(error as Error).message}`,
      });
      continue;
    }
    for (const entry of entries) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.name === '.git') {
        continue;
      }
      const stat = fs.lstatSync(path.join(root, rel));
      if (stat.isSymbolicLink()) {
        skipped.push({ file: rel, reason: 'symbolic link (not followed)' });
        continue;
      }
      if (stat.isDirectory()) {
        if (matchesAny(`${rel}/${PROBE}`, options.exclude) || matchesAny(rel, options.exclude)) {
          continue;
        }
        stack.push(rel);
        continue;
      }
      if (!stat.isFile()) {
        continue;
      }
      if (matchesAny(rel, options.exclude)) {
        continue;
      }
      if (stat.size > options.maxFileSizeBytes) {
        skipped.push({ file: rel, reason: `larger than ${options.maxFileSizeBytes} bytes` });
        continue;
      }
      files.push(rel);
    }
  }

  files.sort();
  skipped.sort((a, b) => a.file.localeCompare(b.file));
  return { files, skipped };
}

/**
 * Reads a repository file as UTF-8 after re-checking it is a regular file inside `root`.
 * Returns null for anything else.
 */
export function readRepoFile(root: string, rel: string): string | null {
  const abs = path.resolve(root, rel);
  const rootAbs = path.resolve(root);
  if (abs !== rootAbs && !abs.startsWith(`${rootAbs}${path.sep}`)) {
    return null;
  }
  try {
    const stat = fs.lstatSync(abs);
    if (!stat.isFile()) {
      return null;
    }
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}
