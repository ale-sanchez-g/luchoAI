# Project Sentinel: decision reference

Every reason Sentinel can give, by gate. The effect shown is the default; the four policies in
`governance` can turn a `REVIEW` into `INFO` where noted. Any `BLOCK` gives `BLOCKED`; otherwise any
`REVIEW` gives `HUMAN_REVIEW`. "Unknown" reasons mean the fact could not be established; they mark
the gate `UNKNOWN`, never `PASS`. `sentinel/test/docs.test.ts` fails if a code is missing here.

## G1 Vulnerability remediation completed

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `AUDIT_UNAVAILABLE` | BLOCK (unknown) | The audit of the base lockfile failed, so there is no trustworthy list of vulnerabilities | Check registry reachability; re-run |
| `POST_AUDIT_UNAVAILABLE` | BLOCK (unknown) | The audit after the change failed, so introduced vulnerabilities cannot be ruled out | Re-run |
| `REMEDIATION_COMMAND_FAILED` | BLOCK | An `npm install`/`npm update` of the plan failed (for example a peer conflict) | Read the action detail in `remediation-report.json` |
| `NOTHING_TO_MERGE` | BLOCK | The PR changes nothing that remediates an in-scope vulnerability | Close the PR |
| `SECURITY_REGRESSION` | BLOCK | The change introduces an advisory more severe than anything it resolves | Do not merge; wait for a fixed release |
| `NEW_VULNERABILITY_INTRODUCED` | REVIEW | The change introduces advisories while resolving more severe ones | Weigh the trade-off |
| `TARGET_NOT_RESOLVED` | REVIEW | A targeted advisory is still present after the change | Inspect the lockfile diff |
| `MAJOR_UPGRADE_REQUIRED` | REVIEW (policy `majorUpgradeRequired`) | An advisory can only be fixed by a major upgrade, which is never applied automatically | Plan the major upgrade separately |
| `PARENT_UPGRADE_REQUIRED` | REVIEW (policy `majorUpgradeRequired`) | A fixed version exists but a parent package pins an older range | Upgrade the parent or wait for its release |
| `MANIFEST_SPEC_UNSUPPORTED` | REVIEW | The dependency is declared with a tag, URL or complex range Sentinel does not rewrite | Update it by hand |
| `FIX_UNKNOWN` | REVIEW (unknown) | Registry data was unavailable, so the fix could not be assessed | Re-run |
| `NO_FIX_AVAILABLE` | INFO (policy `noFixAvailable`) | No published release fixes the advisory | Track upstream; consider replacing the package |
| `OUT_OF_SCOPE` | INFO | Below `severity.minimum` | None |

## G2 Dependency usage analysis completed

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `USAGE_UNKNOWN` | REVIEW (unknown) | No reference to the package (or the dependency that installs it) was found; Sentinel does not assume it is unused | Confirm how the package is loaded |
| `USAGE_PARTIAL` | REVIEW (unknown) | Syntax errors, non-literal dynamic imports or skipped files make the analysis incomplete | See `dependency-usage-report.json` |

## G3 Impact analysis completed

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `IMPACT_UNKNOWN` | REVIEW (unknown) | Impacted files could not be determined | As for `USAGE_UNKNOWN` |
| `BUILD_TOOL_UPGRADE` | REVIEW (policy `buildToolUpgrades`) | The package runs in the build (here: `next`), so the files it processes cannot be listed statically | Check the build and e2e results |
| `ENGINES_INCOMPATIBLE` | REVIEW | The target version's `engines.node` excludes the CI Node version | Upgrade Node first |
| `PEER_DEPENDENCIES_CHANGED` | REVIEW | The target declares different peer dependencies | Check the peers are satisfied |
| `DEPRECATED_VERSION` | REVIEW | The target version is deprecated on the registry | Prefer another version |
| `PRERELEASE_TARGET` | REVIEW | The target is a pre-release | Prefer a stable release |
| `COMPATIBILITY_UNKNOWN` | REVIEW (unknown) | Registry metadata for the target was unavailable | Re-run |
| `ENGINES_CHANGED` | INFO | `engines.node` changed but still allows the CI version | None |

## G4 Impacted files have attributable test coverage

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `FILE_NOT_TESTED` | REVIEW | No passing test exercised the impacted file (loading it is not enough) | Add a test |
| `FILE_INSUFFICIENT_COVERAGE` | REVIEW | Tested, but below the line or branch threshold | Extend the tests |
| `TEST_NOT_EXECUTED` | REVIEW | Tests importing the file were discovered but did not run | Check test selection |
| `ASSOCIATED_TEST_FAILED` | BLOCK | A test associated with the file failed | Fix the test or the code |
| `ASSOCIATED_TESTS_SKIPPED` | REVIEW | Tests associated with the file are skipped (`it.skip`, `todo`) | Un-skip them |
| `FILE_COVERAGE_UNAVAILABLE` | REVIEW (unknown) | No coverage data for the file (missing report, or no validation command mapped to a config file) | Check `coverage.configurationEvidence` and the evidence |
| `FILE_INSTRUMENTATION_UNSUPPORTED` | REVIEW (unknown) | The coverage tool does not instrument this file type | Test it some other way and review |
| `COVERAGE_REPORT_MISSING` | REVIEW (unknown) | No coverage evidence at all | Check the evidence job |
| `COVERAGE_REPORT_MALFORMED` | BLOCK | Coverage evidence is structurally invalid (possible tampering or a tooling fault) | Inspect the artifacts |
| `ATTRIBUTION_UNAVAILABLE` | REVIEW (unknown) | Per-test execution attribution is missing (for example the `v8` coverage provider) | Use the default Babel provider |
| `NO_EVIDENCE_REQUIRED` | INFO | No impacted file needs evidence under the policy | None |

## G5 Required tests executed successfully

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `TESTS_FAILED` | BLOCK | A required test command or test failed | Fix it |
| `TEST_RUN_ERROR` | BLOCK | A required test command errored, timed out or suites could not run | Read the log artifact |
| `NO_TESTS_EXECUTED` | BLOCK | The test run executed nothing | Check the Jest configuration |
| `TEST_EVIDENCE_MISSING` | BLOCK (unknown) | No validation evidence was produced | Check the evidence job |
| `EVIDENCE_JOB_FAILED` | BLOCK | The evidence job failed (often `npm ci`) | Read its log |
| `TESTS_NOT_EXECUTED` | REVIEW | Discovered test files were not executed | Check test selection |
| `TESTS_SKIPPED` | REVIEW | Skipped or todo tests exist and `coverage.allowSkippedTests` is false | Un-skip or allow |

## G6 Builds and security validations pass

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `VALIDATION_FAILED` | BLOCK | A required build, lint or other command failed | Fix it |
| `VALIDATION_NOT_COMPLETED` | BLOCK (unknown) | A required command errored, timed out or did not run | Read the log artifact |
| `OPTIONAL_VALIDATION_FAILED` | INFO | A non-required command failed | Optional |
| `SIGNATURES_INVALID` | BLOCK | A package's registry signature or provenance attestation is invalid | Treat as a supply-chain incident |
| `SIGNATURES_MISSING` | REVIEW | Packages without registry signatures | Check where they come from |
| `SIGNATURE_VERIFICATION_UNAVAILABLE` | REVIEW (unknown) | `npm audit signatures` could not run (for example the Sigstore TUF CDN was unreachable) | Re-run |
| `REGISTRY_NOT_ALLOWED` | BLOCK | The lockfile resolves a package outside `allowedRegistries` | Treat as lockfile injection |
| `INTEGRITY_MISSING` | BLOCK | Lockfile entries without an integrity hash | Regenerate the lockfile |
| `LOCKFILE_INCONSISTENT` | BLOCK | The lockfile does not satisfy the manifest | Regenerate the lockfile |
| `LOCKFILE_CONSISTENCY_UNKNOWN` | REVIEW (unknown) | The consistency check could not run | Re-run |

## G7 No unresolved compatibility or governance restriction

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `UNEXPECTED_FILES_CHANGED` | REVIEW | Files other than `package.json`/`package-lock.json` changed (for example a person pushed code) | Review those changes |
| `MANIFEST_CHANGE_NOT_ALLOWED` | REVIEW | `package.json` changed beyond targeted version specs (scripts, new packages) | Review |
| `UNRELATED_DEPENDENCY_CHANGES` | REVIEW | Lockfile changes not attributable to a targeted fix | Review the diff |
| `MAJOR_UPGRADE_INCLUDED` | REVIEW | A major version change or downgrade appears in the lockfile diff | Review |
| `INSTALL_SCRIPT_ADDED` | REVIEW | A changed or new package has an install script | Review the script |
| `LICENSE_CHANGED` | REVIEW | A package's licence changed | Check compliance |
| `RELEASE_TOO_RECENT` | REVIEW | A target was published less than `minimumReleaseAgeHours` ago | Wait or review |
| `OWNERSHIP_UNRESOLVED` | REVIEW (policy `unresolvedOwnership`) | Impacted files have no CODEOWNERS owner | Add CODEOWNERS or `fallbackOwners` |
| `AUTO_MERGE_DISABLED` | REVIEW | `governance.autoMerge.enabled` is false | None |

## G8 Branch protection and merge requirements satisfied

| Code | Effect | Meaning | What to do |
|---|---|---|---|
| `EVIDENCE_STALE` | BLOCK | The evidence or evaluation belongs to another commit than the PR head | Nothing; the newer run decides |
| `NO_PULL_REQUEST` | REVIEW (unknown) | Preliminary weekly decision; the PR workflow decides | None |
| `BRANCH_NOT_PROTECTED` | REVIEW | The base branch has no protection rule | Protect it (installation guide) |
| `SENTINEL_CHECK_NOT_REQUIRED` | REVIEW | `Sentinel decision` is not a required status check | Add it |
| `REQUIRED_CHECKS_UNKNOWN` | REVIEW (unknown) | Required checks could not be read | Check token permissions |
| `PROTECTION_UNKNOWN` | REVIEW (unknown) | Branch protection or the auto-merge setting could not be read | Check token permissions |
| `AUTO_MERGE_NOT_ALLOWED` | REVIEW | The repository does not allow auto-merge | Enable it |
