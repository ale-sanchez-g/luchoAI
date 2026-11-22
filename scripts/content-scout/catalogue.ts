import type { AgeGroup } from '@/lib/age-groups';
import { weekIndex } from '@/lib/game-library/rotation';
import type { PlaySlot } from '@/types';

// Where new content can go in LuchoAI, what kinds of content there are, and the age bands. The
// model must pick from these lists, and every issue names the files a developer would change.

export type SectionId =
  | 'games-this-week'
  | 'game-iq'
  | 'training-plans'
  | 'coach-knowledge'
  | 'wellbeing';

export interface Section {
  id: SectionId;
  name: string;
  pages: string[];
  holds: string;
  files: string[];
  checks: string[];
  label: string;
}

export const SECTIONS: Section[] = [
  {
    id: 'games-this-week',
    name: 'Games › This week',
    pages: ['/games/'],
    holds:
      'The weekly game library: practice games to play on your own, with a friend or with a ' +
      'group, twists (rule changes that make a game feel new) and match missions (one small ' +
      'thing to try in a real match). Played without a coach and without AI.',
    files: [
      'src/lib/game-library/games/<skill>.ts',
      'src/lib/game-library/twists.ts',
      'src/lib/game-library/missions.ts',
    ],
    checks: [
      'Follow docs/game-library.md ("Writing games" and "Safety decisions")',
      '`npm test` (game-library.test.ts enforces the safety and wording rules)',
      'Open /games/ and read the card aloud as an 8-year-old would hear it',
    ],
    label: 'section: games',
  },
  {
    id: 'game-iq',
    name: 'Games › Game IQ',
    pages: ['/games/'],
    holds:
      'Decision games played on a pitch picture: a match situation, a question, three answers ' +
      '(one best) with feedback, and the play that follows each answer. Eight themes, each ' +
      'with a few on-pitch practice games.',
    files: ['src/lib/decision-games.ts'],
    checks: [
      'Read the Game IQ notes in CLAUDE.md (answers on the pitch, plays, timings)',
      '`npm test` (decision-games.test.ts)',
      '`node e2e/game-iq-motion.mjs`, `node e2e/game-iq-key-player.mjs` and ' +
        '`node e2e/game-iq-one-screen.mjs`',
    ],
    label: 'section: game-iq',
  },
  {
    id: 'training-plans',
    name: 'Training',
    pages: ['/training/'],
    holds:
      'Weekly training plans the AI writes for each player. New content here is a drill ' +
      'picture (a top-down set-up the AI can name for a drill) or guidance for the plan prompt.',
    files: ['src/lib/drill-setups.ts', 'src/components/DrillDiagram.tsx', 'src/lib/prompts.ts'],
    checks: [
      'Read "Training-plan pictures" in CLAUDE.md: the AI only names a set-up, never draws one',
      'Check new pictures with `node e2e/drill-pictures.mjs`',
    ],
    label: 'section: training',
  },
  {
    id: 'coach-knowledge',
    name: 'Coach and Training (AI knowledge base)',
    pages: ['/coach/', '/training/'],
    holds:
      'The evidence-based knowledge base the AI coach and the training plans read: one ' +
      'markdown file per topic, with references and a last-reviewed date.',
    files: ['context/<topic>.md', 'public/context/<topic>.md'],
    checks: [
      'Follow the metadata schema in context/00-index-and-metadata-schema.md',
      'Update `last_reviewed` and keep public/context/ identical to context/',
      'A new topic file also needs an entry in `src/lib/context.ts`',
    ],
    label: 'section: coach',
  },
  {
    id: 'wellbeing',
    name: 'Wellbeing',
    pages: ['/wellbeing/'],
    holds:
      'The reset toolkit (mistake reset, nerves tips, balance facts), the daily check-in and ' +
      'its tips, and calm breathing. Never helplines: those are checked by hand against ' +
      'official sites.',
    files: ['src/app/wellbeing/page.tsx', 'src/lib/wellbeing.ts'],
    checks: [
      'Have someone qualified in child wellbeing or safeguarding read it',
      'Check-ins stay on the device: nothing here may send them anywhere',
    ],
    label: 'section: wellbeing',
  },
];

export type ContentTypeId =
  | 'practice-game'
  | 'game-twist'
  | 'match-mission'
  | 'game-iq-situation'
  | 'drill-picture'
  | 'coaching-knowledge'
  | 'wellbeing-tool';

// Which automatic checks a suggestion of this type must pass before it becomes an issue:
// the game library's no-heading and kindness rules, the process-goal rule for missions, and
// no helplines (those are only ever added by hand).
export type Screen = 'heading' | 'kindness' | 'process-goal' | 'no-helplines';

export interface ContentType {
  id: ContentTypeId;
  name: string;
  what: string;
  sections: SectionId[];
  screens: Screen[];
}

export const CONTENT_TYPES: ContentType[] = [
  {
    id: 'practice-game',
    name: 'Practice game',
    what:
      'A game with a set-up, how to play, what it trains, an easier and a harder version, the ' +
      'number of players and minutes. Goes in the weekly library, or as an on-pitch game for a ' +
      'Game IQ theme.',
    sections: ['games-this-week', 'game-iq'],
    screens: ['heading', 'kindness'],
  },
  {
    id: 'game-twist',
    name: 'Game twist',
    what:
      'A rule change that fits many existing games (pace, space, weaker foot, touches, roles), ' +
      'with the skills it suits and how many players it needs.',
    sections: ['games-this-week'],
    screens: ['heading', 'kindness'],
  },
  {
    id: 'match-mission',
    name: 'Match mission',
    what:
      'One small thing to try in a real match, why it helps, and a question to answer after ' +
      'the match. Always a process goal the player controls, never a result or a statistic.',
    sections: ['games-this-week'],
    screens: ['heading', 'kindness', 'process-goal'],
  },
  {
    id: 'game-iq-situation',
    name: 'Game IQ situation',
    what:
      'A match moment for the pitch picture: the situation, a question, three answers (one ' +
      'best) with kind feedback, and what happens after each answer.',
    sections: ['game-iq'],
    screens: ['heading', 'kindness'],
  },
  {
    id: 'drill-picture',
    name: 'Drill picture',
    what:
      'A new top-down drill set-up (cones, the player, a helper, the paths) that training plans ' +
      'can name, and when a plan should use it.',
    sections: ['training-plans'],
    screens: ['heading'],
  },
  {
    id: 'coaching-knowledge',
    name: 'Coaching knowledge',
    what:
      'New or updated evidence for the AI knowledge base: what to add or change, in which file, ' +
      'and which references a reviewer should check.',
    sections: ['coach-knowledge', 'training-plans'],
    screens: [],
  },
  {
    id: 'wellbeing-tool',
    name: 'Wellbeing tool',
    what: 'A reset tool, tip or check-in idea for the Wellbeing page, in calm and kind words.',
    sections: ['wellbeing'],
    screens: ['kindness', 'no-helplines'],
  },
];

export interface AgeBand {
  group: AgeGroup;
  min: number;
  max: number;
  name: string;
  label: string;
}

// The app's three age groups (src/lib/age-groups.ts) with the names docs/game-library.md uses.
export const AGE_BANDS: AgeBand[] = [
  { group: 'young', min: 8, max: 10, name: 'Explore', label: 'age: 8-10' },
  { group: 'middle', min: 11, max: 13, name: 'Build', label: 'age: 11-13' },
  { group: 'teen', min: 14, max: 18, name: 'Apply', label: 'age: 14-18' },
];

export const MIN_AGE = AGE_BANDS[0].min;
export const MAX_AGE = AGE_BANDS[AGE_BANDS.length - 1].max;

export function bandsFor(min: number, max: number): AgeBand[] {
  return AGE_BANDS.filter((band) => band.min <= max && band.max >= min);
}

export type PlayersSlot = Exclude<PlaySlot, 'wildcard'>;

export const PLAYER_SLOTS: Record<PlayersSlot, string> = {
  solo: 'On your own',
  friend: 'With a friend',
  team: 'With a group',
};

// A different focus each week so the research does not land on the same few trends every time.
export const RESEARCH_FOCUS: string[] = [
  'ball mastery, dribbling and 1v1 play',
  'scanning, awareness and decision-making',
  'passing, receiving and small-sided games',
  'shooting, finishing and goalkeeping',
  'defending, pressing and transitions',
  'warm-ups, movement skills and injury prevention for growing players, including girls',
  'motivation, confidence, enjoyment and mental skills',
  'practising alone or at home without a coach',
];

export function focusForWeek(date: Date): string {
  const n = RESEARCH_FOCUS.length;
  return RESEARCH_FOCUS[((weekIndex(date) % n) + n) % n];
}

export const SCOUT_LABEL = 'content-scout';
export const REVIEW_LABEL = 'needs-human-review';

export interface LabelSpec {
  name: string;
  color: string;
  description: string;
}

export function labelSpecs(): LabelSpec[] {
  return [
    {
      name: SCOUT_LABEL,
      color: '1d76db',
      description: 'Content idea from the weekly research workflow (AI-generated)',
    },
    {
      name: REVIEW_LABEL,
      color: 'fbca04',
      description: 'Nobody has checked this yet: remove the label once a person has',
    },
    ...SECTIONS.map((s) => ({
      name: s.label,
      color: 'c5def5',
      description: `Content for ${s.name}`,
    })),
    ...AGE_BANDS.map((b) => ({
      name: b.label,
      color: 'd4c5f9',
      description: `Content for players aged ${b.min}-${b.max}`,
    })),
  ];
}

export function getSection(id: SectionId): Section {
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown section: ${id}`);
  return section;
}

export function getContentType(id: ContentTypeId): ContentType {
  const type = CONTENT_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`Unknown content type: ${id}`);
  return type;
}
