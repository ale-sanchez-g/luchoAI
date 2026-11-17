import { DECISION_THEMES, getTheme } from '@/lib/decision-games';
import { PITCH_HEIGHT, PITCH_WIDTH } from '@/components/PitchDiagram';
import {
  actorAt,
  applyBeat,
  distance,
  dropTarget,
  goalBox,
  isPitchActor,
  resolveTarget,
  targetGap,
} from '@/lib/pitch-play';
import type { ResolvedTarget } from '@/lib/pitch-play';
import { clearOfPlayers } from './helpers/pitch-shapes';
import type {
  DecisionScenario,
  DecisionThemeId,
  PitchActor,
  PitchPoint,
  PitchScene,
  PlayBeat,
} from '@/types';

const ALL_SCENARIOS = DECISION_THEMES.flatMap((t) => t.scenarios);

function allBeats(s: DecisionScenario): PlayBeat[] {
  return [
    ...s.lead,
    ...s.options.flatMap((o) => o.play),
    ...(s.timing?.phases.flatMap((p) => p.beats) ?? []),
  ];
}

function keyframes(start: PitchScene, beats: PlayBeat[]): PitchScene[] {
  const frames = [start];
  beats.forEach((beat) => frames.push(applyBeat(frames[frames.length - 1], beat)));
  return frames;
}

function targetsOf(s: DecisionScenario): ResolvedTarget[] {
  return s.options.flatMap((o) => (o.marker ? (resolveTarget(s.scene, o.id, o.marker) ?? []) : []));
}

function scenePoints(scenario: DecisionScenario): PitchPoint[] {
  const { scene } = scenario;
  return [
    scene.you,
    scene.ball,
    ...scene.teammates,
    ...scene.opponents,
    ...(scene.arrows ?? []).flatMap((a) => [a.from, a.to]),
    ...scenario.options.flatMap((o) => (typeof o.marker === 'object' ? [o.marker] : [])),
  ];
}

describe('decision games content', () => {
  it('covers attacking, defending and counter-attacking decisions', () => {
    expect(DECISION_THEMES.map((t) => t.id)).toEqual([
      'space',
      'first-touch',
      'press',
      'defend-together',
      'counter',
      'shoot',
      'combine',
      'react-fast',
    ]);
  });

  it('uses unique scenario ids across every theme', () => {
    const ids = ALL_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(ALL_SCENARIOS.map((s) => [s.id, s] as const))('scenario %s', (_id, scenario) => {
    it('has exactly one correct option', () => {
      expect(scenario.options.filter((o) => o.correct)).toHaveLength(1);
    });

    it('labels its options A, B, C in order', () => {
      expect(scenario.options.map((o) => o.id)).toEqual(['A', 'B', 'C']);
    });

    it('explains every option and gives a coaching cue', () => {
      expect(scenario.options.every((o) => o.label && o.feedback)).toBe(true);
      expect(scenario.cue.length).toBeGreaterThan(0);
    });

    it('keeps every player, arrow and marker on the pitch', () => {
      scenePoints(scenario).forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(PITCH_WIDTH);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(PITCH_HEIGHT);
      });
    });
  });

  it('spreads correct answers across A, B and C so guessing one letter does not work', () => {
    const correctId = (s: DecisionScenario): string => s.options.find((o) => o.correct)!.id;
    const counts = { A: 0, B: 0, C: 0 } as Record<string, number>;
    ALL_SCENARIOS.forEach((s) => {
      counts[correctId(s)] += 1;
    });
    expect(Math.min(...Object.values(counts))).toBeGreaterThanOrEqual(2);
    DECISION_THEMES.forEach((theme) => {
      expect(new Set(theme.scenarios.map(correctId)).size).toBeGreaterThan(1);
    });
  });

  it('gives every theme at least one fully described pitch game', () => {
    DECISION_THEMES.forEach((theme) => {
      expect(theme.pitchGames.length).toBeGreaterThan(0);
      theme.pitchGames.forEach((game) => {
        expect(Object.values(game).every((field) => field.length > 0)).toBe(true);
      });
    });
  });

  describe.each(ALL_SCENARIOS.map((s) => [s.id, s] as const))('%s in motion', (_id, s) => {
    const home = actorAt(s.scene, s.control)!;
    const targets = targetsOf(s);
    const droppable = targets.filter((t) => t.actor !== s.control);

    it('builds up with players moving into the picture', () => {
      expect(s.lead.length).toBeGreaterThan(0);
      const start = applyBeat(s.scene, s.lead[0]);
      const moved = (Object.keys(s.lead[0]) as PitchActor[]).some(
        (actor) => distance(actorAt(start, actor)!, actorAt(s.scene, actor)!) >= 3,
      );
      expect(moved).toBe(true);
    });

    it('only moves players the scene has, and keeps every move on the pitch', () => {
      allBeats(s).forEach((beat) => {
        Object.entries(beat).forEach(([actor, at]) => {
          expect(isPitchActor(actor) && actorAt(s.scene, actor) !== undefined).toBe(true);
          expect(at!.x).toBeGreaterThanOrEqual(0);
          expect(at!.x).toBeLessThanOrEqual(PITCH_WIDTH);
          expect(at!.y).toBeGreaterThanOrEqual(0);
          expect(at!.y).toBeLessThanOrEqual(PITCH_HEIGHT);
        });
      });
    });

    it('plays out every answer and sums it up in a few words', () => {
      s.options.forEach((o) => {
        expect(o.play.length).toBeGreaterThan(0);
        expect(o.result.length).toBeGreaterThan(0);
        expect(o.result.length).toBeLessThanOrEqual(18);
      });
    });

    if (s.timing) {
      it('gives each answer one moment of the play to tap GO in', () => {
        expect(s.options.every((o) => o.marker === undefined)).toBe(true);
        expect(s.timing!.phases.map((p) => p.option).sort()).toEqual(['A', 'B', 'C']);
        expect(actorAt(s.scene, s.timing!.watch)).toBeDefined();
      });
      return;
    }

    it('puts every answer on the pitch, fully in view', () => {
      expect(targets.map((t) => t.id)).toEqual(['A', 'B', 'C']);
      targets.forEach((t) => {
        const box =
          t.kind === 'goal'
            ? goalBox(t)
            : { left: t.at.x - t.radius, right: t.at.x + t.radius, top: t.at.y - t.radius,
              bottom: t.at.y + t.radius };
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(PITCH_WIDTH);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.bottom).toBeLessThanOrEqual(PITCH_HEIGHT);
      });
    });

    it('keeps answer spots clear of every player and the ball', () => {
      targets
        .filter((t) => t.kind === 'spot')
        .forEach((t) => expect(clearOfPlayers(t.at, t.radius, s.scene)).toBeGreaterThan(0));
    });

    it('lands each drop on the answer it is over, and a drop back home on none', () => {
      droppable.forEach((t) => expect(dropTarget(t.at, home, droppable)).toBe(t.id));
      expect(dropTarget(home, home, droppable)).toBeNull();
    });

    it('plays each answer where it was dropped', () => {
      s.options.forEach((o) => {
        const target = targets.find((t) => t.id === o.id)!;
        if (target.actor === s.control) {
          // "Stay where you are": what you would have dragged does not move first.
          const first = o.play[0][s.control];
          expect(first === undefined || distance(first, home) < 1).toBe(true);
          return;
        }
        const reach = (scene: PitchScene): number => targetGap(actorAt(scene, s.control)!, target);
        const closest = Math.min(...keyframes(s.scene, o.play).map(reach));
        expect(closest).toBeLessThanOrEqual(0.6 * reach(s.scene) + 1.5);
      });
    });
  });

  it('looks themes up by id and rejects unknown ids', () => {
    expect(getTheme('press').title).toBe('Press or Hold?');
    expect(() => getTheme('dribbling' as DecisionThemeId)).toThrow('Unknown decision theme');
  });
});
