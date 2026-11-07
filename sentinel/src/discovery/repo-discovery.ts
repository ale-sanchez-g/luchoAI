import type { Limitation, RepositoryDiscovery } from '../contracts/types';
import { readRepoFile, walkRepository } from '../core/fs-walk';
import { extensionOf } from '../core/paths';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';
import { extractJestThresholds } from '../coverage/repo-thresholds';

const LANGUAGES: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.css': 'CSS',
  '.scss': 'CSS',
  '.sh': 'Shell',
  '.yml': 'YAML',
  '.yaml': 'YAML',
};

const PACKAGE_MANAGERS: {
  name: string;
  manifest: string;
  lockfiles: string[];
  supported: boolean;
}[] = [
  {
    name: 'npm',
    manifest: 'package.json',
    lockfiles: ['package-lock.json', 'npm-shrinkwrap.json'],
    supported: true,
  },
  { name: 'yarn', manifest: 'package.json', lockfiles: ['yarn.lock'], supported: false },
  { name: 'pnpm', manifest: 'package.json', lockfiles: ['pnpm-lock.yaml'], supported: false },
  { name: 'pip', manifest: 'requirements.txt', lockfiles: [], supported: false },
  { name: 'poetry', manifest: 'pyproject.toml', lockfiles: ['poetry.lock'], supported: false },
  { name: 'go', manifest: 'go.mod', lockfiles: ['go.sum'], supported: false },
  { name: 'cargo', manifest: 'Cargo.toml', lockfiles: ['Cargo.lock'], supported: false },
  { name: 'maven', manifest: 'pom.xml', lockfiles: [], supported: false },
  { name: 'gradle', manifest: 'build.gradle', lockfiles: ['gradle.lockfile'], supported: false },
  { name: 'bundler', manifest: 'Gemfile', lockfiles: ['Gemfile.lock'], supported: false },
  { name: 'composer', manifest: 'composer.json', lockfiles: ['composer.lock'], supported: false },
];

/** CODEOWNERS locations in GitHub's order of precedence. */
export const CODEOWNERS_LOCATIONS = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'];

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  jest?: unknown;
}

function readJson<T>(root: string, rel: string): T | null {
  const text = readRepoFile(root, rel);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Finds the CODEOWNERS file GitHub would use, if any. */
export function findCodeowners(files: readonly string[]): string | null {
  return CODEOWNERS_LOCATIONS.find((candidate) => files.includes(candidate)) ?? null;
}

/**
 * Inspects the repository without executing any of its code: languages, package managers,
 * test frameworks, coverage configuration, CI workflows, CODEOWNERS and security tooling.
 */
export function discoverRepository(
  root: string,
  ctx: RunContext,
  exclude: readonly string[],
): RepositoryDiscovery {
  const { files } = walkRepository(root, { exclude, maxFileSizeBytes: 5 * 1024 * 1024 });
  const limitations: Limitation[] = [];

  const languageCounts = new Map<string, number>();
  for (const file of files) {
    const language = LANGUAGES[extensionOf(file)];
    if (language) {
      languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
    }
  }
  const languages = [...languageCounts.entries()]
    .map(([name, count]) => ({ name, files: count }))
    .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));

  const packageManagers: RepositoryDiscovery['packageManagers'] = [];
  for (const pm of PACKAGE_MANAGERS) {
    const manifests = files.filter((f) => f === pm.manifest || f.endsWith(`/${pm.manifest}`));
    for (const manifest of manifests) {
      const dir = manifest.includes('/') ? manifest.slice(0, manifest.lastIndexOf('/') + 1) : '';
      const lockfile = pm.lockfiles.map((l) => `${dir}${l}`).find((l) => files.includes(l)) ?? null;
      if (pm.name !== 'npm' && pm.manifest === 'package.json' && !lockfile) {
        continue;
      }
      if (
        pm.name === 'npm' &&
        !lockfile &&
        dir === '' &&
        files.some((f) => f === 'yarn.lock' || f === 'pnpm-lock.yaml')
      ) {
        continue;
      }
      let lockfileVersion: number | null = null;
      if (lockfile && pm.name === 'npm') {
        const lock = readJson<{ lockfileVersion?: number }>(root, lockfile);
        lockfileVersion = typeof lock?.lockfileVersion === 'number' ? lock.lockfileVersion : null;
      }
      packageManagers.push({ name: pm.name, manifest, lockfile, lockfileVersion });
      if (!pm.supported) {
        limitations.push({
          code: 'UNSUPPORTED_ECOSYSTEM',
          message:
            `${pm.name} detected (${manifest}) ` +
            'but this release of Sentinel only remediates npm',
          subject: manifest,
        });
      }
    }
  }

  const pkg = readJson<PackageJson>(root, 'package.json');
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const testFrameworks: RepositoryDiscovery['testFrameworks'] = [];
  const jestConfig = files.find((f) => /^jest\.config\.(js|cjs|mjs|ts|json)$/.test(f)) ?? null;
  if (deps.jest || jestConfig || pkg?.jest) {
    const testScript = pkg?.scripts?.test ?? null;
    testFrameworks.push({
      name: 'jest',
      configFile: jestConfig ?? (pkg?.jest ? 'package.json' : null),
      command: testScript && /\bjest\b/.test(testScript) ? 'npm test' : null,
    });
  }
  if (deps.vitest) {
    testFrameworks.push({
      name: 'vitest',
      configFile: files.find((f) => /^vitest\.config\./.test(f)) ?? null,
      command: null,
    });
    limitations.push({
      code: 'UNSUPPORTED_TEST_FRAMEWORK',
      message: 'vitest detected; coverage attribution supports Jest only',
    });
  }
  if (deps.mocha) {
    testFrameworks.push({
      name: 'mocha',
      configFile: files.find((f) => /^\.mocharc/.test(f)) ?? null,
      command: null,
    });
    limitations.push({
      code: 'UNSUPPORTED_TEST_FRAMEWORK',
      message: 'mocha detected; coverage attribution supports Jest only',
    });
  }
  if (deps.playwright || deps['@playwright/test']) {
    const e2eScript = Object.entries(pkg?.scripts ?? {}).find(([name]) => /e2e/.test(name));
    testFrameworks.push({
      name: 'playwright',
      configFile: files.find((f) => /^playwright\.config\./.test(f)) ?? null,
      command: e2eScript ? `npm run ${e2eScript[0]}` : null,
    });
  }

  let coverage: RepositoryDiscovery['coverage'] = {
    configured: false,
    thresholds: null,
    source: null,
  };
  if (jestConfig) {
    const extracted = extractJestThresholds(jestConfig, readRepoFile(root, jestConfig) ?? '');
    coverage = {
      configured: extracted.coverageConfigured,
      thresholds: extracted.thresholds,
      source: jestConfig,
    };
    limitations.push(...extracted.limitations);
  }

  const ciWorkflows = files.filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f));
  const codeownersPath = findCodeowners(files);
  const codeownersRules = codeownersPath
    ? (readRepoFile(root, codeownersPath) ?? '')
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#')).length
    : 0;

  const securityTools = new Set<string>();
  for (const workflow of ciWorkflows) {
    const text = readRepoFile(root, workflow) ?? '';
    if (/npm audit\b/.test(text)) securityTools.add('npm-audit');
    if (/github\/codeql-action/.test(text)) securityTools.add('codeql');
    if (/osv-scanner/.test(text)) securityTools.add('osv-scanner');
    if (/snyk/i.test(text)) securityTools.add('snyk');
    if (/trivy/i.test(text)) securityTools.add('trivy');
    if (/gitleaks|trufflehog/i.test(text)) securityTools.add('secret-scanner');
    if (/grep[^\n]*sk-ant-/.test(text)) securityTools.add('grep-secret-scan');
  }
  if (files.includes('.github/dependabot.yml') || files.includes('.github/dependabot.yaml')) {
    securityTools.add('dependabot-updates');
  }
  if (files.some((f) => /^(\.github\/)?renovate\.json5?$/.test(f) || f === '.renovaterc')) {
    securityTools.add('renovate');
  }

  if (!codeownersPath) {
    limitations.push({
      code: 'NO_CODEOWNERS',
      message: 'No CODEOWNERS file; ownership of impacted files cannot be resolved',
    });
  }

  return {
    ...makeHeader(ctx, 'repository-discovery', limitations),
    languages,
    packageManagers,
    testFrameworks,
    coverage,
    ciWorkflows,
    codeowners: { path: codeownersPath, rules: codeownersRules },
    securityTools: [...securityTools].sort(),
  };
}
