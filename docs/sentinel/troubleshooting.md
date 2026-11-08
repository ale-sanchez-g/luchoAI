# Project Sentinel: troubleshooting

Sentinel's exit codes: `0` ok, `1` decision BLOCKED, `2` configuration error, `3` contract or
evidence error (a report or artifact failed validation), `4` internal error. Every run uploads its
reports; start with `merge-decision.json` and `execution-summary.json`.

## Every decision is HUMAN_REVIEW

Look at the G8 and G7 reasons first; they are usually set-up issues:

| Reason | Fix |
|---|---|
| `SENTINEL_CHECK_NOT_REQUIRED` | Add `Sentinel decision` as a required status check on `main` |
| `BRANCH_NOT_PROTECTED`, `AUTO_MERGE_NOT_ALLOWED` | See the installation guide |
| `PROTECTION_UNKNOWN`, `REQUIRED_CHECKS_UNKNOWN` | The token could not read protection settings; use the GitHub App, or check the job permissions |
| `OWNERSHIP_UNRESOLVED` | Add `.github/CODEOWNERS` or `codeowners.fallbackOwners` |
| `BUILD_TOOL_UPGRADE` | Expected for `next` upgrades. Review, or set `governance.buildToolUpgrades: report` |
| `FILE_NOT_TESTED` on `src/app/**` | The route pages have no unit tests (0 % coverage at discovery). Add tests, or review |

## The validation workflow never ran on Sentinel's PR

PRs and pushes made with `GITHUB_TOKEN` do not trigger workflows. Without the App, the weekly
publish job dispatches `sentinel-pr-validation.yml` explicitly; check that it has
`actions: write` and that the dispatch action shows `DONE` in `pr-management-report.json`. You can
also run *Sentinel PR validation* by hand with the PR number. With the App configured, check that
it is installed on the repository and has the permissions listed in the installation guide.

## Auto-merge is enabled but nothing merges

GitHub is waiting for a required check or review. With `GITHUB_TOKEN`, `ci.yml` does not run on
Sentinel's branch, so its checks never report (use the App). Also check *Require branches to be up
to date*: when `main` moved, update the branch (the next weekly run does it).

## The merge happened but the site did not deploy

Merges completed through auto-merge enabled by `GITHUB_TOKEN` do not trigger `push` workflows, so
CI and `deploy.yml` do not run. Use the App, or run *Deploy to GitHub Pages* by hand.

## `npm ci` fails in the evidence job

The decision is `BLOCKED` with `EVIDENCE_JOB_FAILED`. Usually the lockfile and manifest are out of
sync (someone edited one by hand) or a package needs its install script; Sentinel never runs
install scripts, by design. Regenerate the lockfile on the branch or close the PR.

## `SIGNATURE_VERIFICATION_UNAVAILABLE`

`npm audit signatures` downloads Sigstore trust metadata. Behind a restrictive proxy it fails with
"Failed to download". On GitHub-hosted runners it should work; elsewhere allow
`tuf-repo-cdn.sigstore.dev` or set `validation.auditSignatures: optional`.

## `CVE_IDS_UNAVAILABLE`

The GitHub advisory API was unreachable, so reports carry GHSA ids only. The audit itself is not
affected. In restricted sandboxes the API may be blocked; on Actions it uses the job token.

## `PublishError` in the weekly publish job

The plan artifact failed verification and nothing was pushed: the patch hash did not match, it
touched a file other than `package.json`/`package-lock.json`, the patched lockfile pointed at a
registry outside the allowlist, or `package.json` changed beyond targeted versions. Re-run the
weekly workflow; if it repeats, inspect the plan artifact.

## "has commits not made by Sentinel"

Someone pushed to `sentinel/dependency-remediation`. Sentinel leaves the branch alone. Merge or
close that PR, or delete the branch so the next run starts fresh.

## Configuration errors (exit code 2)

The message lists each problem with its path, for example
`$.coverage: unexpected property "lineTreshold"`. Unknown keys, wrong types, duplicate keys and
references to undefined validation commands are all rejected. Check against
`sentinel/schemas/config.schema.json`.

## Contract errors (exit code 3)

A report or artifact did not match its schema, or a lockfile could not be parsed (lockfile v1 is
not supported; regenerate with npm 7 or newer). In the PR workflow this can mean tampered evidence;
the run stops instead of guessing.

## Running a stage by hand

```bash
npm ci --ignore-scripts && npm run sentinel:build
node sentinel/dist/cli.js scan --offline --out /tmp/s
node sentinel/dist/cli.js impact --offline --out /tmp/s
node sentinel/dist/cli.js validate --offline --out /tmp/s --evidence /tmp/s/evidence
```

`--offline` guarantees no GitHub API calls. Set `CHROMIUM_PATH` when the installed Playwright
expects a different Chromium build than the one on the machine.
