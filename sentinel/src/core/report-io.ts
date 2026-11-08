import fs from 'node:fs';
import path from 'node:path';
import type { Limitation, ReportHeader, ReportType, RepositoryRef } from '../contracts/types';
import { SCHEMA_VERSION } from '../contracts/types';
import { formatSchemaErrors, validateWithSchema } from '../contracts/schemas';
import { TOOL_VERSION } from '../version';

/** Identity and clock shared by every report produced in one run. */
export interface RunContext {
  executionId: string;
  repository: RepositoryRef;
  now: () => Date;
}

/** Raised when a report does not satisfy its contract (on write or read). */
export class ReportContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportContractError';
  }
}

/** Builds the common header for a report. */
export function makeHeader<T extends ReportType>(
  ctx: RunContext,
  reportType: T,
  limitations: Limitation[] = [],
): ReportHeader & { reportType: T } {
  return {
    schemaVersion: SCHEMA_VERSION,
    reportType,
    executionId: ctx.executionId,
    generatedAt: ctx.now().toISOString(),
    repository: ctx.repository,
    tool: { name: 'project-sentinel', version: TOOL_VERSION },
    limitations,
  };
}

/** Throws unless `report` satisfies the schema named after its `reportType`. */
export function assertReport(report: ReportHeader): void {
  const errors = validateWithSchema(report.reportType, report);
  if (errors.length > 0) {
    throw new ReportContractError(
      `${report.reportType} violates its schema:\n${formatSchemaErrors(errors)}`,
    );
  }
}

/** Validates then writes `<dir>/<reportType>.json`; returns the written path. */
export function writeReport(dir: string, report: ReportHeader): string {
  assertReport(report);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${report.reportType}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return file;
}

/** Reads and validates a report; malformed or mismatched files raise `ReportContractError`. */
export function readReport<T extends ReportHeader>(file: string, reportType: ReportType): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ReportContractError(`${file}: unreadable or not JSON (${(error as Error).message})`);
  }
  const header = parsed as ReportHeader;
  if (!header || header.reportType !== reportType) {
    throw new ReportContractError(`${file}: expected reportType "${reportType}"`);
  }
  assertReport(header);
  return parsed as T;
}
