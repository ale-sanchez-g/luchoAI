'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { PitchActor, PitchPoint, PitchScene, PitchTarget } from '@/types';
import {
  BADGE_RADIUS,
  PITCH_HEIGHT,
  PITCH_WIDTH,
  SPOT_RADIUS,
  badgeSpot,
  distance,
  dropTarget,
  goalBox,
  resolveTarget,
} from '@/lib/pitch-play';
import type { Circle, ResolvedTarget } from '@/lib/pitch-play';

export { PITCH_HEIGHT, PITCH_WIDTH };

const TOUCHLINE_LEFT = 2;
const TOUCHLINE_RIGHT = PITCH_WIDTH - 2;
const GOAL_LINE_INSET = 2;
const LINE_PROPS = { stroke: 'white', strokeOpacity: 0.7, strokeWidth: 0.5, fill: 'none' };

const COLORS = {
  pitch: '#1a7f3c',
  dark: '#0f5a2b',
  ink: '#111827',
  you: '#f59e0b',
  opponent: '#dc2626',
  run: '#fde68a',
  answer: '#fef3c7',
  answerOver: '#fde047',
  answerEdge: '#92400e',
  answerInk: '#78350f',
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const KEY_PLAYER_FACE = `${BASE_PATH}/players/key-player.webp`;

// At 11 pitch units the face stays above 28px on a 320px phone, yet only brushes the ball,
// which sits about 6 units from you when you have it.
const FACE_SIZE = 11;
const FACE_TOP = FACE_SIZE / 2;
// An orange disc behind the chin, like a shirt collar, keeps "You" orange as in the key.
const DISC = { dy: FACE_SIZE * 0.12, r: FACE_SIZE * 0.43, stroke: 0.7 };
const FACE_BOTTOM = DISC.dy + DISC.r + DISC.stroke / 2;
// "YOU" in bold at 3.4: its capitals stand 2.45 tall and the outline adds 0.4 all round.
const LABEL_CAP = 2.45;
const LABEL_OUTLINE = 0.4;
const LABEL_GAP = 1;

const TEAMMATE_RADIUS = 3.2;
const BALL_RADIUS = 1.7;
// Rough circles around each shape, for keeping answer letters clear of the players.
const FACE_SHAPE = { dy: 0.4, r: 5.6 };
const OPPONENT_SHAPE = { dy: -0.2, r: 4 };
const LABEL_SHAPE = { dy: -1.2, r: 4.2 };

/** Moving this far (in pitch units) turns a press on YOU or the ball into a drag. */
const DRAG_START = 1.2;
/** Invisible hit areas, bigger than what is drawn, so small fingers can still tap the answers. */
const HIT = { spot: 6, badge: 4.6, you: 7.5, ball: 5.5 };
/** Keeps a dragged player or ball fully on the pitch. */
const EDGE = 1.5;
/** A ring that grows and fades around what you can drag; it stays still for reduced motion. */
const PULSE_CLASS =
  'origin-center opacity-0 [transform-box:fill-box] motion-safe:animate-pitch-pulse';

export interface PitchMarker {
  id: string;
  target: PitchTarget;
}

/** What the player is doing on the pitch right now, so the words under it can follow along. */
export type PitchAim =
  | { kind: 'idle' }
  | { kind: 'dragging'; over: string | null }
  | { kind: 'tapped' }
  | { kind: 'missed' };

export interface PitchAnswer {
  /** What the player drags: themselves or the ball. */
  control: 'you' | 'ball';
  onChoose: (id: string) => void;
  onAim?: (aim: PitchAim) => void;
}

export interface PitchCallout {
  at: PitchPoint;
  text: string;
  /** Under the player instead of over them, to keep clear of the ball. */
  below?: boolean;
}

interface PitchDiagramProps {
  scene: PitchScene;
  label: string;
  markers?: PitchMarker[];
  /** Arrows belong to the still picture; they are hidden while the play moves. */
  showArrows?: boolean;
  /** Makes the pitch answerable: drag YOU or the ball onto a marker, or tap a marker. */
  answer?: PitchAnswer;
  /** A word bubble next to a player, like the passer's "Head down". */
  callout?: PitchCallout | null;
}

interface Drag {
  pointerId: number;
  /** Where the pointer went down. */
  start: PitchPoint;
  /** From the pointer to the centre of what is being dragged, so it does not jump. */
  grab: PitchPoint;
  at: PitchPoint;
  moved: boolean;
  over: string | null;
}

function trianglePoints({ x, y }: PitchPoint): string {
  return `${x},${y - 3.8} ${x - 3.4},${y + 2.4} ${x + 3.4},${y + 2.4}`;
}

function clampToPitch({ x, y }: PitchPoint): PitchPoint {
  return {
    x: Math.min(PITCH_WIDTH - EDGE, Math.max(EDGE, x)),
    y: Math.min(PITCH_HEIGHT - EDGE, Math.max(EDGE, y)),
  };
}

// The "YOU" label normally sits above the face, but flips below when someone (or an answer
// marker) is just above, e.g. a defender tight on your back, so the label never hides them.
function youLabelY(scene: PitchScene, markerPoints: PitchPoint[]): number {
  const { you } = scene;
  const above = you.y - FACE_TOP - LABEL_GAP - LABEL_OUTLINE;
  const below = you.y + FACE_BOTTOM + LABEL_GAP + LABEL_OUTLINE + LABEL_CAP;
  const nearby = [...scene.teammates, ...scene.opponents, ...markerPoints];
  const crowdedAbove = nearby.some(
    (p) => Math.abs(p.x - you.x) < 8 && you.y - p.y > 0 && you.y - p.y < 13.5,
  );
  const noRoomAbove = above - LABEL_CAP - LABEL_OUTLINE < 0;
  return crowdedAbove || noRoomAbove ? below : above;
}

function ownRadius(actor: PitchActor | undefined): number {
  if (actor === 'you') return FACE_SHAPE.r;
  if (actor === 'ball') return BALL_RADIUS;
  if (actor?.startsWith('t')) return TEAMMATE_RADIUS;
  return actor ? OPPONENT_SHAPE.r : 0;
}

export interface MarkerLayout {
  targets: ResolvedTarget[];
  /** Where the letters of ring and goal answers go. */
  badges: Record<string, PitchPoint>;
  /** Answers the YOU label keeps clear of: spots, and rings around anyone but you. */
  labelAvoids: PitchPoint[];
  labelY: number;
}

/** Places the answers on the pitch: spots as they are, letters for rings and the goal. */
export function layoutMarkers(scene: PitchScene, markers: PitchMarker[]): MarkerLayout {
  const targets = markers.flatMap((m) => resolveTarget(scene, m.id, m.target) ?? []);
  const spots = targets.filter((t) => t.kind === 'spot');
  const labelAvoids = targets
    .filter((t) => t.kind === 'spot' || (t.kind === 'ring' && t.actor !== 'you'))
    .map((t) => t.at);
  const labelY = youLabelY(scene, labelAvoids);
  const players: { actor: PitchActor; shape: Circle }[] = [
    { actor: 'you', shape: { x: scene.you.x, y: scene.you.y + FACE_SHAPE.dy, r: FACE_SHAPE.r } },
    { actor: 'ball', shape: { ...scene.ball, r: BALL_RADIUS } },
    ...scene.teammates.map((p, i) => ({
      actor: `t${i}` as PitchActor,
      shape: { ...p, r: TEAMMATE_RADIUS },
    })),
    ...scene.opponents.map((p, i) => ({
      actor: `o${i}` as PitchActor,
      shape: { x: p.x, y: p.y + OPPONENT_SHAPE.dy, r: OPPONENT_SHAPE.r },
    })),
  ];
  const fixed: Circle[] = [
    { x: scene.you.x, y: labelY + LABEL_SHAPE.dy, r: LABEL_SHAPE.r },
    ...spots.map((t) => ({ ...t.at, r: SPOT_RADIUS })),
  ];
  const badges: Record<string, PitchPoint> = {};
  targets.forEach((t) => {
    if (t.kind === 'spot') return;
    // A ring's letter sits outside its own player, so only the others are in the way.
    const others = players.filter((p) => p.actor !== t.actor).map((p) => p.shape);
    const at = badgeSpot(t, [...others, ...fixed], ownRadius(t.actor));
    badges[t.id] = at;
    fixed.push({ ...at, r: BADGE_RADIUS });
  });
  return { targets, badges, labelAvoids, labelY };
}

function KeyPlayer({ at, ghost = false }: { at: PitchPoint; ghost?: boolean }) {
  // Chrome draws a broken-picture icon for a face that fails to load; the plain disc is better.
  const [faceFailed, setFaceFailed] = useState(false);
  return (
    <g data-key-player={ghost ? undefined : ''} opacity={ghost ? 0.35 : undefined}>
      <circle
        cx={at.x}
        cy={at.y + DISC.dy}
        r={DISC.r}
        fill={COLORS.you}
        stroke={COLORS.ink}
        strokeWidth={DISC.stroke}
      />
      {!faceFailed && (
        <image
          href={KEY_PLAYER_FACE}
          x={at.x - FACE_TOP}
          y={at.y - FACE_TOP}
          width={FACE_SIZE}
          height={FACE_SIZE}
          onError={() => setFaceFailed(true)}
        />
      )}
    </g>
  );
}

function Ball({ at, ghost = false }: { at: PitchPoint; ghost?: boolean }) {
  return (
    <circle
      cx={at.x}
      cy={at.y}
      r={BALL_RADIUS}
      fill="white"
      stroke={COLORS.ink}
      strokeWidth={0.5}
      opacity={ghost ? 0.35 : undefined}
    />
  );
}

function GoalEnd({ end }: { end: 'top' | 'bottom' }) {
  const lineY = end === 'top' ? GOAL_LINE_INSET : PITCH_HEIGHT - GOAL_LINE_INSET;
  const boxY = end === 'top' ? lineY : lineY - 16;
  const sixYardY = end === 'top' ? lineY : lineY - 6;
  const goalY = end === 'top' ? 0 : lineY;

  return (
    <g {...LINE_PROPS}>
      <line x1={TOUCHLINE_LEFT} y1={lineY} x2={TOUCHLINE_RIGHT} y2={lineY} />
      <rect x={20} y={boxY} width={60} height={16} />
      <rect x={37} y={sixYardY} width={26} height={6} />
      <rect x={44} y={goalY} width={12} height={GOAL_LINE_INSET} fill="white" fillOpacity={0.3} />
    </g>
  );
}

function Letter({ at, id, r, over }: { at: PitchPoint; id: string; r: number; over: boolean }) {
  return (
    <>
      <circle
        cx={at.x}
        cy={at.y}
        r={r}
        fill={over ? COLORS.answerOver : COLORS.answer}
        stroke={COLORS.answerEdge}
        strokeWidth={over ? 0.9 : 0.6}
        strokeDasharray={over ? undefined : '1.2 0.8'}
      />
      <text
        x={at.x}
        y={at.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r * 1.06}
        fontWeight={700}
        fill={COLORS.answerInk}
      >
        {id}
      </text>
    </>
  );
}

/** The ring around a player, or the frame around the goal, drawn underneath the players. */
function TargetOutline({ target, over }: { target: ResolvedTarget; over: boolean }) {
  const outline = {
    fill: over ? COLORS.answerOver : COLORS.answer,
    fillOpacity: over ? 0.35 : 0.12,
    stroke: over ? COLORS.answerOver : COLORS.answer,
    strokeWidth: over ? 0.9 : 0.6,
    strokeDasharray: over ? undefined : '1.6 1',
  };
  if (target.kind === 'goal') {
    const box = goalBox(target);
    return (
      <rect
        x={box.left}
        y={box.top}
        width={box.right - box.left}
        height={box.bottom - box.top}
        rx={1}
        {...outline}
      />
    );
  }
  return <circle cx={target.at.x} cy={target.at.y} r={target.radius} {...outline} />;
}

function GoalHitArea({ target }: { target: ResolvedTarget }) {
  const box = goalBox(target);
  return (
    <rect
      x={box.left}
      y={box.top}
      width={box.right - box.left}
      height={box.bottom - box.top}
      fill="transparent"
    />
  );
}

export default function PitchDiagram({
  scene,
  label,
  markers = [],
  showArrows = true,
  answer,
  callout = null,
}: PitchDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const control = answer?.control;
  const home = control === 'ball' ? scene.ball : scene.you;
  const dragging = drag !== null && drag.moved && control !== undefined;

  let drawn = scene;
  if (dragging && control === 'you') drawn = { ...scene, you: drag.at };
  if (dragging && control === 'ball') drawn = { ...scene, ball: drag.at };

  const layout = layoutMarkers(scene, markers);
  const labelY = dragging ? youLabelY(drawn, layout.labelAvoids) : layout.labelY;
  // Your own ring ("stay where you are") is answered by tapping its letter, not by dropping.
  const droppable = layout.targets.filter((t) => t.actor !== control);

  const touchlineTop = scene.goal === 'top' ? GOAL_LINE_INSET : 0;
  const touchlineBottom =
    scene.goal === 'bottom' ? PITCH_HEIGHT - GOAL_LINE_INSET : PITCH_HEIGHT;

  const answerable = answer !== undefined;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !answerable) return undefined;
    // iOS Safari can ignore touch-action on SVG shapes, so stop the page scrolling by hand while
    // a finger drags YOU or the ball. A swipe anywhere else on the pitch still scrolls the page.
    function hold(e: TouchEvent): void {
      if (e.target instanceof Element && e.target.closest('[data-draggable]')) e.preventDefault();
    }
    svg.addEventListener('touchstart', hold, { passive: false });
    svg.addEventListener('touchmove', hold, { passive: false });
    return () => {
      svg.removeEventListener('touchstart', hold);
      svg.removeEventListener('touchmove', hold);
    };
  }, [answerable]);

  function toPitch(e: ReactPointerEvent): PitchPoint {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return home;
    return {
      x: ((e.clientX - box.left) / box.width) * PITCH_WIDTH,
      y: ((e.clientY - box.top) / box.height) * PITCH_HEIGHT,
    };
  }

  function grab(e: ReactPointerEvent<SVGCircleElement>): void {
    if (!answer || !e.isPrimary || drag) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const start = toPitch(e);
    setDrag({
      pointerId: e.pointerId,
      start,
      grab: { x: home.x - start.x, y: home.y - start.y },
      at: home,
      moved: false,
      over: null,
    });
  }

  function follow(e: ReactPointerEvent<SVGCircleElement>): void {
    if (!answer || !drag || e.pointerId !== drag.pointerId) return;
    const p = toPitch(e);
    if (!drag.moved && distance(p, drag.start) < DRAG_START) return;
    const at = clampToPitch({ x: p.x + drag.grab.x, y: p.y + drag.grab.y });
    const over = dropTarget(at, home, droppable);
    if (!drag.moved || over !== drag.over) answer.onAim?.({ kind: 'dragging', over });
    setDrag({ ...drag, at, moved: true, over });
  }

  function release(e: ReactPointerEvent<SVGCircleElement>): void {
    if (!answer || !drag || e.pointerId !== drag.pointerId) return;
    setDrag(null);
    // Work from this event rather than the last render: a quick flick can beat the re-render.
    const p = toPitch(e);
    if (!drag.moved && distance(p, drag.start) < DRAG_START) {
      answer.onAim?.({ kind: 'tapped' });
      return;
    }
    const at = clampToPitch({ x: p.x + drag.grab.x, y: p.y + drag.grab.y });
    const over = dropTarget(at, home, droppable);
    if (over === null) {
      answer.onAim?.({ kind: 'missed' });
      return;
    }
    answer.onAim?.({ kind: 'idle' });
    answer.onChoose(over);
  }

  function cancel(e: ReactPointerEvent<SVGCircleElement>): void {
    if (!drag || e.pointerId !== drag.pointerId) return;
    setDrag(null);
    answer?.onAim?.({ kind: 'idle' });
  }

  const tap = (id: string) => (answer ? () => answer.onChoose(id) : undefined);
  const youOnTop = dragging && control === 'you';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
      role="img"
      aria-label={label}
      className={`block h-auto w-full select-none ${dragging ? 'cursor-grabbing' : ''}`}
    >
      <defs>
        <marker
          id="pitch-arrow-pass"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="white" />
        </marker>
        <marker
          id="pitch-arrow-run"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={COLORS.run} />
        </marker>
      </defs>

      <rect width={PITCH_WIDTH} height={PITCH_HEIGHT} fill={COLORS.pitch} />
      {Array.from({ length: 5 }, (_, i) => (
        <rect
          key={i}
          y={i * 15}
          width={PITCH_WIDTH}
          height={7.5}
          fill="white"
          fillOpacity={0.05}
        />
      ))}
      <g {...LINE_PROPS}>
        <line x1={TOUCHLINE_LEFT} y1={touchlineTop} x2={TOUCHLINE_LEFT} y2={touchlineBottom} />
        <line x1={TOUCHLINE_RIGHT} y1={touchlineTop} x2={TOUCHLINE_RIGHT} y2={touchlineBottom} />
      </g>
      {scene.goal && <GoalEnd end={scene.goal} />}

      {showArrows &&
        scene.arrows?.map((arrow, i) => (
          <line
            key={i}
            x1={arrow.from.x}
            y1={arrow.from.y}
            x2={arrow.to.x}
            y2={arrow.to.y}
            stroke={arrow.kind === 'pass' ? 'white' : COLORS.run}
            strokeWidth={0.7}
            strokeDasharray={arrow.kind === 'pass' ? '2 1.5' : undefined}
            markerEnd={`url(#pitch-arrow-${arrow.kind})`}
          />
        ))}

      {layout.targets
        .filter((t) => t.kind !== 'spot')
        .map((t) => (
          <TargetOutline key={t.id} target={t} over={drag?.over === t.id} />
        ))}
      {/* The dragged player covers the spot it is over, so a glow shows round them instead. */}
      {layout.targets
        .filter((t) => t.kind === 'spot' && drag?.over === t.id)
        .map((t) => (
          <circle
            key={t.id}
            cx={t.at.x}
            cy={t.at.y}
            r={HIT.spot + 1.5}
            fill={COLORS.answerOver}
            fillOpacity={0.45}
            stroke={COLORS.answerOver}
            strokeWidth={0.6}
            pointerEvents="none"
          />
        ))}

      {dragging && (
        <g pointerEvents="none">
          {control === 'you' ? <KeyPlayer at={home} ghost /> : <Ball at={home} ghost />}
          <line
            x1={home.x}
            y1={home.y}
            x2={drag.at.x}
            y2={drag.at.y}
            stroke={control === 'you' ? COLORS.run : 'white'}
            strokeWidth={0.7}
            strokeDasharray={control === 'ball' ? '2 1.5' : undefined}
            markerEnd={`url(#pitch-arrow-${control === 'you' ? 'run' : 'pass'})`}
          />
        </g>
      )}

      {/* Drawn before everyone else, so a defender tight on your back stays in full view. */}
      {!youOnTop && <KeyPlayer at={drawn.you} />}
      {drawn.teammates.map((p, i) => (
        <circle
          key={`t${i}`}
          cx={p.x}
          cy={p.y}
          r={TEAMMATE_RADIUS}
          fill="white"
          stroke={COLORS.dark}
          strokeWidth={0.8}
        />
      ))}
      {drawn.opponents.map((p, i) => (
        <polygon
          key={`o${i}`}
          points={trianglePoints(p)}
          fill={COLORS.opponent}
          stroke="white"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      ))}
      <text
        x={drawn.you.x}
        y={labelY}
        textAnchor="middle"
        fontSize={3.4}
        fontWeight={700}
        fill="white"
        stroke={COLORS.dark}
        strokeWidth={0.8}
        paintOrder="stroke"
        pointerEvents="none"
      >
        YOU
      </text>

      {!(dragging && control === 'ball') && <Ball at={drawn.ball} />}

      {layout.targets.map((t) => {
        const over = drag?.over === t.id;
        const onClick = tap(t.id);
        const own = t.actor !== undefined && t.actor === control;
        // Where and what each answer is, for the end-to-end checks.
        const props = {
          'data-marker': t.id,
          'data-kind': t.kind,
          'data-at': `${t.at.x},${t.at.y}`,
          'data-own': own ? '' : undefined,
          onClick,
          className: onClick ? 'cursor-pointer' : undefined,
        };
        if (t.kind === 'spot') {
          return (
            <g key={t.id} {...props}>
              <Letter at={t.at} id={t.id} r={SPOT_RADIUS} over={over} />
              {onClick && <circle cx={t.at.x} cy={t.at.y} r={HIT.spot} fill="transparent" />}
            </g>
          );
        }
        const badge = layout.badges[t.id];
        // Tapping a teammate's ring passes to them. Your own ring ("stay where you are") answers
        // from its letter only, because pressing on you starts a drag.
        const ringTappable = onClick && !own && t.kind === 'ring';
        return (
          <g key={t.id} {...props}>
            {t.kind === 'goal' && onClick && <GoalHitArea target={t} />}
            {ringTappable && (
              <circle cx={t.at.x} cy={t.at.y} r={t.radius + 1} fill="transparent" />
            )}
            <Letter at={badge} id={t.id} r={BADGE_RADIUS} over={over} />
            {onClick && <circle cx={badge.x} cy={badge.y} r={HIT.badge} fill="transparent" />}
          </g>
        );
      })}

      {callout && <Callout {...callout} />}

      {/* Whatever is being dragged rides on top of everything, letters included. */}
      {youOnTop && <KeyPlayer at={drawn.you} />}
      {dragging && control === 'ball' && <Ball at={drawn.ball} />}

      {answer && !drag && (
        <circle
          cx={home.x}
          cy={home.y}
          r={control === 'you' ? 6.6 : 3}
          fill="none"
          stroke="white"
          strokeWidth={0.6}
          pointerEvents="none"
          className={PULSE_CLASS}
        />
      )}
      {answer && (
        <circle
          data-draggable=""
          cx={(drag?.at ?? home).x}
          cy={(drag?.at ?? home).y}
          r={control === 'you' ? HIT.you : HIT.ball}
          fill="transparent"
          className={`touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={grab}
          onPointerMove={follow}
          onPointerUp={release}
          onPointerCancel={cancel}
        />
      )}
    </svg>
  );
}

function Callout({ at, text, below = false }: PitchCallout) {
  const width = text.length * 1.95 + 3.4;
  const x = Math.min(PITCH_WIDTH - width / 2 - 1, Math.max(width / 2 + 1, at.x));
  const y = below ? Math.min(PITCH_HEIGHT - 3.5, at.y + 7.6) : Math.max(3.5, at.y - 7.6);
  return (
    <g data-callout="" pointerEvents="none">
      <rect
        x={x - width / 2}
        y={y - 2.6}
        width={width}
        height={5.2}
        rx={2.6}
        fill="white"
        stroke={COLORS.dark}
        strokeWidth={0.4}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={3.2}
        fontWeight={700}
        fill={COLORS.dark}
      >
        {text}
      </text>
    </g>
  );
}

export function PitchLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600" aria-label="Pitch key">
      <li className="flex items-center gap-1">
        <svg
          viewBox={`${-FACE_TOP} ${-FACE_TOP} ${FACE_SIZE} ${FACE_TOP + FACE_BOTTOM}`}
          className="h-7 w-7"
          aria-hidden="true"
        >
          <KeyPlayer at={{ x: 0, y: 0 }} />
        </svg>
        You
      </li>
      <li className="flex items-center gap-1">
        <svg viewBox="0 0 10 10" className="h-3 w-3" aria-hidden="true">
          <circle cx={5} cy={5} r={4} fill="white" stroke={COLORS.dark} />
        </svg>
        Teammate
      </li>
      <li className="flex items-center gap-1">
        <svg viewBox="0 0 10 10" className="h-3 w-3" aria-hidden="true">
          <polygon points="5,0.8 0.8,9 9.2,9" fill={COLORS.opponent} />
        </svg>
        Opponent
      </li>
      <li className="flex items-center gap-1">
        <svg viewBox="0 0 16 8" className="h-3 w-5" aria-hidden="true">
          <rect width={16} height={8} rx={1.5} fill={COLORS.pitch} />
          <line x1={2} y1={4} x2={14} y2={4} stroke="white" strokeDasharray="3 2" />
        </svg>
        Pass
      </li>
      <li className="flex items-center gap-1">
        <svg viewBox="0 0 16 8" className="h-3 w-5" aria-hidden="true">
          <rect width={16} height={8} rx={1.5} fill={COLORS.pitch} />
          <line x1={2} y1={4} x2={14} y2={4} stroke={COLORS.run} strokeWidth={1.5} />
        </svg>
        Run
      </li>
      <li>Your team attacks up the screen ↑</li>
    </ul>
  );
}
