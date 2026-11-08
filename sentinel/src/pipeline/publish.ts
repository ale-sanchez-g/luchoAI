import fs from 'node:fs';
import path from 'node:path';
import type {
  DependencyUsageReport,
  ImpactReport,
  PrActionResult,
  PrManagementReport,
  RemediationReport,
  VulnerabilityReport,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { outputTail, runCommand } from '../core/exec';
import { sha256 } from '../core/hash';
import type { RunContext } from '../core/report-io';
import { makeHeader, readReport } from '../core/report-io';
import type { GitHubApi } from '../github/client';
import { seg } from '../github/client';
import { renderPullRequestBody } from '../github/markdown';
import { checkPatch, ensureLabels, findOpenPullRequest } from '../github/pr-manager';
import { parseLockfile } from '../graph/lockfile';
import { diffManifests } from '../remediation/diffs';
import { checkLockfile } from '../remediation/integrity';
import { planRemediation } from '../remediation/planner';

/** Raised when a plan artifact fails verification; nothing has been pushed when it is thrown. */
export class PublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishError';
  }
}

export interface PublishInput {
  ctx: RunContext;
  config: SentinelConfig;
  api: GitHubApi;
  slug: string;
  /** Trusted checkout of the default branch with push credentials. */
  repoDir: string;
  baseBranch: string;
  /** Downloaded plan artifact: the four plan reports and remediation.patch. */
  planDir: string;
  env: NodeJS.ProcessEnv;
  /** Workflow file to dispatch when PR events will not fire (GITHUB_TOKEN pushes). */
  dispatchWorkflow: string | null;
  gitUser: { name: string; email: string };
}

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info'] as const;

async function git(args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<string> {
  const result = await runCommand(['git', ...args], { cwd, env, timeoutMs: 5 * 60 * 1000 });
  if (result.exitCode !== 0) {
    throw new PublishError(`git ${args[0]} failed: ${outputTail(result, 600)}`);
  }
  return result.stdout.trim();
}

/**
 * Publishes the weekly remediation: verifies the plan artifact, commits the patch on the Sentinel
 * branch, pushes only when its content changed, then creates or updates the pull request.
 * It never force-pushes over commits that Sentinel did not make.
 */
export async function publishRemediation(input: PublishInput): Promise<PrManagementReport> {
  const { config, repoDir, planDir, env, api, slug } = input;
  const actions: PrActionResult[] = [];
  const result = (
    number: number | null,
    url: string | null,
    created: boolean,
    headSha: string | null,
  ): PrManagementReport => ({
    ...makeHeader(input.ctx, 'pr-management-report'),
    pullRequest: { number, url, created, headSha },
    decision: null,
    finalOutcome: null,
    actions,
  });

  const vulnerabilities = readReport<VulnerabilityReport>(
    path.join(planDir, 'vulnerability-report.json'),
    'vulnerability-report',
  );
  const usage = readReport<DependencyUsageReport>(
    path.join(planDir, 'dependency-usage-report.json'),
    'dependency-usage-report',
  );
  const impact = readReport<ImpactReport>(
    path.join(planDir, 'impact-report.json'),
    'impact-report',
  );
  const remediation = readReport<RemediationReport>(
    path.join(planDir, 'remediation-report.json'),
    'remediation-report',
  );
  const patchFile = path.join(planDir, 'remediation.patch');
  if (!remediation.patch.sha256 || !fs.existsSync(patchFile)) {
    actions.push({
      action: 'publish',
      status: 'SKIPPED',
      detail: 'the plan contains no dependency changes',
    });
    return result(null, null, false, null);
  }
  const patch = fs.readFileSync(patchFile, 'utf8');
  if (sha256(patch) !== remediation.patch.sha256) {
    throw new PublishError(
      'remediation.patch does not match the sha256 recorded in the remediation report',
    );
  }
  const check = checkPatch(patch, config.governance.allowedChangedFiles);
  if (check.problems.length > 0) {
    throw new PublishError(
      `the patch is not a pure dependency change: ${check.problems.join('; ')}`,
    );
  }

  const baseSha = await git(['rev-parse', 'HEAD'], repoDir, env);
  const manifestPath = config.ecosystems.npm.manifest;
  const baseManifest = JSON.parse(
    await git(['show', `HEAD:${manifestPath}`], repoDir, env),
  ) as Record<string, unknown>;
  const branch = config.remediation.branch;
  await git(['checkout', '-B', branch], repoDir, env);
  await git(['apply', '--check', patchFile], repoDir, env);
  await git(['apply', patchFile], repoDir, env);

  const lock = parseLockfile(
    fs.readFileSync(path.join(repoDir, config.ecosystems.npm.lockfile), 'utf8'),
  );
  const integrity = checkLockfile(lock, config.ecosystems.npm.allowedRegistries);
  if (integrity.registry.violations.length > 0 || integrity.missingIntegrity.length > 0) {
    throw new PublishError(
      'patched lockfile failed integrity checks: ' +
        `${integrity.registry.violations.length} registry violations, ` +
        `${integrity.missingIntegrity.length} entries without integrity`,
    );
  }
  const plan = planRemediation(vulnerabilities, baseManifest);
  const patchedManifest = JSON.parse(
    fs.readFileSync(path.join(repoDir, manifestPath), 'utf8'),
  ) as Record<string, unknown>;
  const disallowed = diffManifests(baseManifest, patchedManifest, plan.targetedPackages).filter(
    (m) => !m.allowed,
  );
  if (disallowed.length > 0) {
    throw new PublishError(
      'the patch changes package.json beyond targeted versions: ' +
        disallowed.map((d) => `${d.field}.${d.package}`).join(', '),
    );
  }

  const resolved = vulnerabilities.vulnerabilities.filter((v) =>
    remediation.verification.targeted.includes(v.key),
  );
  const advisoryLines = resolved
    .map((v) => `- ${v.ids.ghsa ?? v.key} (${v.severity}, ${v.package})`)
    .slice(0, 50);
  const message = [
    config.remediation.commitMessage,
    '',
    `Remediates ${resolved.length} advisories:`,
    ...advisoryLines,
    '',
    `Sentinel-Patch: ${remediation.patch.sha256}`,
    `Sentinel-Base: ${baseSha}`,
    `Sentinel-Execution: ${remediation.executionId}`,
  ].join('\n');
  await git(['add', '--', ...check.files], repoDir, env);
  await git(
    [
      '-c',
      `user.name=${input.gitUser.name}`,
      '-c',
      `user.email=${input.gitUser.email}`,
      'commit',
      '-q',
      '-m',
      message,
    ],
    repoDir,
    env,
  );
  const headSha = await git(['rev-parse', 'HEAD'], repoDir, env);

  const remote =
    (await git(['ls-remote', '--heads', 'origin', branch], repoDir, env)).split(/\s+/)[0] || '';
  let pushed = false;
  if (remote) {
    await git(['fetch', '-q', '--depth=1', 'origin', branch], repoDir, env);
    const remoteMessage = await git(['log', '-1', '--format=%B', 'FETCH_HEAD'], repoDir, env);
    if (!remoteMessage.includes('Sentinel-Patch:')) {
      actions.push({
        action: 'push',
        status: 'SKIPPED',
        detail: `${branch} has commits not made by Sentinel; leaving it for people to resolve`,
      });
      return result(null, null, false, remote);
    }
    if (
      remoteMessage.includes(`Sentinel-Patch: ${remediation.patch.sha256}`) &&
      remoteMessage.includes(`Sentinel-Base: ${baseSha}`)
    ) {
      actions.push({
        action: 'push',
        status: 'SKIPPED',
        detail: 'branch already contains this remediation on the current base',
      });
    }
  }
  if (!actions.some((a) => a.action === 'push')) {
    await git(
      [
        'push',
        '-q',
        `--force-with-lease=refs/heads/${branch}:${remote}`,
        'origin',
        `HEAD:refs/heads/${branch}`,
      ],
      repoDir,
      env,
    );
    pushed = true;
    actions.push({
      action: 'push',
      status: 'DONE',
      detail: `pushed ${headSha.slice(0, 12)} to ${branch}`,
    });
  }

  const counts = SEVERITY_ORDER.map(
    (s) => [s, resolved.filter((v) => v.severity === s).length] as const,
  )
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`)
    .join(', ');
  const title = `${config.remediation.commitMessage} (${counts || 'no in-scope advisories'})`;
  const body = renderPullRequestBody(
    vulnerabilities,
    usage,
    impact,
    remediation,
    config.reporting.commentMaxChars,
  );
  const base = `/repos/${seg(slug.split('/')[0])}/${seg(slug.split('/')[1])}`;
  const existing = await findOpenPullRequest(api, slug, branch);
  let number: number;
  let url: string;
  let created = false;
  if (existing) {
    await api.request('PATCH', `${base}/pulls/${existing.number}`, { title, body });
    number = existing.number;
    url = existing.html_url;
    actions.push({ action: 'update-pull-request', status: 'DONE', detail: `updated #${number}` });
  } else {
    const { data } = await api.request<{ number: number; html_url: string }>(
      'POST',
      `${base}/pulls`,
      {
        title,
        head: branch,
        base: input.baseBranch,
        body,
        maintainer_can_modify: false,
      },
    );
    number = data.number;
    url = data.html_url;
    created = true;
    actions.push({ action: 'create-pull-request', status: 'DONE', detail: `created #${number}` });
  }
  await ensureLabels(api, slug, config, [config.labels.dependencyUpdate]);
  await api.request('POST', `${base}/issues/${number}/labels`, {
    labels: [config.labels.dependencyUpdate],
  });
  actions.push({ action: 'labels', status: 'DONE', detail: config.labels.dependencyUpdate });

  if (input.dispatchWorkflow && (pushed || created)) {
    await api.request(
      'POST',
      `${base}/actions/workflows/${seg(input.dispatchWorkflow)}/dispatches`,
      {
        ref: branch,
        inputs: { pr: String(number) },
      },
    );
    actions.push({
      action: 'dispatch-validation',
      status: 'DONE',
      detail: `dispatched ${input.dispatchWorkflow} for #${number}`,
    });
  }
  return result(number, url, created, headSha);
}
