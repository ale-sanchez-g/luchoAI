import type { LibraryGame, PlayerProfile } from '@/types';

// Rules every game, twist and match mission must follow. The content tests enforce them, so a
// new batch of games cannot slip in something unsafe or unkind.

// There are no heading games at all. Football bodies in England and Scotland ban heading in
// training up to age 11 and cap it for older players, and Australia is reviewing its own rules.
// These games are played without a coach to count reps, so heading practice is left to training.
export const HEADING_TEXT = new RegExp(
  [
    // "heading" on its own means the skill, but "heading towards the goal" is just direction.
    '\\bheading\\b(?! (for|to|towards|toward|back|off|home|into|over|out|down|up|across|along)\\b)',
    '\\bheaders?\\b',
    '\\bheads? (it|the ball)\\b',
    '\\bhead the ball\\b',
    '\\bheaded (it|the ball)\\b',
    '\\bhead balls?\\b',
    '\\baerial\\b',
  ].join('|'),
  'i',
);

/** Whether a player has asked for heading practice, so we can kindly explain why we skip it. */
export function profileMentionsHeading(profile: PlayerProfile | null): boolean {
  if (!profile) return false;
  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const areas = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  return [...goals, ...areas].some((text) => typeof text === 'string' && HEADING_TEXT.test(text));
}

export interface BannedPhrase {
  pattern: RegExp;
  reason: string;
}

export const BANNED_PHRASES: BannedPhrase[] = [
  { pattern: /\beliminat/i, reason: 'elimination leaves children sitting out' },
  {
    pattern: /\bknocked out\b|\byou(['’]re| are) out\b/i,
    reason: 'elimination leaves children sitting out',
  },
  { pattern: /\blast (one|player|person|team) standing\b/i, reason: 'elimination games' },
  { pattern: /\bsit(s|ting)? (it )?out\b/i, reason: 'everyone should stay involved' },
  { pattern: /\bout of the game\b/i, reason: 'everyone should stay involved' },
  {
    pattern: /\blose a life\b|\bgame over\b|\b(two|three|four|five|\d+) lives\b/i,
    reason: 'elimination language',
  },
  { pattern: /\bpunish/i, reason: 'no punishments' },
  { pattern: /\bforfeit/i, reason: 'no punishments' },
  {
    pattern: new RegExp(
      [
        '\\bpress-?ups?\\b',
        '\\bpush-?ups?\\b',
        '\\bburpees?\\b',
        '\\bsit-?ups?\\b',
        '\\blaps?\\b',
        '\\bsquats?\\b',
        '\\bstar jumps?\\b',
        '\\bplanks?\\b',
      ].join('|'),
      'i',
    ),
    reason: 'exercise must never be a penalty',
  },
  {
    pattern: /\brun (laps )?if you (lose|miss|drop)\b/i,
    reason: 'exercise must never be a penalty',
  },
  {
    pattern: /\bloser|\bstupid\b|\bdumb\b|\bidiot|\bpathetic\b|\blazy\b|\bfat\b|\bwimp/i,
    reason: 'unkind language',
  },
  { pattern: /\bhumiliat|\bembarrass/i, reason: 'unkind language' },
  {
    pattern: new RegExp(
      [
        '\\bman up\\b',
        '\\btoughen up\\b',
        '\\bno pain\\b',
        '\\bplay(ing)? through (the )?(pain|hurt|injur\\w*)\\b',
        '\\bshake it off\\b',
        '\\bno excuses\\b',
      ].join('|'),
      'i',
    ),
    reason: 'never push children to play through pain or upset',
  },
  {
    pattern: /\bdestroy|\bcrush\b|\btrash.?talk|\bwin at all costs\b/i,
    reason: 'aggressive, win-at-all-costs language',
  },
  {
    pattern: /\broads?\b|\bstreets?\b|\btraffic\b(?! lights?\b)|\bdriveways?\b|\bcar park/i,
    reason: 'never send children near traffic',
  },
  { pattern: /\bslid(e|es|ing) tackle/i, reason: 'no sliding tackles for children' },
  {
    pattern: /\bclose your eyes\b|\beyes (closed|shut)\b|\bblindfold/i,
    reason: 'never practise with eyes closed or covered',
  },
];

// Match missions are about what a player controls, not the result of the match.
export const OUTCOME_PHRASES: BannedPhrase[] = [
  { pattern: /\bwin the (game|match)\b/i, reason: "results are not in a player's control" },
  { pattern: /\bscor(e|es|ing) (a |two |three |\d+ )?goals?\b/i, reason: 'goals are an outcome' },
  { pattern: /\bmake (a |two |three |\d+ )?saves?\b/i, reason: 'saves are an outcome' },
  { pattern: /\brate yourself\b/i, reason: 'no self-scores' },
  {
    pattern: /\bclean sheet\b|\bman of the match\b|\btackles won\b/i,
    reason: 'a stat, not a habit',
  },
  { pattern: /\bbe the best\b|\bbetter than\b/i, reason: 'no comparing players' },
];

// The project writes Australian/British English.
export const US_SPELLINGS =
  /\bcolor|\bcenter\b|\bmeters?\b|\bfavorite|\bdefense\b|\borganiz|\brecogniz|\bpracticing\b/i;

const CONTACT_CUES =
  /\b(defend\w*|tackl\w*|press\w*|chas\w*|intercept\w*|shadow\w*|block\w*|tag(s|ged)?|opponent)/i;
const SHOOTING_CUES = /\b(shoot\w*|shots?|penalty|penalties|keepers?|goalkeepers?|saves?)\b/i;

export const CONTACT_NOTE =
  'Play the ball, not the player: stay on your feet, with no pushing, holding or sliding. If ' +
  'anyone is under 10, defenders only block.';

export const SHOOTING_NOTE =
  'Before you shoot, check that nothing breakable and nobody is behind the goal or target. ' +
  'Never hang on a goal.';

/**
 * Reminders shown on a game card when the game has opponents or shooting in it. They are worked
 * out from the game's own wording, so a new game gets the right ones without being listed.
 */
export function safetyNotes(game: LibraryGame): string[] {
  const text = [game.setup, game.howToPlay, game.easier, game.harder].join(' ');
  const notes: string[] = [];
  if (game.players[1] > 1 && CONTACT_CUES.test(text)) notes.push(CONTACT_NOTE);
  if (SHOOTING_CUES.test(text)) notes.push(SHOOTING_NOTE);
  return notes;
}
