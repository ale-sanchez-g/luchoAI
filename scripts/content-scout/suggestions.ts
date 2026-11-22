import { DECISION_THEMES } from '@/lib/decision-games';
import { BANNED_PHRASES, HEADING_TEXT, OUTCOME_PHRASES } from '@/lib/game-library/safety';
import { SKILL_AREAS } from '@/lib/game-library/skills';
import { SKILL_LEVELS } from '@/lib/skill-levels';
import type { DecisionThemeId, SkillArea, SkillLevel } from '@/types';
import {
  bandsFor,
  CONTENT_TYPES,
  MAX_AGE,
  MIN_AGE,
  PLAYER_SLOTS,
  SECTIONS,
  type AgeBand,
  type ContentTypeId,
  type PlayersSlot,
  type Screen,
  type SectionId,
} from './catalogue';
import { ScoutError, type Source } from './gemini';
import type { ExistingItem } from './inventory';

// Everything the model writes is checked here before it can become an issue. The model is
// told the rules too, but a rule only counts once code enforces it.

export interface Suggestion {
  key: string;
  title: string;
  contentType: ContentTypeId;
  section: SectionId;
  skillArea?: SkillArea;
  gameIqTheme?: DecisionThemeId;
  players?: PlayersSlot;
  level?: SkillLevel;
  ageMin: number;
  ageMax: number;
  bands: AgeBand[];
  trend: string;
  summary: string;
  outline: string[];
  whyNow: string;
  safety: string;
  sources: Source[];
  confidence?: number;
}

export interface ExistingIssue {
  number: number;
  title: string;
  state: string;
  key?: string;
}

export interface Rejection {
  title: string;
  reason: string;
}

export interface ValidationContext {
  sources: Source[];
  existingIssues: ExistingIssue[];
  existingItems: ExistingItem[];
  maxIssues: number;
}

export interface ValidationResult {
  accepted: Suggestion[];
  rejected: Rejection[];
}

const LIMITS = {
  title: 80,
  trend: 400,
  summary: 900,
  outlineItem: 240,
  outlineItems: 8,
  whyNow: 500,
  safety: 400,
};

const HELPLINE_TEXT = /\bhelplines?\b|\bhotlines?\b|\b\d{2,4}[ -]\d{3,4}[ -]\d{3,4}\b/i;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'in',
  'of',
  'on',
  'the',
  'to',
  'with',
  'you',
  'your',
  'game',
]);

function isInvisible(code: number): boolean {
  return (
    code < 0x20 ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0xad ||
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2060 && code <= 0x2064) ||
    code === 0xfeff
  );
}

// Model text ends up in issues and in the run summary. One line of plain text each: no HTML,
// no links (sources come from the search results only), no table-breaking pipes, and no
// @mentions, which would notify real GitHub users.
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const visible = Array.from(value, (ch) => (isInvisible(ch.codePointAt(0) ?? 0) ? ' ' : ch));
  const plain = visible
    .join('')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\bhttps?:\/\/\S+/gi, '(link removed)')
    .replace(/\s+/g, ' ')
    .trim();
  // Shorten before escaping, so the cut can never split an escape or a wrapped @mention.
  const short = plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
  return short
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|')
    .replace(/(^|[^\w`])@([A-Za-z0-9][A-Za-z0-9-]*)/g, '$1`@$2`');
}

// Issue titles are shown as plain text, so the markdown escapes would show there.
export function plainTitle(text: string): string {
  return text.replace(/\\\|/g, '|').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function words(text: string): Set<string> {
  return new Set(
    slug(text)
      .split('-')
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w)),
  );
}

// Share of distinct words two titles have in common (Jaccard). "Scan before you receive" and
// "Scan before receiving" share most of theirs; two different games rarely share half.
export function similarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / (x.size + y.size - shared);
}

// Issue titles read "Content idea: <title> (ages 8-10)"; compare the <title> part.
export function coreTitle(issueTitle: string): string {
  return issueTitle.replace(/^content idea:\s*/i, '').replace(/\s*\(ages? [^)]*\)\s*$/i, '');
}

function screen(screens: Screen[], text: string): string | null {
  if (screens.includes('heading') && HEADING_TEXT.test(text)) {
    return 'it mentions heading, and the games have no heading anywhere (docs/game-library.md)';
  }
  if (screens.includes('kindness')) {
    const hit = BANNED_PHRASES.find((p) => p.pattern.test(text));
    if (hit) return `it breaks a game-library rule: ${hit.reason}`;
  }
  if (screens.includes('process-goal')) {
    const hit = OUTCOME_PHRASES.find((p) => p.pattern.test(text));
    if (hit) return `it is not a process goal: ${hit.reason}`;
  }
  if (screens.includes('no-helplines') && HELPLINE_TEXT.test(text)) {
    return 'it mentions a helpline or phone number, and those are only added by hand';
  }
  return null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkItem(item: unknown, ctx: ValidationContext): Suggestion | string {
  if (!isRecord(item)) return 'it was not an object';
  const title = cleanText(item.title, LIMITS.title);
  if (!title) return 'it had no title';
  const type = CONTENT_TYPES.find((t) => t.id === item.contentType);
  if (!type) return `"${cleanText(String(item.contentType), 40)}" is not a content type`;
  const section = SECTIONS.find((s) => s.id === item.section);
  if (!section) return `"${cleanText(String(item.section), 40)}" is not a section`;
  if (!type.sections.includes(section.id)) {
    return `a ${type.name.toLowerCase()} does not go in ${section.name}`;
  }
  const { ageMin, ageMax } = item;
  if (
    typeof ageMin !== 'number' ||
    typeof ageMax !== 'number' ||
    !Number.isInteger(ageMin) ||
    !Number.isInteger(ageMax) ||
    ageMin < MIN_AGE ||
    ageMax > MAX_AGE ||
    ageMin > ageMax
  ) {
    return `its ages are not a range inside ${MIN_AGE}-${MAX_AGE}`;
  }
  const trend = cleanText(item.trend, LIMITS.trend);
  const summary = cleanText(item.summary, LIMITS.summary);
  const whyNow = cleanText(item.whyNow, LIMITS.whyNow);
  const safety = cleanText(item.safety, LIMITS.safety);
  const outline = (Array.isArray(item.outline) ? item.outline : [])
    .map((line) => cleanText(line, LIMITS.outlineItem))
    .filter(Boolean)
    .slice(0, LIMITS.outlineItems);
  if (!trend || !summary || !whyNow || !safety || !outline.length) {
    return 'it was missing the trend, summary, outline, why-now or safety text';
  }
  const ids = Array.isArray(item.sourceIds) ? item.sourceIds : [];
  const sources = ctx.sources.filter((s) => ids.includes(s.id));
  if (!sources.length) return 'it cites no source from the research, so nobody could check it';
  const problem = screen(type.screens, [title, summary, ...outline].join(' '));
  if (problem) return problem;
  const confidence = item.confidence;
  return {
    key: `${type.id}/${slug(title)}`,
    title,
    contentType: type.id,
    section: section.id,
    skillArea: oneOf(
      item.skillArea,
      SKILL_AREAS.map((s) => s.id),
    ),
    gameIqTheme: oneOf(
      item.gameIqTheme,
      DECISION_THEMES.map((t) => t.id),
    ),
    players: oneOf(item.players, Object.keys(PLAYER_SLOTS) as PlayersSlot[]),
    level: oneOf(item.level, SKILL_LEVELS),
    ageMin,
    ageMax,
    bands: bandsFor(ageMin, ageMax),
    trend,
    summary,
    outline,
    whyNow,
    safety,
    sources,
    confidence:
      typeof confidence === 'number' &&
      Number.isInteger(confidence) &&
      confidence >= 1 &&
      confidence <= 100
        ? confidence
        : undefined,
  };
}

function duplicateOf(s: Suggestion, ctx: ValidationContext, accepted: Suggestion[]): string | null {
  const issue = ctx.existingIssues.find(
    (i) => i.key === s.key || similarity(coreTitle(i.title), s.title) >= 0.6,
  );
  if (issue) return `it was already suggested in #${issue.number} (${issue.state})`;
  const item = ctx.existingItems.find(
    (i) => i.type === s.contentType && similarity(i.name, s.title) >= 0.75,
  );
  if (item) return `the app already has "${item.name}"`;
  const twin = accepted.find((a) => a.key === s.key || similarity(a.title, s.title) >= 0.6);
  if (twin) return `it is the same idea as "${twin.title}" from this run`;
  return null;
}

export function validateSuggestions(raw: unknown, ctx: ValidationContext): ValidationResult {
  const list = isRecord(raw) && Array.isArray(raw.suggestions) ? raw.suggestions : null;
  if (!list) throw new ScoutError("Gemini's answer had no list of suggestions.");
  const accepted: Suggestion[] = [];
  const rejected: Rejection[] = [];
  for (const item of list) {
    const result = checkItem(item, ctx);
    const title = isRecord(item) ? cleanText(item.title, LIMITS.title) || '(untitled)' : '(?)';
    if (typeof result === 'string') {
      rejected.push({ title, reason: result });
      continue;
    }
    const duplicate = duplicateOf(result, ctx, accepted);
    if (duplicate) rejected.push({ title, reason: duplicate });
    else if (accepted.length >= ctx.maxIssues) {
      rejected.push({ title, reason: `this run opens at most ${ctx.maxIssues} issues` });
    } else accepted.push(result);
  }
  return { accepted, rejected };
}
