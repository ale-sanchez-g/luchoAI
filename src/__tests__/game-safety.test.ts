import {
  BANNED_PHRASES,
  HEADING_TEXT,
  OUTCOME_PHRASES,
  US_SPELLINGS,
  profileMentionsHeading,
} from '@/lib/game-library/safety';
import type { PlayerProfile } from '@/types';

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
  ])('flags “%s”', (text) => {
    expect(reasonsFor(text).length).toBeGreaterThan(0);
  });

  it.each([
    'Play Traffic Lights: green means go, red means stop.',
    'Use your weaker foot for every pass.',
    'The ball is heading towards the goal.',
    'Swap roles every two minutes so nobody waits.',
    'Stop if anything hurts and tell a grown-up.',
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
