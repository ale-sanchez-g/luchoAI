# Project Sentinel: installation and configuration

Sentinel is already wired into this repository. This guide covers the one-time GitHub settings it
depends on, how to run it, and how to adapt the policy. Nothing here involves an AI service.

## What gets installed

| Path | Purpose |
|---|---|
| `sentinel/` | The engine (TypeScript), its JSON Schemas, tests and fixtures |
| `.github/sentinel/config.yml` | The policy (validated against `sentinel/schemas/config.schema.json`) |
| `.github/workflows/weekly-sentinel.yml` | Weekly discovery, remediation and PR creation |
| `.github/workflows/sentinel-pr-validation.yml` | Per-commit validation and the merge decision |
| `docs/sentinel/` | Discovery report, architecture, this guide, security and troubleshooting |

`package.json` gains `sentinel:build`, `sentinel:typecheck`, `sentinel:test` and `test:e2e`, and the
devDependencies `semver`, `@types/semver` and `yaml`.

## Required GitHub settings

Without these Sentinel still runs, but every decision is `HUMAN_REVIEW` (Gate 8 says why). That is
deliberate: auto-merge is only safe when GitHub itself waits for Sentinel.

1. **Allow auto-merge**: Settings → General → Pull Requests → *Allow auto-merge*.
2. **Protect `main`** (classic protection or a ruleset) and add **`Sentinel decision`** as a
   required status check. This is what stops a later commit from merging before Sentinel has
   re-evaluated it. Recommended alongside it:
   - *Require branches to be up to date before merging*, so the validated tree is the merged tree.
   - The existing CI checks (`Lint and Build`, `Test`) as required checks too.
   - *Require review from Code Owners* if you want a person on every `HUMAN_REVIEW` PR.
3. **Labels** are created automatically on first use (`security/dependency-update`,
   `security/coverage-complete`, `security/coverage-incomplete`, `security/manual-review`,
   `security/validation-failed`).
4. **CODEOWNERS**: this repository has none, so every impacted file is reported as having no owner
   and, under the default policy, that alone requires human review. Add `.github/CODEOWNERS`
   (for example `* @ale-sanchez-g`) or set `codeowners.fallbackOwners` in the policy.

## Strongly recommended: a GitHub App

Workflows that push or open PRs with the built-in `GITHUB_TOKEN` do not trigger other workflows.
With `GITHUB_TOKEN` only:

- The weekly job dispatches `sentinel-pr-validation.yml` itself (handled), but **CI (`ci.yml`) does
  not run on Sentinel's branch**, so any CI check you made required never reports and auto-merge
  waits forever (safe, but nothing merges).
- A merge completed by auto-merge that `GITHUB_TOKEN` enabled does not trigger the push workflows,
  so **`deploy.yml` would not run** after an automatic merge.

To avoid both, create a GitHub App (Settings → Developer settings → GitHub Apps) with repository
permissions **Contents: read & write**, **Pull requests: read & write**, **Issues: read & write**
and **Metadata: read**, install it on this repository, then add:

- Repository variable `SENTINEL_APP_CLIENT_ID` (the App's client ID)
- Repository secret `SENTINEL_APP_PRIVATE_KEY` (a private key of the App)

Both workflows pick the App up automatically when the variable is set. Tokens are minted per job
with only the permissions listed in the workflow and revoked when the job ends.

## Running it

- **Scheduled**: Mondays 04:17 UTC (`weekly-sentinel.yml`). Change the cron there; GitHub needs it
  in the workflow file.
- **On demand**: Actions → *Sentinel weekly remediation* → *Run workflow*.
- **A specific PR**: Actions → *Sentinel PR validation* → *Run workflow* with the PR number.

What happens each week:

1. `plan` audits the lockfile, analyses usage and impact, plans patch/minor fixes and edits only the
   lockfile and manifest (`npm --package-lock-only --ignore-scripts`). If nothing changes, the run
   ends there.
2. `validate` installs the result and runs the full validation in `config.yml` (unit tests with
   coverage and per-test attribution, lint, build, e2e build, e2e scripts, audit, registry
   signatures), then computes a preliminary decision. Its artifacts are evidence only.
3. `publish` re-verifies the patch, pushes `sentinel/dependency-remediation` (only if the content
   changed, and never over commits a person added) and opens or updates the PR.
4. `sentinel-pr-validation.yml` then evaluates the PR head and posts the authoritative decision,
   labels, owner review requests and, only for `AUTO_MERGE`, enables GitHub auto-merge.

## Running Sentinel locally

```bash
npm ci --ignore-scripts
npm run sentinel:build
node sentinel/dist/cli.js scan --offline              # vulnerability-report.json
node sentinel/dist/cli.js impact --offline            # usage + impact reports
node sentinel/dist/cli.js discover-repo --offline     # repository-discovery.json
```

Reports land in `sentinel-reports/` (git-ignored). `--offline` guarantees no GitHub API call (this
matters in sessions that have a token in the environment). `remediate` edits `package.json` and
`package-lock.json` in place and refuses to run when they have local changes; run it on a scratch
clone. Run `node sentinel/dist/cli.js --help` for every command.

## Adapting the policy

Edit `.github/sentinel/config.yml`. Every key is documented in place; unknown keys, wrong types,
duplicate keys and inconsistent references stop Sentinel with exit code 2 instead of being ignored.
Common changes:

| Goal | Setting |
|---|---|
| Stricter coverage | `coverage.lineThreshold`, `coverage.branchThreshold` (a stricter Jest `coverageThreshold` already wins) |
| Require evidence for importers of impacted modules too | `coverage.scope: direct-and-dependents` |
| Let framework upgrades auto-merge when all else passes | `governance.buildToolUpgrades: report` |
| Let fixes merge while a major-only advisory waits | `governance.majorUpgradeRequired: report` |
| Owners for unowned files | `codeowners.fallbackOwners: ['@org/security']` |
| Patch upgrades only | `remediation.allowedUpgradeTypes: [patch]` |
| Turn automatic merging off entirely | `governance.autoMerge.enabled: false` |

Policy changes are themselves pull requests: they are reviewed like code, and the decision
records a digest of the policy it applied.

## Uninstalling

Delete the two workflow files and `.github/sentinel/`. The `sentinel/` directory has no effect on
the app (it is excluded from the app's TypeScript, Jest and build).
