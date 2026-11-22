// Calls the Gemini API over plain REST, so the workflow installs no packages. The key travels
// in a header, never in the URL, so it cannot end up in a log line.

export const DEFAULT_MODEL = 'gemini-3.8-flash';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 180_000;
const RETRY_DELAYS_MS = [10_000, 30_000];
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_SOURCES = 30;
const MAX_EVIDENCE = 40;
const MAX_QUERIES = 12;
export const REDIRECT_HOST = 'vertexaisearch.cloud.google.com';

// A failure the maintainer can act on. The message is shown as-is in the workflow log.
export class ScoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoutError';
  }
}

export interface GeminiConfig {
  apiKey: string;
  keyName: string;
  model: string;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
}

export interface GeminiPrompt {
  system: string;
  user: string;
}

export interface Usage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  toolUsePromptTokenCount?: number;
  totalTokenCount?: number;
}

interface Part {
  text?: string;
  thought?: boolean;
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: { web?: { uri?: string; title?: string } }[];
  groundingSupports?: { segment?: { text?: string }; groundingChunkIndices?: number[] }[];
}

interface Candidate {
  content?: { parts?: Part[] };
  finishReason?: string;
  groundingMetadata?: GroundingMetadata;
}

export interface GenerateResponse {
  candidates?: Candidate[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: Usage;
}

export interface Source {
  id: number;
  title: string;
  uri: string;
}

export interface Evidence {
  text: string;
  sourceIds: number[];
}

export interface Research {
  brief: string;
  sources: Source[];
  evidence: Evidence[];
  queries: string[];
  usage?: Usage;
}

interface ApiErrorBody {
  error?: { message?: string; details?: { reason?: string }[] };
}

export function explainGeminiError(
  status: number,
  body: string,
  config: Pick<GeminiConfig, 'keyName' | 'model'>,
): string {
  let parsed: ApiErrorBody = {};
  try {
    parsed = JSON.parse(body) as ApiErrorBody;
  } catch {
    // Not JSON (a proxy page, say): fall back to the raw text below.
  }
  const message = (parsed.error?.message ?? body).replace(/\s+/g, ' ').trim().slice(0, 300);
  const reasons = (parsed.error?.details ?? []).map((d) => d.reason);
  const key = config.keyName;
  if (reasons.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
    return (
      `${key} only works from the website (it is restricted to the site's address), so ` +
      "GitHub's servers cannot use it. Create a key restricted to \"Gemini API only\" and save " +
      'it as the GEMINI_RESEARCH_API_KEY secret (see docs/content-scout.md).'
    );
  }
  if (reasons.includes('API_KEY_INVALID') || /api key not valid/i.test(message)) {
    return `${key} is not a valid Gemini API key. Check the secret (see docs/content-scout.md).`;
  }
  if (status === 403) {
    return (
      `Gemini refused ${key} (403: ${message}). Gemini rejects unrestricted keys, so restrict ` +
      'it to "Gemini API only" in Google AI Studio (see docs/content-scout.md).'
    );
  }
  if (status === 404) {
    return (
      `Gemini has no model called "${config.model}" (404). Set the CONTENT_SCOUT_MODEL ` +
      'repository variable to a current model.'
    );
  }
  if (status === 429) {
    return (
      `Gemini's quota or rate limit was reached for ${key} (429: ${message}). Google Search ` +
      "grounding is not part of the free tier for Gemini 3 models, so the key's project may " +
      'need billing turned on (see docs/content-scout.md).'
    );
  }
  return `Gemini answered ${status}: ${message}`;
}

async function generate(
  config: GeminiConfig,
  prompt: GeminiPrompt,
  extra: Record<string, unknown>,
): Promise<GenerateResponse> {
  const url = `${API_BASE}/${encodeURIComponent(config.model)}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
    ...extra,
  });
  for (let attempt = 0; ; attempt += 1) {
    const retry = attempt < RETRY_DELAYS_MS.length;
    let response: Response;
    try {
      response = await config.fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      if (retry) {
        await config.sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new ScoutError(`Could not reach Gemini: ${reason}`);
    }
    if (response.ok) return (await response.json()) as GenerateResponse;
    const text = await response.text();
    if (retry && RETRY_STATUSES.has(response.status)) {
      await config.sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    throw new ScoutError(explainGeminiError(response.status, text, config));
  }
}

function answer(response: GenerateResponse, step: string): { text: string; candidate: Candidate } {
  const blocked = response.promptFeedback?.blockReason;
  if (blocked) throw new ScoutError(`Gemini blocked the ${step} prompt (${blocked}).`);
  const candidate = response.candidates?.[0];
  if (!candidate) throw new ScoutError(`Gemini gave no answer in the ${step} step.`);
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new ScoutError(`Gemini stopped the ${step} step early (${candidate.finishReason}).`);
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();
  if (!text) throw new ScoutError(`Gemini's ${step} answer was empty.`);
  return { text, candidate };
}

export function parseResearch(response: GenerateResponse): Research {
  const { text, candidate } = answer(response, 'research');
  const meta = candidate.groundingMetadata ?? {};
  // A source keeps its chunk's position as its number, because the evidence refers to chunks
  // by position.
  const sources = (meta.groundingChunks ?? []).slice(0, MAX_SOURCES).flatMap((chunk, i) => {
    const uri = chunk.web?.uri ?? '';
    if (!uri.startsWith('https://')) return [];
    return [{ id: i + 1, title: (chunk.web?.title ?? '').trim() || hostname(uri), uri }];
  });
  const known = new Set(sources.map((s) => s.id));
  const evidence = (meta.groundingSupports ?? [])
    .flatMap((support) => {
      const said = (support.segment?.text ?? '').trim();
      const ids = (support.groundingChunkIndices ?? []).map((i) => i + 1);
      const sourceIds = [...new Set(ids)].filter((id) => known.has(id));
      return said && sourceIds.length ? [{ text: said, sourceIds }] : [];
    })
    .slice(0, MAX_EVIDENCE);
  const queries = (meta.webSearchQueries ?? [])
    .filter((q): q is string => typeof q === 'string' && q.trim() !== '')
    .map((q) => q.trim())
    .slice(0, MAX_QUERIES);
  return { brief: text, sources, evidence, queries, usage: response.usageMetadata };
}

export async function research(config: GeminiConfig, prompt: GeminiPrompt): Promise<Research> {
  // The model decides for itself whether to search. One more try before giving up, because a
  // trend summary without sources is the model's memory, not this week's research.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const found = parseResearch(await generate(config, prompt, { tools: [{ google_search: {} }] }));
    if (found.sources.length) return found;
  }
  throw new ScoutError(
    'The research step came back without any web sources twice, so Google Search grounding ' +
      'did not run. Check that the model supports it and that the key has a paid tier ' +
      '(see docs/content-scout.md).',
  );
}

export async function suggest(
  config: GeminiConfig,
  prompt: GeminiPrompt,
  schema: unknown,
): Promise<{ value: unknown; usage?: Usage }> {
  const response = await generate(config, prompt, {
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema },
  });
  const { text } = answer(response, 'suggestion');
  try {
    return { value: JSON.parse(text) as unknown, usage: response.usageMetadata };
  } catch {
    throw new ScoutError("Gemini's suggestions were not valid JSON.");
  }
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Search results arrive as Google redirect links. Following one shows the page itself, which is
// what a reviewer needs to open to check the claim. Any failure keeps the redirect link.
export async function resolveSourceUrl(uri: string, fetchFn: typeof fetch): Promise<string> {
  if (hostname(uri) !== REDIRECT_HOST) return uri;
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetchFn(uri, {
        method,
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      await response.body?.cancel();
      const location = response.headers.get('location') ?? '';
      if (/^https?:\/\//i.test(location)) return new URL(location).toString();
    } catch {
      // Try the next method, then keep the redirect link.
    }
  }
  return uri;
}
