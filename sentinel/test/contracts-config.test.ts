import fs from 'node:fs';
import path from 'node:path';
import { validateAgainstSchema } from '../src/contracts/schema-validator';
import { SCHEMA_DIR, validateWithSchema } from '../src/contracts/schemas';
import { ConfigError, loadConfig, parseConfig } from '../src/config/load-config';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import { makeHeader, readReport, ReportContractError, writeReport } from '../src/core/report-io';
import { makeTempRepo, removeDir, testContext } from './helpers';

describe('schema validator', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'kind'],
    properties: {
      name: { type: 'string', minLength: 1 },
      kind: { enum: ['a', 'b'] },
      count: { type: 'integer', minimum: 0 },
      tags: { type: 'array', items: { $ref: '#/definitions/tag' }, uniqueItems: true },
      when: { type: 'string', format: 'date-time' },
    },
    definitions: { tag: { type: 'string', pattern: '^[a-z]+$' } },
  };

  it('accepts valid documents', () => {
    expect(
      validateAgainstSchema(schema, {
        name: 'x',
        kind: 'a',
        count: 2,
        tags: ['ok'],
        when: '2026-11-07T00:00:00Z',
      }),
    ).toEqual([]);
  });

  it('reports every violation with a path', () => {
    const errors = validateAgainstSchema(schema, {
      name: '',
      kind: 'c',
      count: -1,
      tags: ['OK', 'OK'],
      extra: true,
      when: 'yesterday',
    });
    const messages = errors.map((e) => `${e.path} ${e.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        '$.name must have length >= 1',
        '$.kind must be one of ["a","b"]',
        '$.count must be >= 0',
        '$.tags[0] must match ^[a-z]+$',
        '$.tags items must be unique',
        '$ unexpected property "extra"',
        '$.when must be a date-time',
      ]),
    );
  });

  it('refuses schemas that use unsupported keywords', () => {
    expect(() => validateAgainstSchema({ type: 'object', patternProperties: {} }, {})).toThrow(
      /Unsupported schema keyword/,
    );
  });

  it('every shipped schema only uses supported keywords and resolves its references', () => {
    const names = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.schema.json'));
    expect(names.length).toBeGreaterThan(2);
    for (const name of names) {
      expect(() => validateWithSchema(name.replace('.schema.json', ''), {})).not.toThrow();
    }
  });
});

describe('report I/O', () => {
  let dir: string;
  beforeEach(() => {
    dir = makeTempRepo({});
  });
  afterEach(() => removeDir(dir));

  const discovery = () => ({
    ...makeHeader(testContext(), 'repository-discovery'),
    languages: [{ name: 'TypeScript', files: 3 }],
    packageManagers: [
      { name: 'npm', manifest: 'package.json', lockfile: 'package-lock.json', lockfileVersion: 3 },
    ],
    testFrameworks: [],
    coverage: { configured: false, thresholds: null, source: null },
    ciWorkflows: [],
    codeowners: { path: null, rules: 0 },
    securityTools: [],
  });

  it('writes and reads back a valid report', () => {
    const file = writeReport(dir, discovery());
    expect(path.basename(file)).toBe('repository-discovery.json');
    expect(readReport(file, 'repository-discovery')).toEqual(discovery());
  });

  it('refuses to write a report that violates its schema', () => {
    const bad = { ...discovery(), languages: 'TypeScript' };
    expect(() => writeReport(dir, bad as never)).toThrow(ReportContractError);
  });

  it('refuses to read tampered or malformed reports', () => {
    const file = path.join(dir, 'x.json');
    fs.writeFileSync(file, '{not json');
    expect(() => readReport(file, 'repository-discovery')).toThrow(/not JSON/);
    fs.writeFileSync(file, JSON.stringify({ ...discovery(), reportType: 'merge-decision' }));
    expect(() => readReport(file, 'repository-discovery')).toThrow(/expected reportType/);
    fs.writeFileSync(
      file,
      JSON.stringify({
        ...discovery(),
        repository: { slug: '../../x', commitSha: 'zz', ref: null },
      }),
    );
    expect(() => readReport(file, 'repository-discovery')).toThrow(ReportContractError);
  });
});

describe('configuration loading', () => {
  it('uses the strict defaults when the file is missing', () => {
    const loaded = loadConfig('/nonexistent/config.yml');
    expect(loaded.usedDefaults).toBe(true);
    expect(loaded.config).toEqual(DEFAULT_CONFIG);
    expect(loaded.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('merges objects and replaces arrays', () => {
    const { config } = parseConfig(
      'version: 1\ncoverage:\n  lineThreshold: 90\nremediation:\n  allowedUpgradeTypes: [patch]\n',
      'test.yml',
    );
    expect(config.coverage.lineThreshold).toBe(90);
    expect(config.coverage.scope).toBe('direct');
    expect(config.remediation.allowedUpgradeTypes).toEqual(['patch']);
  });

  it('normalises validation commands with safe defaults', () => {
    const { config } = parseConfig(
      'version: 1\nvalidation:\n  commands:\n    - id: unit-tests\n      kind: jest\n' +
        '    - id: build\n      kind: command\n      run: [npm, run, build]\n',
      'test.yml',
    );
    expect(config.validation.commands[1]).toEqual({
      id: 'build',
      kind: 'command',
      category: 'other',
      run: ['npm', 'run', 'build'],
      env: {},
      required: true,
      timeoutMinutes: 30,
    });
  });

  it.each([
    ['version: 1\ncoverage:\n  lineTreshold: 90\n', /unexpected property "lineTreshold"/],
    ['version: 1\nremediation:\n  allowedUpgradeTypes: [patch, major]\n', /must be one of/],
    ['version: 2\n', /must equal 1/],
    ['version: 1\nversion: 1\n', /invalid YAML/],
    ['version: 1\ncoverage: [\n', /invalid YAML/],
    ['- just\n- a list\n', /top level must be a mapping/],
    [
      'version: 1\nvalidation:\n  commands:\n    - id: a\n      kind: command\n',
      /needs a non-empty "run"/,
    ],
    [
      'version: 1\nvalidation:\n  commands:\n    - id: a\n      kind: jest\n' +
        'coverage:\n  configurationEvidence:\n    - files: [x]\n      satisfiedBy: [build]\n',
      /unknown validation command "build"/,
    ],
    ['version: 1\ncodeowners:\n  fallbackOwners: [security-team]\n', /must match/],
    [
      'version: 1\necosystems:\n  npm:\n    allowedRegistries: [http://evil.example/]\n',
      /must match/,
    ],
  ])('rejects invalid configuration %#', (text, message) => {
    expect(() => parseConfig(text, 'test.yml')).toThrow(ConfigError);
    expect(() => parseConfig(text, 'test.yml')).toThrow(message);
  });

  it('accepts the repository policy file', () => {
    const file = path.resolve(__dirname, '..', '..', '.github', 'sentinel', 'config.yml');
    const loaded = loadConfig(file);
    expect(loaded.usedDefaults).toBe(false);
    expect(loaded.config.validation.commands.map((c) => c.id)).toContain('unit-tests');
  });
});
