import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { LoadedConfig } from '../config/load-config';
import { loadConfig } from '../config/load-config';
import type { RunContext } from '../core/report-io';
import { sanitizedEnv } from '../core/redact';
import type { GitHubApi } from '../github/client';
import { FetchGitHubApi } from '../github/client';
import { NpmViewRegistry } from '../vulnerabilities/registry';
import type { RegistryClient } from '../vulnerabilities/registry';

/** Options shared by every CLI command. */
export interface CommonOptions {
  /** Never call the GitHub API (local runs, dry runs). */
  offline: boolean;
  repoDir: string;
  trustedDir: string;
  configPath: string;
  outDir: string;
  repoSlug: string | null;
  sha: string | null;
  ref: string | null;
}

/** Everything a pipeline stage needs, built once per CLI invocation. */
export interface StageEnv {
  options: CommonOptions;
  ctx: RunContext;
  loaded: LoadedConfig;
  github: GitHubApi | null;
  registry: RegistryClient;
  /** Environment for commands that may execute repository or dependency code. */
  childEnv: NodeJS.ProcessEnv;
}

/** HEAD commit of a git checkout, or null when unavailable. */
export function gitHead(dir: string): string | null {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** Execution id: the Actions run and attempt when available, otherwise a local timestamp. */
export function executionId(env: NodeJS.ProcessEnv, now: Date): string {
  if (env.GITHUB_RUN_ID) {
    return `gh-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT ?? '1'}`;
  }
  return `local-${now.toISOString().replace(/[-:.]/g, '')}`;
}

/** The GitHub token Sentinel may use, preferring a dedicated one. Never logged. */
export function githubToken(env: NodeJS.ProcessEnv): string | null {
  return env.SENTINEL_GITHUB_TOKEN || env.GITHUB_TOKEN || null;
}

/** Builds the stage environment; configuration errors propagate to the caller. */
export function buildStageEnv(
  options: CommonOptions,
  env: NodeJS.ProcessEnv = process.env,
): StageEnv {
  const now = new Date();
  const loaded = loadConfig(options.configPath);
  const token = githubToken(env);
  const slug = options.repoSlug ?? env.GITHUB_REPOSITORY ?? null;
  return {
    options: { ...options, repoSlug: slug },
    ctx: {
      executionId: executionId(env, now),
      repository: {
        slug,
        commitSha: options.sha ?? gitHead(options.repoDir),
        ref: options.ref ?? env.GITHUB_REF ?? null,
      },
      now: () => new Date(),
    },
    loaded,
    github:
      token && !options.offline ? new FetchGitHubApi({ token, apiUrl: env.GITHUB_API_URL }) : null,
    registry: new NpmViewRegistry(
      options.trustedDir,
      sanitizedEnv(env),
      loaded.config.ecosystems.npm.allowedRegistries[0],
    ),
    childEnv: sanitizedEnv(env),
  };
}

/** Resolves CLI paths against the current directory. */
export function resolveOptions(
  raw: Partial<Record<Exclude<keyof CommonOptions, 'offline'>, string | null>> & {
    offline?: boolean;
  },
): CommonOptions {
  const repoDir = path.resolve(raw.repoDir ?? '.');
  const trustedDir = path.resolve(raw.trustedDir ?? repoDir);
  return {
    offline: raw.offline === true,
    repoDir,
    trustedDir,
    configPath: path.resolve(
      raw.configPath ?? path.join(trustedDir, '.github', 'sentinel', 'config.yml'),
    ),
    outDir: path.resolve(raw.outDir ?? 'sentinel-reports'),
    repoSlug: raw.repoSlug ?? null,
    sha: raw.sha ?? null,
    ref: raw.ref ?? null,
  };
}
