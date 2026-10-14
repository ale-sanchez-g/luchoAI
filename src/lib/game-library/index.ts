import { DECISION_THEMES } from '@/lib/decision-games';
import type { LibraryGame, PlayerProfile, WeeklyPlan } from '@/types';
import { ATHLETICISM_GAMES } from './games/athleticism';
import { CREATIVITY_GAMES } from './games/creativity';
import { DEFENDING_1V1_GAMES } from './games/defending-1v1';
import { DRIBBLING_GAMES } from './games/dribbling';
import { FINISHING_GAMES } from './games/finishing';
import { FIRST_TOUCH_GAMES } from './games/first-touch';
import { GOALKEEPING_GAMES } from './games/goalkeeping';
import { MOVEMENT_GAMES } from './games/movement';
import { PASSING_GAMES } from './games/passing';
import { TAKING_ON_GAMES } from './games/taking-on';
import { TEAMWORK_GAMES } from './games/teamwork';
import { TEAM_DEFENDING_GAMES } from './games/team-defending';
import { TRANSITIONS_GAMES } from './games/transitions';
import { VISION_GAMES } from './games/vision';
import { MATCH_MISSIONS } from './missions';
import { buildWeeklyPlan, countWaysToPlay } from './rotation';
import { GAME_TWISTS } from './twists';

export { GAME_TWISTS, MATCH_MISSIONS };

export const GAME_LIBRARY: LibraryGame[] = [
  ...FIRST_TOUCH_GAMES,
  ...PASSING_GAMES,
  ...DRIBBLING_GAMES,
  ...TAKING_ON_GAMES,
  ...DEFENDING_1V1_GAMES,
  ...FINISHING_GAMES,
  ...GOALKEEPING_GAMES,
  ...MOVEMENT_GAMES,
  ...TEAM_DEFENDING_GAMES,
  ...TRANSITIONS_GAMES,
  ...VISION_GAMES,
  ...CREATIVITY_GAMES,
  ...ATHLETICISM_GAMES,
  ...TEAMWORK_GAMES,
];

/** This week's games for a player (or a general mix when there is no profile yet). */
export function getWeeklyPlan(date: Date, profile: PlayerProfile | null): WeeklyPlan {
  return buildWeeklyPlan({
    date,
    profile,
    games: GAME_LIBRARY,
    twists: GAME_TWISTS,
    missions: MATCH_MISSIONS,
    themeIds: DECISION_THEMES.map((t) => t.id),
  });
}

/** Games in the library, and how many ways there are to play them once twists are counted. */
export function getLibraryStats(): { games: number; waysToPlay: number } {
  return { games: GAME_LIBRARY.length, waysToPlay: countWaysToPlay(GAME_LIBRARY, GAME_TWISTS) };
}
