import type { BalanceArea, BalanceLevel, MoodLevel, WellbeingCheckIn } from '@/types';

export interface MoodOption {
  level: MoodLevel;
  emoji: string;
  label: string;
  message: string;
}

export interface BalanceLevelOption {
  level: BalanceLevel;
  emoji: string;
  label: string;
}

export interface BalanceAreaInfo {
  id: BalanceArea;
  emoji: string;
  label: string;
  question: string;
  tip: string;
}

export interface Helpline {
  country: string;
  name: string;
  phone: string;
  href: string;
  textOption?: string;
}

export const MOODS: MoodOption[] = [
  {
    level: 5,
    emoji: '😄',
    label: 'Great',
    message: "Love that energy! Keep doing what's working for you.",
  },
  {
    level: 4,
    emoji: '🙂',
    label: 'Good',
    message: 'Nice one. Good days are worth noticing.',
  },
  {
    level: 3,
    emoji: '😐',
    label: 'Okay',
    message: 'Thanks for checking in. Okay days are completely normal.',
  },
  {
    level: 2,
    emoji: '😕',
    label: 'Not great',
    message: 'Tough days happen to every player, and they pass. Be kind to yourself today.',
  },
  {
    level: 1,
    emoji: '😢',
    label: 'Really low',
    message: "Thanks for being honest about how you feel. You don't have to handle this alone.",
  },
];

export const BALANCE_LEVELS: BalanceLevelOption[] = [
  { level: 3, emoji: '😊', label: 'Yes' },
  { level: 2, emoji: '😐', label: 'Sort of' },
  { level: 1, emoji: '😟', label: 'Not really' },
];

export const BALANCE_AREAS: BalanceAreaInfo[] = [
  {
    id: 'sleep',
    emoji: '😴',
    label: 'Sleep',
    question: 'Am I getting enough sleep?',
    tip:
      'Sleep is when your body recovers and your brain locks in new skills. Aim for 9–12 hours ' +
      "a night if you're 12 or under, or 8–10 hours if you're a teenager. Putting screens " +
      'away for a while before bed really helps.',
  },
  {
    id: 'football',
    emoji: '⚽',
    label: 'Football',
    question: 'Am I enjoying football?',
    tip:
      'Every player has times when football feels hard or less fun, even the pros. Try playing ' +
      'just for fun this week: a kickabout with friends or a new trick with no pressure. Tell ' +
      'your coach or a parent how you feel too. They want you to enjoy it.',
  },
  {
    id: 'school',
    emoji: '📚',
    label: 'School',
    question: 'Is school feeling OK?',
    tip:
      'If school feels like a lot, break big tasks into small chunks and ask a teacher for help ' +
      'early. Asking for help is a strength. A calmer week at school helps you play better too.',
  },
  {
    id: 'people',
    emoji: '🤝',
    label: 'Friends & family',
    question: 'Am I spending time with people I like?',
    tip:
      'Time with friends and family recharges your batteries. Share a meal, play a game or ' +
      'message a friend. Friends from outside football matter just as much as teammates.',
  },
  {
    id: 'fun',
    emoji: '🎨',
    label: 'Fun outside football',
    question: 'Do I have time for fun outside football?',
    tip:
      'Other sports, music, art, games, being outside: doing different things keeps your mind ' +
      'fresh, and playing different sports helps you avoid injuries from doing too much of one ' +
      'thing. Plan one fun thing this week that has nothing to do with football.',
  },
];

export const HELPLINES: Helpline[] = [
  {
    country: 'Australia',
    name: 'Kids Helpline',
    phone: '1800 55 1800',
    href: 'tel:1800551800',
  },
  {
    country: 'New Zealand',
    name: 'Youthline',
    phone: '0800 376 633',
    href: 'tel:0800376633',
    textOption: 'or text 234',
  },
  {
    country: 'United Kingdom',
    name: 'Childline',
    phone: '0800 1111',
    href: 'tel:08001111',
  },
  {
    country: 'Canada',
    name: 'Kids Help Phone',
    phone: '1-800-668-6868',
    href: 'tel:18006686868',
    textOption: 'or text CONNECT to 686868',
  },
  {
    country: 'United States',
    name: '988 Lifeline',
    phone: '988',
    href: 'tel:988',
    textOption: 'or text 988',
  },
];

export const HELPLINE_DIRECTORY_URL = 'https://childhelplineinternational.org/helplines/';

const LOW_MOOD_THRESHOLD = 2;
const RECENT_WINDOW = 5;
const RECENT_LOW_LIMIT = 3;

/** Date key in the player's local time zone, so an early-morning check-in counts for today. */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` key as local midnight (`new Date(key)` would parse it as UTC). */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getMood(level: MoodLevel): MoodOption {
  const mood = MOODS.find((m) => m.level === level);
  if (!mood) throw new Error(`Unknown mood level: ${level}`);
  return mood;
}

/** Areas the player rated lowest, in display order, each carrying a practical tip. */
export function getBalanceTips(balance: Record<BalanceArea, BalanceLevel>): BalanceAreaInfo[] {
  return BALANCE_AREAS.filter((area) => balance[area.id] === 1);
}

/**
 * Whether to nudge the player towards a trusted adult or helpline.
 * One "Really low" day is enough on its own; otherwise we look for a pattern (3 of the last
 * 5 check-ins low) so a single bad day doesn't trigger it, but a rough patch does.
 * `history` must be sorted oldest → newest.
 */
export function shouldSuggestSupport(history: WellbeingCheckIn[]): boolean {
  const latest = history[history.length - 1];
  if (!latest) return false;
  if (latest.mood === 1) return true;
  const recentLow = history
    .slice(-RECENT_WINDOW)
    .filter((c) => c.mood <= LOW_MOOD_THRESHOLD).length;
  return recentLow >= RECENT_LOW_LIMIT;
}
