# Project Sentinel

Deterministic dependency-vulnerability remediation and impact assurance for this repository. Each
week Sentinel finds vulnerable dependencies, works out where they are actually used, applies
patch/minor fixes, runs the full validation, and decides from recorded evidence whether the pull
request may merge automatically, needs a person, or is blocked. No AI or LLM service is involved:
the same evidence and policy always produce the same decision.

| Document | Contents |
|---|---|
| [discovery-report.md](./discovery-report.md) | What was found in this repository before building Sentinel, gaps and challenged assumptions |
| [architecture.md](./architecture.md) | Modules and contracts, trust boundaries, Mermaid diagrams, the decision model |
| [installation.md](./installation.md) | GitHub settings, the optional GitHub App, running and configuring Sentinel |
| [decision-reference.md](./decision-reference.md) | Every reason code, what it means and what to do |
| [security.md](./security.md) | Threat model, residual risks, permissions, token handling, operating procedures |
| [troubleshooting.md](./troubleshooting.md) | Common problems and fixes |

Example reports from a real run on this repository are in [examples/](./examples/).

## Outcomes

- **AUTO_MERGE**: every one of the eight gates passed; Sentinel enables GitHub auto-merge for the
  evaluated commit and GitHub still enforces branch protection.
- **HUMAN_REVIEW**: something needs judgement (coverage gap, unknown usage, framework upgrade,
  major upgrade elsewhere, missing owner...). Owners are requested and the reasons are listed.
- **BLOCKED**: validation failed or a security condition is unresolved; the required check fails.

## Code map

```
sentinel/
  src/cli.ts                 command line (scan, usage, impact, remediate, validate, decide, gate,
                             weekly-plan, weekly-evaluate, publish, pr-evaluate, discover-repo)
  src/discovery/             repository discovery
  src/vulnerabilities/       npm audit, OSV, Dependabot, advisory API, registry, fix assessment
  src/graph/lockfile.ts      lockfile v2/v3 dependency graph (Node resolution)
  src/usage/                 AST imports, scripts and workflows, configs, text search
  src/impact/                classification, import graph, compatibility, impact analysis
  src/coverage/              Istanbul/LCOV/Coverage.py parsers, Jest attribution reporter, statuses
  src/remediation/           planner, npm apply, lockfile and manifest diffs, integrity checks
  src/validation/runner.ts   test, build, lint, e2e and security command runner
  src/governance/            CODEOWNERS and the deterministic decision engine
  src/github/                REST/GraphQL client, branch protection, PR management, Markdown
  src/pipeline/              stage orchestration for the two workflows
  schemas/                   JSON Schemas for the policy and every report
  test/                      unit, integration and scenario A-I tests with fixture repositories
```

Commands: `npm run sentinel:build`, `npm run sentinel:typecheck`, `npm run sentinel:test`.
