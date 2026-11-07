import type { Severity } from '../contracts/types';

/** One advisory as npm reports it for one vulnerable range of one package. */
export interface AuditAdvisory {
  sourceId: number | null;
  ghsa: string | null;
  url: string | null;
  title: string;
  severity: Severity;
  cwe: string[];
  cvssScore: number | null;
  cvssVector: string | null;
  range: string;
  package: string;
}

export type FixAvailable = boolean | { name: string; version: string; isSemVerMajor: boolean };

/** npm's per-package entry; `viaPackages` lists packages it is vulnerable *through*. */
export interface AuditEntry {
  name: string;
  severity: Severity;
  isDirect: boolean;
  viaPackages: string[];
  advisories: AuditAdvisory[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: FixAvailable;
}

export interface ParsedAudit {
  entries: Map<string, AuditEntry>;
  advisories: AuditAdvisory[];
  totals: Record<Severity, number>;
}

/** Raised when npm audit could not produce a report (network, registry or format problems). */
export class AuditUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditUnavailableError';
  }
}

const SEVERITIES: Severity[] = ['critical', 'high', 'moderate', 'low', 'info'];

function severityOf(value: unknown): Severity {
  return SEVERITIES.includes(value as Severity) ? (value as Severity) : 'info';
}

/** Extracts a GHSA id from an advisory URL or string. */
export function ghsaFrom(text: string | null | undefined): string | null {
  const match = /GHSA(-[23456789cfghjmpqrvwx]{4}){3}/i.exec(text ?? '');
  return match ? `GHSA${match[0].slice(4).toLowerCase()}` : null;
}

function parseFix(value: unknown): FixAvailable {
  if (typeof value === 'boolean') {
    return value;
  }
  const v = value as Record<string, unknown> | null;
  if (v && typeof v.name === 'string' && typeof v.version === 'string') {
    return { name: v.name, version: v.version, isSemVerMajor: v.isSemVerMajor === true };
  }
  return false;
}

/**
 * Parses `npm audit --json` (report version 2). Error payloads and older formats raise
 * `AuditUnavailableError`: a missing audit must never look like "no vulnerabilities".
 */
export function parseNpmAudit(text: string): ParsedAudit {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new AuditUnavailableError('npm audit output is not JSON');
  }
  if (raw.error) {
    const err = raw.error as Record<string, unknown>;
    throw new AuditUnavailableError(
      `npm audit failed: ${String(err.summary ?? err.code ?? 'unknown error')}`,
    );
  }
  if (
    raw.auditReportVersion !== 2 ||
    typeof raw.vulnerabilities !== 'object' ||
    raw.vulnerabilities === null
  ) {
    throw new AuditUnavailableError('Unsupported npm audit format (expected auditReportVersion 2)');
  }

  const entries = new Map<string, AuditEntry>();
  const advisories = new Map<string, AuditAdvisory>();
  for (const [name, value] of Object.entries(
    raw.vulnerabilities as Record<string, Record<string, unknown>>,
  )) {
    const via = Array.isArray(value.via) ? value.via : [];
    const viaPackages: string[] = [];
    const own: AuditAdvisory[] = [];
    for (const item of via) {
      if (typeof item === 'string') {
        viaPackages.push(item);
        continue;
      }
      const v = item as Record<string, unknown>;
      const cvss = (v.cvss ?? {}) as Record<string, unknown>;
      const advisory: AuditAdvisory = {
        sourceId: typeof v.source === 'number' ? v.source : null,
        ghsa: ghsaFrom(typeof v.url === 'string' ? v.url : null),
        url: typeof v.url === 'string' ? v.url : null,
        title: typeof v.title === 'string' ? v.title : 'Untitled advisory',
        severity: severityOf(v.severity),
        cwe: Array.isArray(v.cwe) ? v.cwe.filter((c): c is string => typeof c === 'string') : [],
        cvssScore: typeof cvss.score === 'number' && cvss.score > 0 ? cvss.score : null,
        cvssVector: typeof cvss.vectorString === 'string' ? cvss.vectorString : null,
        range: typeof v.range === 'string' ? v.range : '*',
        package:
          typeof v.dependency === 'string'
            ? v.dependency
            : typeof v.name === 'string'
              ? v.name
              : name,
      };
      own.push(advisory);
      const identity = advisory.sourceId ?? advisory.ghsa ?? advisory.title;
      advisories.set(`${identity}|${advisory.package}|${advisory.range}`, advisory);
    }
    entries.set(name, {
      name,
      severity: severityOf(value.severity),
      isDirect: value.isDirect === true,
      viaPackages: [...new Set(viaPackages)].sort(),
      advisories: own,
      effects: Array.isArray(value.effects) ? (value.effects as string[]).slice().sort() : [],
      range: typeof value.range === 'string' ? value.range : '*',
      nodes: Array.isArray(value.nodes) ? (value.nodes as string[]).slice().sort() : [],
      fixAvailable: parseFix(value.fixAvailable),
    });
  }

  const meta = ((raw.metadata as Record<string, unknown> | undefined)?.vulnerabilities ??
    {}) as Record<string, unknown>;
  const totals = Object.fromEntries(
    SEVERITIES.map((s) => [s, typeof meta[s] === 'number' ? (meta[s] as number) : 0]),
  ) as Record<Severity, number>;

  return { entries, advisories: [...advisories.values()], totals };
}

/**
 * Stable advisory keys present in an audit (GHSA or npm source id, plus package), used to compare
 * audits before and after remediation.
 */
export function advisoryKeys(audit: ParsedAudit): string[] {
  return [
    ...new Set(audit.advisories.map((a) => `${a.ghsa ?? `npm-${a.sourceId}`}|${a.package}`)),
  ].sort();
}
