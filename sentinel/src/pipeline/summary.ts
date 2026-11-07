import type {
  CoverageReport,
  ExecutionSummary,
  ImpactReport,
  MergeDecision,
  PrManagementReport,
  RemediationReport,
  ValidationReport,
  VulnerabilityReport,
} from '../contracts/types';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';

export interface SummaryInputs {
  vulnerabilities?: VulnerabilityReport | null;
  impact?: ImpactReport | null;
  coverage?: CoverageReport | null;
  remediation?: RemediationReport | null;
  validation?: ValidationReport | null;
  decision?: MergeDecision | null;
  prManagement?: PrManagementReport | null;
}

/**
 * The execution record: what was found, changed, tested and decided in this run, with pointers to
 * every report it produced. Repository and commit come from the shared header.
 */
export function buildExecutionSummary(
  ctx: RunContext,
  stage: string,
  inputs: SummaryInputs,
  reports: string[],
): ExecutionSummary {
  const { vulnerabilities, impact, coverage, remediation, validation, decision, prManagement } =
    inputs;
  return {
    ...makeHeader(ctx, 'execution-summary'),
    stage,
    vulnerabilities: (vulnerabilities?.vulnerabilities ?? [])
      .filter((v) => v.inScope)
      .map((v) => ({
        key: v.key,
        ids: [v.ids.ghsa, ...v.ids.cve].filter((id): id is string => id !== null),
        severity: v.severity,
        package: v.package,
      })),
    dependencyChanges: (remediation?.changes ?? []).map((c) => ({
      name: c.name,
      from: c.from,
      to: c.to,
    })),
    impactedFiles: (impact?.impactedFiles ?? []).map((f) => f.file),
    tests: validation
      ? {
          executed: validation.tests.total,
          passed: validation.tests.passed,
          failed: validation.tests.failed,
          skipped: validation.tests.skipped,
        }
      : null,
    coverage: Object.fromEntries(
      (coverage?.files ?? []).filter((f) => f.evidenceRequired).map((f) => [f.file, f.status]),
    ),
    gates: (decision?.gates ?? []).map((g) => ({ id: g.id, status: g.status })),
    decision: decision?.decision ?? null,
    pullRequest: {
      number: prManagement?.pullRequest.number ?? decision?.pullRequest.number ?? null,
      url: prManagement?.pullRequest.url ?? null,
    },
    codeownersAssignments: decision?.ownership.owners ?? [],
    reports: [...reports].sort(),
  };
}
