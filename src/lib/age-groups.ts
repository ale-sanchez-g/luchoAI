export type AgeGroup = 'young' | 'middle' | 'teen';

// One set of cut-offs for everything that changes with age: the set-up wording, the plan's
// language and its session length. Ages 8-10, 11-13 and 14-18.
const GROUP_MAX_AGE: [AgeGroup, number][] = [
  ['young', 10],
  ['middle', 13],
  ['teen', 18],
];

/** The age group for a player. A stored age that isn't a number counts as 11-13. */
export function getAgeGroup(age: unknown): AgeGroup {
  const years = Number(age);
  if (!Number.isFinite(years)) return 'middle';
  return GROUP_MAX_AGE.find(([, max]) => years <= max)?.[0] ?? 'teen';
}

/** How long a training session runs for each age group. */
export const SESSION_MINUTES: Record<AgeGroup, string> = {
  young: '30-45 minutes',
  middle: '45-60 minutes',
  teen: '60-75 minutes',
};
