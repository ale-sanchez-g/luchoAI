import type {
  DecisionThemeId,
  FocusSource,
  GameTwist,
  LibraryGame,
  MatchMission,
  PickReason,
  PlayerProfile,
  PlaySlot,
  SkillArea,
  SkillLevel,
  WeeklyPick,
  WeeklyPlan,
} from '@/types';
import { POSITION_SKILLS, SKILL_AREAS, skillsFromList } from './skills';

const MS_PER_DAY = 86_400_000;
// A Monday, so every week runs Monday to Sunday.
const WEEK_ANCHOR_DAY = Date.UTC(2024, 0, 1) / MS_PER_DAY;
const MIN_AGE = 8;
const MAX_AGE = 18;
// With no profile we don't know the age, so assume a young player: age-restricted games must
// never turn up by accident.
const FALLBACK_AGE = 11;
const MAX_FOCUS_SKILLS = 6;
const GROUP_MIN_PLAYERS = 4;
const GROUP_TYPICAL_PLAYERS = 6;
// A skill needs at least this many games of its own before we draw only from them; with fewer,
// its deck would come round every few weeks, so related games join the pool.
const MIN_DECK = 3;
const LEVEL_RANK: Record<SkillLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };

const QUIZ_THEME_FOR_SKILL: Partial<Record<SkillArea, DecisionThemeId>> = {
  'first-touch': 'first-touch',
  movement: 'space',
  'defending-1v1': 'press',
  'team-defending': 'defend-together',
  transitions: 'counter',
  finishing: 'shoot',
};

export interface RotationInput {
  date: Date;
  profile: PlayerProfile | null;
  games: LibraryGame[];
  twists: GameTwist[];
  missions: MatchMission[];
  themeIds: DecisionThemeId[];
}

type Slot = 'solo' | 'friend' | 'team';

const SLOTS: Slot[] = ['solo', 'friend', 'team'];

interface FocusPlan {
  skills: SkillArea[];
  source: FocusSource;
  goalSkills: SkillArea[];
  positionSkills: SkillArea[];
}

// What has been played so far, rebuilt by replaying every week since the start date.
interface RotationState {
  used: Set<string>;
  lastWeek: Set<string>;
  timesPicked: Map<string, number>;
  focusCount: Map<SkillArea, number>;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A stable shuffle: the order depends only on the ids and the salt, never on how the library
// happens to be sorted, so the same pool always produces the same "deck". Each id is hashed once
// up front, because hashing inside the comparator made every shuffle about ten times slower.
function shuffled<T extends { id: string }>(items: T[], salt: string): T[] {
  return items
    .map((item) => ({ item, key: hash(`${salt}:${item.id}`) }))
    .sort((a, b) => a.key - b.key || a.item.id.localeCompare(b.item.id))
    .map(({ item }) => item);
}

function clampAge(age: number | undefined): number {
  if (age === undefined || !Number.isFinite(age)) return FALLBACK_AGE;
  return Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(age)));
}

/** Whole weeks since Monday 1 January 2024, counted in the player's local time. */
export function weekIndex(date: Date): number {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;
  return Math.floor((day - WEEK_ANCHOR_DAY) / 7);
}

/** Local midnight on the Monday that starts the given week. */
export function weekStart(index: number): Date {
  return new Date(2024, 0, 1 + index * 7);
}

/** Whether a game suits a player's age and skill level. Age is never relaxed. */
export function suitsPlayer(game: LibraryGame, age: number, level: SkillLevel): boolean {
  return (
    game.ages[0] <= age && age <= game.ages[1] && LEVEL_RANK[game.level] <= LEVEL_RANK[level]
  );
}

/** Solo games work alone; friend games with two or three; team games with four or more. */
export function fitsSlot(game: LibraryGame, slot: PlaySlot): boolean {
  const [min, max] = game.players;
  if (slot === 'solo') return min === 1;
  if (slot === 'friend') return min <= 3 && max >= 2;
  if (slot === 'team') return max >= GROUP_MIN_PLAYERS;
  return true;
}

function playersFor(game: LibraryGame, slot: PlaySlot): number {
  const [min, max] = game.players;
  if (slot === 'solo') return 1;
  if (slot === 'friend') return Math.min(max, Math.max(min, 2));
  if (slot === 'team') return Math.min(max, Math.max(min, GROUP_TYPICAL_PLAYERS));
  return min;
}

/** Whether a twist makes sense for a game when this many players are on the pitch. */
export function twistFits(game: LibraryGame, twist: GameTwist, players: number): boolean {
  if (twist.skills !== 'all' && !twist.skills.includes(game.skill)) return false;
  if (twist.except?.includes(game.id) || game.noTwists?.includes(twist.kind)) return false;
  return players >= twist.minPlayers;
}

/** Every game once as written, plus once for each twist that fits it. */
export function countWaysToPlay(games: LibraryGame[], twists: GameTwist[]): number {
  return games.reduce(
    (total, game) =>
      total + 1 + twists.filter((t) => twistFits(game, t, game.players[1])).length,
    0,
  );
}

function planFocus(profile: PlayerProfile | null): FocusPlan {
  const everySkill = SKILL_AREAS.map((s) => s.id);
  if (!profile) {
    return { skills: everySkill, source: 'rotation', goalSkills: [], positionSkills: [] };
  }
  // The profile comes straight from localStorage, so don't trust its shape.
  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const areas = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const positionSkills = POSITION_SKILLS[profile.position] ?? [];
  const goalSkills = skillsFromList([...goals, ...areas]).slice(0, MAX_FOCUS_SKILLS);
  if (goalSkills.length > 0) {
    return { skills: goalSkills, source: 'goals', goalSkills, positionSkills };
  }
  if (positionSkills.length > 0) {
    return { skills: positionSkills, source: 'position', goalSkills, positionSkills };
  }
  return { skills: everySkill, source: 'rotation', goalSkills, positionSkills };
}

function reasonFor(game: LibraryGame, plan: FocusPlan): PickReason {
  const skills = [game.skill, ...(game.also ?? [])];
  if (skills.some((s) => plan.goalSkills.includes(s))) return 'goal';
  if (skills.some((s) => plan.positionSkills.includes(s))) return 'position';
  return 'new';
}

// A skill's own games come first. Games from other skills that list it as a secondary skill only
// join when the skill has too few games of its own for a deck that stays fresh.
function skillPool(games: LibraryGame[], skill: SkillArea): LibraryGame[] {
  const own = games.filter((g) => g.skill === skill);
  if (own.length >= MIN_DECK) return own;
  return [...own, ...games.filter((g) => g.skill !== skill && g.also?.includes(skill))];
}

// Takes the first game in the deck that fits and has not been played this round. When every
// fitting game has been played, a new round starts, but this week's and last week's games stay
// "played" so they can't come straight back.
function takeNext(
  deck: LibraryGame[],
  fits: (game: LibraryGame) => boolean,
  state: RotationState,
  thisWeek: ReadonlySet<string>,
): LibraryGame | null {
  const candidates = deck.filter(fits);
  const free = (): LibraryGame | undefined =>
    candidates.find((g) => !thisWeek.has(g.id) && !state.used.has(g.id));
  let game = free();
  if (!game && candidates.length > 0) {
    candidates.forEach((g) => {
      if (!state.lastWeek.has(g.id) && !thisWeek.has(g.id)) state.used.delete(g.id);
    });
    game = free();
  }
  return game ?? null;
}

function pickTwist(
  game: LibraryGame,
  slot: PlaySlot,
  twists: GameTwist[],
  occurrence: number,
  age: number,
  level: SkillLevel,
): GameTwist | null {
  const players = playersFor(game, slot);
  const fitting = twists.filter(
    (t) =>
      twistFits(game, t, players) &&
      LEVEL_RANK[t.level] <= LEVEL_RANK[level] &&
      age >= (t.minAge ?? MIN_AGE),
  );
  if (fitting.length === 0) return null;
  const deck = shuffled(fitting, `twist:${game.id}`);
  return deck[mod(occurrence, deck.length)];
}

function pickMission(
  missions: MatchMission[],
  focus: SkillArea,
  age: number,
  occurrence: number,
): MatchMission | null {
  const suitable = missions.filter((m) => m.ages[0] <= age && age <= m.ages[1]);
  const onFocus = suitable.filter((m) => m.skill === focus);
  const pool = onFocus.length > 0 ? onFocus : suitable;
  if (pool.length === 0) return null;
  const deck = shuffled(pool, `mission:${focus}`);
  return deck[mod(occurrence, deck.length)];
}

/**
 * Builds one week of games for a player. Nothing is stored: the same date and profile always
 * give the same plan, and it changes every Monday.
 *
 * Each week has a focus skill taken from the player's goals (or position, or a rotation of
 * everything when there is no profile). Three slots cover real life (alone, with a friend,
 * with a group) and a wildcard slot offers something outside the focus so players try new things.
 *
 * To make sure a game never comes back before the rest have had a turn, the plan replays every
 * week since the start date: each skill hands out its games in a fixed shuffled order, one round
 * at a time. That is cheap (a few hundred steps) and needs no saved history.
 */
export function buildWeeklyPlan(input: RotationInput): WeeklyPlan {
  const { date, profile, games, twists, missions, themeIds } = input;
  const target = weekIndex(date);
  const age = clampAge(profile?.age);
  const level: SkillLevel = profile?.skillLevel ?? 'beginner';
  const eligible = games.filter((g) => suitsPlayer(g, age, level));
  const plan = planFocus(profile);

  const useGoalsAndPosition = plan.source === 'goals' && plan.positionSkills.length > 0;
  const skillAt = (list: SkillArea[], n: number): SkillArea => list[mod(n, list.length)];
  const slotSkillsAt = (w: number): Record<Slot, SkillArea> => ({
    solo: skillAt(plan.skills, w),
    friend: skillAt(plan.skills, w + 1),
    team: useGoalsAndPosition ? skillAt(plan.positionSkills, w) : skillAt(plan.skills, w + 2),
  });

  const focusSet = new Set<SkillArea>([...plan.skills, ...plan.positionSkills]);
  const skillDecks = new Map<SkillArea, LibraryGame[]>();
  const skillDeck = (skill: SkillArea): LibraryGame[] => {
    let deck = skillDecks.get(skill);
    if (!deck) {
      deck = shuffled(skillPool(eligible, skill), `deck:${skill}`);
      skillDecks.set(skill, deck);
    }
    return deck;
  };
  const focusDeck = shuffled(
    eligible.filter((g) => focusSet.has(g.skill)),
    'deck:focus',
  );
  const anyDeck = shuffled(eligible, 'deck:any');
  const wildcardOrder = shuffled(eligible, 'deck:wildcard');

  // Something new comes from skills the player has not asked for, so it never overlaps the
  // week's own picks. With no profile, every skill takes a turn, so we also steer clear of the
  // skills in use last week and next week.
  const avoidAt = (w: number): Set<SkillArea> => {
    const avoid = new Set<SkillArea>([...plan.goalSkills, ...plan.positionSkills]);
    if (plan.source === 'rotation') {
      [w - 1, w, w + 1].forEach((n) => Object.values(slotSkillsAt(n)).forEach((s) => avoid.add(s)));
    }
    return avoid;
  };

  const state: RotationState = {
    used: new Set(),
    lastWeek: new Set(),
    timesPicked: new Map(),
    focusCount: new Map(),
  };
  let chosen: { slot: PlaySlot; game: LibraryGame }[] = [];
  let focus: SkillArea = plan.skills[0];

  for (let w = Math.min(0, target); w <= target; w += 1) {
    const slotSkills = slotSkillsAt(w);
    const thisWeek = new Set<string>();
    chosen = [];
    const choose = (slot: PlaySlot, game: LibraryGame | null): void => {
      if (!game) return;
      thisWeek.add(game.id);
      state.used.add(game.id);
      state.timesPicked.set(game.id, (state.timesPicked.get(game.id) ?? 0) + 1);
      chosen.push({ slot, game });
    };

    for (const slot of SLOTS) {
      const fits = (g: LibraryGame): boolean => fitsSlot(g, slot);
      const lastResort = anyDeck.find((g) => fits(g) && !thisWeek.has(g.id)) ?? null;
      choose(
        slot,
        takeNext(skillDeck(slotSkills[slot]), fits, state, thisWeek) ??
          takeNext(focusDeck, fits, state, thisWeek) ??
          takeNext(anyDeck, fits, state, thisWeek) ??
          lastResort,
      );
    }

    const avoid = avoidAt(w);
    const outsideFocus = wildcardOrder.filter((g) => !avoid.has(g.skill));
    const always = (): boolean => true;
    choose(
      'wildcard',
      takeNext(outsideFocus, always, state, thisWeek) ??
        takeNext(wildcardOrder, always, state, thisWeek),
    );

    state.lastWeek = thisWeek;
    focus = slotSkills.solo;
    state.focusCount.set(focus, (state.focusCount.get(focus) ?? 0) + 1);
  }

  const picks: WeeklyPick[] = chosen.map(({ slot, game }) => ({
    slot,
    game,
    twist: pickTwist(game, slot, twists, (state.timesPicked.get(game.id) ?? 1) - 1, age, level),
    reason: reasonFor(game, plan),
  }));

  return {
    week: target,
    startsOn: weekStart(target),
    focus,
    focusSource: plan.source,
    picks,
    mission: pickMission(missions, focus, age, (state.focusCount.get(focus) ?? 1) - 1),
    quizTheme:
      QUIZ_THEME_FOR_SKILL[focus] ??
      (themeIds.length > 0 ? themeIds[mod(target, themeIds.length)] : 'space'),
  };
}
