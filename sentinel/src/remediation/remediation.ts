import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import type {
  AuditSnapshot,
  Limitation,
  PackageChange,
  RemediationAction,
  RemediationReport,
  RiskSignal,
  Severity,
  VulnerabilityReport,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { outputTail, runCommand } from '../core/exec';
import { sha256 } from '../core/hash';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';
import type { DependencyGraph } from '../graph/lockfile';
import { parseLockfile } from '../graph/lockfile';
import type { ParsedAudit } from '../vulnerabilities/npm-audit';
import { advisoryKeys, parseNpmAudit } from '../vulnerabilities/npm-audit';
import { inVulnerableRange } from '../vulnerabilities/semver-utils';
import { diffLockfiles, diffManifests } from './diffs';
import { checkLockfile } from './integrity';
import type { RemediationPlan } from './planner';
import { planRemediation } from './planner';

const EMPTY_SEVERITY: Record<Severity, number> = {
  critical: 0,
  high: 0,
  moderate: 0,
  low: 0,
  info: 0,
};

/** Audit snapshot of the vulnerability report (the state before remediation). */
export function snapshotFromReport(report: VulnerabilityReport): AuditSnapshot {
  const audit = report.sources.find((s) => s.source === 'npm-audit');
  const bySeverity = { ...EMPTY_SEVERITY };
  const severities: Record<string, Severity> = {};
  for (const v of report.vulnerabilities) {
    bySeverity[v.severity] += 1;
    severities[v.key] = v.severity;
  }
  return {
    status: audit?.status === 'OK' ? 'OK' : audit?.status === 'ERROR' ? 'ERROR' : 'UNAVAILABLE',
    advisoryKeys: report.vulnerabilities.map((v) => v.key).sort(),
    bySeverity,
    severities,
  };
}

/** Audit snapshot of a parsed npm audit (null = unavailable). */
export function snapshotFromAudit(
  audit: ParsedAudit | null,
  error: string | null = null,
): AuditSnapshot {
  if (!audit) {
    return {
      status: error ? 'ERROR' : 'UNAVAILABLE',
      advisoryKeys: [],
      bySeverity: { ...EMPTY_SEVERITY },
      severities: {},
    };
  }
  const bySeverity = { ...EMPTY_SEVERITY };
  const severities: Record<string, Severity> = {};
  for (const a of audit.advisories) {
    const key = `${a.ghsa ?? `npm-${a.sourceId}`}|${a.package}`;
    if (!(key in severities)) {
      severities[key] = a.severity;
      bySeverity[a.severity] += 1;
    }
  }
  return { status: 'OK', advisoryKeys: advisoryKeys(audit), bySeverity, severities };
}

/**
 * Checks each targeted advisory against the resulting dependency graph: it is resolved when no
 * installed copy of the package is still in the vulnerable range, other than copies that were
 * escalated (expected to remain).
 */
export function verifyTargets(
  report: VulnerabilityReport,
  plan: RemediationPlan,
  after: DependencyGraph,
): { resolved: string[]; remaining: string[] } {
  const resolved: string[] = [];
  const remaining: string[] = [];
  for (const v of report.vulnerabilities.filter((x) => plan.targetedKeys.has(x.key))) {
    const expected = new Set(
      plan.escalations.filter((e) => e.vulnerabilityKey === v.key).map((e) => e.location),
    );
    const stillVulnerable = [...after.packages.values()].filter(
      (p) =>
        p.name === v.package &&
        p.location !== '' &&
        inVulnerableRange(p.version, v.vulnerableRange) &&
        !expected.has(p.location),
    );
    (stillVulnerable.length === 0 ? resolved : remaining).push(v.key);
  }
  return { resolved: resolved.sort(), remaining: remaining.sort() };
}

/** Compatibility signals visible in the lockfile diff itself. */
export function lockfileSignals(
  changes: readonly PackageChange[],
  before: DependencyGraph,
  after: DependencyGraph,
  nodeMajor: string,
): RiskSignal[] {
  const signals: RiskSignal[] = [];
  for (const c of changes) {
    if (c.changeType === 'removed') continue;
    if (c.upgradeType === 'major' || c.upgradeType === 'downgrade') {
      signals.push({
        code: 'MAJOR_UPGRADE',
        package: c.name,
        detail: `${c.location}: ${c.from} -> ${c.to} (${c.upgradeType})`,
      });
    }
    const hadScript = before.packages.get(c.location)?.hasInstallScript === true;
    if (c.hasInstallScript && !hadScript) {
      signals.push({
        code: 'INSTALL_SCRIPT',
        package: c.name,
        detail:
          `${c.location}@${c.to} ` +
          `${c.changeType === 'added' ? 'is a new package with' : 'now has'} an install script`,
      });
    }
    if (
      c.changeType === 'updated' &&
      c.license &&
      c.previousLicense &&
      c.license !== c.previousLicense
    ) {
      signals.push({
        code: 'LICENSE_CHANGED',
        package: c.name,
        detail: `${c.location}: ${c.previousLicense} -> ${c.license}`,
      });
    }
    const engines = after.packages.get(c.location)?.engines.node;
    if (!engines) continue;
    try {
      if (!semver.intersects(engines, `${nodeMajor}.x`, { loose: true })) {
        signals.push({
          code: 'ENGINES_INCOMPATIBLE',
          package: c.name,
          detail: `${c.location}@${c.to} requires node ${engines}; CI runs node ${nodeMajor}`,
        });
      }
    } catch {
      signals.push({
        code: 'ENGINES_CHANGED',
        package: c.name,
        detail: `${c.location}@${c.to} has an unparseable engines.node "${engines}"`,
      });
    }
  }
  return signals;
}

interface Snapshot {
  manifestText: string;
  lockText: string;
}

function readSnapshot(root: string, config: SentinelConfig): Snapshot {
  return {
    manifestText: fs.readFileSync(path.join(root, config.ecosystems.npm.manifest), 'utf8'),
    lockText: fs.readFileSync(path.join(root, config.ecosystems.npm.lockfile), 'utf8'),
  };
}

export interface ApplyInput {
  root: string;
  ctx: RunContext;
  config: SentinelConfig;
  vulnerabilities: VulnerabilityReport;
  env: NodeJS.ProcessEnv;
  /** Command prefix that replaces `npm` (tests point it at a stub). */
  npm?: string[];
  patchFile: string;
}

function npmEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    npm_config_ignore_scripts: 'true',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
  };
}

/**
 * Weekly remediation: applies the plan with npm (lockfile only, no install scripts), then
 * records what changed, verifies each targeted advisory against the new graph, re-audits for
 * introduced advisories, checks lockfile integrity and writes the patch.
 */
export async function applyRemediation(
  input: ApplyInput,
): Promise<{ report: RemediationReport; changed: boolean }> {
  const { root, config } = input;
  const npm = input.npm ?? ['npm'];
  const env = npmEnv(input.env);
  const limitations: Limitation[] = [];
  const before = readSnapshot(root, config);
  const beforeGraph = parseLockfile(before.lockText);
  const manifestBefore = JSON.parse(before.manifestText) as Record<string, unknown>;
  const plan = planRemediation(input.vulnerabilities, manifestBefore);

  const actions: RemediationAction[] = [];
  for (const action of plan.actions) {
    const argv = [...npm, ...action.argv.slice(1)];
    const result = await runCommand(argv, { cwd: root, env, timeoutMs: 10 * 60 * 1000 });
    actions.push({
      id: action.id,
      kind: action.kind,
      package: action.package,
      spec: action.spec,
      argv: action.argv,
      targets: action.targets,
      status: result.exitCode === 0 ? 'APPLIED' : 'FAILED',
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      detail: result.exitCode === 0 ? 'ok' : outputTail(result, 1500),
    });
  }

  const after = readSnapshot(root, config);
  const afterGraph = parseLockfile(after.lockText);
  const changed = after.lockText !== before.lockText || after.manifestText !== before.manifestText;

  let afterAudit: ParsedAudit | null = null;
  let auditError: string | null = null;
  const audit = await runCommand([...npm, 'audit', '--json', '--package-lock-only'], {
    cwd: root,
    env,
    timeoutMs: 5 * 60 * 1000,
  });
  try {
    afterAudit = parseNpmAudit(audit.stdout);
  } catch (error) {
    auditError = (error as Error).message;
    limitations.push({
      code: 'POST_AUDIT_UNAVAILABLE',
      message: `post-remediation npm audit failed: ${auditError}`,
    });
  }

  const ls = await runCommand([...npm, 'ls', '--all', '--package-lock-only', '--json'], {
    cwd: root,
    env,
    timeoutMs: 5 * 60 * 1000,
  });
  const lockfileConsistent = ls.exitCode === 0 ? 'PASS' : ls.exitCode === null ? 'UNKNOWN' : 'FAIL';

  let patch: RemediationReport['patch'] = { file: null, sha256: null };
  let changedFiles: string[] = [];
  if (changed) {
    const files = [config.ecosystems.npm.manifest, config.ecosystems.npm.lockfile];
    const diff = await runCommand(['git', 'diff', '--no-color', '--', ...files], {
      cwd: root,
      env: input.env,
    });
    const names = await runCommand(['git', 'diff', '--name-only', '--', ...files], {
      cwd: root,
      env: input.env,
    });
    if (diff.exitCode === 0 && diff.stdout) {
      fs.mkdirSync(path.dirname(input.patchFile), { recursive: true });
      fs.writeFileSync(input.patchFile, diff.stdout);
      patch = { file: path.basename(input.patchFile), sha256: sha256(diff.stdout) };
      changedFiles = names.stdout.split('\n').filter(Boolean).sort();
    } else {
      limitations.push({
        code: 'PATCH_UNAVAILABLE',
        message: `git diff failed: ${outputTail(diff, 300)}`,
      });
    }
  }

  const report = buildReport({
    ctx: input.ctx,
    config,
    mode: 'apply',
    vulnerabilities: input.vulnerabilities,
    plan,
    beforeGraph,
    afterGraph,
    manifestBefore,
    manifestAfter: JSON.parse(after.manifestText) as Record<string, unknown>,
    afterAudit: snapshotFromAudit(afterAudit, auditError),
    lockfileConsistent,
    lockfileDetail:
      ls.exitCode === 0 ? 'npm ls --package-lock-only reports no problems' : outputTail(ls, 800),
    actions,
    changedFiles,
    patch,
    baseSha: input.ctx.repository.commitSha,
    headSha: null,
    limitations,
  });
  return { report, changed };
}

export interface VerifyInput {
  ctx: RunContext;
  config: SentinelConfig;
  vulnerabilities: VulnerabilityReport;
  baseLockText: string;
  headLockText: string;
  baseManifestText: string;
  headManifestText: string;
  headAudit: ParsedAudit | null;
  headAuditError: string | null;
  lockfileConsistent: 'PASS' | 'FAIL' | 'UNKNOWN';
  lockfileDetail: string;
  changedFiles: string[];
  baseSha: string | null;
  headSha: string | null;
}

/**
 * Pull-request verification: no npm command is run. The base vulnerability report is re-planned,
 * and the PR's lockfile is compared with the base, attributed and verified exactly as in apply
 * mode, so results from the weekly run are never reused for a newer commit.
 */
export function verifyRemediation(input: VerifyInput): RemediationReport {
  const beforeGraph = parseLockfile(input.baseLockText);
  const manifestBefore = JSON.parse(input.baseManifestText) as Record<string, unknown>;
  const plan = planRemediation(input.vulnerabilities, manifestBefore);
  return buildReport({
    ctx: input.ctx,
    config: input.config,
    mode: 'verify',
    vulnerabilities: input.vulnerabilities,
    plan,
    beforeGraph,
    afterGraph: parseLockfile(input.headLockText),
    manifestBefore,
    manifestAfter: JSON.parse(input.headManifestText) as Record<string, unknown>,
    afterAudit: snapshotFromAudit(input.headAudit, input.headAuditError),
    lockfileConsistent: input.lockfileConsistent,
    lockfileDetail: input.lockfileDetail,
    actions: [],
    changedFiles: input.changedFiles,
    patch: { file: null, sha256: null },
    baseSha: input.baseSha,
    headSha: input.headSha,
    limitations: input.headAudit
      ? []
      : [
          {
            code: 'POST_AUDIT_UNAVAILABLE',
            message: input.headAuditError ?? 'no audit of the PR head',
          },
        ],
  });
}

interface BuildInput {
  ctx: RunContext;
  config: SentinelConfig;
  mode: 'apply' | 'verify';
  vulnerabilities: VulnerabilityReport;
  plan: RemediationPlan;
  beforeGraph: DependencyGraph;
  afterGraph: DependencyGraph;
  manifestBefore: Record<string, unknown>;
  manifestAfter: Record<string, unknown>;
  afterAudit: AuditSnapshot;
  lockfileConsistent: 'PASS' | 'FAIL' | 'UNKNOWN';
  lockfileDetail: string;
  actions: RemediationAction[];
  changedFiles: string[];
  patch: RemediationReport['patch'];
  baseSha: string | null;
  headSha: string | null;
  limitations: Limitation[];
}

function buildReport(input: BuildInput): RemediationReport {
  const keysByPackage = new Map<string, string[]>();
  for (const v of input.vulnerabilities.vulnerabilities) {
    if (input.plan.targetedKeys.has(v.key))
      keysByPackage.set(v.package, [...(keysByPackage.get(v.package) ?? []), v.key]);
  }
  for (const action of input.plan.actions.filter((a) => a.kind === 'npm-install')) {
    keysByPackage.set(action.package, [
      ...new Set([...(keysByPackage.get(action.package) ?? []), ...action.targets]),
    ]);
  }
  const changes = diffLockfiles(
    input.beforeGraph,
    input.afterGraph,
    input.plan.targetedPackages,
    keysByPackage,
  );
  const manifestChanges = diffManifests(
    input.manifestBefore,
    input.manifestAfter,
    input.plan.targetedPackages,
  );
  const before = snapshotFromReport(input.vulnerabilities);
  const { resolved, remaining } = verifyTargets(
    input.vulnerabilities,
    input.plan,
    input.afterGraph,
  );
  const introduced =
    input.afterAudit.status === 'OK'
      ? input.afterAudit.advisoryKeys.filter((k) => !before.advisoryKeys.includes(k))
      : [];
  const lockChecks = checkLockfile(input.afterGraph, input.config.ecosystems.npm.allowedRegistries);
  return {
    ...makeHeader(input.ctx, 'remediation-report', input.limitations),
    mode: input.mode,
    baseSha: input.baseSha,
    headSha: input.headSha,
    actions: input.actions,
    escalations: input.plan.escalations,
    changes,
    manifestChanges,
    changedFiles: input.changedFiles,
    verification: {
      before,
      after: input.afterAudit,
      targeted: [...input.plan.targetedKeys].sort(),
      resolved,
      remaining,
      introduced,
    },
    integrity: {
      lockfileConsistent: input.lockfileConsistent,
      lockfileDetail: input.lockfileDetail.slice(0, 2000),
      registry: lockChecks.registry,
      missingIntegrity: lockChecks.missingIntegrity,
      signatures: {
        status: 'NOT_RUN',
        invalid: [],
        missing: [],
        detail: 'verified during validation, after installation',
      },
    },
    compatibility: lockfileSignals(
      changes,
      input.beforeGraph,
      input.afterGraph,
      input.config.runtime.node,
    ),
    patch: input.patch,
  };
}
