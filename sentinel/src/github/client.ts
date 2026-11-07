import { redact, registerSecret } from '../core/redact';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface GitHubResponse<T> {
  status: number;
  data: T;
}

/** Minimal GitHub API surface used by Sentinel; mocked in tests. */
export interface GitHubApi {
  request<T>(method: HttpMethod, path: string, body?: unknown): Promise<GitHubResponse<T>>;
  graphql<T>(query: string, variables: Record<string, unknown>): Promise<T>;
}

/** Non-2xx response or GraphQL error; the message is redacted. */
export class GitHubApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(redact(`GitHub API ${status} on ${path}: ${message}`));
    this.name = 'GitHubApiError';
  }
}

export interface FetchApiOptions {
  token: string | null;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

const SAFE_PATH = /^\/(?!.*\/\/)(?!.*\.\.)[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*$/;

/** Encodes one path segment (owner, repo, label name, ...). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** REST and GraphQL over `fetch`, with bounded retries for transient failures and rate limits. */
export class FetchGitHubApi implements GitHubApi {
  private readonly apiUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: FetchApiOptions) {
    registerSecret(options.token);
    this.apiUrl = (options.apiUrl ?? 'https://api.github.com').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxRetries = options.maxRetries ?? 2;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'project-sentinel',
    };
    if (this.options.token) {
      headers.authorization = `Bearer ${this.options.token}`;
    }
    return headers;
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<GitHubResponse<T>> {
    if (!SAFE_PATH.test(path)) {
      throw new GitHubApiError(0, path, 'refusing an unsafe request path');
    }
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.apiUrl}${path}`, {
          method,
          headers:
            body === undefined
              ? this.headers()
              : { ...this.headers(), 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        if (attempt < this.maxRetries) {
          await this.sleep(1000 * 2 ** attempt);
          continue;
        }
        throw new GitHubApiError(0, path, (error as Error).message);
      }
      const retryAfter = Number(response.headers.get('retry-after') ?? '0');
      const rateLimited = response.status === 429 || (response.status === 403 && retryAfter > 0);
      if ((rateLimited || response.status >= 500) && attempt < this.maxRetries) {
        await this.sleep(Math.min(Math.max(retryAfter * 1000, 1000 * 2 ** attempt), 10_000));
        continue;
      }
      const text = await response.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!response.ok) {
        const message = (data as { message?: string } | null)?.message ?? response.statusText;
        throw new GitHubApiError(response.status, path, String(message));
      }
      return { status: response.status, data: data as T };
    }
  }

  async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await this.request<{ data?: T; errors?: { message: string }[] }>(
      'POST',
      '/graphql',
      {
        query,
        variables,
      },
    );
    if (response.data.errors && response.data.errors.length > 0) {
      throw new GitHubApiError(
        200,
        '/graphql',
        response.data.errors.map((e) => e.message).join('; '),
      );
    }
    return response.data.data as T;
  }
}

/** Collects every page of a list endpoint (100 per page, at most `maxPages`). */
export async function paginate<T>(api: GitHubApi, path: string, maxPages = 20): Promise<T[]> {
  const items: T[] = [];
  const joiner = path.includes('?') ? '&' : '?';
  for (let page = 1; page <= maxPages; page += 1) {
    const { data } = await api.request<T[]>('GET', `${path}${joiner}per_page=100&page=${page}`);
    items.push(...data);
    if (data.length < 100) {
      return items;
    }
  }
  return items;
}
