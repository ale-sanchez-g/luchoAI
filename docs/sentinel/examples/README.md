# Example reports

These files come from one real Sentinel run against this repository on **2026-11-07**. They were
copied unchanged from the output folders. Read them to see what Sentinel writes and what each
field means.

## How they were produced

- **Where:** a development sandbox, not GitHub Actions. Sentinel ran on a scratch copy of this
  repository's working tree with its own throwaway git commit. That is why
  `repository.commitSha` (`30d396af…`) is not a commit on GitHub and `repository.slug` is `null`.
- **Mode:** `--offline`, so Sentinel did not read or write anything on GitHub. The steps were the
  same as in `weekly-sentinel.yml`: `weekly-plan`, apply `remediation.patch` to a fresh copy,
  `validate`, then `weekly-evaluate`.
- **Decision type:** this is the *preliminary* weekly decision. No pull request existed yet, so
  `NO_PULL_REQUEST` and `PROTECTION_UNKNOWN` are expected. On GitHub, the PR validation workflow
  makes the final decision for each commit.
- **Sandbox limits** (both are reported, never treated as a pass):
  - `npm audit signatures` could not download the registry's signing keys. The result is
    `audit-signatures: ERROR` and `SIGNATURE_VERIFICATION_UNAVAILABLE` (review).
  - The GitHub Advisory Database could not be reached to add CVE IDs. The result is the
    `CVE_IDS_UNAVAILABLE` limitation in the vulnerability report.

## What the run found

| Stage | Result |
|---|---|
| Vulnerabilities | 67 (6 critical, 32 high, 25 moderate, 4 low): 58 fixable with patch or minor upgrades, 4 need a major upgrade, 4 need a parent upgrade, 1 has no fix |
| Remediation | `next` 15.3.3 → 15.5.28 (exact pin kept), `postcss` ^8.5.3 → ^8.5.23, and one `npm update` of 9 transitive packages |
| Lockfile changes | 29 entries: 13 targeted, 16 dependencies of targeted packages, 0 unrelated. No downgrades and no major versions |
| Security after the fix | Advisories went from 67 to 9. All 60 targeted advisories were resolved and none were introduced |
| Escalated, not changed | `minimatch` and `sharp` (major upgrade needed), the copy of `postcss` nested under `next` (`next` pins 8.4.31), `deepmerge` (no fixed version) |
| Validation | Unit tests: 486 of 486 passed in 23 files. Lint, build, e2e build, e2e, npm audit and installed-tree check all passed. Signature check: unavailable (see above) |
| Decision | `HUMAN_REVIEW`. Reasons: escalated upgrades, build-tool upgrades (`next`, `postcss`, `nanoid`, `source-map-js`), three untested impacted files, signatures unavailable, no CODEOWNERS, no pull request yet, branch protection not read |

`HUMAN_REVIEW` is the correct result here. The change passes every test, but it upgrades the
build toolchain, some impacted files have no tests, and parts of the evidence could not be
gathered. Sentinel asks a person to look instead of guessing.

## Files

| File | Written by | Schema |
|---|---|---|
| [repository-discovery.json](./repository-discovery.json) | `discover-repo` | `repository-discovery.schema.json` |
| [vulnerability-report.json](./vulnerability-report.json) | Vulnerability Discovery | `vulnerability-report.schema.json` |
| [dependency-usage-report.json](./dependency-usage-report.json) | Dependency Usage Discovery | `dependency-usage-report.schema.json` |
| [impact-report.json](./impact-report.json) | Impact Analysis | `impact-report.schema.json` |
| [remediation-report.json](./remediation-report.json) | Remediation | `remediation-report.schema.json` |
| [validation-report.json](./validation-report.json) | Test Execution and Validation | `validation-report.schema.json` |
| [coverage-report.json](./coverage-report.json) | Test Coverage Intelligence | `coverage-report.schema.json` |
| [merge-decision.json](./merge-decision.json) | Governance and Merge Decision | `merge-decision.schema.json` |
| [execution-summary.json](./execution-summary.json) | Audit and Reporting | `execution-summary.schema.json` |
| [pr-body.md](./pr-body.md) | PR Management (pull request description) | — |
| [decision-comment.md](./decision-comment.md) | PR Management (decision comment) | — |

The schemas are in [`sentinel/schemas/`](../../../sentinel/schemas/). Paths in the reports are
relative to the repository. Command lines in `validation-report.json` use the placeholders
`<repo>`, `<evidence>` and `<sentinel>` instead of machine paths.

## Producing your own

Use a scratch clone: `weekly-plan` and `remediate` rewrite `package-lock.json` (and
`package.json` when a direct dependency changes) in the folder they are given.

```bash
git clone https://github.com/ale-sanchez-g/luchoAI.git /tmp/sentinel-scratch
cd /tmp/sentinel-scratch && npm ci --ignore-scripts && npm run sentinel:build
node sentinel/dist/cli.js weekly-plan --offline --out /tmp/sentinel-plan
```

"Running Sentinel locally" in [installation.md](../installation.md) and "Running a stage by
hand" in [troubleshooting.md](../troubleshooting.md) list the other commands.
[decision-reference.md](../decision-reference.md) explains every reason code.
