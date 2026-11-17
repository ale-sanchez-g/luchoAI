import {
  LEAD_DELAY_MS,
  OUTCOME_DELAY_MS,
  actorAt,
  applyBeat,
  badgeSpot,
  distance,
  dropTarget,
  isPitchActor,
  leadTimeline,
  makeTimeline,
  moveMs,
  outcomeTimeline,
  resolveTarget,
  sceneAt,
  timelineMs,
  timingPlay,
  windowAt,
} from '@/lib/pitch-play';
import type { ResolvedTarget } from '@/lib/pitch-play';
import { getTheme } from '@/lib/decision-games';
import type { PitchScene } from '@/types';

const SCENE: PitchScene = {
  goal: 'top',
  you: { x: 50, y: 50 },
  ball: { x: 55, y: 48 },
  teammates: [{ x: 20, y: 40 }],
  opponents: [{ x: 70, y: 30 }],
};

describe('moving players', () => {
  it('names players the way the plays do', () => {
    expect(['you', 'ball', 't0', 'o12'].every(isPitchActor)).toBe(true);
    expect(['me', 't', 'x1', 'o1a'].some(isPitchActor)).toBe(false);
    expect(actorAt(SCENE, 't0')).toEqual({ x: 20, y: 40 });
    expect(actorAt(SCENE, 'o3')).toBeUndefined();
  });

  it('moves only the players a beat names, without touching the scene it came from', () => {
    const next = applyBeat(SCENE, { you: { x: 60, y: 40 }, o0: { x: 65, y: 35 } });
    expect(next.you).toEqual({ x: 60, y: 40 });
    expect(next.opponents[0]).toEqual({ x: 65, y: 35 });
    expect(next.ball).toEqual(SCENE.ball);
    expect(next.teammates).toEqual(SCENE.teammates);
    expect(SCENE.you).toEqual({ x: 50, y: 50 });
    expect(SCENE.opponents[0]).toEqual({ x: 70, y: 30 });
  });

  it('lets the slowest mover set the pace, within sensible limits', () => {
    const shortRun = applyBeat(SCENE, { you: { x: 51, y: 50 } });
    const longPass = applyBeat(SCENE, { ball: { x: 55, y: 3 } });
    const longRun = applyBeat(SCENE, { you: { x: 50, y: 5 } });
    expect(moveMs(SCENE, shortRun)).toBe(450);
    // The ball covers ground faster than a player does.
    expect(moveMs(SCENE, longPass)).toBeLessThan(moveMs(SCENE, longRun));
    expect(moveMs(SCENE, applyBeat(SCENE, { you: { x: 0, y: 0 } }))).toBe(2000);
  });
});

describe('timelines', () => {
  const beats = [{ you: { x: 50, y: 30 } }, { ball: { x: 50, y: 33 } }];
  const timeline = makeTimeline(SCENE, beats, 200);
  const [first, second] = timeline.moves;

  it('holds still for the delay, then plays each beat in turn', () => {
    expect(sceneAt(timeline, 0)).toEqual(SCENE);
    expect(sceneAt(timeline, 199).you).toEqual(SCENE.you);
    const halfway = sceneAt(timeline, 200 + first / 2).you;
    expect(halfway.x).toBe(50);
    expect(halfway.y).toBeCloseTo(40);
    // Between beats everyone waits where the first beat left them.
    const between = sceneAt(timeline, 200 + first + timeline.pause / 2);
    expect(between.you).toEqual({ x: 50, y: 30 });
    expect(between.ball).toEqual(SCENE.ball);
    expect(timelineMs(timeline)).toBe(200 + first + timeline.pause + second);
    expect(sceneAt(timeline, timelineMs(timeline))).toEqual(timeline.frames[2]);
    expect(sceneAt(timeline, 99999)).toEqual(timeline.frames[2]);
  });

  it('kicks the ball fast off the foot while players ease in and out', () => {
    const both = makeTimeline(SCENE, [{ you: { x: 50, y: 20 }, ball: { x: 55, y: 18 } }]);
    const early = sceneAt(both, both.moves[0] * 0.25);
    const playerShare = (SCENE.you.y - early.you.y) / 30;
    const ballShare = (SCENE.ball.y - early.ball.y) / 30;
    expect(ballShare).toBeGreaterThan(playerShare);
  });

  it('builds up from where the play starts into the decision picture', () => {
    const scenario = getTheme('space').scenarios[0];
    const lead = leadTimeline(scenario);
    expect(lead.delay).toBe(LEAD_DELAY_MS);
    expect(lead.frames[0].you).toEqual(scenario.lead[0].you);
    expect(sceneAt(lead, timelineMs(lead))).toEqual(scenario.scene);
  });

  it('plays an answer on from the decision picture, or from a mid-play moment', () => {
    const scenario = getTheme('space').scenarios[0];
    const correct = scenario.options.find((o) => o.correct)!;
    const outcome = outcomeTimeline(scenario, correct.id);
    expect(outcome.delay).toBe(OUTCOME_DELAY_MS);
    expect(outcome.frames[0]).toEqual(scenario.scene);
    const end = sceneAt(outcome, timelineMs(outcome));
    expect(end.you).toEqual(correct.play[0].you);
    const from = applyBeat(scenario.scene, { ball: { x: 10, y: 10 } });
    expect(outcomeTimeline(scenario, correct.id, from).frames[0]).toBe(from);
  });
});

describe('"when" plays', () => {
  const scenario = getTheme('space').scenarios.find((s) => s.timing)!;
  const { timeline, windows } = timingPlay(scenario);

  it('gives every answer one moment, in order, each lasting as long as it says', () => {
    expect(windows.map((w) => w.option).sort()).toEqual(['A', 'B', 'C']);
    windows.forEach((w, i) => {
      expect(w.start).toBe(i === 0 ? 0 : windows[i - 1].end);
      expect(w.end - w.start).toBeGreaterThanOrEqual(scenario.timing!.phases[i].ms);
    });
    expect(timelineMs(timeline)).toBe(windows[windows.length - 1].end);
  });

  it('reads the moment for a GO tap, and the last moment once the play is over', () => {
    expect(windowAt(windows, 0)?.cue).toBe('Head down');
    expect(windowAt(windows, windows[1].start + 10)?.cue).toBe('Looks up!');
    expect(windowAt(windows, 1e6)?.option).toBe(windows[windows.length - 1].option);
  });
});

describe('answer targets', () => {
  const spot = resolveTarget(SCENE, 'A', { x: 30, y: 20 })!;
  const ring = resolveTarget(SCENE, 'B', 't0')!;
  const goal = resolveTarget(SCENE, 'C', 'goal')!;
  const stay = resolveTarget(SCENE, 'D', 'you')!;

  it('turns spots, players and the goal into things to drop on', () => {
    expect(spot).toMatchObject({ kind: 'spot', at: { x: 30, y: 20 } });
    expect(ring).toMatchObject({ kind: 'ring', at: SCENE.teammates[0], actor: 't0' });
    expect(goal.kind).toBe('goal');
    expect(goal.at.y).toBeLessThan(10);
    expect(stay.radius).toBeGreaterThan(ring.radius);
    expect(resolveTarget(SCENE, 'X', 't5')).toBeNull();
    expect(resolveTarget({ ...SCENE, goal: undefined }, 'X', 'goal')).toBeNull();
  });

  it('answers with whatever a drop lands on, and nothing when it lands at home', () => {
    const targets: ResolvedTarget[] = [spot, ring, goal];
    expect(dropTarget({ x: 31, y: 21 }, SCENE.you, targets)).toBe('A');
    // A finger's width short of the edge still counts.
    expect(dropTarget({ x: 20 + ring.radius + 4, y: 40 }, SCENE.you, targets)).toBe('B');
    expect(dropTarget({ x: 50, y: 4 }, SCENE.you, targets)).toBe('C');
    expect(dropTarget({ x: 51, y: 51 }, SCENE.you, targets)).toBeNull();
    expect(dropTarget({ x: 90, y: 70 }, SCENE.you, targets)).toBeNull();
  });

  it('puts a ring letter where nothing is in the way', () => {
    const blockedUpRight = [{ x: 26, y: 33, r: 4 }];
    const at = badgeSpot(ring, blockedUpRight, 3.2);
    expect(distance(at, blockedUpRight[0])).toBeGreaterThan(4 + 2.9);
    expect(distance(at, ring.at)).toBeGreaterThan(ring.radius);
  });
});
