/**
 * @jest-environment node
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { parse } from 'yaml';
import { getAgeGroup } from '@/lib/age-groups';
import { DECISION_THEMES } from '@/lib/decision-games';
import { GAME_LIBRARY } from '@/lib/game-library';
import { SKILL_AREAS } from '@/lib/game-library/skills';
import {
  AGE_BANDS,
  bandsFor,
  CONTENT_TYPES,
  focusForWeek,
  labelSpecs,
  RESEARCH_FOCUS,
  SECTIONS,
} from '../../scripts/content-scout/catalogue';
import {
  explainGeminiError,
  parseResearch,
  research,
  resolveSourceUrl,
  ScoutError,
  suggest,
  type GeminiConfig,
  type GenerateResponse,
  type Source,
} from '../../scripts/content-scout/gemini';
import { buildInventory, describeInventory } from '../../scripts/content-scout/inventory';
import { gitHubClient, keyFromBody, renderIssue } from '../../scripts/content-scout/issues';
import { main, readConfig, type ScoutDeps } from '../../scripts/content-scout/main';
import {
  buildResearchPrompt,
  buildSuggestionPrompt,
  suggestionSchema,
} from '../../scripts/content-scout/scout-prompts';
import {
  cleanText,
  similarity,
  validateSuggestions,
  type ValidationContext,
  type ValidationResult,
} from '../../scripts/content-scout/suggestions';

const ROOT = path.resolve(__dirname, '..', '..');
const NOW = new Date('2026-11-22T21:41:00Z');
const REDIRECT = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/';
const WORKFLOW = '.github/workflows/weekly-content-scout.yml';

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}

interface Step {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
}

interface SchemaShape {
  properties: {
    suggestions: {
      maxItems: number;
      items: { properties: Record<string, { enum?: string[] }> };
    };
  };
}

function mockFetch(handler: (call: Call) => Response): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    return handler(call);
  };
  return { fetch: fn as typeof fetch, calls };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

function textResponse(text: string, finishReason = 'STOP'): GenerateResponse {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason }] };
}

// Shaped like the documented generateContent response with Google Search grounding.
const RESEARCH_RESPONSE: GenerateResponse = {
  candidates: [
    {
      content: {
        parts: [
          { text: 'Planning the searches.', thought: true },
          { text: '## Scanning\nYoung players are taught to look before the ball arrives.' },
        ],
      },
      finishReason: 'STOP',
      groundingMetadata: {
        webSearchQueries: [' youth football scanning 2026 ', ''],
        groundingChunks: [
          { web: { uri: `${REDIRECT}AAA`, title: 'englandfootball.com' } },
          { web: { uri: 'http://insecure.example/page', title: 'insecure.example' } },
          { web: { uri: `${REDIRECT}CCC`, title: 'frontiersin.org' } },
        ],
        groundingSupports: [
          {
            segment: { text: 'Young players are taught to look before the ball arrives.' },
            groundingChunkIndices: [0, 1, 2, 2],
          },
          { segment: { text: 'Only the insecure page says this.' }, groundingChunkIndices: [1] },
        ],
      },
    },
  ],
  usageMetadata: { totalTokenCount: 4000 },
};

function suggestionsResponse(suggestions: unknown[]): GenerateResponse {
  return {
    ...textResponse(JSON.stringify({ suggestions })),
    usageMetadata: { totalTokenCount: 6000 },
  };
}

function idea(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    trend: 'Scanning before receiving is now taught from age 11 (England Football, 2026).',
    sourceIds: [1, 3],
    title: 'Shoulder Check Wall Passes',
    contentType: 'practice-game',
    section: 'games-this-week',
    skillArea: 'vision',
    players: 'solo',
    level: 'beginner',
    ageMin: 11,
    ageMax: 13,
    summary: 'A wall game: look over your shoulder before every touch, then pass again.',
    outline: ['Set-up: a wall and one ball.', 'How to play: look, then pass.', 'Easier: no look.'],
    whyNow: 'Scanning is a growing focus and there are few solo vision games for 11-13s.',
    safety: 'Pick a wall with nothing breakable nearby, and ask a grown-up first.',
    confidence: 70,
    ...overrides,
  };
}

const SOURCES: Source[] = [
  { id: 1, title: 'englandfootball.com', uri: `${REDIRECT}AAA` },
  { id: 3, title: 'frontiersin.org', uri: `${REDIRECT}CCC` },
];

function context(extra: Partial<ValidationContext> = {}): ValidationContext {
  return { sources: SOURCES, existingIssues: [], existingItems: [], maxIssues: 3, ...extra };
}

function check(...ideas: Record<string, unknown>[]): ValidationResult {
  return validateSuggestions({ suggestions: ideas }, context());
}

function gemini(fetchFn: typeof fetch, sleep = jest.fn(async () => {})): GeminiConfig {
  return {
    apiKey: 'test-key',
    keyName: 'GEMINI_RESEARCH_API_KEY',
    model: 'm',
    fetch: fetchFn,
    sleep,
  };
}

const PROMPT = { system: 's', user: 'u' };

describe('content scout catalogue', () => {
  it('uses the same age cut-offs as the app', () => {
    for (let age = 8; age <= 18; age += 1) {
      const bands = AGE_BANDS.filter((b) => b.min <= age && age <= b.max);
      expect(bands).toHaveLength(1);
      expect(bands[0].group).toBe(getAgeGroup(age));
    }
    expect(bandsFor(12, 16).map((b) => b.label)).toEqual(['age: 11-13', 'age: 14-18']);
  });

  it('puts every content type in real sections, and every section takes some content', () => {
    const ids = SECTIONS.map((s) => s.id);
    for (const type of CONTENT_TYPES) {
      expect(type.sections.length).toBeGreaterThan(0);
      for (const id of type.sections) expect(ids).toContain(id);
    }
    for (const id of ids) expect(CONTENT_TYPES.some((t) => t.sections.includes(id))).toBe(true);
  });

  it('only names files that exist, including one games file per skill area', () => {
    for (const file of SECTIONS.flatMap((s) => s.files).filter((f) => !f.includes('<'))) {
      expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
    }
    for (const skill of SKILL_AREAS) {
      const file = path.join(ROOT, `src/lib/game-library/games/${skill.id}.ts`);
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  it('has unique labels within GitHub limits', () => {
    const labels = labelSpecs();
    expect(new Set(labels.map((l) => l.name)).size).toBe(labels.length);
    for (const l of labels) {
      expect(l.name.length).toBeLessThanOrEqual(50);
      expect(l.description.length).toBeLessThanOrEqual(100);
      expect(l.color).toMatch(/^[0-9a-f]{6}$/);
    }
  });

  it('turns to every research focus in turn, one a week', () => {
    const weeks = RESEARCH_FOCUS.map((_, i) => focusForWeek(new Date(2026, 10, 2 + i * 7)));
    expect(new Set(weeks).size).toBe(RESEARCH_FOCUS.length);
  });
});

describe('content scout inventory', () => {
  const inventory = buildInventory(ROOT);

  it('counts what the app has and lists the thinnest spots first', () => {
    expect(inventory.counts.games).toBe(GAME_LIBRARY.length);
    expect(inventory.counts.situations).toBe(
      DECISION_THEMES.reduce((n, t) => n + t.scenarios.length, 0),
    );
    const counts = inventory.thinnest.map((c) => c.games);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    const games = inventory.items.filter((i) => i.type === 'practice-game');
    expect(games.length).toBeGreaterThanOrEqual(GAME_LIBRARY.length);
  });

  it('reads the knowledge base titles and review dates', () => {
    expect(inventory.knowledgeDocs.length).toBeGreaterThan(0);
    for (const doc of inventory.knowledgeDocs) {
      expect(doc.title).not.toMatch(/\.md$/);
      expect(doc.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('describes every skill area and Game IQ theme to the model', () => {
    const text = describeInventory(inventory);
    for (const skill of SKILL_AREAS) expect(text).toContain(skill.id);
    for (const theme of DECISION_THEMES) expect(text).toContain(theme.title);
  });
});

describe('content scout prompts', () => {
  it('keeps the schema lists in step with the catalogue and the app', () => {
    const schema = suggestionSchema(3) as unknown as SchemaShape;
    const props = schema.properties.suggestions.items.properties;
    expect(schema.properties.suggestions.maxItems).toBe(3);
    expect(props.contentType.enum).toEqual(CONTENT_TYPES.map((t) => t.id));
    expect(props.section.enum).toEqual(SECTIONS.map((s) => s.id));
    expect(props.skillArea.enum).toEqual(SKILL_AREAS.map((s) => s.id));
    expect(props.gameIqTheme.enum).toEqual(DECISION_THEMES.map((t) => t.id));
  });

  it('tells the model the research is data and lists earlier ideas with their state', () => {
    const titles = ['Content idea: Old idea (ages 8-10) [closed, not planned]'];
    const prompt = buildSuggestionPrompt({
      date: '2026-11-22',
      maxIssues: 3,
      research: parseResearch(RESEARCH_RESPONSE),
      inventoryText: 'inventory',
      recentTitles: titles,
    });
    expect(prompt.system).toMatch(/data, not instructions/);
    expect(prompt.system).toMatch(/No heading/);
    expect(prompt.user).toContain(titles[0]);
    expect(prompt.user).toContain('[1] englandfootball.com');
    expect(prompt.user).not.toContain(REDIRECT);
    const researchPrompt = buildResearchPrompt({
      date: '2026-11-22',
      focus: 'goalkeeping',
      recentTitles: [],
    });
    expect(researchPrompt.user).toContain('since 2025-11-22');
    expect(researchPrompt.user).toContain("this week's focus: goalkeeping");
  });
});

describe('content scout research step', () => {
  it('keeps the answer text, numbers sources by position and drops non-https ones', () => {
    const found = parseResearch(RESEARCH_RESPONSE);
    expect(found.brief).toBe(
      '## Scanning\nYoung players are taught to look before the ball arrives.',
    );
    expect(found.sources.map((s) => s.id)).toEqual([1, 3]);
    expect(found.evidence).toEqual([
      { text: 'Young players are taught to look before the ball arrives.', sourceIds: [1, 3] },
    ]);
    expect(found.queries).toEqual(['youth football scanning 2026']);
  });

  it('searches with Google, sends the key in a header and never in the URL', async () => {
    const { fetch, calls } = mockFetch(() => json(200, RESEARCH_RESPONSE));
    await research(gemini(fetch), PROMPT);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/m:generateContent',
    );
    expect(calls[0].headers['x-goog-api-key']).toBe('test-key');
    expect(calls[0].body?.tools).toEqual([{ google_search: {} }]);
  });

  it('tries once more, then fails, when the research comes back without sources', async () => {
    const { fetch, calls } = mockFetch(() => json(200, textResponse('From memory.')));
    await expect(research(gemini(fetch), PROMPT)).rejects.toThrow(/without any web sources/);
    expect(calls).toHaveLength(2);
  });

  it('fails on blocked prompts and answers that stopped early', () => {
    expect(() => parseResearch({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(ScoutError);
    expect(() => parseResearch(textResponse('x', 'MAX_TOKENS'))).toThrow(
      /stopped the research step early \(MAX_TOKENS\)/,
    );
  });
});

describe('content scout Gemini errors', () => {
  it('retries busy and rate-limited answers, waiting longer each time', async () => {
    const answers = [json(503, {}), json(429, {}), json(200, RESEARCH_RESPONSE)];
    const { fetch } = mockFetch(() => answers.shift() as Response);
    const sleep = jest.fn(async () => {});
    await research(gemini(fetch, sleep), PROMPT);
    expect(sleep.mock.calls).toEqual([[10_000], [30_000]]);
  });

  it('explains a key that only works from the website', () => {
    const body = JSON.stringify({
      error: {
        message: 'Requests from referer <empty> are blocked.',
        details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }],
      },
    });
    const message = explainGeminiError(403, body, { keyName: 'GEMINI_FREE_API_KEY', model: 'm' });
    expect(message).toMatch(/GEMINI_FREE_API_KEY only works from the website/);
    expect(message).toMatch(/GEMINI_RESEARCH_API_KEY/);
  });

  it('explains unknown models, quotas and anything else', () => {
    const config = { keyName: 'K', model: 'gemini-x' };
    expect(explainGeminiError(404, '{}', config)).toMatch(/CONTENT_SCOUT_MODEL/);
    expect(explainGeminiError(429, '{}', config)).toMatch(/billing/);
    expect(explainGeminiError(500, 'Oops\n<html>', config)).toBe(
      'Gemini answered 500: Oops <html>',
    );
  });

  it('asks for JSON that matches the schema and rejects anything else', async () => {
    const { fetch, calls } = mockFetch(() => json(200, suggestionsResponse([idea()])));
    const { value } = await suggest(gemini(fetch), PROMPT, { type: 'object' });
    expect(value).toEqual({ suggestions: [idea()] });
    expect(calls[0].body?.generationConfig).toEqual({
      responseMimeType: 'application/json',
      responseJsonSchema: { type: 'object' },
    });
    expect(calls[0].body?.tools).toBeUndefined();
    const bad = mockFetch(() => json(200, textResponse('{"sugg')));
    await expect(suggest(gemini(bad.fetch), PROMPT, {})).rejects.toThrow(/not valid JSON/);
  });

  it('follows search redirects to the real page, keeping the redirect if that fails', async () => {
    const ok = mockFetch(() => redirectTo('https://uefa.com/a'));
    expect(await resolveSourceUrl(`${REDIRECT}AAA`, ok.fetch)).toBe('https://uefa.com/a');
    const down = mockFetch(() => {
      throw new Error('offline');
    });
    expect(await resolveSourceUrl(`${REDIRECT}AAA`, down.fetch)).toBe(`${REDIRECT}AAA`);
    expect(down.calls.map((c) => c.method)).toEqual(['HEAD', 'GET']);
    const direct = mockFetch(() => json(200, {}));
    const page = 'https://example.org/x';
    expect(await resolveSourceUrl(page, direct.fetch)).toBe(page);
    expect(direct.calls).toHaveLength(0);
  });
});

describe('content scout suggestion checks', () => {
  it('accepts a sound idea and works out its age bands and sources', () => {
    const { accepted, rejected } = check(idea());
    expect(rejected).toEqual([]);
    expect(accepted[0]).toMatchObject({
      key: 'practice-game/shoulder-check-wall-passes',
      section: 'games-this-week',
      skillArea: 'vision',
      bands: [AGE_BANDS[1]],
      sources: SOURCES,
      confidence: 70,
    });
  });

  it.each([
    [{ contentType: 'podcast' }, /is not a content type/],
    [{ section: 'shop' }, /is not a section/],
    [{ contentType: 'wellbeing-tool' }, /does not go in Games › This week/],
    [{ ageMin: 6 }, /not a range inside 8-18/],
    [{ ageMin: 14, ageMax: 12 }, /not a range inside 8-18/],
    [{ ageMax: 12.5 }, /not a range inside 8-18/],
    [{ sourceIds: [2, 99] }, /cites no source/],
    [{ summary: '   ' }, /missing the trend/],
    [{ outline: 'not a list' }, /missing the trend/],
    [{ title: '' }, /no title/],
  ])('rejects %j', (overrides, reason) => {
    const { accepted, rejected } = check(idea(overrides));
    expect(accepted).toEqual([]);
    expect(rejected[0].reason).toMatch(reason);
  });

  it('applies the game library safety rules to games but not to coaching knowledge', () => {
    const heading = { summary: 'Practise headers against a wall.' };
    expect(check(idea(heading)).rejected[0].reason).toMatch(/heading/);
    const knowledge = idea({
      ...heading,
      contentType: 'coaching-knowledge',
      section: 'coach-knowledge',
      title: 'Explain the heading limits kindly',
    });
    expect(check(knowledge).accepted).toHaveLength(1);
  });

  it.each([
    [{ outline: ['Last player standing wins.'] }, /elimination/],
    [{ summary: 'Do ten press-ups if you miss.' }, /penalty/],
    [{ contentType: 'match-mission', summary: 'Score a goal in your next match.' }, /process goal/],
    [
      {
        contentType: 'wellbeing-tool',
        section: 'wellbeing',
        summary: 'Call a helpline on 1800 55 1800.',
      },
      /helpline/,
    ],
  ])('rejects %j for breaking a content rule', (overrides, reason) => {
    expect(check(idea(overrides)).rejected[0].reason).toMatch(reason);
  });

  it('refuses ideas already suggested, already in the app, or repeated in the same run', () => {
    const issues = [
      {
        number: 7,
        title: 'Content idea: Shoulder Check Wall Pass (ages 11-13)',
        state: 'closed, not planned',
      },
      { number: 8, title: 'Different', state: 'open', key: 'practice-game/sole-roll-countdown' },
    ];
    const items = [{ type: 'practice-game' as const, name: 'Wall Wizard' }];
    const { accepted, rejected } = validateSuggestions(
      {
        suggestions: [
          idea(),
          idea({ title: 'Sole Roll Countdown' }),
          idea({ title: 'Wall Wizard' }),
          idea({ title: 'Scanning Square' }),
          idea({ title: 'Scanning Square Game' }),
        ],
      },
      context({ existingIssues: issues, existingItems: items }),
    );
    expect(accepted.map((s) => s.title)).toEqual(['Scanning Square']);
    expect(rejected.map((r) => r.reason)).toEqual([
      'it was already suggested in #7 (closed, not planned)',
      'it was already suggested in #8 (open)',
      'the app already has "Wall Wizard"',
      'it is the same idea as "Scanning Square" from this run',
    ]);
  });

  it('opens no more than the limit, and says why it left the rest out', () => {
    const many = ['One Touch Rondo', 'Gate Dribble Race', 'Shadow Pressing'].map((title) =>
      idea({ title }),
    );
    const result = validateSuggestions({ suggestions: many }, context({ maxIssues: 2 }));
    expect(result.accepted).toHaveLength(2);
    expect(result.rejected[0].reason).toBe('this run opens at most 2 issues');
  });

  it('fails when the answer is not a list of suggestions', () => {
    expect(() => validateSuggestions({ ideas: [] }, context())).toThrow(ScoutError);
  });

  it('compares titles by their words', () => {
    expect(similarity('Scan Before You Receive', 'Scan before receive')).toBeGreaterThan(0.6);
    expect(similarity('Wall Wizard', 'Gate Dribble Race')).toBe(0);
  });
});

describe('content scout text cleaning', () => {
  it('keeps model text to one line of plain, safe markdown', () => {
    const dirty =
      'Hi @coach\nsee [this](https://x.example) or https://y.example/z <script>x</script> ' +
      'a|b ‮evil​. Mail me@example.org';
    expect(cleanText(dirty, 500)).toBe(
      'Hi `@coach` see this or (link removed) &lt;script&gt;x&lt;/script&gt; a\\|b evil . ' +
        'Mail me@example.org',
    );
    expect(cleanText('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`);
    expect(cleanText(42, 10)).toBe('');
  });

  it('never leaves a mention live where the text is cut short', () => {
    expect(cleanText('aaaaa @someone', 9)).toBe('aaaaa `@s`…');
    expect(cleanText('fast <b>', 7)).toBe('fast &lt;…');
  });
});

describe('content scout issues', () => {
  const [suggestion] = check(idea()).accepted;
  const run = {
    date: '2026-11-22',
    model: 'gemini-3.8-flash',
    focus: 'scanning',
    queries: ['q (1)'],
  };

  it('says what to add, where, for which ages, and how to check it', () => {
    const resolved = {
      ...suggestion,
      sources: [
        { id: 1, title: 'England Football', uri: 'https://www.englandfootball.com/a(1)' },
        { id: 3, title: 'Study [2026]', uri: 'https://www.frontiersin.org/b' },
      ],
    };
    const runUrl = 'https://github.com/o/r/actions/runs/1';
    const draft = renderIssue(resolved, { ...run, runUrl });
    expect(draft.title).toBe('Content idea: Shoulder Check Wall Passes (ages 11-13)');
    expect(draft.labels).toEqual([
      'content-scout',
      'needs-human-review',
      'section: games',
      'age: 11-13',
    ]);
    expect(draft.body).toContain('AI-generated idea, not checked by a person yet');
    expect(draft.body).toContain('| **Content type** | Practice game |');
    expect(draft.body).toContain('| **Add it to** | Games › This week (`/games/`) |');
    expect(draft.body).toContain('`src/lib/game-library/games/vision.ts`');
    expect(draft.body).toContain('| **Ages** | 11-13 (Build band) |');
    expect(draft.body).toContain(
      '1. [England Football](https://www.englandfootball.com/a%281%29) (englandfootball.com)',
    );
    expect(draft.body).toContain('2. [Study \\[2026\\]](https://www.frontiersin.org/b)');
    expect(draft.body).toContain('<details><summary>Searches the research ran (1)</summary>');
    expect(draft.body).toContain('[q (1)](https://www.google.com/search?q=q%20%281%29)');
    expect(draft.body).toContain('| **Evidence** | 2 sources from 2 sites;');
    expect(draft.body).toContain('Right for ages 11-13, and safe for a child playing without');
    expect(draft.body).toMatch(/No heading, no elimination/);
    expect(draft.body).toContain(`[run log](${runUrl})`);
    expect(keyFromBody(draft.body)).toBe(suggestion.key);
  });

  it('names every age band an idea covers', () => {
    const [all] = check(idea({ ageMin: 8, ageMax: 18 })).accepted;
    const body = renderIssue(all, run).body;
    expect(body).toContain('| **Ages** | 8-18 (Explore, Build and Apply bands) |');
  });

  it('writes issue titles as plain text, since GitHub does not render them', () => {
    const [piped] = check(idea({ title: 'Rondo | 4 v 1 <fast>' })).accepted;
    expect(piped.title).toBe('Rondo \\| 4 v 1 &lt;fast&gt;');
    expect(renderIssue(piped, run).title).toBe('Content idea: Rondo | 4 v 1 <fast> (ages 11-13)');
  });

  it('gives knowledge-base ideas their own files and checks', () => {
    const [knowledge] = check(
      idea({
        contentType: 'coaching-knowledge',
        section: 'coach-knowledge',
        ageMin: 12,
        ageMax: 16,
      }),
    ).accepted;
    const draft = renderIssue(knowledge, run);
    expect(draft.labels).toEqual([
      'content-scout',
      'needs-human-review',
      'section: coach',
      'age: 11-13',
      'age: 14-18',
    ]);
    expect(draft.body).toContain('`context/<topic>.md`');
    expect(draft.body).toContain('12-16 (Build and Apply bands)');
    expect(draft.body).toContain('- [ ] Right for ages 12-16.\n');
    // Redirects that were not followed still count, and show, by their site.
    expect(draft.body).toContain('| **Evidence** | 2 sources from 2 sites;');
    expect(draft.body).toContain(`1. [englandfootball.com](${REDIRECT}AAA)\n`);
    expect(draft.body).not.toMatch(/No heading, no elimination/);
  });
});

describe('content scout GitHub client', () => {
  const options = { token: 't', repo: 'o/r', apiUrl: 'https://api.github.com' };

  it('lists earlier scout issues on every page, skipping pull requests', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: `T${i}`,
      state: 'open',
    }));
    const page2 = [
      {
        number: 200,
        title: 'Old',
        state: 'closed',
        state_reason: 'not_planned',
        body: '<!-- content-scout:v1 key=a/b -->',
      },
      { number: 201, title: 'PR', state: 'open', pull_request: {} },
    ];
    const pages = [page1, page2];
    const { fetch, calls } = mockFetch(() => json(200, pages.shift()));
    const issues = await gitHubClient({ ...options, fetch }).listScoutIssues();
    expect(issues).toHaveLength(101);
    expect(issues[100]).toEqual({
      number: 200,
      title: 'Old',
      state: 'closed, not planned',
      key: 'a/b',
    });
    expect(calls[0].url).toBe(
      'https://api.github.com/repos/o/r/issues?labels=content-scout&state=all&per_page=100&page=1',
    );
    expect(calls[0].headers.authorization).toBe('Bearer t');
  });

  it('creates only the labels that are missing, and tolerates a race', async () => {
    const { fetch, calls } = mockFetch((call) => {
      if (call.method === 'GET') return json(call.url.endsWith('/labels/a') ? 200 : 404, {});
      return json(call.body?.name === 'c' ? 422 : 201, {});
    });
    const specs = ['a', 'b', 'c'].map((name) => ({ name, color: '000000', description: name }));
    await gitHubClient({ ...options, fetch }).ensureLabels(specs);
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.body?.name)).toEqual(['b', 'c']);
  });

  it('opens an issue and reports GitHub refusals', async () => {
    const created = { number: 5, html_url: 'https://github.com/o/r/issues/5' };
    const ok = mockFetch(() => json(201, created));
    const draft = { title: 'T', body: 'B', labels: ['content-scout'] };
    expect(await gitHubClient({ ...options, fetch: ok.fetch }).createIssue(draft)).toEqual({
      number: 5,
      url: created.html_url,
    });
    expect(ok.calls[0].body).toEqual(draft);
    const refused = mockFetch(() => json(410, { message: 'Issues are disabled' }));
    const client = gitHubClient({ ...options, fetch: refused.fetch });
    await expect(client.createIssue(draft)).rejects.toThrow(
      /GitHub refused to open an issue \(410\)/,
    );
  });
});

describe('content scout run', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-scout-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  function world(suggestions: unknown[]): ReturnType<typeof mockFetch> {
    return mockFetch((call) => {
      const url = new URL(call.url);
      if (url.host === 'generativelanguage.googleapis.com') {
        return json(200, call.body?.tools ? RESEARCH_RESPONSE : suggestionsResponse(suggestions));
      }
      if (url.host === 'vertexaisearch.cloud.google.com') {
        return redirectTo(`https://real.example${url.pathname}`);
      }
      if (call.method === 'GET' && url.pathname.endsWith('/issues')) return json(200, []);
      if (call.method === 'GET') return json(404, {});
      return json(201, { number: 9, html_url: 'https://github.com/o/r/issues/9' });
    });
  }

  function deps(fetchFn: typeof fetch, log: string[]): ScoutDeps {
    return {
      fetch: fetchFn,
      sleep: async () => {},
      now: () => NOW,
      log: (line) => log.push(line),
      root: ROOT,
    };
  }

  const env = (extra: Record<string, string> = {}): Record<string, string> => ({
    GEMINI_RESEARCH_API_KEY: 'k',
    GITHUB_TOKEN: 't',
    GITHUB_REPOSITORY: 'o/r',
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary.md'),
    ...extra,
  });

  it('opens nothing in a dry run and shows the issues it would open', async () => {
    const heading = idea({ title: 'Header Ladder', summary: 'Headers.' });
    const { fetch, calls } = world([idea(), heading]);
    const log: string[] = [];
    expect(await main(['--dry-run'], env(), deps(fetch, log))).toBe(0);
    const writes = calls.filter((c) => c.method === 'POST' && c.url.includes('api.github.com'));
    expect(writes).toEqual([]);
    const summary = fs.readFileSync(path.join(dir, 'summary.md'), 'utf8');
    expect(summary).toContain('**Dry run: no issues were opened.**');
    expect(summary).toContain('Content idea: Shoulder Check Wall Passes (ages 11-13)');
    expect(summary).toContain('https://real.example/grounding-api-redirect/AAA');
    expect(summary).toContain('- Header Ladder: it mentions heading');
  });

  it('opens labelled issues for the ideas that pass', async () => {
    const { fetch, calls } = world([idea()]);
    const log: string[] = [];
    expect(await main([], env(), deps(fetch, log))).toBe(0);
    const posts = calls.filter((c) => c.method === 'POST' && c.url.includes('api.github.com'));
    expect(posts.map((c) => new URL(c.url).pathname)).toEqual([
      ...Array(4).fill('/repos/o/r/labels'),
      '/repos/o/r/issues',
    ]);
    expect(posts[4].body?.labels).toEqual([
      'content-scout',
      'needs-human-review',
      'section: games',
      'age: 11-13',
    ]);
    expect(log).toContain('Opened #9: https://github.com/o/r/issues/9');
  });

  it('fails clearly, without calling anyone, when there is no Gemini key', async () => {
    const { fetch, calls } = world([]);
    const log: string[] = [];
    const code = await main([], env({ GEMINI_RESEARCH_API_KEY: '' }), deps(fetch, log));
    expect(code).toBe(1);
    expect(calls).toEqual([]);
    expect(log[0]).toMatch(/^::error::No Gemini key/);
    expect(fs.readFileSync(path.join(dir, 'summary.md'), 'utf8')).toContain('**It failed:**');
  });

  it('checks itself without a key or the network', async () => {
    const { fetch, calls } = world([]);
    const log: string[] = [];
    expect(await main(['--check'], {}, deps(fetch, log))).toBe(0);
    expect(calls).toEqual([]);
    expect(log[0]).toMatch(/^Content scout check passed: \d+ games/);
  });

  it('reads its settings from the workflow', () => {
    const fromWorkflow = {
      GEMINI_FREE_API_KEY: 'f',
      MAX_ISSUES: '9',
      DRY_RUN: 'false',
      CONTENT_SCOUT_MODEL: 'models/x',
    };
    expect(readConfig([], fromWorkflow, NOW)).toMatchObject({
      keyName: 'GEMINI_FREE_API_KEY',
      maxIssues: 5,
      dryRun: false,
      model: 'x',
    });
    expect(readConfig([], { MAX_ISSUES: '' }, NOW).maxIssues).toBe(3);
    const manual = { DRY_RUN: 'true', CONTENT_SCOUT_FOCUS: ' goalkeeping ' };
    expect(readConfig([], manual, NOW)).toMatchObject({
      dryRun: true,
      focus: 'goalkeeping',
      model: 'gemini-3.8-flash',
    });
  });
});

describe('weekly content scout workflow', () => {
  const text = fs.readFileSync(path.join(ROOT, WORKFLOW), 'utf8');
  const doc = parse(text);
  const job = doc.jobs.scout;
  const steps: Step[] = job.steps;
  const action = (name: string): Step | undefined =>
    steps.find((s) => s.uses?.startsWith(`actions/${name}@`));

  it('can only read code and write issues', () => {
    expect(doc.permissions).toEqual({});
    expect(Object.keys(doc.jobs)).toEqual(['scout']);
    expect(job.permissions).toEqual({ contents: 'read', issues: 'write' });
  });

  it('pins every action to a commit, keeps no credentials and installs nothing', () => {
    const uses = text.split('\n').filter((l) => /^\s*(-\s+)?uses:/.test(l));
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    }
    expect(action('checkout')?.with?.['persist-credentials']).toBe(false);
    const node = action('setup-node');
    expect(node?.with?.['package-manager-cache']).toBe(false);
    expect(Number(node?.with?.['node-version'])).toBeGreaterThanOrEqual(24);
    expect(text).not.toMatch(/\bnpm (ci|install)\b/);
  });

  it('keeps expressions and secrets out of the shell script', () => {
    for (const step of steps) if (step.run) expect(step.run).not.toMatch(/\$\{\{/);
    expect(text).not.toMatch(/\balways\(\)/);
    const withSecrets = steps.filter((s) => JSON.stringify(s.env ?? {}).includes('secrets.'));
    expect(withSecrets).toHaveLength(1);
    expect(withSecrets[0].run).toBe('node scripts/content-scout/run.mjs');
  });

  it('runs weekly, and defaults to a dry run when started by hand', () => {
    expect(doc.on.schedule).toHaveLength(1);
    expect(doc.on.schedule[0].cron).toMatch(/^\d+ \d+ \* \* \d$/);
    expect(doc.on.workflow_dispatch.inputs.dry_run.default).toBe(true);
  });

  it('is checked on every push by CI', () => {
    const ci = parse(fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8'));
    const ciSteps: Step[] = ci.jobs['content-scout'].steps;
    expect(ciSteps.map((s) => s.run)).toContain('node scripts/content-scout/run.mjs --check');
  });
});
