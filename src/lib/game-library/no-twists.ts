import type { TwistKind } from '@/types';

// Games about landing, balancing or warming up should never be rushed, scored or made harder by
// a twist. Only counting and reflecting twists suit them.
export const GENTLE_PRACTICE: TwistKind[] = [
  'pace',
  'streak',
  'space',
  'foot',
  'touches',
  'call',
  'talk',
  'players',
  'target',
  'scoring',
  'handicap',
  'roles',
  'rules',
];

// Calm routines, like breathing before a shot, also skip the attention tricks that would
// crowd the player's head.
export const CALM_PRACTICE: TwistKind[] = [...GENTLE_PRACTICE, 'attention'];

// Planning a routine or watching a match has no drill to adjust, so it takes no twist at all.
export const NO_DRILL: TwistKind[] = [...CALM_PRACTICE, 'mindset'];
