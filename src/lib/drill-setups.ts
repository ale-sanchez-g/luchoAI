/**
 * The pictures a training-plan drill can show. The AI only picks a setup id; every picture is
 * drawn here, so it can never show the wrong number of cones or anything unsafe. A drill whose
 * setup is missing or unknown (older saved plans, or a model that made one up) shows no picture.
 *
 * Coordinates are in a 100 x 56 box, seen from above.
 */

export const DRILL_SETUP_IDS = [
  'slalom',
  'gates',
  'square',
  'passing-pair',
  'wall',
  'shooting',
  'one-v-one',
  'goalkeeping',
  'ball-mastery',
  'running',
  'cool-down',
] as const;

export type DrillSetup = (typeof DRILL_SETUP_IDS)[number];

export interface DrillPoint {
  x: number;
  y: number;
}

/** dribble: ball at your feet. pass: the ball travels (pass, shot or throw). run: no ball. */
export type DrillPathKind = 'dribble' | 'pass' | 'run';

export interface DrillPath {
  kind: DrillPathKind;
  /** SVG path data in the 100 x 56 box. */
  d: string;
}

export interface DrillScene {
  you: DrillPoint;
  helper?: DrillPoint;
  ball?: DrillPoint;
  cones: DrillPoint[];
  goal?: 'left' | 'right';
  wall?: boolean;
  paths: DrillPath[];
}

export interface DrillSetupInfo {
  /** Tells the AI when to pick this picture. */
  useFor: string;
  /** Read out by screen readers, in words an 8-year-old knows. */
  alt: string;
  scene: DrillScene;
}

export const DRILL_SETUPS: Record<DrillSetup, DrillSetupInfo> = {
  slalom: {
    useFor: 'dribbling in and out of a line of cones',
    alt: 'Picture: dribble the ball in and out of a line of cones.',
    scene: {
      you: { x: 9, y: 28 },
      ball: { x: 14, y: 30 },
      cones: [25, 37, 49, 61, 73].map((x) => ({ x, y: 28 })),
      paths: [
        {
          kind: 'dribble',
          d: 'M 17 30 C 21 16, 27 16, 31 28 S 41 40, 43 28 S 53 16, 55 28 S 65 40, 67 28 ' +
            'S 77 16, 86 28',
        },
      ],
    },
  },
  gates: {
    useFor: 'dribbling through small gates made of two cones, scattered around a space',
    alt: 'Picture: dribble the ball through little gates made of two cones.',
    scene: {
      you: { x: 9, y: 34 },
      ball: { x: 14, y: 36 },
      cones: [
        { x: 32, y: 12 }, { x: 32, y: 20 },
        { x: 62, y: 8 }, { x: 62, y: 16 },
        { x: 46, y: 34 }, { x: 46, y: 42 },
        { x: 24, y: 46 }, { x: 30, y: 46 },
        { x: 76, y: 38 }, { x: 84, y: 38 },
      ],
      paths: [
        { kind: 'dribble', d: 'M 17 34 C 22 22, 26 16, 32 16 S 54 12, 62 12 S 80 24, 80 44' },
      ],
    },
  },
  square: {
    useFor: 'games inside a square of four cones, such as tag, keep-ball or moving with the ball ' +
      'in a small space',
    alt: 'Picture: a square of four cones. You move with the ball inside it while your helper ' +
      'chases you.',
    scene: {
      you: { x: 40, y: 32 },
      ball: { x: 45, y: 34 },
      helper: { x: 66, y: 18 },
      cones: [{ x: 22, y: 7 }, { x: 78, y: 7 }, { x: 22, y: 49 }, { x: 78, y: 49 }],
      paths: [
        { kind: 'dribble', d: 'M 48 35 C 56 40, 62 44, 70 41' },
        { kind: 'run', d: 'M 63 21 C 58 26, 54 30, 51 31' },
      ],
    },
  },
  'passing-pair': {
    useFor: 'passing the ball to a helper and getting it back, often through a gate of cones',
    alt: 'Picture: you and your helper pass the ball to each other through a gate of two cones.',
    scene: {
      you: { x: 14, y: 28 },
      ball: { x: 20, y: 30 },
      helper: { x: 86, y: 28 },
      cones: [{ x: 50, y: 21 }, { x: 50, y: 35 }],
      paths: [
        { kind: 'pass', d: 'M 23 28 L 81 26' },
        { kind: 'pass', d: 'M 81 32 L 23 34' },
      ],
    },
  },
  wall: {
    useFor: 'passing or kicking the ball against a wall and controlling it when it comes back',
    alt: 'Picture: pass the ball against a wall and control it when it comes back to you.',
    scene: {
      you: { x: 26, y: 28 },
      ball: { x: 32, y: 30 },
      cones: [{ x: 18, y: 16 }, { x: 18, y: 40 }],
      wall: true,
      paths: [
        { kind: 'pass', d: 'M 35 27 L 84 21' },
        { kind: 'pass', d: 'M 84 35 L 36 33' },
      ],
    },
  },
  shooting: {
    useFor: 'shooting at a goal or target, alone or after a short dribble',
    alt: 'Picture: dribble up to the cones, then shoot the ball into the goal.',
    scene: {
      you: { x: 12, y: 30 },
      ball: { x: 18, y: 32 },
      cones: [{ x: 56, y: 20 }, { x: 56, y: 40 }],
      goal: 'right',
      paths: [
        { kind: 'dribble', d: 'M 21 31 C 32 28, 42 32, 52 30' },
        { kind: 'pass', d: 'M 56 30 L 91 22' },
      ],
    },
  },
  'one-v-one': {
    useFor: 'you against your helper: getting past them with the ball, or stopping them',
    alt: 'Picture: you have the ball and try to get past your helper to reach the goal.',
    scene: {
      you: { x: 14, y: 28 },
      ball: { x: 20, y: 30 },
      helper: { x: 56, y: 28 },
      cones: [{ x: 8, y: 8 }, { x: 8, y: 48 }, { x: 88, y: 8 }, { x: 88, y: 48 }],
      goal: 'right',
      paths: [
        { kind: 'dribble', d: 'M 23 31 C 36 34, 44 44, 58 43 S 76 34, 80 30' },
        { kind: 'pass', d: 'M 81 29 L 91 27' },
      ],
    },
  },
  goalkeeping: {
    useFor: 'goalkeeper practice: catching, diving or saving shots and throws from your helper',
    alt: 'Picture: you stand in goal and your helper throws or kicks the ball for you to save.',
    scene: {
      you: { x: 14, y: 28 },
      helper: { x: 66, y: 28 },
      ball: { x: 60, y: 30 },
      cones: [{ x: 80, y: 20 }, { x: 80, y: 36 }],
      goal: 'left',
      paths: [{ kind: 'pass', d: 'M 57 29 L 20 25' }],
    },
  },
  'ball-mastery': {
    useFor: 'touches on the spot with no partner: toe taps, sole rolls, juggling, keepy-ups',
    alt: 'Picture: stay in a small box of cones and touch the ball with your feet.',
    scene: {
      you: { x: 50, y: 25 },
      ball: { x: 50, y: 34 },
      cones: [{ x: 36, y: 14 }, { x: 64, y: 14 }, { x: 36, y: 44 }, { x: 64, y: 44 }],
      paths: [],
    },
  },
  running: {
    useFor: 'warm-ups, sprints, jogging, side-steps and quick feet without the ball',
    alt: 'Picture: run from cone to cone along a line, then come back.',
    scene: {
      you: { x: 10, y: 24 },
      cones: [14, 38, 62, 86].map((x) => ({ x, y: 34 })),
      paths: [
        { kind: 'run', d: 'M 15 24 L 86 24' },
        { kind: 'run', d: 'M 86 44 L 18 44' },
      ],
    },
  },
  'cool-down': {
    useFor: 'cool-downs: walking slowly, stretching and breathing',
    alt: 'Picture: walk slowly around your space, then stretch.',
    scene: {
      you: { x: 50, y: 12 },
      cones: [],
      paths: [{ kind: 'run', d: 'M 56 12 C 84 12, 88 46, 50 46 S 14 14, 44 12' }],
    },
  },
};

/** True when `value` is a setup the app can draw. */
export function isDrillSetup(value: unknown): value is DrillSetup {
  return typeof value === 'string' && (DRILL_SETUP_IDS as readonly string[]).includes(value);
}

/** The setup list for the plan prompt, one "id: when to use it" line each. */
export function describeDrillSetups(): string {
  return DRILL_SETUP_IDS.map((id) => `- ${id}: ${DRILL_SETUPS[id].useFor}`).join('\n');
}
