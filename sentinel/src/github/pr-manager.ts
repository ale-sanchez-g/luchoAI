import type {
  CoverageReport,
  MergeDecision,
  Outcome,
  PrActionResult,
  PrManagementReport,
  RemediationReport,
  ValidationReport,
} from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { matchesAny } from '../core/glob';
import type { RunContext } from '../core/report-io';
import { makeHeader } from '../core/report-io';
import type { GitHubApi } from './client';
import { paginate, seg } from './client';
import { DECISION_MARKER, renderDecisionComment } from './markdown';

const LABEL_COLOURS: Record<string, string> = {
  dependencyUpdate: '0366d6',
  coverageComplete: '0e8a16',
  coverageIncomplete: 'fbca04',
  manualReview: 'd93f0b',
  validationFailed: 'b60205',
};

interface PullRequest {
  number: number;
  state: string;
  html_url: string;
  node_id: string;
  head: { sha: string; ref: string };
  base: { ref: string };
  user: { login: string };
  auto_merge: unknown | null;
}

function repoPath(slug: string): string {
  const [owner, repo] = slug.split('/');
  return `/repos/${seg(owner)}/${seg(repo)}`;
}

class ActionLog {
  readonly actions: PrActionResult[] = [];

  async run(action: string, fn: () => Promise<string>): Promise<boolean> {
    try {
      this.actions.push({ action, status: 'DONE', detail: await fn() });
      return true;
    } catch (error) {
      this.actions.push({
        action,
        status: 'FAILED',
        detail: (error as Error).message.slice(0, 500),
      });
      return false;
    }
  }

  skip(action: string, detail: string): void {
    this.actions.push({ action, status: 'SKIPPED', detail });
  }
}

/** Creates any of Sentinel's labels that do not exist yet. */
export async function ensureLabels(
  api: GitHubApi,
  slug: string,
  config: SentinelConfig,
  names: readonly string[],
): Promise<void> {
  const base = repoPath(slug);
  for (const name of names) {
    try {
      await api.request('GET', `${base}/labels/${seg(name)}`);
    } catch {
      const key = (Object.keys(config.labels) as (keyof SentinelConfig['labels'])[]).find(
        (k) => config.labels[k] === name,
      );
      await api.request('POST', `${base}/labels`, {
        name,
        color: key ? LABEL_COLOURS[key] : 'ededed',
        description: 'Managed by Project Sentinel',
      });
    }
  }
}

/** Sets Sentinel's labels on the PR to exactly `desired`, leaving every other label alone. */
export async function syncLabels(
  api: GitHubApi,
  slug: string,
  pr: number,
  config: SentinelConfig,
  desired: readonly string[],
): Promise<string> {
  const base = repoPath(slug);
  const managed = new Set(Object.values(config.labels));
  const current = (
    await api.request<{ name: string }[]>('GET', `${base}/issues/${pr}/labels`)
  ).data.map((l) => l.name);
  const remove = current.filter((l) => managed.has(l) && !desired.includes(l));
  const add = desired.filter((l) => !current.includes(l));
  for (const name of remove) {
    await api.request('DELETE', `${base}/issues/${pr}/labels/${seg(name)}`);
  }
  if (add.length > 0) {
    await ensureLabels(api, slug, config, add);
    await api.request('POST', `${base}/issues/${pr}/labels`, { labels: add });
  }
  const removed = remove.length > 0 ? `; removed ${remove.join(', ')}` : '';
  return `labels now include ${desired.join(', ')}${removed}`;
}

/** Creates or updates the single Sentinel comment identified by its hidden marker. */
export async function upsertComment(
  api: GitHubApi,
  slug: string,
  pr: number,
  body: string,
  marker: string,
): Promise<string> {
  const base = repoPath(slug);
  const comments = await paginate<{ id: number; body?: string; user?: { type?: string } }>(
    api,
    `${base}/issues/${pr}/comments`,
  );
  const existing = comments.find((c) => c.user?.type === 'Bot' && (c.body ?? '').includes(marker));
  if (existing) {
    await api.request('PATCH', `${base}/issues/comments/${existing.id}`, { body });
    return `updated comment ${existing.id}`;
  }
  const { data } = await api.request<{ id: number }>('POST', `${base}/issues/${pr}/comments`, {
    body,
  });
  return `created comment ${data.id}`;
}

const ENABLE = `mutation($id: ID!, $method: PullRequestMergeMethod!, $head: GitObjectID!) {
  enablePullRequestAutoMerge(
    input: {pullRequestId: $id, mergeMethod: $method, expectedHeadOid: $head}
  ) {
    pullRequest { number }
  }
}`;
const DISABLE = `mutation($id: ID!) {
  disablePullRequestAutoMerge(input: {pullRequestId: $id}) { pullRequest { number } }
}`;

export interface ApplyDecisionInput {
  api: GitHubApi;
  slug: string;
  prNumber: number;
  ctx: RunContext;
  config: SentinelConfig;
  decision: MergeDecision;
  coverage: CoverageReport | null;
  validation: ValidationReport | null;
  remediation: RemediationReport;
  runUrl: string | null;
}

/**
 * Acts on a merge decision. Order matters: a stale evaluation does nothing; for any outcome other
 * than AUTO_MERGE auto-merge is switched off first (if that fails the outcome becomes BLOCKED so
 * the required check fails); auto-merge is only ever enabled for the exact commit evaluated.
 */
export async function applyDecision(input: ApplyDecisionInput): Promise<PrManagementReport> {
  const { api, slug, prNumber, config, decision } = input;
  const base = repoPath(slug);
  const log = new ActionLog();
  const pr = (await api.request<PullRequest>('GET', `${base}/pulls/${prNumber}`)).data;
  let finalOutcome: Outcome = decision.decision;
  const report = (outcome: Outcome | null): PrManagementReport => ({
    ...makeHeader(input.ctx, 'pr-management-report'),
    pullRequest: {
      number: pr.number,
      url: pr.html_url,
      created: false,
      headSha: decision.pullRequest.headSha,
    },
    decision: decision.decision,
    finalOutcome: outcome,
    actions: log.actions,
  });

  if (pr.state !== 'open') {
    log.skip('all', `pull request is ${pr.state}`);
    return report(decision.decision);
  }
  if (pr.head.sha !== decision.pullRequest.headSha) {
    log.skip(
      'all',
      `pull request head is now ${pr.head.sha.slice(0, 12)}; ` +
        'this evaluation is stale and changes nothing',
    );
    return report('BLOCKED');
  }

  if (decision.decision !== 'AUTO_MERGE' && pr.auto_merge) {
    const disabled = await log.run('disable-auto-merge', async () => {
      await api.graphql(DISABLE, { id: pr.node_id });
      return 'auto-merge disabled';
    });
    if (!disabled) finalOutcome = 'BLOCKED';
  }
  if (decision.decision === 'AUTO_MERGE') {
    const method = config.governance.autoMerge.mergeMethod.toUpperCase();
    const enabled = await log.run('enable-auto-merge', async () => {
      await api.graphql(ENABLE, { id: pr.node_id, method, head: decision.pullRequest.headSha });
      return `auto-merge (${method}) enabled for ${decision.pullRequest.headSha?.slice(0, 12)}`;
    });
    if (!enabled) finalOutcome = 'HUMAN_REVIEW';
  }

  const labels = [...decision.labels];
  if (finalOutcome !== 'AUTO_MERGE' && !labels.includes(config.labels.manualReview))
    labels.push(config.labels.manualReview);
  if (finalOutcome === 'BLOCKED' && !labels.includes(config.labels.validationFailed))
    labels.push(config.labels.validationFailed);
  await log.run('labels', () => syncLabels(api, slug, prNumber, config, labels));

  let body = renderDecisionComment(
    decision,
    input.coverage,
    input.validation,
    input.remediation,
    input.runUrl,
    config.reporting.commentMaxChars,
  );
  if (finalOutcome !== decision.decision) {
    body +=
      `\n\n**Final outcome: ${finalOutcome.replace('_', ' ')}** ` +
      '(the decision could not be applied as computed; see the workflow log).';
  }
  await log.run('comment', () => upsertComment(api, slug, prNumber, body, DECISION_MARKER));

  if (finalOutcome !== 'AUTO_MERGE') {
    const owners = decision.ownership;
    const author = pr.user.login.toLowerCase();
    const users = owners.users.filter((u) => u.toLowerCase() !== author && !u.endsWith('[bot]'));
    const teams = owners.teams.map((t) => t.split('/')[1]);
    if (config.codeowners.requestReviews && (users.length > 0 || teams.length > 0)) {
      await log.run('request-reviews', async () => {
        await api.request('POST', `${base}/pulls/${prNumber}/requested_reviewers`, {
          reviewers: users,
          team_reviewers: teams,
        });
        const requested = [...users, ...owners.teams].map((o) => `@${o}`);
        return `requested ${requested.join(', ')}`;
      });
    } else {
      log.skip(
        'request-reviews',
        owners.owners.length === 0
          ? 'no owners resolved and no fallback owners configured'
          : 'disabled by policy',
      );
    }
    if (owners.emails.length > 0) {
      log.skip(
        'email-owners',
        `owners given as emails cannot be requested through the API: ${owners.emails.join(', ')}`,
      );
    }
    if (config.codeowners.assignOwners && users.length > 0) {
      await log.run('assign-owners', async () => {
        await api.request('POST', `${base}/issues/${prNumber}/assignees`, {
          assignees: users.slice(0, 10),
        });
        return `assigned ${users.slice(0, 10).join(', ')}`;
      });
    }
  }
  return report(finalOutcome);
}

/** The open pull request from `branch`, if any. */
export async function findOpenPullRequest(
  api: GitHubApi,
  slug: string,
  branch: string,
): Promise<PullRequest | null> {
  const owner = slug.split('/')[0];
  const { data } = await api.request<PullRequest[]>(
    'GET',
    `${repoPath(slug)}/pulls?state=open&head=${seg(`${owner}:${branch}`)}`,
  );
  return data[0] ?? null;
}

const UNSUPPORTED_PATCH_LINE = new RegExp(
  '^(new file mode|deleted file mode|old mode|new mode|rename from|rename to|' +
    'copy from|copy to|similarity index)',
);

export interface PatchCheck {
  files: string[];
  problems: string[];
}

/**
 * Structural check of a remediation patch before a privileged job applies it: only allowed files,
 * plain content edits (no new, deleted, renamed, binary, mode or symlink changes).
 */
export function checkPatch(text: string, allowed: readonly string[]): PatchCheck {
  const files: string[] = [];
  const problems: string[] = [];
  if (text.trim() === '') problems.push('patch is empty');
  for (const line of text.split('\n')) {
    const header = /^diff --git a\/(\S+) b\/(\S+)$/.exec(line);
    if (header) {
      if (header[1] !== header[2])
        problems.push(`renames are not allowed (${header[1]} -> ${header[2]})`);
      files.push(header[2]);
      continue;
    }
    if (UNSUPPORTED_PATCH_LINE.test(line)) {
      problems.push(`unsupported patch operation: ${line.trim()}`);
    }
    if (/^GIT binary patch|^Binary files/.test(line))
      problems.push('binary patches are not allowed');
  }
  for (const file of files) {
    if (!matchesAny(file, allowed)) problems.push(`${file} is not an allowed file`);
  }
  if (files.length === 0 && text.trim() !== '') problems.push('no file headers found');
  return { files: [...new Set(files)].sort(), problems };
}
