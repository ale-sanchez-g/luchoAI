import fs from 'node:fs';
import { focusForWeek, getContentType, getSection, labelSpecs } from './catalogue';
import {
  DEFAULT_MODEL,
  research,
  resolveSourceUrl,
  ScoutError,
  suggest,
  type GeminiConfig,
  type Usage,
} from './gemini';
import { buildInventory, describeInventory } from './inventory';
import { gitHubClient, renderIssue, type IssueDraft } from './issues';
import { buildResearchPrompt, buildSuggestionPrompt, suggestionSchema } from './scout-prompts';
import { cleanText, validateSuggestions, type Rejection, type Suggestion } from './suggestions';

// The weekly content scout: research youth football training trends with Gemini and Google
// Search, then open GitHub issues with content ideas for a person to review. See
// docs/content-scout.md. Exit codes: 0 ran (even if nothing was worth opening), 1 failed.

export type ScoutEnv = Record<string, string | undefined>;

export interface ScoutDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => Date;
  log: (line: string) => void;
  root: string;
}

interface Config {
  dryRun: boolean;
  maxIssues: number;
  model: string;
  focus: string;
  keyName: string;
  apiKey: string;
  github?: { token: string; repo: string; apiUrl: string };
  runUrl?: string;
  summaryPath?: string;
}

const MAX_ISSUES_LIMIT = 5;
const DEFAULT_MAX_ISSUES = 3;

export function readConfig(args: string[], env: ScoutEnv, now: Date): Config {
  const requested = Number(env.MAX_ISSUES || DEFAULT_MAX_ISSUES);
  const maxIssues = Number.isInteger(requested)
    ? Math.min(MAX_ISSUES_LIMIT, Math.max(1, requested))
    : DEFAULT_MAX_ISSUES;
  // The research job's own key comes first. The website's free key is the fallback, but it is
  // usually locked to the site's address and on the free tier, so it may be refused here.
  const keyName = ['GEMINI_RESEARCH_API_KEY', 'GEMINI_FREE_API_KEY'].find((k) => env[k]) ?? '';
  const repo = env.GITHUB_REPOSITORY ?? '';
  const runUrl =
    env.GITHUB_SERVER_URL && repo && env.GITHUB_RUN_ID
      ? `${env.GITHUB_SERVER_URL}/${repo}/actions/runs/${env.GITHUB_RUN_ID}`
      : undefined;
  return {
    dryRun: env.DRY_RUN === 'true' || args.includes('--dry-run'),
    maxIssues,
    model: (env.CONTENT_SCOUT_MODEL || DEFAULT_MODEL).trim().replace(/^models\//, ''),
    focus: (env.CONTENT_SCOUT_FOCUS ?? '').trim().slice(0, 200) || focusForWeek(now),
    keyName,
    apiKey: keyName ? (env[keyName] ?? '') : '',
    github:
      env.GITHUB_TOKEN && repo
        ? { token: env.GITHUB_TOKEN, repo, apiUrl: env.GITHUB_API_URL || 'https://api.github.com' }
        : undefined,
    runUrl,
    summaryPath: env.GITHUB_STEP_SUMMARY,
  };
}

function tokens(usage: (Usage | undefined)[]): number {
  return usage.reduce((n, u) => n + (u?.totalTokenCount ?? 0), 0);
}

interface Outcome {
  config: Config;
  date: string;
  searches: string[];
  sourceCount: number;
  tokenCount: number;
  accepted: Suggestion[];
  drafts: IssueDraft[];
  opened: { number: number; url: string }[];
  rejected: Rejection[];
}

function describe(s: Suggestion): string {
  return (
    `${getContentType(s.contentType).name} · ${getSection(s.section).name} · ` +
    `ages ${s.ageMin}-${s.ageMax}`
  );
}

export function renderSummary(o: Outcome): string {
  const lines = [
    `## Weekly content scout, ${o.date}`,
    '',
    o.config.dryRun
      ? '**Dry run: no issues were opened.** These are the issues it would open.'
      : `Opened ${o.opened.length} issue${o.opened.length === 1 ? '' : 's'} for review.`,
    '',
    `Model \`${o.config.model}\` with the \`${o.config.keyName}\` key. This week's focus: ` +
      `${cleanText(o.config.focus, 200)}. ${o.searches.length} searches, ${o.sourceCount} ` +
      `sources, ${o.tokenCount} tokens.`,
    '',
  ];
  if (!o.accepted.length) lines.push('No idea passed the checks this week.', '');
  o.accepted.forEach((s, i) => {
    const opened = o.opened[i];
    if (opened) lines.push(`- [#${opened.number} ${s.title}](${opened.url}): ${describe(s)}`);
    else {
      lines.push(
        `<details><summary>${s.title}: ${describe(s)}</summary>`,
        '',
        `**${o.drafts[i].title}**`,
        '',
        `Labels: ${o.drafts[i].labels.map((l) => `\`${l}\``).join(', ')}`,
        '',
        o.drafts[i].body,
        '',
        '</details>',
        '',
      );
    }
  });
  if (o.rejected.length) {
    lines.push('', '### Left out', '', ...o.rejected.map((r) => `- ${r.title}: ${r.reason}`));
  }
  if (o.searches.length) {
    lines.push('', '### Searches', '', ...o.searches.map((q) => `- ${cleanText(q, 120)}`));
  }
  return `${lines.join('\n')}\n`;
}

// Workflow commands end at a line break, so the message's own breaks (and %) must be encoded.
function annotation(message: string): string {
  return message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function writeSummary(path: string | undefined, markdown: string, log: (l: string) => void): void {
  if (path) fs.appendFileSync(path, markdown);
  else log(markdown);
}

// CI runs this on every push: it loads the scout and the app modules it reads under plain Node,
// which fails on things Next.js tolerates (a type imported without `import type`, say).
function selfCheck(deps: ScoutDeps): number {
  const inventory = buildInventory(deps.root);
  const date = deps.now().toISOString().slice(0, 10);
  const sources = [{ id: 1, title: 'example.org', uri: 'https://example.org/' }];
  const prompts = [
    buildResearchPrompt({ date, focus: focusForWeek(deps.now()), recentTitles: [] }),
    buildSuggestionPrompt({
      date,
      maxIssues: DEFAULT_MAX_ISSUES,
      research: { brief: 'Check.', sources, evidence: [], queries: [] },
      inventoryText: describeInventory(inventory),
      recentTitles: [],
    }),
  ];
  const size = prompts.reduce((n, p) => n + p.system.length + p.user.length, 0);
  JSON.stringify(suggestionSchema(DEFAULT_MAX_ISSUES));
  const { counts } = inventory;
  deps.log(
    `Content scout check passed: ${counts.games} games, ${counts.twists} twists, ` +
      `${counts.missions} missions, ${counts.situations} Game IQ situations, ` +
      `${inventory.knowledgeDocs.length} knowledge files; prompts are ${size} characters.`,
  );
  return 0;
}

export async function main(args: string[], env: ScoutEnv, deps: ScoutDeps): Promise<number> {
  if (args.includes('--check')) return selfCheck(deps);
  const now = deps.now();
  const config = readConfig(args, env, now);
  const date = now.toISOString().slice(0, 10);
  try {
    if (!config.apiKey) {
      throw new ScoutError(
        'No Gemini key: add a GEMINI_RESEARCH_API_KEY repository secret (see ' +
          'docs/content-scout.md).',
      );
    }
    if (!config.dryRun && !config.github) {
      throw new ScoutError('Opening issues needs GITHUB_TOKEN and GITHUB_REPOSITORY.');
    }
    const inventory = buildInventory(deps.root);
    const github = config.github ? gitHubClient({ ...config.github, fetch: deps.fetch }) : null;
    const existingIssues = github ? await github.listScoutIssues() : [];
    if (!github) deps.log('::warning::No GITHUB_TOKEN, so earlier issues were not checked.');
    // With its state, so the model knows which ideas reviewers built or turned down.
    const recentTitles = existingIssues.map((i) => `${i.title} [${i.state}]`);

    const gemini: GeminiConfig = {
      apiKey: config.apiKey,
      keyName: config.keyName,
      model: config.model,
      fetch: deps.fetch,
      sleep: deps.sleep,
    };
    deps.log(`Researching with ${config.model} (${config.keyName}). Focus: ${config.focus}`);
    const found = await research(
      gemini,
      buildResearchPrompt({ date, focus: config.focus, recentTitles }),
    );
    deps.log(
      `Research ran ${found.queries.length} searches and found ${found.sources.length} sources.`,
    );

    const prompt = buildSuggestionPrompt({
      date,
      maxIssues: config.maxIssues,
      research: found,
      inventoryText: describeInventory(inventory),
      recentTitles,
    });
    const { value, usage } = await suggest(gemini, prompt, suggestionSchema(config.maxIssues));
    const { accepted, rejected } = validateSuggestions(value, {
      sources: found.sources,
      existingIssues,
      existingItems: inventory.items,
      maxIssues: config.maxIssues,
    });
    for (const r of rejected) deps.log(`Left out "${r.title}": ${r.reason}`);

    const cited = [...new Map(accepted.flatMap((s) => s.sources).map((s) => [s.id, s])).values()];
    const resolved = new Map(
      await Promise.all(
        cited.map(async (s) => [s.id, await resolveSourceUrl(s.uri, deps.fetch)] as const),
      ),
    );
    for (const s of accepted) {
      s.sources = s.sources.map((src) => ({ ...src, uri: resolved.get(src.id) ?? src.uri }));
    }

    const run = { date, model: config.model, focus: config.focus, queries: found.queries };
    const drafts = accepted.map((s) => renderIssue(s, { ...run, runUrl: config.runUrl }));
    const opened: { number: number; url: string }[] = [];
    if (!config.dryRun && github && drafts.length) {
      const used = new Set(drafts.flatMap((d) => d.labels));
      await github.ensureLabels(labelSpecs().filter((l) => used.has(l.name)));
      for (const draft of drafts) {
        const issue = await github.createIssue(draft);
        opened.push(issue);
        deps.log(`Opened #${issue.number}: ${issue.url}`);
      }
    }
    writeSummary(
      config.summaryPath,
      renderSummary({
        config,
        date,
        searches: found.queries,
        sourceCount: found.sources.length,
        tokenCount: tokens([found.usage, usage]),
        accepted,
        drafts,
        opened,
        rejected,
      }),
      deps.log,
    );
    deps.log(
      config.dryRun
        ? `Dry run: ${drafts.length} issue(s) would be opened. See the run summary.`
        : `Done: opened ${opened.length} issue(s).`,
    );
    return 0;
  } catch (err) {
    if (!(err instanceof ScoutError)) throw err;
    deps.log(`::error::${annotation(err.message)}`);
    writeSummary(
      config.summaryPath,
      `## Weekly content scout, ${date}\n\n**It failed:** ${err.message}\n`,
      deps.log,
    );
    return 1;
  }
}
