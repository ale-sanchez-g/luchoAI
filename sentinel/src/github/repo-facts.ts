import type { RepoFacts } from '../governance/decision';
import type { GitHubApi } from './client';
import { GitHubApiError, seg } from './client';

interface BranchResponse {
  protected?: boolean;
  protection?: {
    required_status_checks?: { contexts?: string[]; checks?: { context: string }[] } | null;
  };
}

interface RuleResponse {
  type: string;
  parameters?: { required_status_checks?: { context: string }[] };
}

/**
 * Reads what decides whether GitHub auto-merge will wait for Sentinel: the repository's
 * auto-merge setting, classic branch protection and rulesets on the base branch. Anything that
 * cannot be read is reported as unknown, never assumed.
 */
export async function readRepoFacts(
  api: GitHubApi,
  slug: string,
  baseBranch: string,
): Promise<RepoFacts> {
  const [owner, repo] = slug.split('/');
  const base = `/repos/${seg(owner)}/${seg(repo)}`;
  const errors: string[] = [];

  let allowAutoMerge: boolean | null = null;
  try {
    const { data } = await api.request<{ allow_auto_merge?: boolean }>('GET', base);
    allowAutoMerge = typeof data.allow_auto_merge === 'boolean' ? data.allow_auto_merge : null;
  } catch (error) {
    errors.push(`repository: ${(error as Error).message}`);
  }

  let classicProtected: boolean | null = null;
  let classicChecks: string[] | null = null;
  try {
    const { data } = await api.request<BranchResponse>(
      'GET',
      `${base}/branches/${seg(baseBranch)}`,
    );
    classicProtected = data.protected === true;
    const checks = data.protection?.required_status_checks;
    classicChecks = checks
      ? [...(checks.contexts ?? []), ...(checks.checks ?? []).map((c) => c.context)]
      : classicProtected
        ? null
        : [];
  } catch (error) {
    errors.push(`branch: ${(error as Error).message}`);
  }

  let rulesetChecks: string[] | null = null;
  let rulesetActive = false;
  try {
    const { data } = await api.request<RuleResponse[]>(
      'GET',
      `${base}/rules/branches/${seg(baseBranch)}`,
    );
    rulesetActive = data.length > 0;
    rulesetChecks = data
      .filter((r) => r.type === 'required_status_checks')
      .flatMap((r) => (r.parameters?.required_status_checks ?? []).map((c) => c.context));
  } catch (error) {
    if (!(error instanceof GitHubApiError && error.status === 404)) {
      errors.push(`rulesets: ${(error as Error).message}`);
    } else {
      rulesetChecks = [];
    }
  }

  const baseProtected =
    classicProtected === null && !rulesetActive ? null : classicProtected === true || rulesetActive;
  const requiredChecks =
    classicChecks === null && rulesetChecks === null
      ? null
      : [...new Set([...(classicChecks ?? []), ...(rulesetChecks ?? [])])].sort();
  return {
    allowAutoMerge,
    baseProtected,
    requiredChecks: classicChecks === null && classicProtected ? null : requiredChecks,
    readError: errors.length > 0 && baseProtected === null ? errors.join('; ') : null,
  };
}
