import '@testing-library/jest-dom';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import PitchDiagram, {
  KEY_PLAYER_FACE,
  PITCH_HEIGHT,
  PITCH_WIDTH,
  PitchLegend,
} from '@/components/PitchDiagram';
import { DECISION_THEMES } from '@/lib/decision-games';

const ROOT = join(__dirname, '..', '..');
const FACE_FILE = join(ROOT, 'public', 'players', 'key-player.webp');
const SCENARIOS = DECISION_THEMES.flatMap((t) => t.scenarios);
type Scenario = (typeof SCENARIOS)[number];

// Draws a situation the way the game does, with its answer markers on the pitch.
function drawSituation(s: Scenario) {
  const markers = s.options.flatMap((o) => (o.marker ? [{ id: o.id, at: o.marker }] : []));
  return render(<PitchDiagram scene={s.scene} label={s.title} markers={markers} />);
}

function youLabel(container: HTMLElement): SVGTextElement {
  const label = [...container.querySelectorAll('text')].find((t) => t.textContent === 'YOU');
  if (!label) throw new Error('no YOU label');
  return label;
}

describe('key player on the Game IQ pitch', () => {
  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s draws YOU as the face', (_, s) => {
    const { container } = drawSituation(s);
    const faces = container.querySelectorAll('image');
    expect(faces).toHaveLength(1);
    expect(faces[0]).toHaveAttribute('href', KEY_PLAYER_FACE);
    const x = Number(faces[0].getAttribute('x'));
    const y = Number(faces[0].getAttribute('y'));
    const size = Number(faces[0].getAttribute('width'));
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + size).toBeLessThanOrEqual(PITCH_WIDTH);
    expect(y + size).toBeLessThanOrEqual(PITCH_HEIGHT);
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s keeps the YOU label on the pitch', (_, s) => {
    const { container } = drawSituation(s);
    const baseline = Number(youLabel(container).getAttribute('y'));
    expect(baseline - 2.85).toBeGreaterThanOrEqual(0);
    expect(baseline + 0.4).toBeLessThanOrEqual(PITCH_HEIGHT);
  });

  it('flips the label below the face when a defender is tight on your back', () => {
    const scene = {
      you: { x: 50, y: 42 },
      ball: { x: 50, y: 52 },
      teammates: [],
      opponents: [{ x: 50, y: 35.5 }],
    };
    const { container } = render(<PitchDiagram scene={scene} label="Defender on your back" />);
    expect(Number(youLabel(container).getAttribute('y'))).toBeGreaterThan(scene.you.y);
  });

  it('flips the label below the face when an answer marker sits just above', () => {
    const scene = { you: { x: 46, y: 50 }, ball: { x: 51.5, y: 48 }, teammates: [], opponents: [] };
    const { container, rerender } = render(<PitchDiagram scene={scene} label="Spare player" />);
    expect(Number(youLabel(container).getAttribute('y'))).toBeLessThan(scene.you.y);
    rerender(
      <PitchDiagram scene={scene} label="Spare player" markers={[{ id: 'B', at: { x: 52, y: 41 } }]} />,
    );
    expect(Number(youLabel(container).getAttribute('y'))).toBeGreaterThan(scene.you.y);
  });

  it('falls back to the plain orange disc if the face cannot load', () => {
    const { container } = drawSituation(SCENARIOS[0]);
    fireEvent.error(container.querySelector('image') as Element);
    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelector('[data-key-player] circle')).toBeInTheDocument();
  });

  it('shows the same face next to "You" in the pitch key', () => {
    const { container } = render(<PitchLegend />);
    expect(container.querySelector('image')).toHaveAttribute('href', KEY_PLAYER_FACE);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('serves the face as a small WebP from public/players', () => {
    expect(KEY_PLAYER_FACE.endsWith('/players/key-player.webp')).toBe(true);
    const bytes = readFileSync(FACE_FILE);
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
    // The original art is 1.7MB; the pitch only ever shows it at about 40px.
    expect(statSync(FACE_FILE).size).toBeLessThan(60 * 1024);
  });
});
