import { builtinModules } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { readRepoFile } from '../core/fs-walk';
import { packageNameOf } from './ast-imports';

export type SpecifierClass = 'local' | 'alias' | 'package' | 'builtin' | 'url' | 'unresolved-alias';

export interface Resolution {
  specifierClass: SpecifierClass;
  /** Repository-relative file for local and alias specifiers that resolve. */
  file: string | null;
  /** Package name for bare specifiers. */
  packageName: string | null;
}

interface PathAlias {
  prefix: string;
  suffix: string;
  targets: string[];
}

const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.d.ts',
];
const BUILTINS = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));

/**
 * Resolves module specifiers to repository files, honouring `compilerOptions.paths` from the
 * repository's tsconfig. Only files the walker listed are candidates, so resolution never touches
 * anything outside the scanned set.
 */
export class LocalResolver {
  private readonly aliases: PathAlias[] = [];
  private readonly baseDir: string | null;

  constructor(
    root: string,
    private readonly files: ReadonlySet<string>,
    tsconfig: string | null,
    private readonly installedPackages: ReadonlySet<string> = new Set(),
  ) {
    let baseDir: string | null = null;
    if (tsconfig) {
      const text = readRepoFile(root, tsconfig);
      if (text !== null) {
        const parsed = ts.parseConfigFileTextToJson(tsconfig, text);
        const options = (parsed.config?.compilerOptions ?? {}) as {
          baseUrl?: string;
          paths?: Record<string, string[]>;
        };
        const configDir = path.posix.dirname(tsconfig) === '.' ? '' : path.posix.dirname(tsconfig);
        const pathsBase = path.posix.normalize(path.posix.join(configDir, options.baseUrl ?? '.'));
        baseDir = options.baseUrl !== undefined ? pathsBase : null;
        for (const [pattern, targets] of Object.entries(options.paths ?? {})) {
          const star = pattern.indexOf('*');
          this.aliases.push({
            prefix: star === -1 ? pattern : pattern.slice(0, star),
            suffix: star === -1 ? '' : pattern.slice(star + 1),
            targets: (targets ?? []).map((t) =>
              path.posix.normalize(path.posix.join(pathsBase, t)),
            ),
          });
        }
        this.aliases.sort((a, b) => b.prefix.length - a.prefix.length);
      }
    }
    this.baseDir = baseDir === '.' ? '' : baseDir;
  }

  private probe(candidate: string): string | null {
    const normal = path.posix.normalize(candidate).replace(/^\.\//, '');
    if (normal.startsWith('../')) {
      return null;
    }
    const tries = [normal];
    const ext = path.posix.extname(normal);
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      const stem = normal.slice(0, -ext.length);
      tries.push(`${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${stem}.cts`);
    }
    for (const e of RESOLVE_EXTENSIONS) tries.push(`${normal}${e}`);
    for (const e of RESOLVE_EXTENSIONS) tries.push(`${normal}/index${e}`);
    return tries.find((t) => this.files.has(t)) ?? null;
  }

  /** Classifies and resolves a specifier written in `fromFile`. */
  resolve(fromFile: string, specifier: string): Resolution {
    if (/^(https?|data|file):/i.test(specifier)) {
      return { specifierClass: 'url', file: null, packageName: null };
    }
    if (
      BUILTINS.has(specifier) ||
      BUILTINS.has(specifier.split('/')[0]) ||
      specifier.startsWith('node:')
    ) {
      return { specifierClass: 'builtin', file: null, packageName: null };
    }
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const base = specifier.startsWith('/')
        ? specifier.slice(1)
        : path.posix.join(path.posix.dirname(fromFile), specifier);
      return { specifierClass: 'local', file: this.probe(base), packageName: null };
    }
    for (const alias of this.aliases) {
      if (
        specifier.startsWith(alias.prefix) &&
        specifier.endsWith(alias.suffix) &&
        specifier.length >= alias.prefix.length + alias.suffix.length
      ) {
        const matched = specifier.slice(
          alias.prefix.length,
          specifier.length - alias.suffix.length,
        );
        for (const target of alias.targets) {
          const file = this.probe(target.replace('*', matched));
          if (file) {
            return { specifierClass: 'alias', file, packageName: null };
          }
        }
      }
    }
    if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
      return { specifierClass: 'unresolved-alias', file: null, packageName: null };
    }
    const pkg = packageNameOf(specifier);
    // An installed package always wins over a baseUrl lookup, so package usage is never hidden.
    if (this.baseDir !== null && !(pkg && this.installedPackages.has(pkg))) {
      const viaBase = this.probe(path.posix.join(this.baseDir, specifier));
      if (viaBase) {
        return { specifierClass: 'alias', file: viaBase, packageName: null };
      }
    }
    return pkg
      ? { specifierClass: 'package', file: null, packageName: pkg }
      : { specifierClass: 'unresolved-alias', file: null, packageName: null };
  }
}
