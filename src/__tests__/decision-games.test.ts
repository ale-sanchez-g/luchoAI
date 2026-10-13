import { DECISION_THEMES, getTheme } from '@/lib/decision-games';
import { PITCH_HEIGHT, PITCH_WIDTH } from '@/components/PitchDiagram';
import type { DecisionScenario, DecisionThemeId, PitchPoint } from '@/types';

const ALL_SCENARIOS = DECISION_THEMES.flatMap((t) => t.scenarios);

function scenePoints(scenario: DecisionScenario): PitchPoint[] {
  const { scene } = scenario;
  return [
    scene.you,
    scene.ball,
    ...scene.teammates,
    ...scene.opponents,
    ...(scene.arrows ?? []).flatMap((a) => [a.from, a.to]),
    ...scenario.options.flatMap((o) => (o.marker ? [o.marker] : [])),
  ];
}

describe('decision games content', () => {
  it('covers moving into space, first touch, and press vs hold', () => {
    expect(DECISION_THEMES.map((t) => t.id)).toEqual(['space', 'first-touch', 'press']);
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
    const counts = { A: 0, B: 0, C: 0 } as Record<string, number>;
    ALL_SCENARIOS.forEach((s) => {
      counts[s.options.find((o) => o.correct)!.id] += 1;
    });
    expect(Math.min(...Object.values(counts))).toBeGreaterThanOrEqual(2);
  });

  it('gives every theme at least one fully described pitch game', () => {
    DECISION_THEMES.forEach((theme) => {
      expect(theme.pitchGames.length).toBeGreaterThan(0);
      theme.pitchGames.forEach((game) => {
        expect(Object.values(game).every((field) => field.length > 0)).toBe(true);
      });
    });
  });

  it('looks themes up by id and rejects unknown ids', () => {
    expect(getTheme('press').title).toBe('Press or Hold?');
    expect(() => getTheme('dribbling' as DecisionThemeId)).toThrow('Unknown decision theme');
  });
});
