/**
 * npm lockfile (v2/v3) dependency graph. Edges are resolved with Node's module resolution
 * algorithm over the `packages` map, so the graph reflects what is actually installed rather than
 * what manifests declare.
 */

export type EdgeType = 'prod' | 'dev' | 'optional' | 'peer';

export interface LockPackage {
  location: string;
  name: string;
  version: string;
  resolved: string | null;
  integrity: string | null;
  dev: boolean;
  optional: boolean;
  devOptional: boolean;
  peer: boolean;
  link: boolean;
  inBundle: boolean;
  hasInstallScript: boolean;
  license: string | null;
  deprecated: string | null;
  dependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  bin: Record<string, string>;
  engines: Record<string, string>;
}

export interface DependencyEdge {
  from: string;
  to: string | null;
  name: string;
  range: string;
  type: EdgeType;
}

export interface DependencyGraph {
  rootName: string;
  rootVersion: string;
  lockfileVersion: number;
  packages: Map<string, LockPackage>;
  edges: DependencyEdge[];
  out: Map<string, DependencyEdge[]>;
  in: Map<string, DependencyEdge[]>;
}

/** Raised for lockfiles Sentinel cannot interpret; never silently treated as empty. */
export class LockfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockfileError';
  }
}

const NM = 'node_modules/';

/** Package name implied by a lockfile location (`node_modules/a/node_modules/@s/b` -> `@s/b`). */
export function packageNameFromLocation(location: string): string {
  const index = location.lastIndexOf(NM);
  return index === -1 ? location : location.slice(index + NM.length);
}

function record(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') {
      out[k] = v;
    }
  }
  return out;
}

function binRecord(name: string, value: unknown): Record<string, string> {
  if (typeof value === 'string') {
    return { [name.split('/').pop() as string]: value };
  }
  return record(value);
}

/**
 * Resolves `name` as required from the package at `fromLocation`, walking up nested
 * `node_modules` folders exactly as Node does. Returns the lockfile location or null.
 */
export function resolveDependency(
  packages: Map<string, LockPackage>,
  fromLocation: string,
  name: string,
): string | null {
  let base = fromLocation;
  for (;;) {
    const candidate = base ? `${base}/${NM}${name}` : `${NM}${name}`;
    if (packages.has(candidate)) {
      return candidate;
    }
    if (!base) {
      return null;
    }
    const index = base.lastIndexOf(`/${NM}`);
    base = index === -1 ? '' : base.slice(0, index);
  }
}

/** Parses package-lock.json text (lockfile v2 or v3) into a resolved dependency graph. */
export function parseLockfile(text: string): DependencyGraph {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    throw new LockfileError(`package-lock.json is not valid JSON: ${(error as Error).message}`);
  }
  const lockfileVersion = raw.lockfileVersion;
  if (lockfileVersion !== 2 && lockfileVersion !== 3) {
    throw new LockfileError(
      `Unsupported lockfileVersion ${String(lockfileVersion)}; ` +
        'regenerate the lockfile with npm 7 or newer',
    );
  }
  const entries = raw.packages as Record<string, Record<string, unknown>> | undefined;
  if (!entries || typeof entries !== 'object' || !entries['']) {
    throw new LockfileError('package-lock.json has no "packages" map with a root entry');
  }

  const packages = new Map<string, LockPackage>();
  for (const [location, entry] of Object.entries(entries)) {
    const name =
      location === ''
        ? String(entry.name ?? raw.name ?? 'root')
        : String(entry.name ?? packageNameFromLocation(location));
    packages.set(location, {
      location,
      name,
      version: String(entry.version ?? (location === '' ? (raw.version ?? '0.0.0') : '')),
      resolved: typeof entry.resolved === 'string' ? entry.resolved : null,
      integrity: typeof entry.integrity === 'string' ? entry.integrity : null,
      dev: entry.dev === true,
      optional: entry.optional === true,
      devOptional: entry.devOptional === true,
      peer: entry.peer === true,
      link: entry.link === true,
      inBundle: entry.inBundle === true,
      hasInstallScript: entry.hasInstallScript === true,
      license: typeof entry.license === 'string' ? entry.license : null,
      deprecated: typeof entry.deprecated === 'string' ? entry.deprecated : null,
      dependencies: record(entry.dependencies),
      optionalDependencies: record(entry.optionalDependencies),
      peerDependencies: record(entry.peerDependencies),
      devDependencies: location === '' ? record(entry.devDependencies) : {},
      bin: binRecord(name, entry.bin),
      engines: record(entry.engines),
    });
  }

  const edges: DependencyEdge[] = [];
  for (const pkg of packages.values()) {
    const from =
      pkg.link && pkg.resolved && packages.has(pkg.resolved) ? pkg.resolved : pkg.location;
    const groups: [Record<string, string>, EdgeType][] = [
      [pkg.dependencies, 'prod'],
      [pkg.optionalDependencies, 'optional'],
      [pkg.peerDependencies, 'peer'],
      [pkg.devDependencies, 'dev'],
    ];
    for (const [deps, type] of groups) {
      for (const [name, range] of Object.entries(deps)) {
        let to = resolveDependency(packages, from, name);
        const target = to ? packages.get(to) : undefined;
        if (target?.link && target.resolved && packages.has(target.resolved)) {
          to = target.resolved;
        }
        edges.push({ from: pkg.location, to, name, range, type });
      }
    }
  }

  const out = new Map<string, DependencyEdge[]>();
  const inbound = new Map<string, DependencyEdge[]>();
  for (const edge of edges) {
    out.set(edge.from, [...(out.get(edge.from) ?? []), edge]);
    if (edge.to) {
      inbound.set(edge.to, [...(inbound.get(edge.to) ?? []), edge]);
    }
  }
  const root = packages.get('') as LockPackage;
  return {
    rootName: root.name,
    rootVersion: root.version,
    lockfileVersion: lockfileVersion as number,
    packages,
    edges,
    out,
    in: inbound,
  };
}

/** Direct dependencies declared by the root manifest, keyed by name. */
export function directDependencies(graph: DependencyGraph): Map<string, DependencyEdge> {
  const direct = new Map<string, DependencyEdge>();
  for (const edge of graph.out.get('') ?? []) {
    if (!direct.has(edge.name)) {
      direct.set(edge.name, edge);
    }
  }
  return direct;
}

/** Locations that can reach `location` (its ancestors), excluding the root. */
export function ancestorsOf(graph: DependencyGraph, location: string): Set<string> {
  const seen = new Set<string>();
  const queue = [location];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const edge of graph.in.get(current) ?? []) {
      if (edge.from !== '' && !seen.has(edge.from)) {
        seen.add(edge.from);
        queue.push(edge.from);
      }
    }
  }
  return seen;
}

/** Locations reachable from `location` (its descendants). */
export function descendantsOf(graph: DependencyGraph, location: string): Set<string> {
  const seen = new Set<string>();
  const queue = [location];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const edge of graph.out.get(current) ?? []) {
      if (edge.to && !seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return seen;
}

/** Direct dependency edges of the root through which `location` is reachable. */
export function viaDirectDependencies(graph: DependencyGraph, location: string): DependencyEdge[] {
  const reach = ancestorsOf(graph, location);
  reach.add(location);
  return [...directDependencies(graph).values()]
    .filter((edge) => edge.to !== null && reach.has(edge.to))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function label(graph: DependencyGraph, location: string): string {
  const pkg = graph.packages.get(location);
  return pkg ? `${pkg.name}@${pkg.version}` : location;
}

function shortestPath(graph: DependencyGraph, start: string, target: string): string[] | null {
  const previous = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === target) {
      const path: string[] = [];
      let node: string | null = current;
      while (node !== null) {
        path.unshift(node);
        node = previous.get(node) ?? null;
      }
      return path;
    }
    for (const edge of graph.out.get(current) ?? []) {
      if (edge.to && !previous.has(edge.to)) {
        previous.set(edge.to, current);
        queue.push(edge.to);
      }
    }
  }
  return null;
}

/**
 * Dependency paths from the root to `location`: one shortest path per direct dependency that
 * reaches it, capped at `max`. Each element is `name@version`, starting with the root project.
 */
export function dependencyPaths(
  graph: DependencyGraph,
  location: string,
  max: number,
): { paths: string[][]; truncated: boolean } {
  const rootLabel = `${graph.rootName}@${graph.rootVersion}`;
  const entries = viaDirectDependencies(graph, location);
  const paths: string[][] = [];
  for (const edge of entries) {
    const path = shortestPath(graph, edge.to as string, location);
    if (path) {
      paths.push([rootLabel, ...path.map((p) => label(graph, p))]);
    }
  }
  paths.sort((a, b) => a.length - b.length || a.join('>').localeCompare(b.join('>')));
  return { paths: paths.slice(0, max), truncated: paths.length > max };
}

/** Executable name -> package name for binaries installed at the top level. */
export function topLevelBins(graph: DependencyGraph): Map<string, string> {
  const bins = new Map<string, string>();
  for (const pkg of graph.packages.values()) {
    if (pkg.location.startsWith(NM) && !pkg.location.slice(NM.length).includes(`/${NM}`)) {
      for (const bin of Object.keys(pkg.bin)) {
        if (!bins.has(bin)) {
          bins.set(bin, pkg.name);
        }
      }
    }
  }
  return bins;
}
