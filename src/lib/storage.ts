import { SKILL_LEVELS } from './skill-levels';
import { FREE_PLAN_LIMIT, FREE_QUESTION_LIMIT } from './free-key';
import type {
  PlayerProfile,
  AIProviderConfig,
  WellbeingCheckIn,
  BalanceArea,
  BestScores,
  DecisionThemeId,
} from '@/types';

const KEYS = {
  API_KEY: 'luchoai_api_key',
  PLAYER_PROFILE: 'luchoai_player_profile',
  PROVIDER_CONFIG: 'luchoai_provider_config',
  WELLBEING_CHECKINS: 'luchoai_wellbeing_checkins',
  GAME_SCORES: 'luchoai_game_scores',
  FREE_QUESTIONS_USED: 'luchoai_free_questions_used',
  FREE_PLANS_USED: 'luchoai_free_plans_used',
} as const;

const MAX_CHECKINS = 30;
const MAX_MOOD_LEVEL = 5;
const MAX_BALANCE_LEVEL = 3;

// Check-in validation lives here rather than in lib/wellbeing.ts so that every page using
// storage doesn't also bundle the wellbeing copy. The Record type makes the compiler flag
// this list whenever a BalanceArea is added.
const BALANCE_AREA_KEYS: Record<BalanceArea, true> = {
  sleep: true,
  football: true,
  school: true,
  people: true,
  fun: true,
};

function isLevel(value: unknown, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max;
}

function isCheckIn(value: unknown): value is WellbeingCheckIn {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  if (typeof c.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return false;
  if (!isLevel(c.mood, MAX_MOOD_LEVEL) || typeof c.proudOf !== 'string') return false;
  if (typeof c.balance !== 'object' || c.balance === null) return false;
  const balance = c.balance as Record<string, unknown>;
  return Object.keys(BALANCE_AREA_KEYS).every((area) => isLevel(balance[area], MAX_BALANCE_LEVEL));
}

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEYS.API_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEYS.API_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(KEYS.API_KEY);
}

export function getProviderConfig(): AIProviderConfig | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.PROVIDER_CONFIG);
  if (raw) {
    try {
      return JSON.parse(raw) as AIProviderConfig;
    } catch {
      return null;
    }
  }
  // Backwards compat: migrate old anthropic-only key
  const legacyKey = localStorage.getItem(KEYS.API_KEY);
  if (legacyKey) {
    return { provider: 'anthropic', model: 'claude-opus-4-8', apiKey: legacyKey };
  }
  return null;
}

export function setProviderConfig(config: AIProviderConfig): void {
  localStorage.setItem(KEYS.PROVIDER_CONFIG, JSON.stringify(config));
  if (config.provider === 'anthropic') {
    localStorage.setItem(KEYS.API_KEY, config.apiKey);
  }
}

export function clearProviderConfig(): void {
  localStorage.removeItem(KEYS.PROVIDER_CONFIG);
  localStorage.removeItem(KEYS.API_KEY);
}

export const PROFILE_MIN_AGE = 8;
export const PROFILE_MAX_AGE = 18;
export const PROFILE_MAX_NAME_LENGTH = 50;
export const PROFILE_MAX_ENTRY_LENGTH = 500;
export const PROFILE_MAX_ENTRIES = 5;

const POSITIONS: PlayerProfile['position'][] = ['goalkeeper', 'defender', 'midfielder', 'forward'];

function cleanEntries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().slice(0, PROFILE_MAX_ENTRY_LENGTH))
    .filter(Boolean)
    .slice(0, PROFILE_MAX_ENTRIES);
}

// The stored profile can come from an older version or be edited by hand, so rebuild it from
// known-good fields instead of trusting its shape: a bad value must not blank the profile page.
function normalizeProfile(value: unknown): PlayerProfile | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const age = typeof p.age === 'number' && Number.isFinite(p.age) ? Math.round(p.age) : 12;
  return {
    name: typeof p.name === 'string' ? p.name.trim().slice(0, PROFILE_MAX_NAME_LENGTH) : '',
    age: Math.min(PROFILE_MAX_AGE, Math.max(PROFILE_MIN_AGE, age)),
    position: POSITIONS.find((pos) => pos === p.position) ?? 'midfielder',
    skillLevel: SKILL_LEVELS.find((lvl) => lvl === p.skillLevel) ?? 'beginner',
    goals: cleanEntries(p.goals),
    weaknesses: cleanEntries(p.weaknesses),
  };
}

export function getPlayerProfile(): PlayerProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.PLAYER_PROFILE);
  if (!raw) return null;
  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function setPlayerProfile(profile: PlayerProfile): void {
  localStorage.setItem(KEYS.PLAYER_PROFILE, JSON.stringify(normalizeProfile(profile)));
}

export function getCheckIns(): WellbeingCheckIn[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEYS.WELLBEING_CHECKINS);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCheckIn) : [];
  } catch {
    return [];
  }
}

/** Saves a check-in, replacing any from the same day. Returns history oldest → newest. */
export function saveCheckIn(checkIn: WellbeingCheckIn): WellbeingCheckIn[] {
  const updated = [...getCheckIns().filter((c) => c.date !== checkIn.date), checkIn]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_CHECKINS);
  localStorage.setItem(KEYS.WELLBEING_CHECKINS, JSON.stringify(updated));
  return updated;
}

export function clearCheckIns(): void {
  localStorage.removeItem(KEYS.WELLBEING_CHECKINS);
}

export function getBestScores(): BestScores {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(KEYS.GAME_SCORES);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const scores: BestScores = {};
    for (const [themeId, score] of Object.entries(parsed)) {
      if (typeof score === 'number') scores[themeId as DecisionThemeId] = score;
    }
    return scores;
  } catch {
    return {};
  }
}

/** Records a round score only if it beats the stored best. Returns the up-to-date best scores. */
export function saveBestScore(themeId: DecisionThemeId, score: number): BestScores {
  const scores = getBestScores();
  const previous = scores[themeId];
  if (previous !== undefined && previous >= score) return scores;
  const updated = { ...scores, [themeId]: score };
  localStorage.setItem(KEYS.GAME_SCORES, JSON.stringify(updated));
  return updated;
}

/** Counted in the browser only, so it limits honest use rather than stopping a determined one. */
export function getFreeQuestionsLeft(): number {
  if (typeof window === 'undefined') return 0;
  const used = Number(localStorage.getItem(KEYS.FREE_QUESTIONS_USED));
  return Math.max(0, FREE_QUESTION_LIMIT - (Number.isFinite(used) ? used : 0));
}

export function spendFreeQuestion(): void {
  const used = FREE_QUESTION_LIMIT - getFreeQuestionsLeft();
  localStorage.setItem(KEYS.FREE_QUESTIONS_USED, String(used + 1));
}

export function getFreePlansLeft(): number {
  if (typeof window === 'undefined') return 0;
  const used = Number(localStorage.getItem(KEYS.FREE_PLANS_USED));
  return Math.max(0, FREE_PLAN_LIMIT - (Number.isFinite(used) ? used : 0));
}

export function spendFreePlan(): void {
  const used = FREE_PLAN_LIMIT - getFreePlansLeft();
  localStorage.setItem(KEYS.FREE_PLANS_USED, String(used + 1));
}
