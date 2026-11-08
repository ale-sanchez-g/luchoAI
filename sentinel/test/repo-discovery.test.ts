import { discoverRepository } from '../src/discovery/repo-discovery';
import { extractJestThresholds } from '../src/coverage/repo-thresholds';
import { assertReport } from '../src/core/report-io';
import { makeTempRepo, removeDir, testContext } from './helpers';

describe('discoverRepository', () => {
  let root: string;
  afterEach(() => removeDir(root));

  it('detects npm, jest, playwright, workflows and the absence of CODEOWNERS', () => {
    root = makeTempRepo({
      'package.json': JSON.stringify({
        scripts: { test: 'jest --ci', 'test:e2e': 'node e2e/a.mjs' },
        devDependencies: { jest: '^29', playwright: '^1' },
      }),
      'package-lock.json': JSON.stringify({ lockfileVersion: 3, packages: {} }),
      'jest.config.js':
        'module.exports = { coverageThreshold: { global: { lines: 90, branches: 75 } } };',
      'src/a.ts': 'export const a = 1;',
      'src/b.tsx': 'export const b = 1;',
      'e2e/a.mjs': '',
      '.github/workflows/ci.yml':
        'jobs:\n  a:\n    steps:\n      - run: npm audit --audit-level=high\n',
    });
    const report = discoverRepository(root, testContext(), ['node_modules/**']);
    assertReport(report);
    expect(report.languages).toEqual([
      { name: 'JavaScript', files: 2 },
      { name: 'TypeScript', files: 2 },
      { name: 'YAML', files: 1 },
    ]);
    expect(report.packageManagers).toEqual([
      { name: 'npm', manifest: 'package.json', lockfile: 'package-lock.json', lockfileVersion: 3 },
    ]);
    expect(report.testFrameworks).toEqual([
      { name: 'jest', configFile: 'jest.config.js', command: 'npm test' },
      { name: 'playwright', configFile: null, command: 'npm run test:e2e' },
    ]);
    expect(report.coverage.thresholds).toEqual({
      lines: 90,
      branches: 75,
      functions: null,
      statements: null,
    });
    expect(report.ciWorkflows).toEqual(['.github/workflows/ci.yml']);
    expect(report.codeowners).toEqual({ path: null, rules: 0 });
    expect(report.securityTools).toEqual(['npm-audit']);
    expect(report.limitations.map((l) => l.code)).toContain('NO_CODEOWNERS');
  });

  it('records other ecosystems as detected but unsupported', () => {
    root = makeTempRepo({
      'requirements.txt': 'flask==2.0\n',
      '.github/CODEOWNERS': '# c\n* @org/team\n',
    });
    const report = discoverRepository(root, testContext(), []);
    expect(report.packageManagers.map((p) => p.name)).toEqual(['pip']);
    expect(report.limitations.map((l) => l.code)).toContain('UNSUPPORTED_ECOSYSTEM');
    expect(report.codeowners).toEqual({ path: '.github/CODEOWNERS', rules: 1 });
  });
});

describe('extractJestThresholds', () => {
  it('reads thresholds statically without executing the file', () => {
    const text =
      "throw new Error('must not run');\n" +
      'module.exports = { coverageThreshold: { global: { lines: 85, functions: -10 } } };';
    const result = extractJestThresholds('jest.config.js', text);
    expect(result.thresholds).toEqual({
      lines: 85,
      branches: null,
      functions: null,
      statements: null,
    });
    expect(result.limitations.map((l) => l.code)).toEqual(['THRESHOLD_NOT_PERCENTAGE']);
  });

  it('flags settings computed at runtime', () => {
    const result = extractJestThresholds(
      'jest.config.ts',
      'export default { coverageThreshold: { global: { lines: LIMIT } } };',
    );
    expect(result.thresholds).toEqual({
      lines: null,
      branches: null,
      functions: null,
      statements: null,
    });
    expect(result.limitations.map((l) => l.code)).toContain('CONFIG_NOT_STATIC');
  });

  it('reads the jest key of package.json', () => {
    const result = extractJestThresholds(
      'package.json',
      JSON.stringify({ jest: { collectCoverage: true } }),
    );
    expect(result.coverageConfigured).toBe(true);
    expect(result.thresholds).toBeNull();
  });
});
