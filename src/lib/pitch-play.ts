import type {
  DecisionScenario,
  PitchActor,
  PitchPoint,
  PitchScene,
  PitchTarget,
  PlayBeat,
} from '@/types';

// Pitch coordinates use a 100 × 75 grid. Your team always attacks up the screen, so y = 0 is the
// end you attack and y = 75 is the end you defend.
export const PITCH_WIDTH = 100;
export const PITCH_HEIGHT = 75;

/**
 * Pitch units per second, slow enough for a child to follow: a player crosses a fifth of the
 * pitch in about a second, and a pass is a little over twice as fast.
 */
const SPEED = { player: 18, ball: 45 };
const MOVE_MS = { min: 450, max: 2000 };
const PAUSE_MS = 180;
/** A still moment first, so the player takes in the picture before it moves. */
export const LEAD_DELAY_MS = 700;
/** The build-up plays a little slower still: it is the part to watch closely. */
const LEAD_PACE = 1.3;
export const OUTCOME_DELAY_MS = 250;

export function distance(a: PitchPoint, b: PitchPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const ACTOR_PATTERN = /^(you|ball|[to]\d+)$/;

export function isPitchActor(value: string): value is PitchActor {
  return ACTOR_PATTERN.test(value);
}

/** Where a player (or the ball) is; undefined for a player the scene does not have. */
export function actorAt(scene: PitchScene, actor: PitchActor): PitchPoint | undefined {
  if (actor === 'you') return scene.you;
  if (actor === 'ball') return scene.ball;
  const team = actor.startsWith('t') ? scene.teammates : scene.opponents;
  return team[Number(actor.slice(1))];
}

/** The scene after a beat: the named players (and the ball) at their new spots. */
export function applyBeat(scene: PitchScene, beat: PlayBeat): PitchScene {
  const next: PitchScene = {
    ...scene,
    teammates: [...scene.teammates],
    opponents: [...scene.opponents],
  };
  for (const [actor, at] of Object.entries(beat) as [PitchActor, PitchPoint | undefined][]) {
    if (!at) continue;
    if (actor === 'you') next.you = at;
    else if (actor === 'ball') next.ball = at;
    else (actor.startsWith('t') ? next.teammates : next.opponents)[Number(actor.slice(1))] = at;
  }
  return next;
}

/** Every player and the ball where they stand in `scene`, as one beat. */
function wholeScene(scene: PitchScene): PlayBeat {
  const beat: PlayBeat = { you: scene.you, ball: scene.ball };
  scene.teammates.forEach((p, i) => {
    beat[`t${i}`] = p;
  });
  scene.opponents.forEach((p, i) => {
    beat[`o${i}`] = p;
  });
  return beat;
}

/** How long a move from one scene to the next takes: the slowest mover sets the pace. */
export function moveMs(from: PitchScene, to: PitchScene): number {
  const runs = [
    distance(from.you, to.you),
    ...from.teammates.map((p, i) => distance(p, to.teammates[i])),
    ...from.opponents.map((p, i) => distance(p, to.opponents[i])),
  ];
  const seconds = Math.max(
    Math.max(...runs) / SPEED.player,
    distance(from.ball, to.ball) / SPEED.ball,
  );
  return Math.round(Math.min(MOVE_MS.max, Math.max(MOVE_MS.min, seconds * 1000)));
}

/** A play ready to animate: the scene at each step and how long each move takes. */
export interface Timeline {
  frames: PitchScene[];
  /** Milliseconds for the move into each frame after the first. */
  moves: number[];
  /** Stillness before the first move. */
  delay: number;
  /** Stillness between moves. */
  pause: number;
}

/** `pace` above 1 slows every move down by that much. */
export function makeTimeline(
  start: PitchScene,
  beats: PlayBeat[],
  delay = 0,
  pace = 1,
): Timeline {
  const frames = [start];
  beats.forEach((beat) => frames.push(applyBeat(frames[frames.length - 1], beat)));
  const moves = frames.slice(1).map((frame, i) => Math.round(moveMs(frames[i], frame) * pace));
  return { frames, moves, delay, pause: PAUSE_MS };
}

export function timelineMs({ moves, delay, pause }: Timeline): number {
  const moving = moves.reduce((sum, ms) => sum + ms, 0);
  return delay + moving + pause * Math.max(0, moves.length - 1);
}

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2);
const easeOut = (t: number): number => 1 - (1 - t) ** 2;

function mix(a: PitchPoint, b: PitchPoint, t: number): PitchPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Players speed up and slow down; a kicked ball is fastest as it leaves the foot.
function blend(a: PitchScene, b: PitchScene, t: number): PitchScene {
  const run = easeInOut(t);
  return {
    ...b,
    you: mix(a.you, b.you, run),
    ball: mix(a.ball, b.ball, easeOut(t)),
    teammates: a.teammates.map((p, i) => mix(p, b.teammates[i], run)),
    opponents: a.opponents.map((p, i) => mix(p, b.opponents[i], run)),
  };
}

/** The scene `elapsed` milliseconds into a timeline. */
export function sceneAt(timeline: Timeline, elapsed: number): PitchScene {
  const { frames, moves, delay, pause } = timeline;
  let time = elapsed - delay;
  for (let i = 0; i < moves.length; i += 1) {
    if (time < moves[i]) return blend(frames[i], frames[i + 1], Math.max(0, time) / moves[i]);
    time -= moves[i] + pause;
    if (time < 0) return frames[i + 1];
  }
  return frames[frames.length - 1];
}

/** The build-up: from where everyone was a moment earlier into the decision picture. */
export function leadTimeline(scenario: DecisionScenario): Timeline {
  const [start = {}, ...steps] = scenario.lead;
  const settle = wholeScene(scenario.scene);
  const from = applyBeat(scenario.scene, start);
  return makeTimeline(from, [...steps, settle], LEAD_DELAY_MS, LEAD_PACE);
}

/** What happens after an answer: from the decision picture, or from `from` after a GO tap. */
export function outcomeTimeline(
  scenario: DecisionScenario,
  optionId: string,
  from: PitchScene = scenario.scene,
): Timeline {
  const option = scenario.options.find((o) => o.id === optionId);
  return makeTimeline(from, option?.play ?? [], OUTCOME_DELAY_MS);
}

export interface TimingWindow {
  option: string;
  cue: string;
  start: number;
  end: number;
}

/** The play behind a "when" question, and which answer a GO tap gives at each moment. */
export function timingPlay(scenario: DecisionScenario): {
  timeline: Timeline;
  windows: TimingWindow[];
} {
  const frames = [scenario.scene];
  const moves: number[] = [];
  const windows: TimingWindow[] = [];
  let clock = 0;
  const last = (): PitchScene => frames[frames.length - 1];
  for (const phase of scenario.timing?.phases ?? []) {
    const start = clock;
    for (const beat of phase.beats) {
      const next = applyBeat(last(), beat);
      const ms = moveMs(last(), next);
      frames.push(next);
      moves.push(ms);
      clock += ms;
    }
    // Hold still for the rest of the moment, so "head up" lasts long enough to react to.
    if (start + phase.ms > clock) {
      frames.push(last());
      moves.push(start + phase.ms - clock);
      clock = start + phase.ms;
    }
    windows.push({ option: phase.option, cue: phase.cue, start, end: clock });
  }
  return { timeline: { frames, moves, delay: 0, pause: 0 }, windows };
}

/** The moment of a "when" play at `elapsed`; the last moment once the play is over. */
export function windowAt(windows: TimingWindow[], elapsed: number): TimingWindow | undefined {
  return windows.find((w) => elapsed < w.end) ?? windows[windows.length - 1];
}

export const SPOT_RADIUS = 3.4;
/** Rings sit just outside the player they go around. */
const RING_RADIUS = { you: 7.6, ball: 3.8, teammate: 5.4, opponent: 6.2 };
/** The goal answer covers the goal mouth and a little in front of it. */
const GOAL_MOUTH = { left: 42, right: 58, depth: 7 };

export interface ResolvedTarget {
  id: string;
  kind: 'spot' | 'ring' | 'goal';
  at: PitchPoint;
  /** The spot's or ring's radius; half the box height for the goal. */
  radius: number;
  /** The player (or ball) a ring goes around. */
  actor?: PitchActor;
}

/** Turns an answer's target into something to draw and drop onto. Null if it cannot be shown. */
export function resolveTarget(
  scene: PitchScene,
  id: string,
  target: PitchTarget,
): ResolvedTarget | null {
  if (typeof target === 'object') return { id, kind: 'spot', at: target, radius: SPOT_RADIUS };
  if (target === 'goal') {
    if (!scene.goal) return null;
    const half = GOAL_MOUTH.depth / 2;
    const y = scene.goal === 'top' ? half : PITCH_HEIGHT - half;
    return { id, kind: 'goal', at: { x: PITCH_WIDTH / 2, y }, radius: half };
  }
  const at = actorAt(scene, target);
  if (!at) return null;
  let radius = RING_RADIUS.opponent;
  if (target === 'you') radius = RING_RADIUS.you;
  else if (target === 'ball') radius = RING_RADIUS.ball;
  else if (target.startsWith('t')) radius = RING_RADIUS.teammate;
  return { id, kind: 'ring', at, radius, actor: target };
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function goalBox(target: ResolvedTarget): Box {
  return {
    left: GOAL_MOUTH.left,
    right: GOAL_MOUTH.right,
    top: target.at.y - target.radius,
    bottom: target.at.y + target.radius,
  };
}

/** How far a point is from a target's edge (0 when it is on or inside it). */
export function targetGap(p: PitchPoint, target: ResolvedTarget): number {
  if (target.kind === 'goal') {
    const box = goalBox(target);
    const dx = Math.max(box.left - p.x, 0, p.x - box.right);
    const dy = Math.max(box.top - p.y, 0, p.y - box.bottom);
    return Math.hypot(dx, dy);
  }
  return Math.max(0, distance(p, target.at) - target.radius);
}

/** A drop still counts this far past a target's edge: fingers are bigger than the spots. */
export const DROP_REACH = 5;
/** Dropping this close to where the drag started puts things back: no answer. */
const HOME_REACH = 4;

/** The answer a drop at `at` gives, or null when it is nearer home or too far from every target. */
export function dropTarget(
  at: PitchPoint,
  home: PitchPoint,
  targets: ResolvedTarget[],
): string | null {
  let best: string | null = null;
  let bestGap = Math.max(0, distance(at, home) - HOME_REACH);
  targets.forEach((target) => {
    const gap = targetGap(at, target);
    if (gap < bestGap) {
      best = target.id;
      bestGap = gap;
    }
  });
  return bestGap <= DROP_REACH ? best : null;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export const BADGE_RADIUS = 2.9;
const BADGE_MARGIN = 0.3;
/** Up-right first: the corner that reads most naturally as the ring's label. */
const BADGE_ANGLES = [-45, -135, 45, 135, 0, 180, -90, 90];

function clearance(c: PitchPoint, obstacles: Circle[]): number {
  const edges = Math.min(c.x, PITCH_WIDTH - c.x, c.y, PITCH_HEIGHT - c.y) - BADGE_RADIUS;
  return obstacles.reduce(
    (least, o) => Math.min(least, distance(c, o) - o.r - BADGE_RADIUS),
    edges,
  );
}

/**
 * Where the letter of a ring or goal answer goes: on its edge, clear of the players, the YOU
 * label and the other answers. Falls back to the roomiest place when nowhere is fully clear.
 */
export function badgeSpot(
  target: ResolvedTarget,
  obstacles: Circle[],
  ownRadius = 0,
): PitchPoint {
  let candidates: PitchPoint[];
  if (target.kind === 'goal') {
    const box = goalBox(target);
    const y = target.at.y;
    candidates = [
      { x: box.right + BADGE_RADIUS + 0.8, y },
      { x: box.left - BADGE_RADIUS - 0.8, y },
    ];
  } else {
    const reach = Math.max(target.radius + 0.8, ownRadius + BADGE_RADIUS + 0.4);
    candidates = BADGE_ANGLES.map((deg) => ({
      x: target.at.x + reach * Math.cos((deg * Math.PI) / 180),
      y: target.at.y + reach * Math.sin((deg * Math.PI) / 180),
    }));
  }
  let best = candidates[0];
  let bestClear = -Infinity;
  for (const c of candidates) {
    const clear = clearance(c, obstacles);
    if (clear >= BADGE_MARGIN) return c;
    if (clear > bestClear) {
      best = c;
      bestClear = clear;
    }
  }
  return best;
}
