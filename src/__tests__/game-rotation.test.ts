import {
  buildWeeklyPlan,
  countWaysToPlay,
  fitsSlot,
  suitsPlayer,
  twistFits,
  weekIndex,
  weekStart,
} from '@/lib/game-library/rotation';
import {
  POSITION_SKILLS,
  SKILL_AREAS,
  skillsFromList,
  skillsFromText,
} from '@/lib/game-library/skills';
import type {
  DecisionThemeId,
  GameTwist,
  LibraryGame,
  MatchMission,
  PlayerProfile,
  SkillArea,
  WeeklyPlan,
} from '@/types';

function makeGame(
  id: string,
  skill: SkillArea,
  overrides: Partial<LibraryGame> = {},
): LibraryGame {
  return {
    id,
    name: id,
    skill,
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup: 'Set up.',
    howToPlay: 'Play.',
    focus: 'Focus.',
    easier: 'Easier.',
    harder: 'Harder.',
    ...overrides,
  };
}

const FIXTURE_SKILLS: SkillArea[] = [
  'first-touch',
  'finishing',
  'passing',
  'dribbling',
  'taking-on',
  'defending-1v1',
  'team-defending',
  'vision',
  'movement',
];

const GAMES: LibraryGame[] = [
  ...FIXTURE_SKILLS.flatMap((skill) =>
    [1, 2, 3, 4].flatMap((n) => [
      makeGame(`${skill}-solo-${n}`, skill),
      makeGame(`${skill}-friend-${n}`, skill, { players: [2, 3] }),
      makeGame(`${skill}-team-${n}`, skill, { players: [6, 12] }),
    ]),
  ),
  makeGame('passing-older', 'passing', { players: [1, 3], ages: [14, 18] }),
  makeGame('passing-young', 'passing', { players: [2, 4], ages: [8, 10] }),
  makeGame('finishing-advanced', 'finishing', { level: 'advanced' }),
];

const TWISTS: GameTwist[] = [
  {
    id: 'any',
    name: 'Any',
    kind: 'mindset',
    rule: 'Anything.',
    skills: 'all',
    minPlayers: 1,
    level: 'beginner',
  },
  {
    id: 'pair',
    name: 'Pair',
    kind: 'scoring',
    rule: 'Two.',
    skills: 'all',
    minPlayers: 2,
    level: 'beginner',
  },
  {
    id: 'hard',
    name: 'Hard',
    kind: 'touches',
    rule: 'Hard.',
    skills: ['first-touch'],
    minPlayers: 1,
    level: 'advanced',
    minAge: 13,
  },
];

const MISSIONS: MatchMission[] = [
  mission('first-touch-all', 'first-touch', [8, 18]),
  mission('first-touch-young', 'first-touch', [8, 10]),
  mission('finishing-all', 'finishing', [8, 18]),
  mission('passing-older', 'passing', [14, 18]),
];

function mission(id: string, skill: SkillArea, ages: [number, number]): MatchMission {
  return {
    id,
    title: id,
    mission: 'Do it.',
    why: 'It helps.',
    afterMatch: 'How did it go?',
    skill,
    ages,
  };
}

const THEMES: DecisionThemeId[] = [
  'space',
  'first-touch',
  'press',
  'defend-together',
  'counter',
  'shoot',
];

const PROFILE: PlayerProfile = {
  name: 'Sam',
  age: 12,
  position: 'midfielder',
  skillLevel: 'beginner',
  goals: ['Improve my first touch', 'Score more goals'],
  weaknesses: [],
};

// Monday 12 October 2026 is week 145.
function plan(weeksAhead = 0, profile: PlayerProfile | null = PROFILE): WeeklyPlan {
  return buildWeeklyPlan({
    date: new Date(2026, 9, 12 + weeksAhead * 7),
    profile,
    games: GAMES,
    twists: TWISTS,
    missions: MISSIONS,
    themeIds: THEMES,
  });
}

function ids(p: WeeklyPlan): string[] {
  return p.picks.map((pick) => pick.game.id);
}

describe('weekIndex and weekStart', () => {
  it('starts each week on Monday and ends it on Sunday night', () => {
    expect(weekIndex(new Date(2024, 0, 1))).toBe(0);
    expect(weekIndex(new Date(2024, 0, 7, 23, 59))).toBe(0);
    expect(weekIndex(new Date(2024, 0, 8))).toBe(1);
    expect(weekIndex(new Date(2026, 9, 12))).toBe(145);
    expect(weekIndex(new Date(2026, 9, 18, 23, 59))).toBe(145);
    expect(weekIndex(new Date(2026, 9, 19))).toBe(146);
  });

  it('turns a week number back into the Monday that starts it', () => {
    const monday = weekStart(145);
    expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2026, 9, 12]);
    expect(monday.getDay()).toBe(1);
  });
});

describe('skillsFromText', () => {
  it.each([
    ['Improve my first touch', ['first-touch']],
    ['Score more goals', ['finishing']],
    ['Be a better dribbler and passer', ['passing', 'dribbling']],
    ['Focus on my shooting', ['finishing']],
    ['Stay focused for the whole game', ['teamwork']],
    ['I want to press higher up the pitch', ['team-defending']],
    ['Be faster and fitter', ['athleticism']],
    ['Get better at heading the ball', []],
    ['Stay calm when I make mistakes', ['teamwork']],
    ['Communicate more with my team', ['teamwork']],
  ])('reads "%s"', (text, expected) => {
    expect(skillsFromText(text)).toEqual(expected);
  });

  it('treats 1v1 as both attacking and defending', () => {
    expect(skillsFromText('Win more 1v1 battles')).toEqual(
      expect.arrayContaining(['taking-on', 'defending-1v1']),
    );
  });

  it('does not match inside other words', () => {
    expect(skillsFromText('I want to impress my coach and play ahead of the ball')).toEqual([]);
  });

  it('keeps the player order across a list and drops repeats', () => {
    const goals = ['Better passing', 'Improve my touch', 'Passing under pressure'];
    expect(skillsFromList(goals)).toEqual(['passing', 'first-touch']);
  });

  it('ignores entries that are not text', () => {
    expect(skillsFromList(['Dribbling', null as unknown as string])).toEqual(['dribbling']);
  });
});

describe('game filters', () => {
  it('never relaxes age and only offers levels the player has reached', () => {
    const advanced = makeGame('x', 'finishing', { level: 'advanced', ages: [12, 14] });
    expect(suitsPlayer(advanced, 13, 'advanced')).toBe(true);
    expect(suitsPlayer(advanced, 13, 'intermediate')).toBe(false);
    expect(suitsPlayer(advanced, 11, 'advanced')).toBe(false);
    expect(suitsPlayer(advanced, 15, 'advanced')).toBe(false);
  });

  it('sorts games by who can play them', () => {
    const solo = makeGame('a', 'passing', { players: [1, 3] });
    const pair = makeGame('b', 'passing', { players: [2, 2] });
    const team = makeGame('c', 'passing', { players: [4, 10] });
    expect([solo, pair, team].map((g) => fitsSlot(g, 'solo'))).toEqual([true, false, false]);
    expect([solo, pair, team].map((g) => fitsSlot(g, 'friend'))).toEqual([true, true, false]);
    expect([solo, pair, team].map((g) => fitsSlot(g, 'team'))).toEqual([false, false, true]);
  });

  it('only suggests twists that fit the skill and the number of players', () => {
    const touch = makeGame('t', 'first-touch');
    const [any, pair, hard] = TWISTS;
    expect(twistFits(touch, any, 1)).toBe(true);
    expect(twistFits(touch, pair, 1)).toBe(false);
    expect(twistFits(touch, pair, 2)).toBe(true);
    expect(twistFits(makeGame('p', 'passing'), hard, 1)).toBe(false);
    expect(twistFits(touch, { ...any, except: ['t'] }, 1)).toBe(false);
  });

  it('lets a game opt out of a whole kind of twist', () => {
    const [any, pair] = TWISTS;
    const gentle = makeGame('g', 'first-touch', { players: [1, 4], noTwists: ['mindset'] });
    expect(twistFits(gentle, any, 1)).toBe(false);
    expect(twistFits(gentle, pair, 2)).toBe(true);
  });

  it('counts each game once as written plus once per fitting twist', () => {
    const touch = makeGame('t', 'first-touch', { players: [1, 4] });
    const passing = makeGame('p', 'passing', { players: [1, 1] });
    // touch: plain + any + pair + hard = 4; passing: plain + any = 2
    expect(countWaysToPlay([touch, passing], TWISTS)).toBe(6);
  });
});

describe('buildWeeklyPlan', () => {
  it('stays the same all week and changes on Monday', () => {
    const early = buildWeeklyPlan({
      date: new Date(2026, 9, 12, 6, 0),
      profile: PROFILE,
      games: GAMES,
      twists: TWISTS,
      missions: MISSIONS,
      themeIds: THEMES,
    });
    const late = buildWeeklyPlan({
      date: new Date(2026, 9, 18, 23, 30),
      profile: PROFILE,
      games: GAMES,
      twists: TWISTS,
      missions: MISSIONS,
      themeIds: THEMES,
    });
    expect(ids(late)).toEqual(ids(early));
    expect(early.week).toBe(145);
    expect(ids(plan(1))).not.toEqual(ids(early));
  });

  it('is the same whatever order the library is written in', () => {
    const reversed = buildWeeklyPlan({
      date: new Date(2026, 9, 12),
      profile: PROFILE,
      games: [...GAMES].reverse(),
      twists: [...TWISTS].reverse(),
      missions: [...MISSIONS].reverse(),
      themeIds: THEMES,
    });
    expect(ids(reversed)).toEqual(ids(plan()));
    expect(reversed.picks.map((p) => p.twist?.id)).toEqual(plan().picks.map((p) => p.twist?.id));
    expect(reversed.mission?.id).toBe(plan().mission?.id);
  });

  it('gives a game for being alone, with a friend and with a team, plus something new', () => {
    const { picks } = plan();
    expect(picks.map((p) => p.slot)).toEqual(['solo', 'friend', 'team', 'wildcard']);
    expect(new Set(ids(plan())).size).toBe(4);
    expect(fitsSlot(picks[0].game, 'solo')).toBe(true);
    expect(fitsSlot(picks[1].game, 'friend')).toBe(true);
    expect(fitsSlot(picks[2].game, 'team')).toBe(true);
  });

  it('always labels the wildcard as something new, even if it touches a goal skill', () => {
    const touchy = [
      makeGame('first-touch-solo-x', 'first-touch'),
      makeGame('first-touch-friend-x', 'first-touch', { players: [2, 3] }),
      makeGame('first-touch-group-x', 'first-touch', { players: [6, 12] }),
      makeGame('creativity-also-goal', 'creativity', { also: ['first-touch'] }),
    ];
    const result = buildWeeklyPlan({
      date: new Date(2026, 9, 12),
      profile: { ...PROFILE, goals: ['First touch'] },
      games: touchy,
      twists: TWISTS,
      missions: MISSIONS,
      themeIds: THEMES,
    });
    const wildcard = result.picks.find((p) => p.slot === 'wildcard');
    expect(wildcard?.reason).toBe('new');
  });

  it('rotates the weekly focus through the player goals', () => {
    const focuses = [0, 1, 2, 3].map((w) => plan(w).focus);
    expect(focuses[0]).not.toBe(focuses[1]);
    expect(focuses[0]).toBe(focuses[2]);
    expect(focuses[1]).toBe(focuses[3]);
    expect(new Set(focuses)).toEqual(new Set(['first-touch', 'finishing']));
    expect(plan().focusSource).toBe('goals');
    const solo = plan().picks[0];
    expect(solo.game.skill).toBe(plan().focus);
    expect(solo.reason).toBe('goal');
  });

  it('gives every game a turn, even ones that fit every slot', () => {
    const flexible = Array.from({ length: 12 }, (_, i) =>
      makeGame(`first-touch-flex-${i}`, 'first-touch', { players: [1, 6] }),
    );
    const everyGame = flexible.map((g) => g.id);
    [0, 1, 2, 5].forEach((offset) => {
      const seen = new Set<string>();
      for (let w = offset; w < offset + 6; w += 1) {
        buildWeeklyPlan({
          date: new Date(2026, 9, 12 + w * 7),
          profile: { ...PROFILE, goals: ['First touch'] },
          games: flexible,
          twists: TWISTS,
          missions: MISSIONS,
          themeIds: THEMES,
        }).picks.forEach((p) => seen.add(p.game.id));
      }
      expect([...seen].sort()).toEqual(everyGame.sort());
    });
  });

  it('does not hand a player the same game two weeks running', () => {
    const profiles: (PlayerProfile | null)[] = [
      PROFILE,
      { ...PROFILE, goals: ['First touch'] },
      { ...PROFILE, goals: ['Better passing', 'Win more 1v1 battles', 'Press better'] },
      { ...PROFILE, goals: ['Be the best I can be'], position: 'defender' },
      null,
    ];
    profiles.forEach((profile, i) => {
      let previous = new Set<string>();
      for (let w = 0; w < 52; w += 1) {
        const current = new Set(ids(plan(w, profile)));
        const repeats = [...current].filter((id) => previous.has(id));
        expect({ profile: i, week: w, repeats }).toEqual({ profile: i, week: w, repeats: [] });
        previous = current;
      }
    });
  });

  it('plays each game in a skill once before any comes round again', () => {
    const counts = new Map<string, number>();
    for (let w = 0; w < 16; w += 1) {
      const solo = plan(w).picks[0];
      counts.set(solo.game.id, (counts.get(solo.game.id) ?? 0) + 1);
    }
    // Two goals share the weeks, so each skill's 4 solo games get 4 turns in 16 weeks.
    const turns = [...counts.values()];
    expect(turns).toHaveLength(8);
    expect(Math.max(...turns) - Math.min(...turns)).toBeLessThanOrEqual(1);
  });

  it('keeps a single-goal player on their goal with a new game every week', () => {
    const single: PlayerProfile = { ...PROFILE, goals: ['First touch'] };
    const solos = Array.from({ length: 8 }, (_, w) => plan(w, single).picks[0].game.id);
    solos.slice(1).forEach((id, i) => expect(id).not.toBe(solos[i]));
    expect(new Set(solos).size).toBe(4);
    expect(plan(0, single).focus).toBe('first-touch');
  });

  it('only offers games that suit the age and level, for every age and level', () => {
    const levels = ['beginner', 'intermediate', 'advanced'] as const;
    for (let age = 8; age <= 18; age += 1) {
      for (const skillLevel of levels) {
        const profile: PlayerProfile = { ...PROFILE, age, skillLevel };
        for (let w = 0; w < 12; w += 1) {
          plan(w, profile).picks.forEach((pick) => {
            expect(suitsPlayer(pick.game, age, skillLevel)).toBe(true);
          });
        }
      }
    }
  });

  it('keeps age-restricted games away from younger players, even when they ask for them', () => {
    const wantsPassing: PlayerProfile = { ...PROFILE, age: 12, goals: ['Better passing'] };
    for (let w = 0; w < 20; w += 1) {
      expect(ids(plan(w, wantsPassing))).not.toContain('passing-older');
      expect(ids(plan(w, null))).not.toContain('passing-older');
    }
    const older: PlayerProfile = { ...wantsPassing, age: 15 };
    const seen = Array.from({ length: 20 }, (_, w) => ids(plan(w, older))).flat();
    expect(seen).toContain('passing-older');
  });

  it('uses the position when the goals do not name a skill', () => {
    const vague: PlayerProfile = { ...PROFILE, goals: ['Be the best I can be'], weaknesses: [] };
    const result = plan(0, vague);
    expect(result.focusSource).toBe('position');
    expect(POSITION_SKILLS.midfielder).toContain(result.focus);
    expect(result.picks.length).toBeGreaterThanOrEqual(3);
  });

  it('rotates through every skill when there is no profile', () => {
    const seen = new Set<SkillArea>();
    for (let w = 0; w < SKILL_AREAS.length; w += 1) {
      const result = plan(w, null);
      expect(result.focusSource).toBe('rotation');
      seen.add(result.focus);
    }
    expect(seen.size).toBe(SKILL_AREAS.length);
    plan(0, null).picks.forEach((pick) => expect(pick.reason).toBe('new'));
  });

  it('only adds twists that fit the players, level and age', () => {
    const beginner = { ...PROFILE, age: 12, skillLevel: 'beginner' as const };
    for (let w = 0; w < 30; w += 1) {
      plan(w, beginner).picks.forEach((pick) => {
        if (pick.slot === 'solo') expect(pick.twist?.minPlayers ?? 1).toBeLessThanOrEqual(1);
        expect(pick.twist?.id).not.toBe('hard');
      });
    }
  });

  it('suggests a match mission that suits the age and prefers the focus skill', () => {
    const young: PlayerProfile = { ...PROFILE, age: 9, goals: ['First touch'] };
    const result = plan(0, young);
    expect(result.mission?.skill).toBe('first-touch');
    const older: PlayerProfile = { ...PROFILE, age: 16, goals: ['Better passing'] };
    expect(plan(0, older).mission?.id).toBe('passing-older');
    expect(plan(0, { ...older, age: 9 }).mission?.ages[0]).toBeLessThanOrEqual(9);
  });

  it('links the focus to a Game IQ round, or rotates the rounds', () => {
    const touch: PlayerProfile = { ...PROFILE, goals: ['First touch'] };
    expect(plan(0, touch).quizTheme).toBe('first-touch');
    const composure: PlayerProfile = { ...PROFILE, goals: ['Stay calm'] };
    const first = plan(0, composure);
    expect(THEMES[first.week % THEMES.length]).toBe(first.quizTheme);
    expect(plan(1, composure).quizTheme).not.toBe(first.quizTheme);
  });

  it('copes with a damaged saved profile', () => {
    const damaged = { name: 'X', age: 'ten', position: 'striker' } as unknown as PlayerProfile;
    const result = plan(0, damaged);
    expect(result.picks.length).toBeGreaterThanOrEqual(3);
    result.picks.forEach((pick) => expect(suitsPlayer(pick.game, 11, 'beginner')).toBe(true));
  });

  it('returns an empty week rather than failing when nothing suits', () => {
    const result = buildWeeklyPlan({
      date: new Date(2026, 9, 12),
      profile: { ...PROFILE, goals: ['Stay calm'] },
      games: [],
      twists: [],
      missions: [],
      themeIds: [],
    });
    expect(result.picks).toEqual([]);
    expect(result.mission).toBeNull();
    expect(result.quizTheme).toBe('space');
  });
});
