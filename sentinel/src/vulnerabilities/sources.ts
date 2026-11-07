import type { Severity, SourceName } from '../contracts/types';
import type { GitHubApi } from '../github/client';
import { GitHubApiError, paginate, seg } from '../github/client';
import type { AuditAdvisory } from './npm-audit';
import { ghsaFrom } from './npm-audit';

/** An advisory with the sources that reported it. */
export interface SourcedAdvisory extends AuditAdvisory {
  osvId: string | null;
  aliases: string[];
  sources: SourceName[];
}

/** CVE id, aliases and withdrawal status from the GitHub Advisory Database. */
export interface AdvisoryDetails {
  ghsa: string;
  cve: string | null;
  aliases: string[];
  withdrawn: boolean;
}

function mapSeverity(value: unknown): Severity | null {
  const v = String(value ?? '').toLowerCase();
  if (v === 'medium') return 'moderate';
  return (['critical', 'high', 'moderate', 'low', 'info'] as const).find((s) => s === v) ?? null;
}

/** Fetches one advisory from the global advisory API (`GET /advisories/{ghsa}`). */
export async function fetchAdvisory(api: GitHubApi, ghsa: string): Promise<AdvisoryDetails | null> {
  try {
    const { data } = await api.request<Record<string, unknown>>('GET', `/advisories/${seg(ghsa)}`);
    const identifiers = Array.isArray(data.identifiers)
      ? (data.identifiers as { type: string; value: string }[])
      : [];
    const cve =
      typeof data.cve_id === 'string'
        ? data.cve_id
        : (identifiers.find((i) => i.type === 'CVE')?.value ?? null);
    return {
      ghsa,
      cve,
      aliases: identifiers
        .map((i) => i.value)
        .filter((v) => v !== ghsa && v !== cve)
        .sort(),
      withdrawn: typeof data.withdrawn_at === 'string',
    };
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Reads open npm Dependabot alerts. Throws on access problems so the caller can record the source
 * as unavailable (it needs a token with Dependabot alerts read access).
 */
export async function fetchDependabotAdvisories(
  api: GitHubApi,
  slug: string,
): Promise<SourcedAdvisory[]> {
  const [owner, repo] = slug.split('/');
  const alerts = await paginate<Record<string, unknown>>(
    api,
    `/repos/${seg(owner)}/${seg(repo)}/dependabot/alerts?state=open&ecosystem=npm`,
  );
  return alerts
    .map((alert) => {
      const adv = (alert.security_advisory ?? {}) as Record<string, unknown>;
      const vuln = (alert.security_vulnerability ?? {}) as Record<string, unknown>;
      const pkg = ((vuln.package ?? {}) as Record<string, unknown>).name;
      const cvss = (adv.cvss ?? {}) as Record<string, unknown>;
      const ghsa = typeof adv.ghsa_id === 'string' ? adv.ghsa_id : null;
      return {
        sourceId: null,
        ghsa,
        osvId: null,
        url: ghsa ? `https://github.com/advisories/${ghsa}` : null,
        title: typeof adv.summary === 'string' ? adv.summary : 'Dependabot alert',
        severity: mapSeverity(vuln.severity ?? adv.severity) ?? 'moderate',
        cwe: Array.isArray(adv.cwes) ? (adv.cwes as { cwe_id: string }[]).map((c) => c.cwe_id) : [],
        cvssScore: typeof cvss.score === 'number' && cvss.score > 0 ? cvss.score : null,
        cvssVector: typeof cvss.vector_string === 'string' ? cvss.vector_string : null,
        range:
          typeof vuln.vulnerable_version_range === 'string' ? vuln.vulnerable_version_range : '*',
        package: String(pkg ?? ''),
        aliases: typeof adv.cve_id === 'string' ? [adv.cve_id] : [],
        sources: ['dependabot-alerts' as SourceName],
      };
    })
    .filter((a) => a.package !== '');
}

function osvRange(affected: Record<string, unknown>): string {
  const parts: string[] = [];
  const ranges = Array.isArray(affected.ranges)
    ? (affected.ranges as Record<string, unknown>[])
    : [];
  for (const range of ranges) {
    if (range.type !== 'SEMVER' && range.type !== 'ECOSYSTEM') continue;
    let introduced: string | null = null;
    for (const event of (range.events as Record<string, string>[]) ?? []) {
      if (event.introduced !== undefined) {
        introduced = event.introduced;
      } else if (event.fixed !== undefined || event.last_affected !== undefined) {
        const upper = event.fixed !== undefined ? `<${event.fixed}` : `<=${event.last_affected}`;
        parts.push(introduced && introduced !== '0' ? `>=${introduced} ${upper}` : upper);
        introduced = null;
      }
    }
    if (introduced !== null) {
      parts.push(introduced === '0' ? '*' : `>=${introduced}`);
    }
  }
  const versions = Array.isArray(affected.versions) ? (affected.versions as string[]) : [];
  if (parts.length === 0 && versions.length > 0) {
    return versions.join(' || ');
  }
  return parts.length > 0 ? parts.join(' || ') : '*';
}

/** Parses `osv-scanner --format json` output into npm advisories. */
export function parseOsvReport(text: string): SourcedAdvisory[] {
  const raw = JSON.parse(text) as { results?: { packages?: Record<string, unknown>[] }[] };
  const out: SourcedAdvisory[] = [];
  for (const result of raw.results ?? []) {
    for (const entry of result.packages ?? []) {
      const pkg = (entry.package ?? {}) as Record<string, string>;
      if (String(pkg.ecosystem).toLowerCase() !== 'npm') continue;
      for (const vuln of (entry.vulnerabilities as Record<string, unknown>[]) ?? []) {
        const id = String(vuln.id ?? '');
        const aliases = Array.isArray(vuln.aliases) ? (vuln.aliases as string[]) : [];
        const ghsa =
          ghsaFrom(id) ?? aliases.map((a) => ghsaFrom(a)).find((a) => a !== null) ?? null;
        const affected = ((vuln.affected as Record<string, unknown>[]) ?? []).find(
          (a) => ((a.package ?? {}) as Record<string, string>).name === pkg.name,
        );
        const malicious = id.startsWith('MAL-');
        const dbSeverity = ((vuln.database_specific ?? {}) as Record<string, unknown>).severity;
        out.push({
          sourceId: null,
          ghsa,
          osvId: id,
          url: ghsa
            ? `https://github.com/advisories/${ghsa}`
            : `https://osv.dev/vulnerability/${encodeURIComponent(id)}`,
          title: malicious
            ? `Malicious package: ${String(vuln.summary ?? pkg.name)}`
            : String(vuln.summary ?? id),
          severity: malicious ? 'critical' : (mapSeverity(dbSeverity) ?? 'moderate'),
          cwe: [],
          cvssScore: null,
          cvssVector: null,
          range: affected ? osvRange(affected) : '*',
          package: pkg.name,
          aliases: aliases.filter((a) => a !== ghsa),
          sources: ['osv-scanner'],
        });
      }
    }
  }
  return out;
}

/** Stable identity of an advisory for one package, used to merge sources. */
export function advisoryIdentity(a: {
  ghsa: string | null;
  osvId?: string | null;
  sourceId: number | null;
  title: string;
  package: string;
}): string {
  const id = a.ghsa ?? a.osvId ?? (a.sourceId !== null ? `npm-${a.sourceId}` : a.title);
  return `${id}|${a.package}`;
}

/**
 * Merges advisories from several sources. Entries describing the same advisory and package are
 * combined: ranges are unioned and sources recorded, so nothing reported by any source is lost.
 */
export function mergeAdvisories(lists: SourcedAdvisory[][]): SourcedAdvisory[] {
  const merged = new Map<string, SourcedAdvisory[]>();
  for (const list of lists) {
    for (const advisory of list) {
      const key = advisoryIdentity(advisory);
      merged.set(key, [...(merged.get(key) ?? []), advisory]);
    }
  }
  const rank: Record<Severity, number> = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };
  const out: SourcedAdvisory[] = [];
  for (const group of merged.values()) {
    const first = group[0];
    const ranges = [...new Set(group.map((g) => g.range))];
    out.push({
      ...first,
      severity: group.reduce<Severity>(
        (m, g) => (rank[g.severity] > rank[m] ? g.severity : m),
        first.severity,
      ),
      range: ranges.join(' || '),
      sources: [...new Set(group.flatMap((g) => g.sources))].sort(),
      aliases: [...new Set(group.flatMap((g) => g.aliases))].sort(),
      cwe: [...new Set(group.flatMap((g) => g.cwe))].sort(),
      cvssScore: group.reduce<number | null>(
        (m, g) => (g.cvssScore !== null && (m === null || g.cvssScore > m) ? g.cvssScore : m),
        null,
      ),
    });
  }
  return out;
}
