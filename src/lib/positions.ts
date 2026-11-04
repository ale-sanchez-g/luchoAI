import type { PlayerPosition, PlayerProfile } from '@/types';
import { getAgeGroup } from './age-groups';

/** Every stored position value. 'all-round' means trying them all, with no main position. */
export const POSITIONS: PlayerPosition[] = [
  'goalkeeper',
  'defender',
  'midfielder',
  'forward',
  'all-round',
];

export type PitchPosition = Exclude<PlayerPosition, 'all-round'>;

/** The four places on the pitch, front to back, the way a player looks up the pitch. */
export const PITCH_POSITIONS: PitchPosition[] = ['forward', 'midfielder', 'defender', 'goalkeeper'];

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Goalkeeper',
  defender: 'Defender',
  midfielder: 'Midfielder',
  forward: 'Forward',
  'all-round': 'All positions',
};

// Fits "Every session focuses on ___", so it reads well for a player of any age and a parent.
export const POSITION_AREAS: Record<PlayerPosition, string> = {
  goalkeeper: 'goalkeeping',
  defender: 'defending',
  midfielder: 'midfield play',
  forward: 'attacking',
  'all-round': 'a different position',
};

export function isPosition(value: unknown): value is PlayerPosition {
  return POSITIONS.some((pos) => pos === value);
}

/** Whether plans should try other positions too. Always true for 'all-round'. */
export function isExploring(profile: Pick<PlayerProfile, 'position' | 'exploring'>): boolean {
  return profile.position === 'all-round' || profile.exploring === true;
}

/**
 * Whether a player who picks a position is "still finding out" until they say otherwise. Youth
 * coaching guidance is to try every position until the early teens, so only 14-18s start
 * settled.
 */
export function exploringByDefault(age: number): boolean {
  return getAgeGroup(age) !== 'teen';
}

/** The player's position in a few words, for the coach and the profile summary. */
export function describePosition(profile: Pick<PlayerProfile, 'position' | 'exploring'>): string {
  if (profile.position === 'all-round' || !isPosition(profile.position)) {
    return 'Trying every position';
  }
  const label = POSITION_LABELS[profile.position];
  return profile.exploring ? `${label}, still trying other positions` : label;
}
