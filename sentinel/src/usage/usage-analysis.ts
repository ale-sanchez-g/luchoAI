import path from 'node:path';
import type {
  DependencyUsageReport,
  DynamicImportSite,
  FileClass,
  Limitation,
  PackageUsage,
  RelationshipType,
  UsageReference,
  VulnerabilityReport,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { readRepoFile, walkRepository } from '../core/fs-walk';
import { extensionOf } from '../core/paths';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';
import type { DependencyGraph } from '../graph/lockfile';
import { topLevelBins, viaDirectDependencies } from '../graph/lockfile';
import { classifyFile } from '../impact/classify';
import { ImportGraph } from '../impact/import-graph';
import type { ParsedModule, ReferenceKind } from './ast-imports';
import { CODE_EXTENSIONS, parseModule } from './ast-imports';
import { configFileOwner, jsonTokens, matchTokens } from './config-references';
import { LocalResolver } from './module-resolution';
import type { ScriptEntry } from './scripts';
import { expandScript, parseScripts, parseWorkflowCommands } from './scripts';
import { textReferences } from './text-search';

export interface UsageInput {
  root: string;
  ctx: RunContext;
  config: SentinelConfig;
  graph: DependencyGraph;
  vulnerabilities: VulnerabilityReport;
}

/** Report plus the intermediate structures later stages reuse (no second parse). */
export interface UsageAnalysis {
  report: DependencyUsageReport;
  files: string[];
  classes: Map<string, FileClass>;
  modules: Map<string, ParsedModule>;
  importGraph: ImportGraph;
  scripts: Map<string, ScriptEntry>;
  /** Packages whose binaries run in each npm script (after following npm-run chains). */
  scriptPackages: Map<string, Set<string>>;
}

const RELATIONSHIP: Record<ReferenceKind, RelationshipType> = {
  import: 'DIRECT_IMPORT',
  'side-effect': 'DIRECT_IMPORT',
  'export-from': 'DIRECT_IMPORT',
  'import-equals': 'DIRECT_IMPORT',
  'type-import': 'TYPE_IMPORT',
  require: 'REQUIRE',
  'require-resolve': 'REQUIRE',
  'dynamic-import': 'DYNAMIC_IMPORT',
  'jest-mock': 'TEST_MOCK',
};

const CODE_RELATIONSHIPS = new Set<RelationshipType>([
  'DIRECT_IMPORT',
  'TYPE_IMPORT',
  'REQUIRE',
  'DYNAMIC_IMPORT',
  'TEST_MOCK',
]);
const TEXT_EXTENSIONS = new Set([
  '.sh',
  '.bash',
  '.zsh',
  '.yml',
  '.yaml',
  '.toml',
  '.ini',
  '.cfg',
  '.html',
  '.htm',
  '.env',
  '.properties',
]);
const JSON_CONFIG = new RegExp(
  String.raw`(^|/)(tsconfig[^/]*\.json|\.eslintrc(\.json)?|\.babelrc(\.json)?|` +
    String.raw`babel\.config\.json|jest\.config\.json|\.swcrc|package\.json)$`,
);

function isTextCandidate(file: string): boolean {
  const base = path.posix.basename(file);
  return (
    TEXT_EXTENSIONS.has(extensionOf(file)) ||
    /^(Dockerfile|Containerfile|Makefile|Procfile)/.test(base) ||
    base === '.npmrc'
  );
}

/**
 * Finds where each vulnerable package (and each direct dependency through which it is installed)
 * is referenced: source imports via the TypeScript AST, npm scripts and the binaries they run,
 * configuration files, CI workflows and, for other text files, quoted references. A package with
 * no reference is reported as UNKNOWN, never as unused.
 */
export function analyseUsage(input: UsageInput): UsageAnalysis {
  const { root, config, graph } = input;
  const walk = walkRepository(root, {
    exclude: config.analysis.excludedPaths,
    maxFileSizeBytes: config.analysis.maxFileSizeBytes,
  });
  const files = walk.files;
  const fileSet = new Set(files);
  const classes = new Map(files.map((f) => [f, classifyFile(f, config.analysis.classification)]));
  const limitations: Limitation[] = [];

  const vulnerable = [
    ...new Set(input.vulnerabilities.vulnerabilities.map((v) => v.package)),
  ].sort();
  const namesFor = new Map<string, string[]>();
  const interestedBy = new Map<string, Set<string>>();
  for (const pkg of vulnerable) {
    const names = new Set<string>([pkg]);
    for (const instance of [...graph.packages.values()].filter(
      (p) => p.name === pkg && p.location !== '',
    )) {
      viaDirectDependencies(graph, instance.location).forEach((edge) => names.add(edge.name));
    }
    namesFor.set(pkg, [...names].sort());
    for (const name of names) {
      interestedBy.set(name, new Set([...(interestedBy.get(name) ?? []), pkg]));
    }
  }
  const interest = new Set(interestedBy.keys());
  const references = new Map<string, UsageReference[]>(vulnerable.map((p) => [p, []]));
  const record = (ref: Omit<UsageReference, 'fileClass'>): void => {
    for (const pkg of interestedBy.get(ref.referencedPackage) ?? []) {
      references.get(pkg)?.push({ ...ref, fileClass: classes.get(ref.file) ?? 'other' });
    }
  };

  const installed = new Set(
    [...graph.packages.values()]
      .filter((p) => p.location.startsWith('node_modules/'))
      .map((p) => p.name),
  );
  const tsconfig = fileSet.has(config.analysis.tsconfig) ? config.analysis.tsconfig : null;
  const resolver = new LocalResolver(root, fileSet, tsconfig, installed);
  const importGraph = new ImportGraph();
  const modules = new Map<string, ParsedModule>();
  const parseErrors: DependencyUsageReport['parseErrors'] = [];
  const dynamicImports: DynamicImportSite[] = [];
  const unresolved = new Map<string, string[]>();

  for (const file of files.filter(
    (f) => CODE_EXTENSIONS.has(extensionOf(f)) && !f.endsWith('.d.ts'),
  )) {
    const text = readRepoFile(root, file);
    if (text === null) continue;
    const fileClass = classes.get(file) ?? 'other';
    const parsed = parseModule(file, text, fileClass === 'configuration');
    modules.set(file, parsed);
    if (parsed.syntaxErrors > 0) {
      parseErrors.push({
        file,
        message: `${parsed.syntaxErrors} syntax error(s); references may be incomplete`,
      });
    }
    for (const site of parsed.dynamicSites) {
      dynamicImports.push({
        file,
        line: site.line,
        column: site.column,
        kind: site.kind,
        expression: site.expression,
        fileClass,
      });
    }
    for (const ref of parsed.references) {
      const resolution = resolver.resolve(file, ref.specifier);
      if (resolution.file) {
        importGraph.add({
          from: file,
          to: resolution.file,
          typeOnly: ref.kind === 'type-import',
          line: ref.line,
          text: ref.text,
        });
      } else if (
        resolution.specifierClass === 'local' ||
        resolution.specifierClass === 'unresolved-alias'
      ) {
        unresolved.set(file, [...(unresolved.get(file) ?? []), ref.specifier]);
      } else if (resolution.packageName && interest.has(resolution.packageName)) {
        record({
          file,
          line: ref.line,
          column: ref.column,
          relationship: RELATIONSHIP[ref.kind],
          confidence: 'CONFIRMED',
          specifier: ref.specifier,
          referencedPackage: resolution.packageName,
          detector: 'ast',
          evidence: ref.text,
        });
      }
    }
    if (fileClass === 'configuration') {
      for (const match of matchTokens(parsed.literals, interest)) {
        record({
          file,
          line: match.line,
          column: match.column,
          relationship: 'CONFIGURATION',
          confidence: match.confidence,
          specifier: match.value,
          referencedPackage: match.name,
          detector: 'config',
          evidence: `${match.rule}: "${match.value}"`,
        });
      }
    }
  }
  for (const file of files) {
    const owner = configFileOwner(file);
    if (owner && interest.has(owner) && classes.get(file) === 'configuration') {
      record({
        file,
        line: null,
        column: null,
        relationship: 'CONFIGURATION',
        confidence: 'INFERRED',
        specifier: path.posix.basename(file),
        referencedPackage: owner,
        detector: 'config',
        evidence:
          `config file naming: ${path.posix.basename(file)} ` + `is ${owner}'s configuration file`,
      });
    }
  }
  for (const [file, specs] of unresolved) {
    limitations.push({
      code: 'UNRESOLVED_LOCAL_IMPORT',
      message: `${file}: could not resolve ${[...new Set(specs)].join(', ')}`,
      subject: file,
    });
  }

  const bins = topLevelBins(graph);
  const manifestText = readRepoFile(root, config.ecosystems.npm.manifest) ?? '';
  const scripts = parseScripts(manifestText);
  const scriptPackages = new Map<string, Set<string>>();
  for (const name of scripts.keys()) {
    const { bins: used } = expandScript(scripts, name);
    scriptPackages.set(
      name,
      new Set([...used].map((b) => bins.get(b)).filter((p): p is string => !!p)),
    );
  }
  for (const entry of scripts.values()) {
    for (const bin of entry.summary.bins) {
      const pkg = bins.get(bin);
      if (pkg && interest.has(pkg)) {
        record({
          file: config.ecosystems.npm.manifest,
          line: entry.line,
          column: null,
          relationship: 'BUILD_SCRIPT',
          confidence: 'CONFIRMED',
          specifier: `scripts.${entry.name}`,
          referencedPackage: pkg,
          detector: 'package-json',
          evidence: `scripts.${entry.name} "${entry.command}" runs the "${bin}" binary of ${pkg}`,
        });
      }
    }
  }

  for (const file of files) {
    const fileClass = classes.get(file) ?? 'other';
    if (fileClass === 'documentation') continue;
    const ext = extensionOf(file);
    if (
      (JSON_CONFIG.test(file) && ext === '.json') ||
      /(^|\/)\.(eslintrc|babelrc|swcrc)$/.test(file)
    ) {
      const text = readRepoFile(root, file);
      if (text === null || file.endsWith('package-lock.json')) continue;
      for (const match of matchTokens(jsonTokens(file, text), interest)) {
        record({
          file,
          line: match.line,
          column: null,
          relationship: 'CONFIGURATION',
          confidence: match.confidence,
          specifier: match.value,
          referencedPackage: match.name,
          detector: 'config',
          evidence: `${match.rule}: "${match.value}"`,
        });
      }
      continue;
    }
    if (fileClass === 'ci' && (ext === '.yml' || ext === '.yaml')) {
      const text = readRepoFile(root, file) ?? '';
      for (const command of parseWorkflowCommands(text)) {
        const reached = new Map<string, string>();
        for (const bin of command.summary.bins) {
          const pkg = bins.get(bin);
          if (pkg) reached.set(pkg, `runs the "${bin}" binary`);
        }
        for (const run of command.summary.npmRuns) {
          const { bins: used, chain } = expandScript(scripts, run);
          for (const bin of used) {
            const pkg = bins.get(bin);
            if (pkg && !reached.has(pkg))
              reached.set(pkg, `npm script chain ${chain.join(' -> ')} runs the "${bin}" binary`);
          }
        }
        for (const [pkg, how] of reached) {
          if (!interest.has(pkg)) continue;
          record({
            file,
            line: command.line,
            column: null,
            relationship: 'CI_WORKFLOW',
            confidence: 'CONFIRMED',
            specifier: command.command,
            referencedPackage: pkg,
            detector: 'workflow',
            evidence: `job ${command.job}: "${command.command}" ${how} of ${pkg}`,
          });
        }
      }
      continue;
    }
    if (!CODE_EXTENSIONS.has(ext) && isTextCandidate(file)) {
      const text = readRepoFile(root, file);
      if (text === null) continue;
      for (const hit of textReferences(text, [...interest])) {
        record({
          file,
          line: hit.line,
          column: hit.column,
          relationship: 'TEXT_REFERENCE',
          confidence: 'INFERRED',
          specifier: hit.name,
          referencedPackage: hit.name,
          detector: 'text-search',
          evidence: hit.snippet,
        });
      }
    }
  }

  const skippedCode = walk.skipped.filter((s) => CODE_EXTENSIONS.has(extensionOf(s.file)));
  const riskyDynamic = dynamicImports.filter((d) =>
    ['production', 'configuration', 'tooling'].includes(d.fileClass),
  );
  const buildScripts = new Set(
    config.validation.commands
      .filter(
        (c) =>
          c.category === 'build' &&
          c.run[0] === 'npm' &&
          (c.run[1] === 'run' || c.run[1] === 'run-script'),
      )
      .map((c) => c.run[2]),
  );
  buildScripts.add('build');

  const packages: PackageUsage[] = vulnerable.map((pkg) => {
    const refs = dedupe(references.get(pkg) ?? []);
    const own = refs.filter((r) => r.referencedPackage === pkg);
    const pkgLimitations: Limitation[] = [];
    let status: PackageUsage['status'];
    if (own.some((r) => CODE_RELATIONSHIPS.has(r.relationship))) {
      status = 'USED_DIRECTLY';
    } else if (refs.some((r) => CODE_RELATIONSHIPS.has(r.relationship))) {
      status = 'USED_TRANSITIVELY';
      const through = [...new Set(refs.map((r) => r.referencedPackage))].join(', ');
      pkgLimitations.push({
        code: 'TRANSITIVE_REACHABILITY_UNKNOWN',
        message:
          `${pkg} is reached through ${through}; ` +
          'whether its vulnerable code runs cannot be determined statically',
      });
    } else if (refs.length > 0) {
      status = 'TOOLING_ONLY';
    } else {
      status = 'UNKNOWN';
      const dependents =
        (namesFor.get(pkg) ?? []).filter((n) => n !== pkg).join(', ') || 'its dependents';
      pkgLimitations.push({
        code: 'USAGE_NOT_FOUND',
        message:
          `No reference to ${pkg} or ${dependents} was found; usage cannot be ruled out ` +
          '(runtime loading, framework conventions, generated code)',
      });
    }
    const packageBins = Object.keys(
      [...graph.packages.values()].find(
        (p) => p.name === pkg && p.location === `node_modules/${pkg}`,
      )?.bin ?? {},
    );
    const buildTools = (namesFor.get(pkg) ?? []).filter((name) =>
      [...buildScripts].some((script) => scriptPackages.get(script)?.has(name)),
    );
    if (buildTools.length > 0) {
      pkgLimitations.push({
        code: 'BUILD_TOOL_SCOPE',
        message:
          `${buildTools.join(', ')} runs in the build; ` +
          'the files it processes cannot be listed statically',
      });
    }
    let completeness: PackageUsage['completeness'] = 'COMPLETE';
    if (status === 'UNKNOWN') {
      completeness = 'UNKNOWN';
    } else if (parseErrors.length > 0 || riskyDynamic.length > 0 || skippedCode.length > 0) {
      completeness = 'PARTIAL';
      pkgLimitations.push({
        code: 'ANALYSIS_PARTIAL',
        message:
          `${parseErrors.length} file(s) with syntax errors, ` +
          `${riskyDynamic.length} unresolved dynamic import(s), ` +
          `${skippedCode.length} skipped code file(s)`,
      });
    }
    return {
      package: pkg,
      status,
      completeness,
      viaDirectDependencies: (namesFor.get(pkg) ?? []).filter((n) => n !== pkg),
      binaries: packageBins.sort(),
      references: refs,
      limitations: pkgLimitations,
    };
  });

  const report: DependencyUsageReport = {
    ...makeHeader(input.ctx, 'dependency-usage-report', limitations),
    scannedFiles: files.length,
    skippedFiles: walk.skipped,
    parseErrors,
    dynamicImports,
    packages,
  };
  return { report, files, classes, modules, importGraph, scripts, scriptPackages };
}

function dedupe(refs: UsageReference[]): UsageReference[] {
  const seen = new Set<string>();
  const out: UsageReference[] = [];
  for (const ref of refs) {
    const { file, line, relationship, referencedPackage, specifier } = ref;
    const key = `${file}|${line}|${relationship}|${referencedPackage}|${specifier}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(ref);
    }
  }
  return out.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.referencedPackage.localeCompare(b.referencedPackage),
  );
}
