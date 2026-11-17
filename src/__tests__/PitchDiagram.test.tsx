import '@testing-library/jest-dom';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import PitchDiagram, {
  KEY_PLAYER_FACE,
  PITCH_HEIGHT,
  PITCH_WIDTH,
  PitchLegend,
  layoutMarkers,
} from '@/components/PitchDiagram';
import { DECISION_THEMES } from '@/lib/decision-games';
import { BADGE_RADIUS, distance } from '@/lib/pitch-play';
import type { PitchPoint } from '@/types';
import { clearOfPlayers } from './helpers/pitch-shapes';

const ROOT = join(__dirname, '..', '..');
const FACE_FILE = join(ROOT, 'public', 'players', 'key-player.webp');
const SCENARIOS = DECISION_THEMES.flatMap((t) => t.scenarios);
type Scenario = (typeof SCENARIOS)[number];

// Draws a situation the way the game does, with its answer markers on the pitch.
function drawSituation(s: Scenario) {
  const markers = s.options.flatMap((o) => (o.marker ? [{ id: o.id, target: o.marker }] : []));
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
      <PitchDiagram
        scene={scene}
        label="Spare player"
        markers={[{ id: 'B', target: { x: 52, y: 41 } }]}
      />,
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

// jsdom has no PointerEvent; React reads pointerId and isPrimary from it.
class TestPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
  }
}
if (!('PointerEvent' in window)) Object.assign(window, { PointerEvent: TestPointerEvent });

const byId = (id: string): Scenario => SCENARIOS.find((s) => s.id === id)!;
const markersOf = (s: Scenario) =>
  s.options.flatMap((o) => (o.marker ? [{ id: o.id, target: o.marker }] : []));
// The pitch is drawn 400px wide in these tests, so a pitch unit is 4px.
const at = (p: PitchPoint) => ({ clientX: p.x * 4, clientY: p.y * 4, pointerId: 1 });

function drawAnswerable(s: Scenario) {
  const onChoose = jest.fn();
  const onAim = jest.fn();
  const view = render(
    <PitchDiagram
      scene={s.scene}
      label={s.title}
      markers={markersOf(s)}
      answer={{ control: s.control, onChoose, onAim }}
    />,
  );
  const svg = view.container.querySelector('svg[role="img"]') as SVGSVGElement;
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0 }) as DOMRect;
  const handle = view.container.querySelector('[data-draggable]') as Element;
  return { ...view, onChoose, onAim, handle };
}

describe('answering on the Game IQ pitch', () => {
  const shadow = byId('space-shadow');

  it('lets you drag YOU onto a letter, saying what the drop means on the way', () => {
    const { container, handle, onChoose, onAim } = drawAnswerable(shadow);
    fireEvent.pointerDown(handle, at(shadow.scene.you));
    fireEvent.pointerMove(handle, at({ x: 60, y: 33 }));
    fireEvent.pointerMove(handle, at({ x: 69, y: 35 }));
    expect(onAim).toHaveBeenLastCalledWith({ kind: 'dragging', over: 'B' });
    // YOU follows the pointer, with a faded copy left where the drag began.
    expect(container.querySelectorAll('image')).toHaveLength(2);
    fireEvent.pointerUp(handle, at({ x: 69, y: 35 }));
    expect(onChoose).toHaveBeenCalledWith('B');
    expect(container.querySelectorAll('image')).toHaveLength(1);
  });

  it('puts YOU back and answers nothing when dropped away from every letter', () => {
    const { handle, onChoose, onAim } = drawAnswerable(shadow);
    fireEvent.pointerDown(handle, at(shadow.scene.you));
    fireEvent.pointerMove(handle, at({ x: 85, y: 65 }));
    fireEvent.pointerUp(handle, at({ x: 85, y: 65 }));
    expect(onChoose).not.toHaveBeenCalled();
    expect(onAim).toHaveBeenLastCalledWith({ kind: 'missed' });
  });

  it('treats a press without a drag as a tap on YOU, which asks for a drag', () => {
    const { handle, onChoose, onAim } = drawAnswerable(shadow);
    fireEvent.pointerDown(handle, at(shadow.scene.you));
    fireEvent.pointerUp(handle, at({ x: shadow.scene.you.x + 0.2, y: shadow.scene.you.y }));
    expect(onChoose).not.toHaveBeenCalled();
    expect(onAim).toHaveBeenLastCalledWith({ kind: 'tapped' });
  });

  it('answers when a letter is tapped, including "stay where you are" on your own ring', () => {
    const { container, onChoose } = drawAnswerable(shadow);
    fireEvent.click(container.querySelector('[data-marker="A"]') as Element);
    expect(onChoose).toHaveBeenLastCalledWith('A');
    fireEvent.click(container.querySelector('[data-marker="C"]') as Element);
    expect(onChoose).toHaveBeenLastCalledWith('C');
  });

  it('passes by dragging the ball onto a teammate', () => {
    const protect = byId('touch-protect');
    const { handle, onChoose } = drawAnswerable(protect);
    fireEvent.pointerDown(handle, at(protect.scene.ball));
    fireEvent.pointerMove(handle, at({ x: 34, y: 60 }));
    fireEvent.pointerUp(handle, at({ x: 31, y: 62 }));
    expect(onChoose).toHaveBeenCalledWith('A');
  });

  it('shoots by dragging the ball into the goal', () => {
    const shot = byId('shoot-clear-sight');
    const { handle, onChoose } = drawAnswerable(shot);
    fireEvent.pointerDown(handle, at(shot.scene.ball));
    fireEvent.pointerMove(handle, at({ x: 50, y: 10 }));
    fireEvent.pointerUp(handle, at({ x: 47, y: 3 }));
    expect(onChoose).toHaveBeenCalledWith('C');
  });

  it('is only a picture when there is nothing to answer', () => {
    const { container } = drawSituation(shadow);
    expect(container.querySelector('[data-draggable]')).toBeNull();
    expect(container.querySelector('[data-marker="A"]')).not.toHaveClass('cursor-pointer');
  });

  it('shows what the watched player is doing in a "when" play', () => {
    const timing = byId('space-timing');
    render(
      <PitchDiagram
        scene={timing.scene}
        label={timing.title}
        callout={{ at: timing.scene.teammates[0], text: 'Looks up!', below: true }}
      />,
    );
    expect(screen.getByText('Looks up!')).toBeInTheDocument();
  });

  it.each(SCENARIOS.filter((s) => !s.timing).map((s) => [s.id, s] as const))(
    '%s keeps every answer letter clear of players, the YOU label and each other',
    (_, s) => {
      const layout = layoutMarkers(s.scene, markersOf(s));
      const letters = [
        ...layout.targets.filter((t) => t.kind === 'spot').map((t) => ({ ...t.at, r: t.radius })),
        ...Object.values(layout.badges).map((b) => ({ ...b, r: BADGE_RADIUS })),
      ];
      expect(letters).toHaveLength(3);
      // "YOU" is about 8 units wide and sits on its baseline.
      const label = { left: s.scene.you.x - 4, right: s.scene.you.x + 4 };
      const labelTop = layout.labelY - 2.85;
      const labelBottom = layout.labelY + 0.4;
      letters.forEach((c, i) => {
        expect(clearOfPlayers(c, c.r, s.scene)).toBeGreaterThan(0);
        const dx = Math.max(label.left - c.x, 0, c.x - label.right);
        const dy = Math.max(labelTop - c.y, 0, c.y - labelBottom);
        expect(Math.hypot(dx, dy)).toBeGreaterThan(c.r);
        expect(c.x - c.r).toBeGreaterThanOrEqual(0);
        expect(c.x + c.r).toBeLessThanOrEqual(PITCH_WIDTH);
        expect(c.y - c.r).toBeGreaterThanOrEqual(0);
        expect(c.y + c.r).toBeLessThanOrEqual(PITCH_HEIGHT);
        letters.slice(i + 1).forEach((o) => expect(distance(c, o)).toBeGreaterThan(c.r + o.r));
      });
    },
  );
});
