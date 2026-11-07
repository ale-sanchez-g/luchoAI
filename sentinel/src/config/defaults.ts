import type { SentinelConfig } from './types';

/**
 * Defaults applied under the repository's `.github/sentinel/config.yml`. Objects are merged key
 * by key; arrays in the repository file replace the default array entirely.
 */
export const DEFAULT_CONFIG: SentinelConfig = {
  version: 1,
  runtime: { node: '20' },
  ecosystems: {
    npm: {
      manifest: 'package.json',
      lockfile: 'package-lock.json',
      allowedRegistries: ['https://registry.npmjs.org/'],
    },
  },
  sources: {
    npmAudit: true,
    githubAdvisoryDatabase: true,
    dependabotAlerts: false,
    osvScanner: { enabled: false, reportPath: 'osv-results.json' },
  },
  severity: { minimum: 'low' },
  remediation: {
    allowedUpgradeTypes: ['patch', 'minor'],
    minimumReleaseAgeHours: 48,
    branch: 'sentinel/dependency-remediation',
    commitMessage: 'fix(deps): remediate vulnerable dependencies',
    maxDependencyPaths: 10,
  },
  analysis: {
    excludedPaths: [
      'node_modules/**',
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'sentinel-reports/**',
      'sentinel-evidence/**',
      'sentinel/dist/**',
      'sentinel/test/fixtures/**',
      '.claude/worktrees/**',
    ],
    maxFileSizeBytes: 1024 * 1024,
    tsconfig: 'tsconfig.json',
    classification: {
      test: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*', 'e2e/**', 'test/**', 'tests/**'],
      documentation: ['**/*.md', 'docs/**'],
      ci: ['.github/workflows/**', '.github/actions/**'],
      infrastructure: ['**/Dockerfile*', '**/*.tf', '/docker-compose*.yml', 'k8s/**', 'helm/**'],
      tooling: ['scripts/**', 'sentinel/**', '.claude/**', '.husky/**'],
      configuration: [
        '/package.json',
        '/*.config.{js,cjs,mjs,ts}',
        '/tsconfig*.json',
        '/.babelrc*',
        '/babel.config.*',
        '/.eslintrc*',
        '/.npmrc',
        '/.nvmrc',
      ],
      production: ['src/**', 'lib/**', 'app/**', 'pages/**', 'components/**', 'server/**'],
    },
  },
  tests: {
    jest: {
      command: ['node_modules/.bin/jest', '--ci'],
      collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/__tests__/**', '!src/**/*.test.*'],
    },
  },
  coverage: {
    scope: 'direct',
    lineThreshold: 80,
    branchThreshold: null,
    requireAttribution: true,
    allowSkippedTests: false,
    typeOnlyImportsRequireEvidence: false,
    evidenceRequiredFor: ['production', 'configuration'],
    configurationEvidence: [],
  },
  validation: {
    commands: [
      {
        id: 'unit-tests',
        kind: 'jest',
        category: 'test',
        run: [],
        env: {},
        required: true,
        timeoutMinutes: 30,
      },
    ],
    npmAudit: 'required',
    auditSignatures: 'required',
  },
  governance: {
    autoMerge: { enabled: true, mergeMethod: 'squash' },
    majorUpgradeRequired: 'require-review',
    noFixAvailable: 'report',
    unresolvedOwnership: 'require-review',
    buildToolUpgrades: 'require-review',
    allowedChangedFiles: ['/package.json', '/package-lock.json'],
    requiredStatusCheck: 'Sentinel decision',
  },
  codeowners: {
    fallbackOwners: [],
    requestReviews: true,
    assignOwners: true,
  },
  labels: {
    dependencyUpdate: 'security/dependency-update',
    coverageComplete: 'security/coverage-complete',
    coverageIncomplete: 'security/coverage-incomplete',
    manualReview: 'security/manual-review',
    validationFailed: 'security/validation-failed',
  },
  reporting: { commentMaxChars: 60000 },
};
