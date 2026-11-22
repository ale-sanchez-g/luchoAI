import { DECISION_THEMES } from '@/lib/decision-games';
import { SKILL_AREAS } from '@/lib/game-library/skills';
import {
  getContentType,
  getSection,
  PLAYER_SLOTS,
  REVIEW_LABEL,
  SCOUT_LABEL,
  type LabelSpec,
} from './catalogue';
import { hostname, REDIRECT_HOST, ScoutError, type Source } from './gemini';
import { cleanText, plainTitle, type ExistingIssue, type Suggestion } from './suggestions';

export const TITLE_PREFIX = 'Content idea: ';
const MARKER = 'content-scout:v1';
const MAX_BODY = 60_000;
const ISSUE_PAGES = 5;

export interface IssueDraft {
  title: string;
  body: string;
  labels: string[];
}

export interface RunInfo {
  date: string;
  model: string;
  focus: string;
  queries: string[];
  runUrl?: string;
}

export function issueTitle(s: Suggestion): string {
  return `${TITLE_PREFIX}${plainTitle(s.title)} (ages ${s.ageMin}-${s.ageMax})`;
}

export function filesFor(s: Suggestion): string[] {
  if (s.section !== 'games-this-week') return getSection(s.section).files;
  if (s.contentType === 'game-twist') return ['src/lib/game-library/twists.ts'];
  if (s.contentType === 'match-mission') return ['src/lib/game-library/missions.ts'];
  return [`src/lib/game-library/games/${s.skillArea ?? '<skill>'}.ts`];
}

function linkUrl(url: string): string {
  return url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20');
}

function linkText(text: string): string {
  return text.replace(/[[\]]/g, (c) => `\\${c}`);
}

// A redirect that could not be followed still names its site: search results title it so.
function siteOf(src: Source): string {
  const host = hostname(src.uri);
  return host === REDIRECT_HOST ? cleanText(src.title, 120).toLowerCase() : host;
}

const GAME_RULES =
  'No heading, no elimination or sitting out, no exercise as a penalty and nowhere near roads ' +
  'or traffic (docs/game-library.md; the content tests check the wording).';

export function renderIssue(s: Suggestion, run: RunInfo): IssueDraft {
  const type = getContentType(s.contentType);
  const section = getSection(s.section);
  const bands = s.bands.map((b) => b.name).join(' and ');
  const rows: [string, string][] = [
    ['Content type', type.name],
    ['Add it to', `${section.name} (${section.pages.map((p) => `\`${p}\``).join(', ')})`],
    ['Files', filesFor(s).map((f) => `\`${f}\``).join(', ')],
    ['Ages', `${s.ageMin}-${s.ageMax} (${bands} band${s.bands.length === 1 ? '' : 's'})`],
  ];
  const skill = SKILL_AREAS.find((a) => a.id === s.skillArea);
  if (skill) rows.push(['Skill area', `${skill.label} (\`${skill.id}\`)`]);
  const theme = DECISION_THEMES.find((t) => t.id === s.gameIqTheme);
  if (theme) rows.push(['Game IQ theme', `${theme.title} (\`${theme.id}\`)`]);
  if (s.players) rows.push(['Players', PLAYER_SLOTS[s.players]]);
  if (s.level) rows.push(['Lowest level', `${s.level[0].toUpperCase()}${s.level.slice(1)}`]);
  const sites = new Set(s.sources.map(siteOf)).size;
  rows.push([
    'Evidence',
    `${s.sources.length} source${s.sources.length === 1 ? '' : 's'} from ${sites} ` +
      `site${sites === 1 ? '' : 's'}` +
      (s.confidence ? `; the model rates its own confidence ${s.confidence}/100` : ''),
  ]);

  const sources = s.sources.map((src, i) => {
    const site = siteOf(src);
    const title = cleanText(src.title, 120) || site;
    const from = site && site !== title.toLowerCase() ? ` (${site})` : '';
    return `${i + 1}. [${linkText(title)}](${linkUrl(src.uri)})${from}`;
  });
  const searches = run.queries
    .map((q) => {
      const url = linkUrl(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
      return `[${linkText(cleanText(q, 100))}](${url})`;
    })
    .join(' · ');
  const checklist = [
    '- [ ] Open each source and check it says what this issue claims. The research reads ' +
      'search results and can get things wrong.',
    `- [ ] Right for ages ${s.ageMin}-${s.ageMax}, and safe for a child playing without a coach.`,
    '- [ ] Written in our own words, with no copied text, diagrams or branded names.',
    '- [ ] Not already in the app, and it follows the rules for this section:',
    ...section.checks.map((c) => `  - ${c}`),
    ...(type.screens.includes('kindness') && type.id !== 'wellbeing-tool'
      ? [`- [ ] ${GAME_RULES}`]
      : []),
    s.section === 'wellbeing'
      ? '- [ ] Read by someone qualified in child wellbeing or safeguarding before it ships.'
      : '- [ ] Read by a coach before it ships.',
  ];

  const runLog = run.runUrl ? ` · [run log](${run.runUrl})` : '';
  const body = [
    '> [!NOTE]',
    '> **AI-generated idea, not checked by a person yet.** Gemini searched the web on ' +
      `${run.date} for youth football training trends and suggested this. A person decides ` +
      'whether to build it. Treat everything below, the sources included, as unverified.',
    '',
    `**Trend:** ${s.trend}`,
    '',
    '| | |',
    '| --- | --- |',
    ...rows.map(([k, v]) => `| **${k}** | ${v} |`),
    '',
    '### What to add',
    '',
    s.summary,
    '',
    ...s.outline.map((line) => `- ${line}`),
    '',
    '### Why now',
    '',
    s.whyNow,
    '',
    '### Safety',
    '',
    s.safety,
    '',
    '### Sources from the research',
    '',
    ...sources,
    '',
    ...(searches ? [`Searches it ran: ${searches}`, ''] : []),
    '### Before building it',
    '',
    ...checklist,
    '',
    'Not a good fit? Close it as "not planned". The scout reads closed issues too, so it will ' +
      'not suggest the same idea again.',
    '',
    '---',
    `<sub>Weekly content scout · ${run.date} · ${run.model} with Google Search · this week's ` +
      `focus: ${cleanText(run.focus, 200)}${runLog}</sub>`,
    `<!-- ${MARKER} key=${s.key} -->`,
  ].join('\n');

  return {
    title: issueTitle(s),
    body: body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}\n\n(shortened)` : body,
    labels: [SCOUT_LABEL, REVIEW_LABEL, section.label, ...s.bands.map((b) => b.label)],
  };
}

export interface GitHub {
  listScoutIssues(): Promise<ExistingIssue[]>;
  ensureLabels(specs: LabelSpec[]): Promise<void>;
  createIssue(draft: IssueDraft): Promise<{ number: number; url: string }>;
}

export interface GitHubOptions {
  token: string;
  repo: string;
  apiUrl: string;
  fetch: typeof fetch;
}

interface RawIssue {
  number: number;
  title: string;
  state: string;
  state_reason?: string | null;
  body?: string | null;
  pull_request?: unknown;
}

export function keyFromBody(body: string | null | undefined): string | undefined {
  return new RegExp(`<!-- ${MARKER} key=(\\S+) -->`).exec(body ?? '')?.[1];
}

export function gitHubClient(options: GitHubOptions): GitHub {
  const base = `${options.apiUrl.replace(/\/$/, '')}/repos/${options.repo}`;
  async function call(method: string, route: string, body?: unknown): Promise<Response> {
    return options.fetch(`${base}${route}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${options.token}`,
        'user-agent': 'luchoai-content-scout',
        'x-github-api-version': '2022-11-28',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  }
  async function refuse(response: Response, what: string): Promise<never> {
    const text = (await response.text()).replace(/\s+/g, ' ').slice(0, 200);
    throw new ScoutError(`GitHub refused to ${what} (${response.status}): ${text}`);
  }
  return {
    async listScoutIssues(): Promise<ExistingIssue[]> {
      const found: ExistingIssue[] = [];
      for (let page = 1; page <= ISSUE_PAGES; page += 1) {
        const label = encodeURIComponent(SCOUT_LABEL);
        const route = `/issues?labels=${label}&state=all&per_page=100&page=${page}`;
        const response = await call('GET', route);
        if (!response.ok) await refuse(response, 'list issues');
        const batch = (await response.json()) as RawIssue[];
        for (const issue of batch) {
          if (issue.pull_request) continue;
          const reason = issue.state_reason ? `, ${issue.state_reason.replace('_', ' ')}` : '';
          found.push({
            number: issue.number,
            title: issue.title,
            state: `${issue.state}${reason}`,
            key: keyFromBody(issue.body),
          });
        }
        if (batch.length < 100) break;
      }
      return found;
    },
    async ensureLabels(specs: LabelSpec[]): Promise<void> {
      for (const spec of specs) {
        const existing = await call('GET', `/labels/${encodeURIComponent(spec.name)}`);
        if (existing.status !== 404 && !existing.ok) {
          await refuse(existing, `read the "${spec.name}" label`);
        }
        await existing.text();
        if (existing.ok) continue;
        const created = await call('POST', '/labels', spec);
        // 422: someone else created it a moment ago, which is just as good.
        if (!created.ok && created.status !== 422) {
          await refuse(created, `create the "${spec.name}" label`);
        }
        await created.text();
      }
    },
    async createIssue(draft: IssueDraft): Promise<{ number: number; url: string }> {
      const response = await call('POST', '/issues', draft);
      if (!response.ok) await refuse(response, 'open an issue');
      const issue = (await response.json()) as { number: number; html_url: string };
      return { number: issue.number, url: issue.html_url };
    },
  };
}
