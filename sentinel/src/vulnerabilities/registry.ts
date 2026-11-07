import semver from 'semver';
import type { Severity } from '../contracts/types';
import { runCommand } from '../core/exec';
import { ghsaFrom } from './npm-audit';

export interface PackageInfo {
  name: string;
  versions: string[];
  time: Record<string, string>;
}

export interface VersionManifest {
  name: string;
  version: string;
  /** Regular and optional dependencies declared by this version. */
  dependencies: Record<string, string>;
  engines: Record<string, string>;
  peerDependencies: Record<string, string>;
  license: string | null;
  deprecated: string | null;
  hasInstallScript: boolean;
  publishedAt: string | null;
}

/** An advisory returned by the registry's bulk advisory endpoint. */
export interface BulkAdvisory {
  key: string;
  ghsa: string | null;
  sourceId: number | null;
  title: string;
  url: string | null;
  severity: Severity;
  range: string;
}

/** Source of published-version metadata. Implementations must never throw. */
export interface RegistryClient {
  packageInfo(name: string): Promise<PackageInfo | null>;
  versionManifest(name: string, version: string): Promise<VersionManifest | null>;
  /**
   * Advisories affecting any of the given versions, per package (the registry's bulk advisory
   * endpoint, which `npm audit` also uses). Null when the endpoint is unreachable.
   */
  advisoriesFor(versions: Record<string, string[]>): Promise<Map<string, BulkAdvisory[]> | null>;
}

const NAME = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;

/** True for names safe to pass to npm as a positional argument (cannot be read as a flag). */
export function isSafePackageName(name: string): boolean {
  return name.length <= 214 && NAME.test(name);
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  );
}

function licenseOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  ) {
    return (value as { type: string }).type;
  }
  return null;
}

/** Builds a manifest summary from a registry version document. */
export function manifestFromDocument(
  name: string,
  version: string,
  doc: Record<string, unknown>,
): VersionManifest {
  const scripts = stringRecord(doc.scripts);
  const time = stringRecord(doc.time);
  return {
    name,
    version,
    dependencies: { ...stringRecord(doc.optionalDependencies), ...stringRecord(doc.dependencies) },
    engines: stringRecord(doc.engines),
    peerDependencies: stringRecord(doc.peerDependencies),
    license: licenseOf(doc.license),
    deprecated: typeof doc.deprecated === 'string' ? doc.deprecated : null,
    hasInstallScript:
      doc.hasInstallScript === true ||
      doc.gypfile === true ||
      ['preinstall', 'install', 'postinstall'].some((s) => s in scripts),
    publishedAt: time[version] ?? null,
  };
}

const SEVERITIES: Severity[] = ['critical', 'high', 'moderate', 'low', 'info'];

/** Converts a bulk advisory response body into keyed advisories. */
export function parseBulkAdvisories(body: unknown): Map<string, BulkAdvisory[]> {
  const out = new Map<string, BulkAdvisory[]>();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return out;
  }
  for (const [name, list] of Object.entries(body as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    out.set(
      name,
      list.map((raw) => {
        const a = raw as Record<string, unknown>;
        const url = typeof a.url === 'string' ? a.url : null;
        const ghsa = ghsaFrom(url);
        const sourceId = typeof a.id === 'number' ? a.id : null;
        return {
          key: ghsa ?? `npm-${sourceId}`,
          ghsa,
          sourceId,
          title: typeof a.title === 'string' ? a.title : 'Untitled advisory',
          url,
          severity: SEVERITIES.includes(a.severity as Severity) ? (a.severity as Severity) : 'info',
          range: typeof a.vulnerable_versions === 'string' ? a.vulnerable_versions : '*',
        };
      }),
    );
  }
  return out;
}

/**
 * Registry access through `npm view`, so the repository's own npm configuration (registry,
 * proxy, auth) applies. Run it from a trusted working directory: npm reads `.npmrc` from there.
 */
export class NpmViewRegistry implements RegistryClient {
  private readonly infoCache = new Map<string, Promise<PackageInfo | null>>();
  private readonly manifestCache = new Map<string, Promise<VersionManifest | null>>();

  constructor(
    private readonly cwd: string,
    private readonly env: NodeJS.ProcessEnv,
    private readonly registryUrl: string = 'https://registry.npmjs.org/',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async advisoriesFor(
    versions: Record<string, string[]>,
  ): Promise<Map<string, BulkAdvisory[]> | null> {
    const body: Record<string, string[]> = {};
    for (const [name, list] of Object.entries(versions)) {
      if (isSafePackageName(name)) {
        body[name] = list.filter((v) => semver.valid(v) !== null);
      }
    }
    if (Object.keys(body).length === 0) {
      return new Map();
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await this.fetchImpl(
        `${this.registryUrl.replace(/\/$/, '')}/-/npm/v1/security/advisories/bulk`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'user-agent': 'project-sentinel' },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        return null;
      }
      return parseBulkAdvisories(await response.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async view(args: string[]): Promise<Record<string, unknown> | null> {
    const result = await runCommand(['npm', 'view', ...args, '--json'], {
      cwd: this.cwd,
      env: this.env,
      timeoutMs: 120_000,
    });
    if (result.exitCode !== 0) {
      return null;
    }
    try {
      const parsed = JSON.parse(result.stdout) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  packageInfo(name: string): Promise<PackageInfo | null> {
    if (!isSafePackageName(name)) {
      return Promise.resolve(null);
    }
    const cached = this.infoCache.get(name);
    if (cached) return cached;
    const pending = this.view([name, 'versions', 'time']).then((doc) => {
      if (!doc || !Array.isArray(doc.versions)) return null;
      return {
        name,
        versions: (doc.versions as unknown[]).filter((v): v is string => typeof v === 'string'),
        time: stringRecord(doc.time),
      };
    });
    this.infoCache.set(name, pending);
    return pending;
  }

  versionManifest(name: string, version: string): Promise<VersionManifest | null> {
    if (!isSafePackageName(name) || !semver.valid(version)) {
      return Promise.resolve(null);
    }
    const key = `${name}@${version}`;
    const cached = this.manifestCache.get(key);
    if (cached) return cached;
    const pending = this.view([key]).then((doc) =>
      doc ? manifestFromDocument(name, version, doc) : null,
    );
    this.manifestCache.set(key, pending);
    return pending;
  }
}

interface StaticPackage {
  time?: Record<string, string>;
  versions: Record<string, Record<string, unknown>>;
  advisories?: Record<string, unknown>[];
}

/** Registry backed by recorded data; used for tests and for replaying recorded evidence. */
export class StaticRegistry implements RegistryClient {
  constructor(private readonly data: Record<string, StaticPackage>) {}

  async advisoriesFor(
    versions: Record<string, string[]>,
  ): Promise<Map<string, BulkAdvisory[]> | null> {
    const raw: Record<string, unknown[]> = {};
    for (const [name, list] of Object.entries(versions)) {
      const all = this.data[name]?.advisories ?? [];
      const hits = all.filter((a) =>
        list.some((v) =>
          semver.satisfies(v, String(a.vulnerable_versions), { includePrerelease: true }),
        ),
      );
      if (hits.length > 0) raw[name] = hits;
    }
    return parseBulkAdvisories(raw);
  }

  async packageInfo(name: string): Promise<PackageInfo | null> {
    const entry = this.data[name];
    if (!entry) return null;
    return { name, versions: Object.keys(entry.versions), time: entry.time ?? {} };
  }

  async versionManifest(name: string, version: string): Promise<VersionManifest | null> {
    const entry = this.data[name];
    const doc = entry?.versions[version];
    if (!entry || !doc) return null;
    return manifestFromDocument(name, version, { ...doc, time: entry.time ?? {} });
  }
}
