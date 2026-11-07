import path from 'node:path';
import type {
  FileClass,
  ImpactedFile,
  ImpactKind,
  ImpactReport,
  Limitation,
  PackageImpact,
  RiskSignal,
  TraceStep,
  UsageReference,
  VulnerabilityReport,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';
import type { DependencyGraph } from '../graph/lockfile';
import type { UsageAnalysis } from '../usage/usage-analysis';
import type { RegistryClient } from '../vulnerabilities/registry';
import { assessCompatibility, plannedUpgrades } from './compatibility';

export interface ImpactInput {
  ctx: RunContext;
  config: SentinelConfig;
  graph: DependencyGraph;
  vulnerabilities: VulnerabilityReport;
  usage: UsageAnalysis;
  registry: RegistryClient;
}

const CODE = new Set(['DIRECT_IMPORT', 'REQUIRE', 'DYNAMIC_IMPORT', 'TEST_MOCK']);
const HIGH = new Set([
  'ENGINES_INCOMPATIBLE',
  'MAJOR_UPGRADE',
  'INSTALL_SCRIPT',
  'LICENSE_CHANGED',
]);
const MEDIUM = new Set([
  'BUILD_TOOL',
  'PEER_DEPENDENCIES_CHANGED',
  'RECENT_RELEASE',
  'DEPRECATED_VERSION',
  'PRERELEASE_TARGET',
  'ENGINES_CHANGED',
]);

function riskLevel(signals: readonly RiskSignal[]): PackageImpact['risk']['level'] {
  if (signals.some((s) => HIGH.has(s.code))) return 'HIGH';
  if (signals.some((s) => s.code === 'METADATA_UNAVAILABLE')) return 'UNKNOWN';
  if (signals.some((s) => MEDIUM.has(s.code))) return 'MEDIUM';
  return 'LOW';
}

function refStep(pkg: string, ref: UsageReference): TraceStep {
  const via = ref.referencedPackage === pkg ? '' : ` (installs ${pkg})`;
  return {
    from: `package:${ref.referencedPackage}`,
    to: ref.file,
    relationship: ref.relationship,
    evidence: `${ref.file}${ref.line ? `:${ref.line}` : ''} ${ref.evidence}${via}`,
  };
}

interface FileAccumulator {
  file: string;
  fileClass: FileClass;
  kinds: Set<ImpactKind>;
  packages: Set<string>;
  confirmed: boolean;
  traces: TraceStep[][];
}

function evidenceRequirement(
  acc: FileAccumulator,
  config: SentinelConfig,
): { required: boolean; reason: string } {
  const kinds = acc.kinds;
  if (!config.coverage.evidenceRequiredFor.includes(acc.fileClass)) {
    return {
      required: false,
      reason: `${acc.fileClass} files do not require evidence under policy`,
    };
  }
  if (kinds.has('DIRECT'))
    return { required: true, reason: 'references the vulnerable package directly' };
  if (kinds.has('TRANSITIVE'))
    return { required: true, reason: 'imports a dependency that installs the vulnerable package' };
  if (kinds.has('CONFIGURATION') || kinds.has('BUILD_SCRIPT')) {
    return {
      required: true,
      reason: 'configuration that references the package; needs a passing validation command',
    };
  }
  if (kinds.has('TYPE_ONLY')) {
    return config.coverage.typeOnlyImportsRequireEvidence
      ? { required: true, reason: 'type-only import; policy requires evidence' }
      : {
          required: false,
          reason: 'type-only import (no runtime effect); covered by the build type-check',
        };
  }
  if (kinds.has('DEPENDENT_MODULE')) {
    return config.coverage.scope === 'direct-and-dependents'
      ? { required: true, reason: 'imports an impacted module; policy scope includes dependents' }
      : {
          required: false,
          reason: 'imports an impacted module; reported, not required under scope "direct"',
        };
  }
  return { required: false, reason: 'reference does not require evidence' };
}

/**
 * Impact of each vulnerable package: directly and transitively impacted files, dependent modules
 * and entry points, configuration and CI relationships, a downstream graph, and compatibility
 * risk of the proposed upgrade. Every impacted file carries at least one trace back to the package.
 */
export async function analyseImpact(input: ImpactInput): Promise<ImpactReport> {
  const { usage, config } = input;
  const classOf = (file: string): FileClass => usage.classes.get(file) ?? 'other';
  const compat = await assessCompatibility(
    plannedUpgrades(input.vulnerabilities),
    input.graph,
    input.registry,
    config,
    input.ctx.now(),
  );
  const fixParents = new Map<string, Set<string>>();
  for (const v of input.vulnerabilities.vulnerabilities) {
    for (const instance of v.instances) {
      const parent = instance.fix.parent?.name;
      if (parent)
        fixParents.set(v.package, new Set([...(fixParents.get(v.package) ?? []), parent]));
    }
  }

  const files = new Map<string, FileAccumulator>();
  const touch = (file: string): FileAccumulator => {
    let acc = files.get(file);
    if (!acc) {
      acc = {
        file,
        fileClass: classOf(file),
        kinds: new Set(),
        packages: new Set(),
        confirmed: false,
        traces: [],
      };
      files.set(file, acc);
    }
    return acc;
  };

  const packages: PackageImpact[] = [];
  for (const pkgUsage of usage.report.packages) {
    const pkg = pkgUsage.package;
    const refs = pkgUsage.references;
    const direct = new Set<string>();
    const transitive = new Set<string>();
    const typeOnly = new Set<string>();
    const configuration = new Set<string>();
    const ci = new Set<string>();
    const tests = new Set<string>();
    const seedRef = new Map<string, UsageReference>();

    for (const ref of refs) {
      const acc = touch(ref.file);
      acc.packages.add(pkg);
      acc.traces.push([refStep(pkg, ref)]);
      if (ref.confidence === 'CONFIRMED') acc.confirmed = true;
      if (ref.fileClass === 'test') {
        acc.kinds.add('TEST');
        tests.add(ref.file);
        continue;
      }
      if (ref.relationship === 'CI_WORKFLOW') {
        acc.kinds.add('CI');
        ci.add(ref.file);
      } else if (ref.relationship === 'BUILD_SCRIPT') {
        acc.kinds.add('BUILD_SCRIPT');
        configuration.add(ref.file);
      } else if (ref.relationship === 'CONFIGURATION' || ref.relationship === 'TEXT_REFERENCE') {
        acc.kinds.add('CONFIGURATION');
        configuration.add(ref.file);
      } else if (ref.relationship === 'TYPE_IMPORT') {
        acc.kinds.add('TYPE_ONLY');
        typeOnly.add(ref.file);
      } else if (CODE.has(ref.relationship)) {
        const kind: ImpactKind = ref.referencedPackage === pkg ? 'DIRECT' : 'TRANSITIVE';
        acc.kinds.add(kind);
        (kind === 'DIRECT' ? direct : transitive).add(ref.file);
        if (!seedRef.has(ref.file)) seedRef.set(ref.file, ref);
      }
    }
    for (const file of [...typeOnly]) {
      if (direct.has(file) || transitive.has(file)) typeOnly.delete(file);
    }

    const seeds = [...seedRef.keys()].filter((f) => classOf(f) === 'production');
    const dependents = usage.importGraph.dependentsOf(seeds, (f) => classOf(f) === 'production');
    for (const [file, chain] of dependents) {
      const acc = touch(file);
      acc.kinds.add('DEPENDENT_MODULE');
      acc.packages.add(pkg);
      const seed = chain[0].to;
      const first = seedRef.get(seed) as UsageReference;
      acc.traces.push([
        refStep(pkg, first),
        ...chain.map((edge) => ({
          from: edge.to,
          to: edge.from,
          relationship: 'IMPORTED_BY',
          evidence: `${edge.from}:${edge.line} ${edge.text}`,
        })),
      ]);
    }

    const impactedProduction = [...seeds, ...dependents.keys()];
    const productionSet = new Set(impactedProduction);
    const entryPoints = impactedProduction
      .filter(
        (f) => !usage.importGraph.importersOf(f).some((e) => classOf(e.from) === 'production'),
      )
      .sort();
    const edges: [string, string][] = seeds.map((s) => [
      `package:${seedRef.get(s)?.referencedPackage ?? pkg}`,
      s,
    ]);
    for (const file of productionSet) {
      for (const edge of usage.importGraph.importersOf(file)) {
        if (productionSet.has(edge.from)) edges.push([file, edge.from]);
      }
    }
    const signals: RiskSignal[] = [
      ...(compat.get(pkg) ?? []),
      ...[...(fixParents.get(pkg) ?? [])].flatMap((parent) => compat.get(parent) ?? []),
    ];
    const buildTool = pkgUsage.limitations.find((l) => l.code === 'BUILD_TOOL_SCOPE');
    if (buildTool) {
      signals.push({ code: 'BUILD_TOOL', package: pkg, detail: buildTool.message });
    }
    const unknowns: Limitation[] = [...pkgUsage.limitations];
    if (pkgUsage.status === 'UNKNOWN') {
      unknowns.push({
        code: 'IMPACT_UNKNOWN',
        message: `usage of ${pkg} could not be established; impacted files are unknown`,
      });
    }
    packages.push({
      package: pkg,
      vulnerabilityKeys: input.vulnerabilities.vulnerabilities
        .filter((v) => v.package === pkg)
        .map((v) => v.key),
      usageStatus: pkgUsage.status,
      directFiles: [...direct].sort(),
      transitiveFiles: [...transitive].sort(),
      typeOnlyFiles: [...typeOnly].sort(),
      dependentModules: [...dependents.keys()].sort(),
      entryPoints,
      components: [...new Set(impactedProduction.map((f) => path.posix.dirname(f)))].sort(),
      configurationFiles: [...configuration].sort(),
      ciFiles: [...ci].sort(),
      testFiles: [...tests].sort(),
      downstreamGraph: {
        nodes: [`package:${pkg}`, ...[...productionSet].sort()],
        edges: dedupeEdges(edges),
      },
      risk: { level: riskLevel(signals), signals: dedupeSignals(signals) },
      unknowns,
    });
  }

  const impactedFiles: ImpactedFile[] = [...files.values()]
    .map((acc) => {
      const requirement = evidenceRequirement(acc, config);
      return {
        file: acc.file,
        fileClass: acc.fileClass,
        impactKinds: [...acc.kinds].sort() as ImpactKind[],
        packages: [...acc.packages].sort(),
        confidence: acc.confirmed ? 'CONFIRMED' : 'INFERRED',
        traces: acc.traces.slice(0, 10),
        evidenceRequired: requirement.required,
        evidenceReason: requirement.reason,
      } as ImpactedFile;
    })
    .sort((a, b) => a.file.localeCompare(b.file));

  return {
    ...makeHeader(input.ctx, 'impact-report', usage.report.limitations),
    coverageScope: config.coverage.scope,
    packages,
    impactedFiles,
  };
}

function dedupeEdges(edges: [string, string][]): [string, string][] {
  const seen = new Set<string>();
  return edges
    .filter(([a, b]) => {
      const key = `${a}>${b}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((x, y) => x[0].localeCompare(y[0]) || x[1].localeCompare(y[1]));
}

function dedupeSignals(signals: RiskSignal[]): RiskSignal[] {
  const seen = new Set<string>();
  return signals.filter((s) => {
    const key = `${s.code}|${s.package}|${s.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
