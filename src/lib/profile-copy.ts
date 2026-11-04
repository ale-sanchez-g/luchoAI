import type { PlayerPosition, ProfileAuthor, SkillLevel } from '@/types';
import type { IconName } from './icons';
import { getAgeGroup, SESSION_MINUTES } from './age-groups';
import type { AgeGroup } from './age-groups';
import { PITCH_POSITIONS, POSITION_AREAS } from './positions';
import type { PitchPosition } from './positions';

// The words on the profile set-up change with who is filling it in and how old the player is:
// a 9-year-old picks a place on the pitch, a teenager picks a position, and a parent gets plain
// words with the football term in brackets.

/** Who the set-up screens are talking to. */
export interface Audience {
  author: ProfileAuthor;
  group: AgeGroup;
  age: number;
  /** The player's name, or a stand-in such as "your child" when it is still empty. */
  name: string;
}

export const GOAL_PICK_LIMIT = 3;

export function getAudience(author: ProfileAuthor, age: number, name: string): Audience {
  const trimmed = name.trim();
  const fallback = author === 'parent' ? 'your child' : '';
  return { author, group: getAgeGroup(age), age, name: trimmed || fallback };
}

// "your child" starts a sentence as "Your child".
function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function possessive(name: string): string {
  if (name === 'your child') return "your child's";
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

export interface Choice<T extends string> {
  value: T;
  title: string;
  text: string;
  icon?: IconName;
  /** The football word for a plain-language title, shown to parents in brackets. */
  term?: string;
  badge?: string;
}

/* Step 1: who is filling this in */

export const AUTHOR_CHOICES: Choice<ProfileAuthor>[] = [
  {
    value: 'player',
    icon: 'ball',
    title: "I'm the player",
    text: "I'm 8 to 18 and I want to get better at football.",
  },
  {
    value: 'parent',
    icon: 'people',
    title: "I'm a parent or carer",
    text: "I'm setting this up for my child. You don't need to know much about football.",
  },
];

/* Step 2: name and age */

export interface AboutCopy {
  heading: string;
  nameLabel: string;
  nameHint: string;
  ageLabel: string;
}

export function aboutCopy(author: ProfileAuthor): AboutCopy {
  if (author === 'parent') {
    return {
      heading: 'Tell us about your child',
      nameLabel: 'Their first name or a nickname',
      nameHint: 'A nickname is fine. The coach uses it to say hello.',
      ageLabel: 'How old are they?',
    };
  }
  return {
    heading: 'About you',
    nameLabel: 'Your first name or a nickname',
    nameHint: 'A nickname is fine. The coach uses it to say hello.',
    ageLabel: 'How old are you?',
  };
}

const AGE_STYLE: Record<AgeGroup, string> = {
  young: 'short, playful sessions, simple words and lots of games',
  middle: 'sessions that mix games with skill practice, and football words explained',
  teen: 'longer sessions with game-like and tactical work',
};

/** What the chosen age changes, e.g. "At 9: sessions of 30 to 45 minutes, ...". */
export function ageHint(age: number): string {
  const group = getAgeGroup(age);
  const minutes = SESSION_MINUTES[group].replace('-', ' to ');
  return `At ${age}: ${minutes}, with ${AGE_STYLE[group]}.`;
}

/* Step 3: position */

export interface PositionCopy {
  heading: string;
  intro: string;
  /** Show "try them all" first, with a divider before the single positions. */
  allRoundFirst: boolean;
  divider: string;
  layout: 'list' | 'grid';
  choices: Choice<PlayerPosition>[];
  sureLegend: string;
  settledLabel: string;
  exploringLabel: string;
}

type PositionWords = Record<PitchPosition, { title: string; text: string; term?: string }>;

const YOUNG_PLACES: PositionWords = {
  forward: { title: 'At the front', text: 'Try to score goals' },
  midfielder: { title: 'In the middle', text: 'Pass, run and help everyone' },
  defender: { title: 'At the back', text: 'Stop the other team scoring' },
  goalkeeper: { title: 'In goal', text: 'Make saves with your hands' },
};

const MIDDLE_POSITIONS: PositionWords = {
  forward: { title: 'Forward', text: 'Up front: scoring and making chances' },
  midfielder: { title: 'Midfielder', text: 'In the middle: passing and linking play' },
  defender: { title: 'Defender', text: 'At the back: stopping attacks' },
  goalkeeper: { title: 'Goalkeeper', text: 'In goal: saves and starting attacks' },
};

const TEEN_POSITIONS: PositionWords = {
  forward: { title: 'Forward', text: 'Winger or striker' },
  midfielder: { title: 'Midfielder', text: 'Holding, central or attacking' },
  defender: { title: 'Defender', text: 'Centre-back or full-back' },
  goalkeeper: { title: 'Goalkeeper', text: 'Saves, crosses and distribution' },
};

const PARENT_PLACES: PositionWords = {
  forward: { title: 'At the front', term: 'forward', text: 'Tries to score goals' },
  midfielder: {
    title: 'In the middle',
    term: 'midfield',
    text: 'Passes and runs between attack and defence',
  },
  defender: { title: 'At the back', term: 'defence', text: 'Stops the other team scoring' },
  goalkeeper: {
    title: 'In goal',
    term: 'goalkeeper',
    text: 'The one player who can use their hands',
  },
};

function pitchChoices(words: PositionWords, order: PitchPosition[]): Choice<PlayerPosition>[] {
  return order.map((value) => ({ value, ...words[value] }));
}

export function positionCopy(audience: Audience): PositionCopy {
  const { author, group, age, name } = audience;
  if (author === 'parent') {
    const young = group === 'young';
    const intro: Record<AgeGroup, string> = {
      young:
        `No idea? That's normal at ${age}. Youth coaching guides say children this age should ` +
        'try every position, so "not sure yet" is a great answer.',
      middle:
        'Not sure? Lots of players try a few positions before they settle, so "not sure yet" ' +
        'is a fine answer.',
      teen: `Not sure? Ask ${name}, or pick "not sure yet".`,
    };
    return {
      heading: `Where does ${name} like to play?`,
      intro: intro[group],
      allRoundFirst: young,
      divider: `or, if ${name} has a favourite`,
      layout: 'list',
      choices: [
        ...pitchChoices(PARENT_PLACES, PITCH_POSITIONS),
        {
          value: 'all-round',
          title: `Not sure yet: let ${name} try everything`,
          text: 'A different spot each session, from scoring to saving.',
          badge: young ? `Good choice at ${age}` : undefined,
        },
      ],
      sureLegend: `How sure is ${name}?`,
      settledLabel: "That's their position",
      exploringLabel: 'Still finding out',
    };
  }
  const named = name ? `, ${name}` : '';
  if (group === 'young') {
    return {
      heading: `Where do you like to play${named}?`,
      intro: "Don't know yet? That's OK! Trying lots of places is how you find your favourite.",
      allRoundFirst: true,
      divider: 'or pick one place',
      layout: 'list',
      choices: [
        ...pitchChoices(YOUNG_PLACES, PITCH_POSITIONS),
        {
          value: 'all-round',
          title: 'Everywhere! I want to try them all',
          text: 'A new place to play each session.',
        },
      ],
      sureLegend: 'Do you want to try other places too?',
      settledLabel: 'No, just this one',
      exploringLabel: 'Yes, mix it up',
    };
  }
  if (group === 'middle') {
    return {
      heading: `Where do you play most${named}?`,
      intro: 'Pick the closest one. You can change it any time.',
      allRoundFirst: false,
      divider: '',
      layout: 'list',
      choices: [
        ...pitchChoices(MIDDLE_POSITIONS, PITCH_POSITIONS),
        {
          value: 'all-round',
          title: "I don't have one yet",
          text: 'Try a different spot each session',
        },
      ],
      sureLegend: 'How sure are you?',
      settledLabel: "It's my position",
      exploringLabel: 'Not sure yet',
    };
  }
  return {
    heading: 'Your position',
    intro: 'Your plan and weekly games are built around it.',
    allRoundFirst: false,
    divider: '',
    layout: 'grid',
    choices: [
      ...pitchChoices(TEEN_POSITIONS, [...PITCH_POSITIONS].reverse()),
      {
        value: 'all-round',
        title: "I don't play one position yet",
        text: 'Train in a different spot each session',
      },
    ],
    sureLegend: 'How settled are you there?',
    settledLabel: 'Settled',
    exploringLabel: 'Still exploring',
  };
}

/** What the "how sure" answer does to the plan, in words that work for every age. */
export function sureHint(position: PlayerPosition, exploring: boolean): string {
  const area = POSITION_AREAS[position];
  return exploring
    ? `Most sessions focus on ${area}, and one each week is in a different spot.`
    : `Every session focuses on ${area}.`;
}

/* Step 4: level */

export interface LevelCopy {
  heading: string;
  intro: string;
  choices: Choice<SkillLevel>[];
  hint: string;
}

const LEVEL_ICONS: Record<SkillLevel, IconName> = {
  beginner: 'sprout',
  intermediate: 'runner',
  advanced: 'medal',
};

const LEVEL_TITLES: Record<SkillLevel, string> = {
  beginner: 'Rookie',
  intermediate: 'Rising',
  advanced: 'Ace',
};

function levelChoices(text: Record<SkillLevel, string>): Choice<SkillLevel>[] {
  return (Object.keys(LEVEL_TITLES) as SkillLevel[]).map((value) => ({
    value,
    icon: LEVEL_ICONS[value],
    title: LEVEL_TITLES[value],
    text: text[value],
  }));
}

export function levelCopy(audience: Audience): LevelCopy {
  const { author, group, name } = audience;
  if (author === 'parent') {
    return {
      heading: `How much football does ${name} play?`,
      intro: 'This sets how hard the drills are. Pick the closest one.',
      choices: levelChoices({
        beginner: 'New to football, or plays for fun at school and in the park',
        intermediate: 'Plays for a team most weeks and knows the basics',
        advanced: 'Trains several times a week, for example at an academy or a top club team',
      }),
      hint:
        'Not sure? Pick Rookie. Every weekly game has an easier and a harder way to play, ' +
        `so ${name} can step up when ready.`,
    };
  }
  return {
    heading: 'How much do you play?',
    intro: 'This sets how hard your drills are.',
    choices: levelChoices(
      group === 'young'
        ? {
            beginner: "I'm new to football, or I play for fun",
            intermediate: 'I play for a team most weeks',
            advanced: 'I train lots, at an academy or a top team',
          }
        : {
            beginner: 'New to football, or playing for fun',
            intermediate: 'Regular team football, with the basics sorted',
            advanced: 'Academy or high-level club, training several times a week',
          },
    ),
    hint:
      'Not sure? Pick Rookie. Every weekly game has an easier and a harder way to play, so ' +
      "you can step up when you're ready.",
  };
}

/* Step 5: goals and the tricky bits */

export interface ChipGroup {
  title: string;
  chips: { label: string; icon?: IconName }[];
}

export interface GoalsCopy {
  heading: string;
  intro: string;
  /** Picture tiles for the youngest players, rounded pills for everyone else. */
  layout: 'tiles' | 'pills';
  groups: ChipGroup[];
  customLabel: string;
  trickyHeading: string;
  trickyNote: string;
  tricky: string[];
  trickyCustomLabel: string;
}

// Each label uses words the weekly games already match (see game-library/skills.ts), so picking
// "Scoring goals" brings up shooting games. game-library tests hold every chip to that.
const YOUNG_GOALS: ChipGroup = {
  title: '',
  chips: [
    { label: 'Scoring goals', icon: 'goal' },
    { label: 'Dribbling past people', icon: 'whirl' },
    { label: 'Cool tricks', icon: 'sparkles' },
    { label: 'Running faster', icon: 'gymnast' },
    { label: 'Passing to teammates', icon: 'shuffle' },
    { label: 'Controlling the ball', icon: 'sneaker' },
    { label: 'Making saves', icon: 'glove' },
    { label: 'Feeling confident', icon: 'heart' },
  ],
};

const POSITION_GOALS: Record<'middle' | 'teen', Record<PlayerPosition, string[]>> = {
  middle: {
    forward: ['Scoring goals', 'Taking players on', 'Runs in behind'],
    midfielder: ['Passing', 'Receiving and turning', 'Finding space'],
    defender: ['Tackling', '1v1 defending', 'Passing out from the back'],
    goalkeeper: ['Making saves', 'Catching the ball', 'Passing out from goal'],
    'all-round': ['Scoring goals', 'Passing', 'Tackling', 'Making saves'],
  },
  teen: {
    forward: [
      'Finishing with both feet',
      'Runs in behind',
      'Taking players on',
      'Pressing from the front',
    ],
    midfielder: [
      'Scanning before receiving',
      'Passing range',
      'Receiving on the half-turn',
      'Winning the ball back',
    ],
    defender: [
      '1v1 defending',
      'Passing out from the back',
      'Pressing as a unit',
      'Intercepting passes',
    ],
    goalkeeper: [
      'Making saves',
      'Catching crosses',
      'Passing out from goal',
      'Talking to the defence',
    ],
    'all-round': ['Finishing', 'Passing range', '1v1 defending', 'Making saves'],
  },
};

const EVERYONE_GOALS: Record<'middle' | 'teen', string[]> = {
  middle: [
    'First touch',
    'Weaker foot',
    'Dribbling',
    'Speed and agility',
    'Feeling confident',
    'Cool tricks',
  ],
  teen: [
    'Scanning and decisions',
    'First touch under pressure',
    'Weaker foot',
    'Speed and agility',
    'Composure in big games',
    'Leadership and talking',
  ],
};

const POSITION_GROUP_TITLES: Record<PlayerPosition, string> = {
  forward: 'For forwards',
  midfielder: 'For midfielders',
  defender: 'For defenders',
  goalkeeper: 'For goalkeepers',
  'all-round': 'A bit of everything',
};

const TRICKY: Record<'young' | 'older', string[]> = {
  young: ['Using the weaker foot', 'Stopping the ball', 'Feeling nervous', 'Knowing where to run'],
  older: [
    'Weaker foot',
    'Losing the ball under pressure',
    'Nerves before games',
    'Knowing where to be',
  ],
};

function chipGroups(group: AgeGroup, position: PlayerPosition): ChipGroup[] {
  if (group === 'young') return [YOUNG_GOALS];
  const toChips = (labels: string[]): ChipGroup['chips'] => labels.map((label) => ({ label }));
  return [
    { title: POSITION_GROUP_TITLES[position], chips: toChips(POSITION_GOALS[group][position]) },
    { title: 'For everyone', chips: toChips(EVERYONE_GOALS[group]) },
  ];
}

export function goalsCopy(audience: Audience, position: PlayerPosition): GoalsCopy {
  const { author, group, name } = audience;
  const young = group === 'young';
  const parent = author === 'parent';
  const pick = `Tap up to ${GOAL_PICK_LIMIT}`;
  let heading = young ? 'What do you want to get better at?' : 'What do you want to work on?';
  let intro = young ? `${pick}.` : `${pick} or write your own.`;
  if (parent) {
    heading = young
      ? `What would ${name} like to get better at?`
      : `What does ${name} want to work on?`;
    intro = `${pick}. Not sure? Ask ${name}, or skip this and add goals later.`;
  }
  let trickyHeading = young ? 'Anything that feels tricky?' : "What's holding you back?";
  if (parent) trickyHeading = `Anything ${name} finds tricky?`;
  return {
    heading,
    intro,
    layout: young ? 'tiles' : 'pills',
    groups: chipGroups(group, position),
    customLabel: 'Something else',
    trickyHeading,
    trickyNote: young || parent ? 'You can skip this' : 'Optional',
    tricky: TRICKY[young ? 'young' : 'older'],
    trickyCustomLabel: 'Something else',
  };
}

/** Every goal chip any audience can see, for the content tests. */
export function allGoalChips(): string[] {
  const labels = [
    ...YOUNG_GOALS.chips.map((c) => c.label),
    ...Object.values(POSITION_GOALS).flatMap((byPosition) => Object.values(byPosition).flat()),
    ...Object.values(EVERYONE_GOALS).flat(),
  ];
  return [...new Set(labels)];
}

/** Every "tricky" chip any audience can see, for the content tests. */
export function allTrickyChips(): string[] {
  return [...new Set(Object.values(TRICKY).flat())];
}

/* After set-up */

export interface DoneCopy {
  heading: string;
  planLine: string;
  coachLine: string;
  wellbeingLine: string;
}

export function parentDoneCopy(
  audience: Audience,
  position: PlayerPosition,
  exploring: boolean,
): DoneCopy {
  const { name, age } = audience;
  const whose = possessive(name);
  let planLine = `${capitalise(whose)} sessions focus on ${POSITION_AREAS[position]}.`;
  if (position === 'all-round') {
    planLine =
      `${capitalise(whose)} first week tries a different spot each session, from scoring to ` +
      'saving.';
  } else if (exploring) {
    planLine =
      `Most of ${whose} sessions focus on ${POSITION_AREAS[position]}, with one each week in a ` +
      'different spot.';
  }
  return {
    heading: `${capitalise(whose)} profile is ready`,
    planLine,
    coachLine:
      `The coach only talks about football, in words that suit a ${age}\u2011year\u2011old. ` +
      `${capitalise(whose)} name, age and goals go to the AI so its advice fits ${name}.`,
    wellbeingLine: 'Wellbeing check-ins stay on this device. They are never sent anywhere.',
  };
}

export function playerDoneHeading(name: string): string {
  return name ? `You're all set, ${name}!` : "You're all set!";
}

export function editHeading(author: ProfileAuthor, name: string): string {
  if (author === 'parent' && name.trim()) return `${possessive(name.trim())} profile`;
  return 'Player profile';
}
