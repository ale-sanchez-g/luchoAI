import {
  BANNED_PHRASES,
  CONTACT_NOTE,
  HEADING_TEXT,
  OUTCOME_PHRASES,
  SHOOTING_NOTE,
  US_SPELLINGS,
  profileMentionsHeading,
  safetyNotes,
} from '@/lib/game-library/safety';
import type { LibraryGame, PlayerProfile } from '@/types';

function reasonsFor(text: string): string[] {
  return BANNED_PHRASES.filter((b) => b.pattern.test(text)).map((b) => b.reason);
}

const PROFILE: PlayerProfile = {
  name: 'Sam',
  age: 12,
  position: 'midfielder',
  skillLevel: 'beginner',
  goals: [],
  weaknesses: [],
};

describe('banned phrases', () => {
  it.each([
    'The last player standing wins.',
    'Anyone who is knocked out sits out for a round.',
    "If you're out, wait by the cone.",
    'Do ten push-ups if you miss.',
    'Run a lap as a forfeit.',
    'Players who lose get a punishment.',
    "Don't be such a loser.",
    'Toughen up and play through the pain.',
    'Go and destroy them.',
    'Play in the street outside your house.',
    'Practise on the driveway.',
    'Try a sliding tackle.',
    'You’re out if you miss.',
    'You are out when the ball goes wide.',
    'The last team standing wins.',
    'Sit it out for a round.',
    'Everyone starts with three lives.',
    'Do ten squats if you lose a point.',
    'Hold a plank if you drop the ball.',
    'Close your eyes and pass.',
    'Play with your eyes closed.',
    'Just shake it off and keep going.',
    'Play through the pain.',
  ])('flags “%s”', (text) => {
    expect(reasonsFor(text).length).toBeGreaterThan(0);
  });

  it.each([
    'Play Traffic Lights: green means go, red means stop.',
    'Use your weaker foot for every pass.',
    'The ball is heading towards the goal.',
    'Swap roles every two minutes so nobody waits.',
    'Stop if anything hurts and tell a grown-up.',
    'Pass through the gate and play through the middle.',
    'Keep your eyes on the ball.',
    'Open your eyes wide and look around.',
  ])('allows “%s”', (text) => {
    expect(reasonsFor(text)).toEqual([]);
  });
});

describe('heading', () => {
  it.each([
    'Practise your heading.',
    'Jump for the header.',
    'Head the ball back to your partner.',
    'Win the aerial ball.',
    'Win the head balls.',
    'He headed the ball clear.',
  ])('spots “%s”', (text) => {
    expect(HEADING_TEXT.test(text)).toBe(true);
  });

  it.each([
    'Keep your head up and look around.',
    'The ball is heading for the goal.',
    'Head to the next cone.',
    'Take a new route to the cone.',
  ])('leaves “%s” alone', (text) => {
    expect(HEADING_TEXT.test(text)).toBe(false);
  });

  it('notices when a player asks for heading practice, in goals or areas to improve', () => {
    expect(profileMentionsHeading({ ...PROFILE, goals: ['Better heading'] })).toBe(true);
    expect(profileMentionsHeading({ ...PROFILE, weaknesses: ['Winning headers'] })).toBe(true);
    expect(profileMentionsHeading({ ...PROFILE, goals: ['Better passing'] })).toBe(false);
    expect(profileMentionsHeading(null)).toBe(false);
  });

  it('copes with a damaged profile', () => {
    const damaged = { ...PROFILE, goals: 'heading', weaknesses: [7, null] };
    expect(profileMentionsHeading(damaged as unknown as PlayerProfile)).toBe(false);
  });
});

describe('match mission wording', () => {
  it.each([
    'Win the match for your team.',
    'Try to score two goals.',
    'Keep a clean sheet.',
    'Be the best player on the pitch.',
    'Try scoring a goal.',
    'Make three saves.',
    'Rate yourself out of ten.',
  ])('flags the outcome in “%s”', (text) => {
    expect(OUTCOME_PHRASES.some((o) => o.pattern.test(text))).toBe(true);
  });

  it('allows process goals', () => {
    const text = 'Try to look up three times before you pass, and shoot early when you can.';
    expect(OUTCOME_PHRASES.some((o) => o.pattern.test(text))).toBe(false);
  });
});

describe('house spelling', () => {
  it('flags US spellings but not the Australian ones', () => {
    expect(US_SPELLINGS.test('Pick a color for the center cone.')).toBe(true);
    expect(US_SPELLINGS.test('Pick a colour for the centre cone and practise.')).toBe(false);
  });
});

describe('safety notes', () => {
  const solo: LibraryGame = {
    id: 'dribbling-example',
    name: 'Example',
    skill: 'dribbling',
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup: 'Set out six cones in a line.',
    howToPlay: 'Dribble through the cones and time your run.',
    focus: 'Keep the ball close.',
    easier: 'Space the cones wider.',
    harder: 'Use only your weaker foot.',
  };

  it('adds nothing to a ball-skills game with no opponents or shots', () => {
    expect(safetyNotes(solo)).toEqual([]);
  });

  it('reminds players to play the ball, not the player, when there are defenders', () => {
    const game = {
      ...solo,
      players: [2, 2] as [number, number],
      setup: 'A defender stands in a lane.',
    };
    expect(safetyNotes(game)).toEqual([CONTACT_NOTE]);
  });

  it('does not warn a lone player about a cone called a defender', () => {
    expect(safetyNotes({ ...solo, setup: 'Put a cone down as your defender.' })).toEqual([]);
  });

  it('reminds players to check behind the goal when there is shooting', () => {
    const game = { ...solo, howToPlay: 'Take ten shots at the goal.' };
    expect(safetyNotes(game)).toEqual([SHOOTING_NOTE]);
  });

  it('can give both reminders', () => {
    const game = {
      ...solo,
      players: [2, 2] as [number, number],
      howToPlay: 'The defender chases and you shoot.',
    };
    expect(safetyNotes(game)).toEqual([CONTACT_NOTE, SHOOTING_NOTE]);
  });
});
