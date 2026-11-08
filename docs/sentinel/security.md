# Project Sentinel: security and operations guide

## Threat model

Sentinel changes dependencies and can enable automatic merging, so it is itself a target. The
assets are the default branch, the deploy pipeline (`deploy.yml` publishes `main` to GitHub Pages)
and the tokens the workflows hold. The threats considered:

| Threat | Control |
|---|---|
| A compromised or malicious package version executes during install | `npm ci --ignore-scripts` everywhere; the build, tests and e2e were verified to work without install scripts |
| Dependency code executed during tests steals a write token | Jobs that execute dependency or PR code have `contents: read` only and no secrets; credential-like variables are removed from every child process environment |
| Code that ran during validation alters what gets published | The weekly patch is uploaded as an immutable artifact **before** updated dependencies are installed; the publish job re-verifies its sha256, structure, lockfile integrity and manifest diff |
| A privileged job executes attacker-controlled code | Write-capable jobs build Sentinel from the trusted default/base revision, never run `npm` lifecycle scripts, never execute files from the PR or from artifacts, and parse artifacts as untrusted JSON against schemas |
| Forged security evidence hides a vulnerability | The decision job re-runs both `npm audit`s and the lockfile consistency check itself, on copies of the two manifest files in an empty directory (no `.npmrc` from the PR is read) |
| Lockfile injection (tarballs from another host, stripped hashes) | Every `resolved` URL must start with an allowed registry and carry an integrity hash; violations block |
| A crafted symlink pulls runner files into reports | The repository walker uses `lstat` and never follows symbolic links |
| Script injection through PR titles, branch names or file names | No `${{ }}` expression is interpolated into a shell script (enforced by `sentinel/test/workflows.test.ts`); values are passed through environment variables; Markdown output escapes report data and neutralises `@mentions` |
| A stale evaluation enables auto-merge for a newer commit | Auto-merge is enabled with `expectedHeadOid` set to the evaluated commit; the PR head is re-read just before acting; stale runs change nothing; newer commits cancel older runs |
| Tampered action versions | Every action is pinned to a full commit SHA (enforced by test) |
| Bypassing branch protection | Sentinel only ever enables GitHub's native auto-merge, which still enforces every protection rule; it never merges or pushes to `main` |
| Rewriting someone else's work | Publishing never force-pushes over commits on the Sentinel branch that Sentinel did not make |
| A supply-chain attack on a freshly published version | Versions younger than `remediation.minimumReleaseAgeHours` (48 h) need human review; registry signatures and provenance are verified with `npm audit signatures` |

## Residual risks (read these)

- **Evidence is produced by running the code under test.** A malicious dependency version that
  executes during tests can fake test results or coverage in the evidence job. Sentinel limits the
  damage (patch/minor of packages already in use, release-age cool-down, signature verification,
  independent audits, branch protection), but no CI system can fully trust results produced by
  code it is testing. Keep human review in branch protection if that risk is unacceptable.
- **Anyone with write access can change a workflow** on a branch. For `pull_request` events
  GitHub runs the workflow file from the PR, so a person who can push to the Sentinel branch could
  alter the decision workflow there. Sentinel flags any file outside `package.json` and
  `package-lock.json` (`UNEXPECTED_FILES_CHANGED`), but the real control is branch protection with
  Code Owner review on `.github/` and `sentinel/`.
- **Coverage is not behavioural verification.** Attribution is per test file; a test that executes
  a function without asserting its result still counts as "exercised".
- **Static usage analysis cannot see everything**: runtime-built specifiers, framework conventions
  and generated code. These are reported (`USAGE_PARTIAL`, `BUILD_TOOL_SCOPE`, `UNKNOWN`) and never
  treated as "unused".
- **Advisory data can be incomplete.** CVE identifiers come from the GitHub advisory API; if it is
  unreachable the report says so (`CVE_IDS_UNAVAILABLE`).

## Permissions

| Workflow / job | Permissions | Token |
|---|---|---|
| weekly: plan | `contents: read` | `GITHUB_TOKEN` (advisory lookups) |
| weekly: validate | `contents: read` | none used |
| weekly: publish | `contents: write`, `pull-requests: write`, `issues: write`, `actions: write` | App token if configured, else `GITHUB_TOKEN` |
| PR: context | `pull-requests: read` | `GITHUB_TOKEN` |
| PR: evidence | `contents: read` | none used |
| PR: decide | `contents: write`, `pull-requests: write`, `issues: write` | App token if configured, else `GITHUB_TOKEN` |

Every workflow starts from `permissions: {}`. `actions: write` exists only so the weekly job can
dispatch PR validation when it has to use `GITHUB_TOKEN`. PR creation and merge enabling run in
different workflows and jobs; if you want them under different identities, install two GitHub
Apps and give each workflow its own variables.

## Token handling

- Tokens reach Sentinel only through the `SENTINEL_GITHUB_TOKEN` / `GITHUB_TOKEN` environment
  variables of the step that needs them. They are registered with Sentinel's redactor, removed from
  child process environments, and stripped from every log line and report (`ghp_`, `ghs_`,
  `github_pat_`, `npm_`, bearer headers and `x-access-token` URLs are also redacted by shape).
- App tokens are minted per job with explicit `permission-*` scopes and revoked when the job ends.
- `actions/checkout` runs with `persist-credentials: false` everywhere except the publish job,
  which must push and runs only default-branch code.

## Operating Sentinel

**Weekly PR is `AUTO_MERGE`.** Nothing to do; GitHub merges once every required check passes.
Watch the deploy afterwards (only triggered automatically when an App token is used).

**Weekly PR is `HUMAN_REVIEW`.** Read the decision comment: every reason has a code (see
[decision-reference.md](./decision-reference.md)), the files involved and the owners requested.
Typical actions: add the missing test, accept the framework upgrade after checking the e2e
results, or decide on the escalated major upgrade in a separate PR. Approve and merge as usual;
the Sentinel check passes for `HUMAN_REVIEW`.

**Weekly PR is `BLOCKED`.** The required check fails. Fix the cause on the Sentinel branch (your
commit makes the next evaluation `HUMAN_REVIEW` at best, by design) or close the PR; the next weekly
run rebuilds it from the latest `main`.

**Fixing something by hand on the Sentinel branch.** Allowed. Sentinel will not overwrite your
commits; delete the branch to let the next weekly run start fresh.

**Pausing Sentinel.** Disable the two workflows (Actions → workflow → Disable), or set
`governance.autoMerge.enabled: false` to keep the reports without automatic merging.

**Auditing a decision.** Every run uploads its reports. `merge-decision.json` records the digests
of every input report and of the policy, so the decision can be recomputed from the artifacts and
compared (`decisionDigest`). `execution-summary.json` indexes the run: vulnerabilities, changes,
impacted files, tests, coverage, gates, decision, PR and owners.

**Rotating the App key.** Generate a new private key in the App settings, update the
`SENTINEL_APP_PRIVATE_KEY` secret, then delete the old key.

## Hardening still recommended outside Sentinel

Found during discovery and left unchanged because they are outside this change:

- `ci.yml` pins actions by tag (`@v4`), has no `permissions:` block, installs with `npm install`
  (can rewrite the lockfile) and runs `npm audit` with `continue-on-error: true`.
- CI uses Node 20, which reached end of life on 2026-04-30.
- There is no CODEOWNERS file.
