<!-- sentinel:decision -->
## Sentinel decision: HUMAN REVIEW

Evaluated commit unknown. A person needs to review this change; auto-merge is off and the owners of impacted files are requested.

| Gate | Status |
|---|---|
| G1 Vulnerability remediation completed | FAIL |
| G2 Dependency usage analysis completed | PASS |
| G3 Impact analysis completed | FAIL |
| G4 Impacted files have attributable test coverage | FAIL |
| G5 Required tests executed successfully | PASS |
| G6 Builds and security validations pass | UNKNOWN |
| G7 No unresolved compatibility or governance restriction | FAIL |
| G8 Branch protection and merge requirements satisfied | UNKNOWN |

### What needs attention

- **REVIEW** G1 `MAJOR_UPGRADE_REQUIRED`: minimatch (node\_modules/@​typescript-eslint/typescript-estree/node\_modules/minimatch) is not remediated automatically: lowest fixed version 11.0.1 is a major upgrade from 10.2.5 (`GHSA-g3hv-75wg-m249|minimatch`)
- **REVIEW** G1 `MAJOR_UPGRADE_REQUIRED`: sharp (node\_modules/sharp) is not remediated automatically: lowest fixed version 0.35.0 is a major upgrade from 0.34.5 (`GHSA-f88m-g3jw-g9cj|sharp`)
- **REVIEW** G1 `MAJOR_UPGRADE_REQUIRED`: sharp (node\_modules/sharp) is not remediated automatically: lowest fixed version 0.35.4 is a major upgrade from 0.34.5 (`GHSA-rgj7-g3m4-5g8c|sharp`)
- **REVIEW** G1 `MAJOR_UPGRADE_REQUIRED`: sharp (node\_modules/sharp) is not remediated automatically: lowest fixed version 0.35.5 is a major upgrade from 0.34.5 (`GHSA-wq5f-xc86-pv6w|sharp`)
- **REVIEW** G1 `PARENT_UPGRADE_REQUIRED`: postcss (node\_modules/next/node\_modules/postcss) is not remediated automatically: fixed in 8.5.12, outside the range declared by next (8.4.31); npm's suggestion rejected: next@​15.5.29 still requires postcss 8.4.31 (resolves to 8.4.31, still vulnerable) (`GHSA-6g55-p6wh-862q|postcss`)
- **REVIEW** G1 `PARENT_UPGRADE_REQUIRED`: postcss (node\_modules/next/node\_modules/postcss) is not remediated automatically: fixed in 8.5.23, outside the range declared by next (8.4.31); npm's suggestion rejected: next@​15.5.29 still requires postcss 8.4.31 (resolves to 8.4.31, still vulnerable) (`GHSA-fxqj-rqcc-2cmp|postcss`)
- **REVIEW** G1 `PARENT_UPGRADE_REQUIRED`: postcss (node\_modules/next/node\_modules/postcss) is not remediated automatically: fixed in 8.5.10, outside the range declared by next (8.4.31); npm's suggestion rejected: next@​15.5.29 still requires postcss 8.4.31 (resolves to 8.4.31, still vulnerable) (`GHSA-qx2v-qp2m-jg93|postcss`)
- **REVIEW** G1 `PARENT_UPGRADE_REQUIRED`: postcss (node\_modules/next/node\_modules/postcss) is not remediated automatically: fixed in 8.5.18, outside the range declared by next (8.4.31); npm's suggestion rejected: next@​15.5.29 still requires postcss 8.4.31 (resolves to 8.4.31, still vulnerable) (`GHSA-r28c-9q8g-f849|postcss`)
- **REVIEW** G3 `BUILD_TOOL_UPGRADE`: nanoid: next runs in the build; the files it processes cannot be listed statically (`nanoid`)
- **REVIEW** G3 `BUILD_TOOL_UPGRADE`: next: next runs in the build; the files it processes cannot be listed statically (`next`)
- **REVIEW** G3 `BUILD_TOOL_UPGRADE`: postcss: next runs in the build; the files it processes cannot be listed statically (`postcss`)
- **REVIEW** G3 `BUILD_TOOL_UPGRADE`: source-map-js: next runs in the build; the files it processes cannot be listed statically (`source-map-js`)
- **REVIEW** G4 `FILE_NOT_TESTED`: no passing test exercises this impacted file (`src/app/layout.tsx`, `src/app/not-found.tsx`, `src/app/page.tsx`)
- **REVIEW** G6 `SIGNATURE_VERIFICATION_UNAVAILABLE`: registry signatures not verified: npm audit signatures failed: Failed to download
- **REVIEW** G7 `OWNERSHIP_UNRESOLVED`: impacted files have no CODEOWNERS owner and no fallback owners are configured (`.claude/hooks/validate-code.sh`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `eslint.config.mjs`, `jest.config.js`, `next.config.ts`, `package.json`, `postcss.config.mjs`, …)
- **REVIEW** G8 `NO_PULL_REQUEST`: evaluated before the pull request exists; the PR validation workflow makes the final decision
- **REVIEW** G8 `PROTECTION_UNKNOWN`: branch protection could not be read

### Test coverage of impacted files

| File | Status | Lines | Exercised by |
|---|---|---|---|
| `eslint.config.mjs` | TESTED_AND_COVERED | validated by lint | - |
| `jest.config.js` | TESTED_AND_COVERED | validated by unit-tests | - |
| `next.config.ts` | TESTED_AND_COVERED | validated by build | - |
| `package.json` | TESTED_AND_COVERED | validated by unit-tests, lint, build | - |
| `postcss.config.mjs` | TESTED_AND_COVERED | validated by build | - |
| `src/app/layout.tsx` | NOT_TESTED | 0% | - |
| `src/app/not-found.tsx` | NOT_TESTED | 0% | - |
| `src/app/page.tsx` | NOT_TESTED | 0% | - |
| `src/components/Header.tsx` | TESTED_AND_COVERED | 100% | `src/__tests__/Header.test.tsx` |
| `src/components/PlayerProfile.tsx` | TESTED_AND_COVERED | 97.58% | `src/__tests__/PlayerProfile.test.tsx` |
| `src/components/WeeklyGames.tsx` | TESTED_AND_COVERED | 100% | `src/__tests__/GamesHub.test.tsx`, `src/__tests__/WeeklyGames.test.tsx` |
| `src/lib/claude.ts` | TESTED_AND_COVERED | 87.93% | `src/__tests__/claude.test.ts` |
| `tsconfig.json` | TESTED_AND_COVERED | validated by build | - |

### Validation

| Check | Required | Result |
|---|---|---|
| unit-tests | yes | PASSED |
| lint | yes | PASSED |
| build | yes | PASSED |
| e2e-build | yes | PASSED |
| e2e | yes | PASSED |
| npm-audit | yes | PASSED |
| audit-signatures | yes | ERROR |
| installed-tree | yes | PASSED |

Tests: 486 passed, 0 failed, 0 skipped, 0 todo across 23 files.

### Security

Advisories before: 67; after: 9 (audit OK). Targeted 60, resolved 60, remaining 0, introduced 0.
Lockfile: consistency PASS, 0 registry violations, 0 entries without integrity.

### Ownership

No owners resolved.
Files without a CODEOWNERS owner: `.claude/hooks/validate-code.sh`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `eslint.config.mjs`, `jest.config.js`, `next.config.ts`, `package.json`, `postcss.config.mjs`, `sentinel/test/coverage.test.ts`, `sentinel/test/scenarios.test.ts`, `sentinel/test/validation.test.ts`, `sentinel/tsconfig.json`, `src/__tests__/Header.test.tsx`, `src/__tests__/claude.test.ts`, `src/app/coach/page.tsx`, …

<sub>Decision 2abc045cbab1d38a · policy e969d1ea81b4dc43 · reproducible from the artifacts of this run. No AI was used.</sub>
