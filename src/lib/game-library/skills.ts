import type { PlayerPosition, SkillArea } from '@/types';
import type { IconName } from '@/lib/icons';

export interface SkillAreaInfo {
  id: SkillArea;
  icon: IconName;
  label: string;
  patterns: RegExp[];
}

// Players type their goals in their own words, so each skill area lists the phrases that mean
// it. Patterns run against lower-case text and use word boundaries so "impress" is not "press".
export const SKILL_AREAS: SkillAreaInfo[] = [
  {
    id: 'first-touch',
    icon: 'sneaker',
    label: 'First touch',
    patterns: [/\btouch\b/, /\bcontrol(ling)?\b/, /\breceiv(e|ing)\b/, /\btrap(ping)?\b/],
  },
  {
    id: 'passing',
    icon: 'shuffle',
    label: 'Passing',
    patterns: [
      /\bpass(es|ing|er|ers)?\b/,
      /\bcross(es|ing)?\b/,
      /\bthrough balls?\b/,
      /\blong balls?\b/,
      /\bdistribut(e|ion|ing)\b/,
    ],
  },
  {
    id: 'dribbling',
    icon: 'whirl',
    label: 'Dribbling',
    patterns: [
      /\bdribbl(e|es|er|ers|ing)\b/,
      /\bball mastery\b/,
      /\bball control\b/,
      /\bclose control\b/,
      /\bfootwork\b/,
      /\b1 ?v ?1\b/,
    ],
  },
  {
    id: 'taking-on',
    icon: 'flame',
    label: 'Beating defenders',
    patterns: [
      /\btak(e|ing) (players |defenders )?on\b/,
      /\bbeat(ing)?\b/,
      /\bwing(er|ers|s)?\b/,
      /\b1 ?v ?1\b/,
    ],
  },
  {
    id: 'defending-1v1',
    icon: 'shield',
    label: '1v1 defending',
    patterns: [
      /\bdefend(er|ers|ing)?\b/,
      /\btackl(e|es|ing|er|ers)\b/,
      /\bmarking\b/,
      /\bjockey(ing)?\b/,
      /\bintercept(ing|ions?)?\b/,
      /\b1 ?v ?1\b/,
    ],
  },
  {
    id: 'finishing',
    icon: 'goal',
    label: 'Shooting and finishing',
    patterns: [
      /\bshoot(ing|er|ers)?\b/,
      /\bshots?\b/,
      /\bfinish(ing|er|ers)?\b/,
      /\bscor(e|ing)\b/,
      /\bstrik(er|ing)\b/,
      /\bvolley(s|ing)?\b/,
    ],
  },
  {
    id: 'goalkeeping',
    icon: 'glove',
    label: 'Goalkeeping',
    patterns: [
      /\bgoal ?keep(er|ers|ing)\b/,
      /\bgoalie\b/,
      /\bkeeper\b/,
      /\bsaves?\b/,
      /\bcatching\b/,
    ],
  },
  {
    id: 'movement',
    icon: 'runner',
    label: 'Movement and space',
    patterns: [
      /\bmovement\b/,
      /\boff the ball\b/,
      /\bspace\b/,
      /\bpositioning\b/,
      /\bruns? in behind\b/,
      /\bsupport(ing)?\b/,
      /\bwidth\b/,
    ],
  },
  {
    id: 'team-defending',
    icon: 'wall',
    label: 'Defending together',
    patterns: [
      /\bpress(ing)?\b/,
      /\bcompact\b/,
      /\bteam defen(d|ding|ce)\b/,
      /\bdefensive shape\b/,
      /\bwin(ning)? the ball back\b/,
    ],
  },
  {
    id: 'transitions',
    icon: 'bolt',
    label: 'Quick counters',
    patterns: [
      /\bcounter(-| )?attack(s|ing)?\b/,
      /\btransitions?\b/,
      /\bswitch(ing)? (the )?play\b/,
      /\bfast break\b/,
    ],
  },
  {
    id: 'vision',
    icon: 'eyes',
    label: 'Vision and decisions',
    patterns: [
      /\bvision\b/,
      /\bscan(ning)?\b/,
      /\bawareness\b/,
      /\bgame (iq|intelligence|sense)\b/,
      /\bdecisions?\b/,
      /\bdecision[- ]making\b/,
      /\bread(ing)? the game\b/,
      /\btactic(s|al)?\b/,
    ],
  },
  {
    id: 'creativity',
    icon: 'sparkles',
    label: 'Creativity and flair',
    patterns: [
      /\bcreativ(e|ity)\b/,
      /\bflair\b/,
      /\bimprovis(e|ing|ation)\b/,
      /\btricks?\b/,
      /\bskill moves?\b/,
      /\bfreestyle\b/,
      /\bnutmegs?\b/,
      /\bflicks?\b/,
    ],
  },
  {
    id: 'athleticism',
    icon: 'gymnast',
    label: 'Speed, agility and balance',
    patterns: [
      /\bfast(er)?\b/,
      /\bspeed(y)?\b/,
      /\bquick(er)?\b/,
      /\bagil(e|ity)\b/,
      /\bfit(ter|ness)?\b/,
      /\bstamina\b/,
      /\bendurance\b/,
      /\bstrong(er)?\b/,
      /\bstrength\b/,
      /\bbalance\b/,
      /\bcoordination\b/,
      /\bjump(ing)?\b/,
      /\bexplosive\b/,
    ],
  },
  {
    id: 'teamwork',
    icon: 'speaking',
    label: 'Teamwork and composure',
    patterns: [
      /\bcommunicat(e|ion|ing)\b/,
      /\btalk(ing)?\b/,
      /\bleader(ship)?\b/,
      /\bcaptain\b/,
      /\bteam ?work\b/,
      /\bconfiden(t|ce)\b/,
      /\bnervous\b/,
      /\bnerves\b/,
      /\bcompos(ed|ure)\b/,
      /\bcalm\b/,
      /\bfocused\b/,
      /\bconcentrat(e|ion)\b/,
      /\bmistakes?\b/,
      /\bresilien(t|ce)\b/,
    ],
  },
];

export const POSITION_SKILLS: Record<PlayerPosition, SkillArea[]> = {
  goalkeeper: ['goalkeeping', 'passing', 'vision'],
  defender: ['defending-1v1', 'team-defending', 'passing'],
  midfielder: ['passing', 'vision', 'movement'],
  forward: ['finishing', 'taking-on', 'movement'],
};

export function getSkillArea(id: SkillArea): SkillAreaInfo {
  const info = SKILL_AREAS.find((s) => s.id === id);
  if (!info) throw new Error(`Unknown skill area: ${id}`);
  return info;
}

/** Skill areas a player's own words point at, in the standard skill order. */
export function skillsFromText(text: string): SkillArea[] {
  const lower = text.toLowerCase();
  return SKILL_AREAS.filter((s) => s.patterns.some((p) => p.test(lower))).map((s) => s.id);
}

/** Skill areas across a list of goals, keeping the player's own order and dropping repeats. */
export function skillsFromList(items: readonly string[]): SkillArea[] {
  const found: SkillArea[] = [];
  for (const item of items) {
    if (typeof item !== 'string') continue;
    for (const id of skillsFromText(item)) {
      if (!found.includes(id)) found.push(id);
    }
  }
  return found;
}
