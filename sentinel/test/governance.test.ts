import { assertReport } from '../src/core/report-io';
import {
  compileCodeownersPattern,
  ownersFor,
  parseCodeowners,
  resolveOwnership,
} from '../src/governance/codeowners';
import type { GovernanceInput } from '../src/governance/decision';
import { decide } from '../src/governance/decision';
import { GREEN_CONFIG, greenInput, KEY, SHA } from './governance-helpers';
import { testContext } from './helpers';

function decideWith(change: (input: GovernanceInput) => void) {
  const input = greenInput();
  change(input);
  const decision = decide(input);
  assertReport(decision);
  return decision;
}

const codes = (d: ReturnType<typeof decide>): string[] =>
  d.reasons.filter((r) => r.effect !== 'INFO').map((r) => `${r.effect}:${r.code}`);
const gate = (d: ReturnType<typeof decide>, id: string) => d.gates.find((g) => g.id === id)?.status;

describe('merge decision', () => {
  it('auto-merges only when all eight gates pass', () => {
    const d = decideWith(() => undefined);
    expect(d.decision).toBe('AUTO_MERGE');
    expect(d.gates.map((g) => g.status)).toEqual(Array(8).fill('PASS'));
    expect(d.labels).toEqual(['security/dependency-update', 'security/coverage-complete']);
  });

  it('is reproducible from the same evidence and policy, whatever the run id or time', () => {
    const a = decide(greenInput());
    const other = greenInput();
    other.ctx = testContext({
      executionId: 'another-run',
      now: () => new Date('2027-01-01T00:00:00Z'),
    });
    const b = decide(other);
    expect(b.decisionDigest).toBe(a.decisionDigest);
    expect(b.inputs.digests).toEqual(a.inputs.digests);
    expect(b.inputs.evaluatedAt).not.toBe(a.inputs.evaluatedAt);
  });

  it.each([
    [
      'an impacted file is not tested',
      (i: GovernanceInput) => {
        i.coverage!.files[0].status = 'NOT_TESTED';
      },
      'HUMAN_REVIEW',
      'G4',
      ['REVIEW:FILE_NOT_TESTED'],
    ],
    [
      'coverage is below the threshold',
      (i: GovernanceInput) => {
        i.coverage!.files[0].status = 'TESTED_INSUFFICIENT_COVERAGE';
      },
      'HUMAN_REVIEW',
      'G4',
      ['REVIEW:FILE_INSUFFICIENT_COVERAGE'],
    ],
    [
      'coverage evidence is missing',
      (i: GovernanceInput) => {
        i.coverage = null;
      },
      'HUMAN_REVIEW',
      'G4',
      ['REVIEW:COVERAGE_REPORT_MISSING'],
    ],
    [
      'coverage evidence is malformed',
      (i: GovernanceInput) => {
        i.coverage!.inputs[0].status = 'MALFORMED';
      },
      'BLOCKED',
      'G4',
      ['BLOCK:COVERAGE_REPORT_MALFORMED'],
    ],
    [
      'attribution is unavailable',
      (i: GovernanceInput) => {
        i.coverage!.attribution.available = false;
      },
      'HUMAN_REVIEW',
      'G4',
      ['REVIEW:ATTRIBUTION_UNAVAILABLE'],
    ],
    [
      'tests fail after remediation',
      (i: GovernanceInput) => {
        i.validation!.commands[0].status = 'FAILED';
        i.validation!.tests.failed = 2;
      },
      'BLOCKED',
      'G5',
      ['BLOCK:TESTS_FAILED'],
    ],
    [
      'tests are skipped',
      (i: GovernanceInput) => {
        i.validation!.tests.skipped = 1;
      },
      'HUMAN_REVIEW',
      'G5',
      ['REVIEW:TESTS_SKIPPED'],
    ],
    [
      'validation evidence is missing',
      (i: GovernanceInput) => {
        i.validation = null;
        i.evidenceJobResult = 'failure';
      },
      'BLOCKED',
      'G5',
      ['BLOCK:EVIDENCE_JOB_FAILED', 'BLOCK:TEST_EVIDENCE_MISSING'],
    ],
    [
      'the build fails',
      (i: GovernanceInput) => {
        i.validation!.commands[1].status = 'FAILED';
      },
      'BLOCKED',
      'G6',
      ['BLOCK:VALIDATION_FAILED'],
    ],
    [
      'a registry signature is invalid',
      (i: GovernanceInput) => {
        i.signatures = {
          status: 'INVALID',
          invalid: [{ name: 'x', version: '1.0.0', code: 'EINTEGRITYSIGNATURE' }],
          missing: [],
          detail: 'tampered',
        };
      },
      'BLOCKED',
      'G6',
      ['BLOCK:SIGNATURES_INVALID'],
    ],
    [
      'signatures could not be verified',
      (i: GovernanceInput) => {
        i.signatures = {
          status: 'UNAVAILABLE',
          invalid: [],
          missing: [],
          detail: 'Failed to download',
        };
      },
      'HUMAN_REVIEW',
      'G6',
      ['REVIEW:SIGNATURE_VERIFICATION_UNAVAILABLE'],
    ],
    [
      'the lockfile points at another registry',
      (i: GovernanceInput) => {
        i.remediation.integrity.registry.violations = [
          { location: 'node_modules/x', resolved: 'https://evil.example/x.tgz' },
        ];
      },
      'BLOCKED',
      'G6',
      ['BLOCK:REGISTRY_NOT_ALLOWED'],
    ],
    [
      'a major upgrade is required',
      (i: GovernanceInput) => {
        i.remediation.escalations = [
          {
            vulnerabilityKey: 'GHSA-5555-6666-7777|other',
            package: 'other',
            location: 'node_modules/other',
            reason: 'MAJOR_UPGRADE_REQUIRED',
            detail: '1.0.0 -> 2.0.0',
          },
        ];
      },
      'HUMAN_REVIEW',
      'G1',
      ['REVIEW:MAJOR_UPGRADE_REQUIRED'],
    ],
    [
      'a targeted vulnerability remains',
      (i: GovernanceInput) => {
        i.remediation.verification.remaining = [KEY];
        i.remediation.verification.resolved = [];
      },
      'HUMAN_REVIEW',
      'G1',
      ['REVIEW:TARGET_NOT_RESOLVED'],
    ],
    [
      'the audit could not run',
      (i: GovernanceInput) => {
        i.vulnerabilities.sources[0].status = 'ERROR';
      },
      'BLOCKED',
      'G1',
      ['BLOCK:AUDIT_UNAVAILABLE'],
    ],
    [
      'usage cannot be established',
      (i: GovernanceInput) => {
        i.usage.packages[0].status = 'UNKNOWN';
        i.usage.packages[0].completeness = 'UNKNOWN';
      },
      'HUMAN_REVIEW',
      'G2',
      ['REVIEW:USAGE_UNKNOWN'],
    ],
    [
      'impact is unknown',
      (i: GovernanceInput) => {
        i.impact.packages[0].unknowns = [{ code: 'IMPACT_UNKNOWN', message: 'x' }];
      },
      'HUMAN_REVIEW',
      'G3',
      ['REVIEW:IMPACT_UNKNOWN'],
    ],
    [
      'the target needs a newer Node',
      (i: GovernanceInput) => {
        i.impact.packages[0].risk.signals = [
          { code: 'ENGINES_INCOMPATIBLE', package: 'lib', detail: 'requires node >=22' },
        ];
      },
      'HUMAN_REVIEW',
      'G3',
      ['REVIEW:ENGINES_INCOMPATIBLE'],
    ],
    [
      'the release is too recent',
      (i: GovernanceInput) => {
        i.impact.packages[0].risk.signals = [
          { code: 'RECENT_RELEASE', package: 'lib', detail: 'published 2h ago' },
        ];
      },
      'HUMAN_REVIEW',
      'G7',
      ['REVIEW:RELEASE_TOO_RECENT'],
    ],
    [
      'a later commit changes source files',
      (i: GovernanceInput) => {
        i.pr!.changedFiles.push('src/a.ts');
      },
      'HUMAN_REVIEW',
      'G7',
      ['REVIEW:UNEXPECTED_FILES_CHANGED'],
    ],
    [
      'the lockfile has unrelated changes',
      (i: GovernanceInput) => {
        i.remediation.changes.push({
          ...i.remediation.changes[0],
          name: 'other',
          location: 'node_modules/other',
          relation: 'unrelated',
          relatedTo: [],
        });
      },
      'HUMAN_REVIEW',
      'G7',
      ['REVIEW:UNRELATED_DEPENDENCY_CHANGES'],
    ],
    [
      'an impacted file has no owner',
      (i: GovernanceInput) => {
        i.ownership.unresolvedFiles = ['src/a.ts'];
      },
      'HUMAN_REVIEW',
      'G7',
      ['REVIEW:OWNERSHIP_UNRESOLVED'],
    ],
    [
      'the evidence is for an older commit',
      (i: GovernanceInput) => {
        i.pr!.liveHeadSha = 'c'.repeat(40);
      },
      'BLOCKED',
      'G8',
      ['BLOCK:EVIDENCE_STALE'],
    ],
    [
      'the Sentinel check is not required',
      (i: GovernanceInput) => {
        i.repo!.requiredChecks = ['Test'];
      },
      'HUMAN_REVIEW',
      'G8',
      ['REVIEW:SENTINEL_CHECK_NOT_REQUIRED'],
    ],
    [
      'branch protection cannot be read',
      (i: GovernanceInput) => {
        i.repo = null;
      },
      'HUMAN_REVIEW',
      'G8',
      ['REVIEW:PROTECTION_UNKNOWN'],
    ],
  ])('%s', (_name, change, outcome, gateId, expected) => {
    const d = decideWith(change);
    expect(d.decision).toBe(outcome);
    expect(gate(d, gateId)).not.toBe('PASS');
    expect(codes(d)).toEqual(expected);
    if (outcome !== 'AUTO_MERGE') expect(d.labels).toContain('security/manual-review');
    if (outcome === 'BLOCKED') expect(d.labels).toContain('security/validation-failed');
  });

  it('marks gates that could not be evaluated as UNKNOWN, not FAIL', () => {
    expect(
      gate(
        decideWith((i) => {
          i.repo = null;
        }),
        'G8',
      ),
    ).toBe('UNKNOWN');
    expect(
      gate(
        decideWith((i) => {
          i.coverage!.files[0].status = 'NOT_TESTED';
        }),
        'G4',
      ),
    ).toBe('FAIL');
  });

  it('blocks a change that introduces a more severe vulnerability than it fixes', () => {
    const introduced = 'GHSA-ffff-gggg-hhhh|lib';
    const worse = decideWith((i) => {
      i.remediation.verification.introduced = [introduced];
      i.remediation.verification.after.severities = { [introduced]: 'critical' };
    });
    expect(codes(worse)).toEqual(['BLOCK:SECURITY_REGRESSION']);
    const milder = decideWith((i) => {
      i.remediation.verification.introduced = [introduced];
      i.remediation.verification.after.severities = { [introduced]: 'low' };
    });
    expect(milder.decision).toBe('HUMAN_REVIEW');
    expect(codes(milder)).toEqual(['REVIEW:NEW_VULNERABILITY_INTRODUCED']);
  });

  it('applies the configured review policies', () => {
    const report = decideWith((i) => {
      i.config = {
        ...GREEN_CONFIG,
        governance: {
          ...GREEN_CONFIG.governance,
          majorUpgradeRequired: 'report',
          unresolvedOwnership: 'report',
        },
      };
      i.remediation.escalations = [
        {
          vulnerabilityKey: 'x|y',
          package: 'y',
          location: 'node_modules/y',
          reason: 'MAJOR_UPGRADE_REQUIRED',
          detail: 'major',
        },
      ];
      i.ownership.unresolvedFiles = ['src/a.ts'];
    });
    expect(report.decision).toBe('AUTO_MERGE');
    expect(report.reasons.map((r) => `${r.effect}:${r.code}`)).toEqual([
      'INFO:MAJOR_UPGRADE_REQUIRED',
      'INFO:OWNERSHIP_UNRESOLVED',
    ]);
    const disabled = decideWith((i) => {
      i.config = {
        ...GREEN_CONFIG,
        governance: {
          ...GREEN_CONFIG.governance,
          autoMerge: { enabled: false, mergeMethod: 'squash' },
        },
      };
    });
    expect(codes(disabled)).toEqual(['REVIEW:AUTO_MERGE_DISABLED']);
  });

  it('never auto-merges before a pull request exists', () => {
    const d = decideWith((i) => {
      i.pr = null;
    });
    expect(d.decision).toBe('HUMAN_REVIEW');
    expect(codes(d)).toEqual(['REVIEW:NO_PULL_REQUEST']);
    expect(d.pullRequest).toEqual({ number: null, headSha: null, baseRef: null });
  });

  it('passes the coverage gate when no impacted file needs evidence', () => {
    const d = decideWith((i) => {
      i.impact.impactedFiles[0].evidenceRequired = false;
    });
    expect(d.decision).toBe('AUTO_MERGE');
    expect(d.reasons.map((r) => r.code)).toEqual(['NO_EVIDENCE_REQUIRED']);
  });

  it('records which pull request head the decision is for', () => {
    expect(decide(greenInput()).pullRequest).toEqual({ number: 7, headSha: SHA, baseRef: 'main' });
  });
});

describe('CODEOWNERS', () => {
  const file = parseCodeowners(
    '.github/CODEOWNERS',
    [
      '# Global owners',
      '*       @global-owner1 @global-owner2',
      '*.js    @js-owner #This is an inline comment.',
      '*.go docs@example.com',
      '*.txt @octo-org/octocats',
      '/build/logs/ @doctocat',
      'docs/* docs@example.com',
      'apps/ @octocat',
      '/docs/ @doctocat',
      '**/logs @octocat',
      '/apps/github',
      '!/secret @nobody',
      'lib/ not-an-owner @valid-user',
    ].join('\n'),
  );

  it.each([
    ['src/index.js', ['@js-owner']],
    ['README.md', ['@global-owner1', '@global-owner2']],
    ['src/main.go', ['docs@example.com']],
    ['notes/a.txt', ['@octo-org/octocats']],
    ['build/logs/out.log', ['@octocat']],
    ['docs/getting-started.md', ['@doctocat']],
    ['nested/apps/web/x.ts', ['@octocat']],
    ['apps/github/x.ts', []],
    ['lib/a.ts', ['@valid-user']],
  ])('%s is owned by %j (last matching rule wins)', (target, owners) => {
    expect(ownersFor(file, target).owners).toEqual(owners);
  });

  it('reports unsupported syntax and invalid owners instead of guessing', () => {
    expect(file.errors.map((e) => `${e.line}:${e.message}`)).toEqual([
      '12:negation "!/secret" is not supported by CODEOWNERS; rule ignored',
      '13:invalid owner "not-an-owner"',
    ]);
  });

  it('anchors patterns with a slash and matches others at any depth', () => {
    expect(compileCodeownersPattern('docs/*').test('docs/a.md')).toBe(true);
    expect(compileCodeownersPattern('docs/*').test('docs/sub/a.md')).toBe(false);
    expect(compileCodeownersPattern('*.js').test('a/b/c.js')).toBe(true);
    expect(compileCodeownersPattern('/build/').test('other/build/x')).toBe(false);
  });

  it('flags unowned files and applies the fallback owners', () => {
    const none = resolveOwnership(['apps/github/x.ts', 'src/index.js'], file, []);
    expect(none.unresolvedFiles).toEqual(['apps/github/x.ts']);
    expect(none.assignments[0]).toMatchObject({
      source: 'none',
      rule: '.github/CODEOWNERS:11 /apps/github (no owners)',
    });
    const withFallback = resolveOwnership(['apps/github/x.ts'], null, ['@org/security']);
    expect(withFallback).toMatchObject({
      fallbackApplied: true,
      owners: ['@org/security'],
      teams: ['org/security'],
      unresolvedFiles: ['apps/github/x.ts'],
    });
  });
});
