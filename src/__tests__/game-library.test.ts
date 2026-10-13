import {
  GAME_LIBRARY,
  GAME_TWISTS,
  MATCH_MISSIONS,
  getLibraryStats,
  getWeeklyPlan,
} from '@/lib/game-library';
import { NO_DRILL } from '@/lib/game-library/no-twists';
import { fitsSlot, suitsPlayer, twistFits } from '@/lib/game-library/rotation';
import {
  BANNED_PHRASES,
  HEADING_TEXT,
  OUTCOME_PHRASES,
  US_SPELLINGS,
} from '@/lib/game-library/safety';
import { SKILL_AREAS } from '@/lib/game-library/skills';
import type { GameTwist, LibraryGame, MatchMission, PlayerProfile, SkillArea } from '@/types';

const ID_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKILL_IDS = SKILL_AREAS.map((s) => s.id);

function gameText(g: LibraryGame): string {
  return [g.name, g.setup, g.howToPlay, g.focus, g.easier, g.harder].join(' ');
}

function missionText(m: MatchMission): string {
  return [m.title, m.mission, m.why, m.afterMatch].join(' ');
}

function twistText(t: GameTwist): string {
  return `${t.name} ${t.rule}`;
}

function problemsIn(text: string): string[] {
  const found = BANNED_PHRASES.filter((b) => b.pattern.test(text)).map((b) => b.reason);
  if (US_SPELLINGS.test(text)) found.push('US spelling (use Australian/British English)');
  return found;
}

function inSkill(game: LibraryGame, skill: SkillArea): boolean {
  return game.skill === skill || (game.also?.includes(skill) ?? false);
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

describe('game library', () => {
  it('has unique, well-formed ids that start with their skill', () => {
    expect(unique(GAME_LIBRARY.map((g) => g.id))).toBe(true);
    GAME_LIBRARY.forEach((g) => {
      expect(g.id).toMatch(ID_FORMAT);
      expect(g.id.startsWith(`${g.skill}-`)).toBe(true);
    });
  });

  it('keeps each game to sensible sizes', () => {
    GAME_LIBRARY.forEach((g) => {
      expect(g.players[0]).toBeGreaterThanOrEqual(1);
      expect(g.players[1]).toBeGreaterThanOrEqual(g.players[0]);
      expect(g.players[1]).toBeLessThanOrEqual(22);
      expect(g.ages[0]).toBeGreaterThanOrEqual(8);
      expect(g.ages[1]).toBeGreaterThanOrEqual(g.ages[0]);
      expect(g.ages[1]).toBeLessThanOrEqual(18);
      expect(Number.isInteger(g.minutes)).toBe(true);
      expect(g.minutes).toBeGreaterThanOrEqual(3);
      expect(g.minutes).toBeLessThanOrEqual(30);
      expect(g.also ?? []).not.toContain(g.skill);
      expect(unique(g.also ?? [])).toBe(true);
    });
  });

  it('writes short, complete descriptions', () => {
    GAME_LIBRARY.forEach((g) => {
      expect(g.name.length).toBeLessThanOrEqual(36);
      expect(g.setup.length).toBeLessThanOrEqual(300);
      expect(g.howToPlay.length).toBeLessThanOrEqual(480);
      [g.focus, g.easier, g.harder].forEach((text) => expect(text.length).toBeLessThanOrEqual(170));
      [g.name, g.setup, g.howToPlay, g.focus, g.easier, g.harder].forEach((text) => {
        expect(text.trim()).toBe(text);
        expect(text.length).toBeGreaterThan(3);
      });
    });
  });

  it('keeps every game safe, kind and inclusive', () => {
    GAME_LIBRARY.forEach((g) => {
      expect({ id: g.id, problems: problemsIn(gameText(g)) }).toEqual({ id: g.id, problems: [] });
    });
  });

  it('has no heading practice, which is left to training with a coach', () => {
    GAME_LIBRARY.forEach((g) => {
      expect({ id: g.id, heading: HEADING_TEXT.test(gameText(g)) }).toEqual({
        id: g.id,
        heading: false,
      });
    });
    GAME_TWISTS.forEach((t) => expect(HEADING_TEXT.test(twistText(t))).toBe(false));
    MATCH_MISSIONS.forEach((m) => expect(HEADING_TEXT.test(missionText(m))).toBe(false));
  });

  it('has enough games for every skill at every age', () => {
    SKILL_IDS.forEach((skill) => {
      for (const age of [8, 10, 12, 14, 16, 18]) {
        const any = GAME_LIBRARY.filter(
          (g) => inSkill(g, skill) && suitsPlayer(g, age, 'advanced'),
        );
        const beginner = any.filter((g) => suitsPlayer(g, age, 'beginner'));
        expect({ skill, age, enough: any.length >= 6 }).toEqual({ skill, age, enough: true });
        expect({ skill, age, enough: beginner.length >= 4 }).toEqual({ skill, age, enough: true });
      }
    });
  });

  it('gives every skill games to play alone, with friends and with a team', () => {
    SKILL_IDS.forEach((skill) => {
      const games = GAME_LIBRARY.filter((g) => inSkill(g, skill));
      (['solo', 'friend', 'team'] as const).forEach((slot) => {
        const count = games.filter((g) => fitsSlot(g, slot)).length;
        expect({ skill, slot, enough: count >= 2 }).toEqual({ skill, slot, enough: true });
      });
    });
  });

  it('counts a way to play as a game as written, or with one twist that fits it', () => {
    const { games, waysToPlay } = getLibraryStats();
    const fitting = (g: LibraryGame): number =>
      GAME_TWISTS.filter((t) => twistFits(g, t, g.players[1])).length;
    expect(games).toBe(GAME_LIBRARY.length);
    expect(waysToPlay).toBe(GAME_LIBRARY.reduce((sum, g) => sum + 1 + fitting(g), 0));
  });

  it('names a plastic bottle the first time a bottle appears, never glass', () => {
    GAME_LIBRARY.forEach((g) => {
      const text = [g.setup, g.howToPlay, g.focus, g.easier, g.harder].join(' ');
      const first = /\b(\w+ )?bottles?\b/i.exec(text);
      if (first) {
        expect({ id: g.id, plastic: /^plastic /i.test(first[0]) }).toEqual({
          id: g.id,
          plastic: true,
        });
      }
    });
  });

  it('has enough players for the teams its set-up describes', () => {
    GAME_LIBRARY.forEach((g) => {
      const sizes = Array.from(g.setup.matchAll(/\b(\d+) v (\d+)\b/g)).map(
        (m) => Number(m[1]) + Number(m[2]),
      );
      if (sizes.length > 0) {
        expect({ id: g.id, enough: g.players[0] >= Math.min(...sizes) }).toEqual({
          id: g.id,
          enough: true,
        });
      }
    });
  });

  it('keeps shots and clocks out of games that say they are not about scoring', () => {
    const calm = /no winner|no score|do not count goals/i;
    const pressure = GAME_TWISTS.filter((t) =>
      ['pace', 'streak', 'scoring', 'handicap'].includes(t.kind),
    );
    const calmGames = GAME_LIBRARY.filter((g) => calm.test(`${g.setup} ${g.howToPlay}`));
    expect(calmGames.length).toBeGreaterThanOrEqual(2);
    calmGames.forEach((g) => {
      const fits = pressure.filter((t) => twistFits(g, t, g.players[1])).map((t) => t.id);
      expect({ id: g.id, fits }).toEqual({ id: g.id, fits: [] });
    });
  });
});

describe('game twists', () => {
  it('has unique, well-formed ids', () => {
    expect(unique(GAME_TWISTS.map((t) => t.id))).toBe(true);
    GAME_TWISTS.forEach((t) => {
      expect(t.id).toMatch(ID_FORMAT);
      expect(t.minPlayers).toBeGreaterThanOrEqual(1);
      expect(t.name.length).toBeLessThanOrEqual(30);
      expect(t.rule.length).toBeLessThanOrEqual(190);
      expect({ id: t.id, problems: problemsIn(twistText(t)) }).toEqual({ id: t.id, problems: [] });
    });
  });

  it('only names skills that exist', () => {
    GAME_TWISTS.forEach((t) => {
      if (t.skills !== 'all') t.skills.forEach((s) => expect(SKILL_IDS).toContain(s));
    });
  });

  it('fits plenty of games, and every game has plenty of twists', () => {
    GAME_TWISTS.forEach((t) => {
      const fits = GAME_LIBRARY.filter((g) => twistFits(g, t, g.players[1])).length;
      expect({ twist: t.id, enough: fits >= 5 }).toEqual({ twist: t.id, enough: true });
    });
    GAME_LIBRARY.forEach((g) => {
      const fits = GAME_TWISTS.filter((t) => twistFits(g, t, g.players[1])).length;
      // Watching a match or writing a plan has no drill to adjust, so it takes no twist. Three is
      // enough for a game that only comes round every few months.
      const needed = g.noTwists === NO_DRILL ? 0 : 3;
      expect({ game: g.id, enough: fits >= needed }).toEqual({ game: g.id, enough: true });
    });
  });

  it('gives a game with no drill no twist at all', () => {
    const noDrill = GAME_LIBRARY.filter((g) => g.noTwists === NO_DRILL);
    expect(noDrill.length).toBeGreaterThanOrEqual(2);
    noDrill.forEach((g) => {
      const fits = GAME_TWISTS.filter((t) => twistFits(g, t, g.players[1])).map((t) => t.id);
      expect({ id: g.id, fits }).toEqual({ id: g.id, fits: [] });
    });
  });

  it('only offers swap roles to games that have roles to swap', () => {
    const swap = GAME_TWISTS.find((t) => t.id === 'swap-roles')!;
    const roles = new RegExp(
      [
        'swap|rotate|roles?|jobs?|leader|caller|feeder|passer|thrower|holder|guide|captain',
        'goalkeeper|keeper|defender|attacker|shooter|runner|winger|finisher|receiver',
        'dribbler|teacher|gatekeepers?|shadow|guesser|collector|traffic light|neutral',
      ]
        .map((part) => `\\b(${part})\\b`)
        .join('|'),
      'i',
    );
    const withoutRoles = GAME_LIBRARY.filter(
      (g) => twistFits(g, swap, g.players[1]) && !roles.test(`${g.setup} ${g.howToPlay}`),
    ).map((g) => g.id);
    expect(withoutRoles).toEqual([]);
  });

  it('keeps rushing twists away from defending, goalkeeping and warm-up games', () => {
    const rush = GAME_TWISTS.filter((t) => ['beat-the-clock', 'five-seconds'].includes(t.id));
    expect(rush).toHaveLength(2);
    GAME_LIBRARY.filter((g) =>
      ['defending-1v1', 'team-defending', 'goalkeeping', 'athleticism'].includes(g.skill),
    ).forEach((g) => {
      const fits = rush.filter((t) => twistFits(g, t, g.players[1])).map((t) => t.id);
      expect({ id: g.id, fits }).toEqual({ id: g.id, fits: [] });
    });
  });

  it('asks for the right care when a twist adds players or tells players to carry on', () => {
    const byId = (id: string): GameTwist => GAME_TWISTS.find((t) => t.id === id)!;
    expect(byId('bounce-back').rule).toMatch(/pain/);
    expect(byId('add-a-keeper').rule).toMatch(/on the ground/);
    expect(byId('add-a-keeper').minAge).toBeGreaterThanOrEqual(10);
    expect(byId('add-a-defender').rule).toMatch(/no sliding, pushing or grabbing/);
    expect(byId('five-seconds').minAge).toBeGreaterThanOrEqual(10);
    expect(byId('quiet-game').rule).toMatch(/Shout “stop” if anyone is hurt/);
    expect(byId('squeeze-the-space').rule).toMatch(/make it bigger again/);
  });

  it('never tells players to stay quiet in a game that is played by calling out', () => {
    const quiet = GAME_TWISTS.find((t) => t.id === 'quiet-game')!;
    const calling = /\b(call|calls|called|calling|shout|shouts|say|says|speak|voice|talk|talks)\b/;
    GAME_LIBRARY.filter((g) => twistFits(g, quiet, g.players[1])).forEach((g) => {
      expect({ id: g.id, calls: calling.test(gameText(g).toLowerCase()) }).toEqual({
        id: g.id,
        calls: false,
      });
    });
  });

  it('never rushes or scores a game about landing, hopping, jumping or falling', () => {
    // "fall to your feet" is the ball, so only the player falling or landing counts.
    const risky = /\b(landing(?! zone)|land softly|hop|hops|hopping|jump|jumps|jumping|falling)\b/;
    GAME_LIBRARY.filter((g) => risky.test(gameText(g).toLowerCase())).forEach((g) => {
      const pace = GAME_TWISTS.filter((t) => ['pace', 'streak'].includes(t.kind));
      const fits = pace.filter((t) => twistFits(g, t, g.players[1])).map((t) => t.id);
      expect({ id: g.id, fits }).toEqual({ id: g.id, fits: [] });
    });
  });

});

describe('match missions', () => {
  it('has unique, well-formed ids and complete text', () => {
    expect(unique(MATCH_MISSIONS.map((m) => m.id))).toBe(true);
    MATCH_MISSIONS.forEach((m) => {
      expect(m.id).toMatch(ID_FORMAT);
      expect(m.id.startsWith(`${m.skill}-`)).toBe(true);
      expect(m.ages[0]).toBeGreaterThanOrEqual(8);
      expect(m.ages[1]).toBeLessThanOrEqual(18);
      expect(m.ages[1]).toBeGreaterThanOrEqual(m.ages[0]);
      expect(m.title.length).toBeLessThanOrEqual(48);
      expect(m.mission.length).toBeLessThanOrEqual(240);
      expect(m.why.length).toBeLessThanOrEqual(200);
      expect(m.afterMatch.length).toBeLessThanOrEqual(200);
    });
  });

  it('is about what a player controls, kindly worded and age-safe', () => {
    MATCH_MISSIONS.forEach((m) => {
      const text = missionText(m);
      const outcome = OUTCOME_PHRASES.filter((b) => b.pattern.test(text)).map((b) => b.reason);
      expect({ id: m.id, problems: [...problemsIn(text), ...outcome] }).toEqual({
        id: m.id,
        problems: [],
      });
    });
  });

  it('has missions for every skill at every age', () => {
    SKILL_IDS.forEach((skill) => {
      expect(MATCH_MISSIONS.filter((m) => m.skill === skill).length).toBeGreaterThanOrEqual(2);
      for (const age of [8, 12, 16]) {
        const count = MATCH_MISSIONS.filter(
          (m) => m.skill === skill && m.ages[0] <= age && age <= m.ages[1],
        ).length;
        expect({ skill, age, enough: count >= 1 }).toEqual({ skill, age, enough: true });
      }
    });
  });
});

describe('a year of weekly plans', () => {
  const positions: PlayerProfile['position'][] = [
    'goalkeeper',
    'defender',
    'midfielder',
    'forward',
  ];
  const goalSets: string[][] = [
    ['Improve my first touch', 'Be a better dribbler'],
    ['Score more goals'],
    ['Win more 1v1 battles', 'Press better'],
    ['Be faster', 'Stay calm', 'Communicate more'],
    ['Be the best I can be'],
    [],
  ];

  function profileFor(i: number): PlayerProfile {
    const ages = [8, 9, 11, 13, 14, 16, 18];
    return {
      name: 'Test',
      age: ages[i % ages.length],
      position: positions[i % positions.length],
      skillLevel: (['beginner', 'intermediate', 'advanced'] as const)[i % 3],
      goals: goalSets[i % goalSets.length],
      weaknesses: [],
    };
  }

  it('always gives four distinct, suitable games and a match mission', () => {
    for (let i = 0; i < 24; i += 1) {
      const profile = profileFor(i);
      for (let w = 0; w < 52; w += 1) {
        const plan = getWeeklyPlan(new Date(2026, 9, 12 + w * 7), profile);
        const label = `profile ${i}, week ${w}`;
        expect({ label, picks: plan.picks.length }).toEqual({ label, picks: 4 });
        expect(new Set(plan.picks.map((p) => p.game.id)).size).toBe(4);
        expect({ label, mission: plan.mission !== null }).toEqual({ label, mission: true });
        plan.picks.forEach((p) => {
          expect(suitsPlayer(p.game, profile.age, profile.skillLevel)).toBe(true);
        });
        if (plan.mission) {
          expect(plan.mission.ages[0]).toBeLessThanOrEqual(profile.age);
          expect(plan.mission.ages[1]).toBeGreaterThanOrEqual(profile.age);
        }
      }
    }
  });

  it('does not hand the same game to a player in two weeks running', () => {
    for (let i = 0; i < 24; i += 1) {
      const profile = profileFor(i);
      let previous = new Set<string>();
      for (let w = 0; w < 52; w += 1) {
        const plan = getWeeklyPlan(new Date(2026, 9, 12 + w * 7), profile);
        const current = new Set(plan.picks.map((p) => p.game.id));
        const repeats = [...current].filter((id) => previous.has(id));
        expect({ profile: i, week: w, repeats }).toEqual({ profile: i, week: w, repeats: [] });
        previous = current;
      }
    }
  });
});
