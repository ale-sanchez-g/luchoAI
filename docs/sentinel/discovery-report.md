# Project Sentinel: repository discovery report

Discovery date: **2026-11-07**. Commit inspected: `9636b1d` (main, 2026-11-04).
Everything below was observed directly (commands run, files read, APIs queried) unless it is
marked *inferred* or *not verifiable*.

## 1. Findings

| # | Area | Finding | Evidence |
|---|------|---------|----------|
| 1 | Languages | TypeScript (53 `.ts`, 34 `.tsx`), JavaScript (`jest.config.js`, 4 `.mjs`), CSS (Tailwind), one shell hook, YAML workflows. No other application language. | `git ls-files` by extension |
| 2 | Package managers | npm only. `package-lock.json` lockfile v3, 840 entries. No yarn/pnpm lockfiles, no `packageManager` field. CI runs Node 20 (end of life since 2026-04-30); local toolchain Node 22.23.4 / npm 10.9.9. | `package-lock.json`, `ci.yml` |
| 3 | Manifests and lockfiles | One manifest at the root: 9 dependencies, 16 devDependencies. `next` and `eslint-config-next` are pinned exactly (`15.3.3`); everything else uses caret ranges. | `package.json` |
| 4 | Directory structure | `src/app` (Next.js App Router routes), `src/components`, `src/lib`, `src/types`, `src/__tests__`, `e2e/`, `public/`, `docs/`, `context/`, `.github/workflows`, `.claude/` (agent rules, hooks). | tree |
| 5 | Source organisation | 61 production TS/TSX files in `src/` (excluding tests). Path alias `@/*` to `./src/*` in `tsconfig.json`. Static export (`output: 'export'`), no server code. | `tsconfig.json`, `next.config.ts` |
| 6 | Dependency management | No Dependabot or Renovate. `ci.yml` installs with `npm install` (can rewrite the lockfile), `deploy.yml` uses `npm ci`. `npm audit --audit-level=high` runs with `continue-on-error: true`, so it can never fail CI. | workflows |
| 7 | Test frameworks | Jest 29 + ts-jest + jsdom + Testing Library: 23 suites, 486 tests, ~12 s. Playwright scripts `e2e/*.mjs` (2 scripts, 93 checks) that drive the built site; **not run in CI**. | `jest.config.js`, test run |
| 8 | Test commands | `npm test` (`jest --ci`). E2E: `NODE_ENV=production npm run build` with an empty base path, then `node e2e/<script>.mjs` (needs a Chromium matching the Playwright build; `CHROMIUM_PATH` overrides it). Both e2e scripts passed here (66/66, 27/27). | runs |
| 9 | Coverage reporting | None configured: no `collectCoverageFrom`, no `coverageThreshold`, nothing collected in CI. `jest --coverage` works with the default Babel/Istanbul provider: **84.8 % lines overall**, but **0 %** for every `src/app/**` page, `ApiKeySetup.tsx` and `src/lib/context.ts`. | coverage run |
| 10 | CI/CD | `ci.yml` (lint+build, test, security, validate-config) on pushes and PRs; `deploy.yml` deploys Pages after CI succeeds on `main`. Actions pinned by **tag** (`@v4`, `@v3`), not by commit SHA. `ci.yml` has no `permissions:` block. | workflows |
| 11 | CODEOWNERS | **None** in `.github/`, the root or `docs/`. | file search |
| 12 | Branch protection | `main` is protected (GitHub API `protected: true`). The exact rules (required checks, reviews, the "Allow auto-merge" setting) could not be read with this session's tools. | GitHub API |
| 13 | Security scanning | `npm audit` (non-blocking) and a grep for hard-coded keys. No CodeQL, OSV-Scanner or Dependabot alerts integration. `npm audit signatures` could not run from this sandbox (Sigstore TUF CDN unreachable). | `ci.yml`, runs |
| 14 | Standards | `.claude/rules/` (2-space indent, single quotes, 100-char lines, kebab-case files, interfaces over types, explicit return types, JSDoc on public lib APIs), conventional commits, PR template in `.claude/rules/pr.md`. | rules files |

### Current vulnerability picture (npm audit, 2026-11-07)

25 vulnerable package entries: 2 critical, 8 high, 8 moderate, 7 low. npm reports *propagated*
entries (a package is "vulnerable" because something it depends on is), so the root causes are
fewer:

| Root-cause package | Scope | Reached through | Notes |
|---|---|---|---|
| `next@15.3.3` | production, direct | - | ~37 GHSA advisories incl. a critical one. Fix inside 15.x: `15.5.29` (published 2026-11-03). Also fixes the nested `postcss@8.4.31` it pins. |
| `handlebars@4.7.9` | dev | `ts-jest` | Fixed in `4.7.10` (patch, within `ts-jest`'s `^4.7.9`). |
| `deepmerge@4.3.1` | dev | `jest-config` | Advisory covers `>=4.2.0 <=4.3.1`; 4.3.1 is the latest release, so **no fix exists**. npm's suggested "fix" is `jest@25.1.0`, a **downgrade** from 29. |
| `form-data@4.0.5` | production *and* dev | `@anthropic-ai/sdk` then `@types/node-fetch` (types only), and `jsdom` | Production scope only via a types package; never executed in the browser (*inferred*). |
| `nanoid`, `source-map-js`, `postcss` | production + dev | `next` (nested postcss), `postcss`, `tailwindcss` | |
| `sharp@0.34.5` | optional, production | `next` | Has an install script. |
| `js-yaml` (2 copies), `brace-expansion` (2 copies), `minimatch`, `browserslist`, `baseline-browser-mapping`, `postcss-selector-parser` | dev | eslint, jest, tailwind toolchains | |

### Other facts that shape the design

- `npm ci --ignore-scripts` followed by lint, build and tests all succeed, so Sentinel never needs
  to run package install scripts.
- `next build` fails with `NODE_ENV=development` (this session's `.claude/settings.json` sets
  it). Validation commands must set `NODE_ENV=production` explicitly.
- A Jest custom reporter receives **per-test-file coverage** (`testResult.coverage`), so
  Sentinel can record which test file actually executed which source file. A test that only
  *imports* a module (module-level code runs, no function is called) can be told apart from one
  that exercises it.
- Events created with `GITHUB_TOKEN` do not start other workflows (except `workflow_dispatch`
  and `repository_dispatch`). A PR opened with `GITHUB_TOKEN` will not trigger PR workflows,
  and an auto-merge enabled with it produces a push to `main` that will not trigger `ci.yml` or
  the deploy.
- GitHub auto-merge requires the repository's "Allow auto-merge" setting and a protection rule
  on the base branch with at least one requirement.

## 2. Recommended architecture

A TypeScript command-line engine in `sentinel/` (Node, no AI), driven by two workflows. Every
module is a plain function with typed input and output contracts; workflows only call the CLI.
See [architecture.md](./architecture.md) for diagrams and module contracts.

Key decisions:

1. **Root-cause advisories, not npm's propagated entries.** Remediation targets the package that
   carries the advisory (`deepmerge`, not `jest`). Downgrades are always rejected.
2. **Trust boundaries in the workflows.** Jobs that execute updated dependency code (tests,
   build) have a read-only token. Jobs with write access build Sentinel from the trusted base
   branch, never install or run code from the PR, and treat artifacts as untrusted data.
3. **Patch produced before any dependency code runs.** The weekly workflow uploads the
   lockfile patch as an immutable artifact before tests execute, so test-time code cannot alter
   what gets published.
4. **Evidence from execution, not just from imports.** Coverage status per impacted file is
   derived from per-test-file execution attribution plus aggregate Istanbul data; static import
   association is used only to find tests that should have run.
5. **Unknown is never a pass.** Any gate without evidence is `UNKNOWN`, which yields
   `HUMAN_REVIEW` at best.
6. **The PR workflow re-derives everything** from the PR itself (lockfile diff, audits, tests).
   Results from the weekly run are never reused for a newer commit.

## 3. Tooling and dependencies

| Need | Choice | Why |
|---|---|---|
| AST parsing | `typescript` compiler API (already a devDependency) | Parses TS/TSX/JS/MJS/CJS; also resolves modules with the repo's own `tsconfig` paths. |
| Semver ranges | `semver` (already in the tree at 7.8.4; now declared) | Range evaluation is subtle (pre-releases, unions, hyphen ranges); re-implementing it is a correctness risk. |
| YAML config | `yaml` (new devDependency, zero dependencies) | The only YAML parser present (`js-yaml`) is itself vulnerable. |
| Coverage | Jest's built-in Istanbul provider + a Sentinel reporter | No new tooling. |
| Vulnerability data | `npm audit` (GitHub Advisory Database) + GitHub advisory API for CVE ids; OSV-Scanner JSON and Dependabot alerts as optional sources | npm audit has no CVE ids; the advisory API does. |
| GitHub API | `fetch` (Node 20+) | Avoids adding Octokit. |
| CLI parsing | `node:util` `parseArgs` | Built in. |
| JSON Schema validation | Small strict validator in Sentinel for the keyword subset its schemas use | Avoids adding ajv; rejects unknown keywords so schemas cannot silently rely on unsupported features. |

## 4. Reusable existing capabilities

- Jest configuration and `npm test` (used as-is, with coverage flags added by Sentinel).
- `npm run lint` and `npm run build` as validation commands.
- `e2e/*.mjs` browser scripts as end-to-end validation.
- `.claude/rules` conventions for code style and PRs (conventional commits, squash merges).
- `main` branch protection, to which auto-merge defers.

## 5. Gaps

| Gap | Impact on Sentinel | Handling |
|---|---|---|
| No CODEOWNERS | Every impacted file has unresolved ownership; with the default policy that alone requires human review. | Flagged per file, fallback owners configurable, documented. **Recommendation:** add `.github/CODEOWNERS`. |
| Pages and some components untested (0 %) | Any vulnerability reaching them (e.g. `next`) cannot reach `AUTO_MERGE`. | Reported per file; that is the intended outcome. |
| No coverage in CI, no thresholds | Sentinel runs its own coverage pass; default threshold 80 % lines (matches the repo's testing skill guidance). | Configurable; stricter repo thresholds win. |
| E2E not in CI | Framework upgrades are otherwise checked only by unit tests and the build. | Sentinel runs the e2e scripts as validation. |
| Audit is non-blocking in CI | Vulnerabilities never fail a build today. | Sentinel's gates do not depend on `ci.yml`. |
| Actions pinned by tag, no `permissions:` in `ci.yml` | Supply-chain and token-scope risk in existing CI. | Sentinel workflows pin SHAs and declare least privilege. Existing workflows left unchanged (out of scope); recommended in the security guide. |
| Branch protection details unknown | Sentinel cannot assume auto-merge will wait for its own check. | Gate 8 reads protection at runtime; auto-merge only if Sentinel's check is a required status check. |
| No Node 20 runtime here | Sentinel was run on Node 22/24 locally. | Code avoids post-20 APIs; CI runs it on Node 20. |

## 6. Implementation plan

| Phase | Scope | Acceptance |
|---|---|---|
| 1 | Discovery, architecture, scaffolding, contracts, config loader | Config errors fail safely; schemas validate fixtures |
| 2 | Vulnerability discovery, lockfile graph, fix assessment | Root causes, paths, fix types correct on fixtures and on this repo |
| 3 | Usage discovery and impact analysis | Every reference traceable to file:line; unknown usage reported as `UNKNOWN` |
| 4 | Coverage intelligence | All 7 statuses reproducible; attribution verified with a real Jest run |
| 5 | Remediation | Only patch/minor; no downgrades; lockfile diff classifies related and unrelated changes |
| 6 | Validation and governance | 8 gates, deterministic decision, CODEOWNERS semantics match GitHub's |
| 7 | GitHub integration and workflows | Idempotent PR management; scenarios A-I pass end-to-end with a mocked GitHub API |
| 8 | Hardening and docs | Lint, typecheck, tests, build green; real run on this repo recorded as example reports |

## 7. Challenged assumptions

1. **"Tests pass" is not "impacted files are tested".** Confirmed here: the suite passes with
   0 % coverage on every route page.
2. **Executed is not exercised.** A test that imports a module only runs its top-level code.
   Sentinel counts a test as evidence only when it called into the file (or the file has no
   functions, i.e. it is pure data).
3. **Coverage is not behavioural protection.** Attribution is per test *file*, not per test
   case, and says nothing about assertion quality. Reports state this.
4. **Evidence can be forged by the code under test.** A malicious dependency version executed
   during tests could write fake results. Mitigations: patch/minor only, a minimum release age,
   integrity and registry checks, signature verification, privilege separation, and branch
   protection as the final backstop. This residual risk cannot be eliminated by any CI system.
5. **One PR per week, grouped.** Simple and idempotent, but one risky upgrade (e.g. `next`) holds
   back safe ones in the same PR. Splitting per package would multiply lockfile conflicts.
6. **The literal ownership rule makes `AUTO_MERGE` unreachable in this repo today** (no
   CODEOWNERS). That is configurable (`governance.unresolvedOwnership: report`), but the default
   follows the brief.
