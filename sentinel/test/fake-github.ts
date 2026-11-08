import type { GitHubApi, GitHubResponse, HttpMethod } from '../src/github/client';
import { GitHubApiError } from '../src/github/client';

export interface FakeState {
  pr: {
    number: number;
    state: string;
    headSha: string;
    baseRef: string;
    author: string;
    autoMerge: { method: string; expectedHeadOid: string } | null;
    files: string[];
  };
  repo: { allowAutoMerge: boolean; protected: boolean; requiredChecks: string[] };
  labels: Set<string>;
  repoLabels: Set<string>;
  comments: { id: number; body: string; user: { type: string; login: string } }[];
  reviewers: { reviewers: string[]; team_reviewers: string[] }[];
  assignees: string[][];
}

/** In-memory GitHub used by the end-to-end scenarios; records every call in order. */
export class FakeGitHub implements GitHubApi {
  readonly calls: string[] = [];
  readonly state: FakeState;
  readonly openPulls: number[] = [];
  readonly created: Record<string, unknown>[] = [];
  readonly updated: Record<string, unknown>[] = [];
  readonly dispatches: Record<string, unknown>[] = [];
  private nextComment = 100;

  constructor(headSha: string, files: string[]) {
    this.state = {
      pr: {
        number: 7,
        state: 'open',
        headSha,
        baseRef: 'main',
        author: 'github-actions[bot]',
        autoMerge: null,
        files,
      },
      repo: {
        allowAutoMerge: true,
        protected: true,
        requiredChecks: ['Sentinel decision', 'Lint and Build'],
      },
      labels: new Set(),
      repoLabels: new Set(),
      comments: [],
      reviewers: [],
      assignees: [],
    };
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<GitHubResponse<T>> {
    this.calls.push(`${method} ${path}`);
    const ok = (data: unknown): GitHubResponse<T> => ({ status: 200, data: data as T });
    const s = this.state;
    const b = (body ?? {}) as Record<string, unknown>;
    const route = path.replace(/\?.*$/, '');
    if (method === 'GET' && route === '/repos/acme/app')
      return ok({ allow_auto_merge: s.repo.allowAutoMerge, default_branch: 'main' });
    if (method === 'GET' && route === '/repos/acme/app/branches/main') {
      return ok({
        protected: s.repo.protected,
        protection: { required_status_checks: { contexts: s.repo.requiredChecks } },
      });
    }
    if (method === 'GET' && route === '/repos/acme/app/rules/branches/main') return ok([]);
    if (method === 'GET' && route === '/repos/acme/app/pulls/7') {
      return ok({
        number: 7,
        state: s.pr.state,
        html_url: 'https://github.com/acme/app/pull/7',
        node_id: 'PR_node7',
        head: { sha: s.pr.headSha, ref: 'sentinel/dependency-remediation' },
        base: { ref: s.pr.baseRef },
        user: { login: s.pr.author },
        auto_merge: s.pr.autoMerge,
      });
    }
    if (method === 'GET' && route === '/repos/acme/app/pulls/7/files') {
      return ok(path.includes('page=1') ? s.pr.files.map((filename) => ({ filename })) : []);
    }
    if (method === 'GET' && route === '/repos/acme/app/issues/7/labels')
      return ok([...s.labels].map((name) => ({ name })));
    if (method === 'POST' && route === '/repos/acme/app/issues/7/labels') {
      (b.labels as string[]).forEach((l) => s.labels.add(l));
      return ok([]);
    }
    const labelMatch = /^\/repos\/acme\/app\/issues\/7\/labels\/(.+)$/.exec(route);
    if (method === 'DELETE' && labelMatch) {
      s.labels.delete(decodeURIComponent(labelMatch[1]));
      return ok(null);
    }
    const repoLabel = /^\/repos\/acme\/app\/labels\/(.+)$/.exec(route);
    if (method === 'GET' && repoLabel) {
      if (!s.repoLabels.has(decodeURIComponent(repoLabel[1])))
        throw new GitHubApiError(404, path, 'Not Found');
      return ok({ name: decodeURIComponent(repoLabel[1]) });
    }
    if (method === 'POST' && route === '/repos/acme/app/labels') {
      s.repoLabels.add(String(b.name));
      return ok({ name: b.name });
    }
    if (method === 'GET' && route === '/repos/acme/app/issues/7/comments')
      return ok(path.includes('page=1') ? s.comments : []);
    if (method === 'POST' && route === '/repos/acme/app/issues/7/comments') {
      const comment = {
        id: this.nextComment++,
        body: String(b.body),
        user: { type: 'Bot', login: 'github-actions[bot]' },
      };
      s.comments.push(comment);
      return ok({ id: comment.id });
    }
    const commentMatch = /^\/repos\/acme\/app\/issues\/comments\/(\d+)$/.exec(route);
    if (method === 'PATCH' && commentMatch) {
      const comment = s.comments.find((c) => c.id === Number(commentMatch[1]));
      if (!comment) throw new GitHubApiError(404, path, 'Not Found');
      comment.body = String(b.body);
      return ok({ id: comment.id });
    }
    if (method === 'POST' && route === '/repos/acme/app/pulls/7/requested_reviewers') {
      s.reviewers.push({
        reviewers: b.reviewers as string[],
        team_reviewers: b.team_reviewers as string[],
      });
      return ok({});
    }
    if (method === 'POST' && route === '/repos/acme/app/issues/7/assignees') {
      s.assignees.push(b.assignees as string[]);
      return ok({});
    }
    if (method === 'GET' && route === '/repos/acme/app/pulls') {
      return ok(
        this.openPulls.map((n) => ({
          number: n,
          html_url: `https://github.com/acme/app/pull/${n}`,
        })),
      );
    }
    if (method === 'POST' && route === '/repos/acme/app/pulls') {
      const number = 7 + this.openPulls.length;
      this.openPulls.push(number);
      this.created.push(b);
      return ok({ number, html_url: `https://github.com/acme/app/pull/${number}` });
    }
    if (method === 'PATCH' && /^\/repos\/acme\/app\/pulls\/\d+$/.test(route)) {
      this.updated.push(b);
      return ok({});
    }
    if (method === 'POST' && /^\/repos\/acme\/app\/issues\/\d+\/labels$/.test(route)) {
      (b.labels as string[]).forEach((l) => s.labels.add(l));
      return ok([]);
    }
    if (
      method === 'POST' &&
      /^\/repos\/acme\/app\/actions\/workflows\/[^/]+\/dispatches$/.test(route)
    ) {
      this.dispatches.push({ workflow: route.split('/')[6], ...b });
      return ok(null);
    }
    throw new GitHubApiError(404, path, `fake has no route for ${method} ${route}`);
  }

  async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    if (query.includes('enablePullRequestAutoMerge')) {
      this.calls.push(`GRAPHQL enable ${String(variables.method)} ${String(variables.head)}`);
      if (variables.head !== this.state.pr.headSha)
        throw new GitHubApiError(200, '/graphql', 'Head ref is out of date');
      this.state.pr.autoMerge = {
        method: String(variables.method),
        expectedHeadOid: String(variables.head),
      };
    } else if (query.includes('disablePullRequestAutoMerge')) {
      this.calls.push('GRAPHQL disable');
      this.state.pr.autoMerge = null;
    }
    return {} as T;
  }
}
