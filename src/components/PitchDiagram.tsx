'use client';

import { useState } from 'react';
import type { PitchPoint, PitchScene } from '@/types';

export const PITCH_WIDTH = 100;
export const PITCH_HEIGHT = 75;

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

export interface PitchMarker {
  id: string;
  at: PitchPoint;
}

interface PitchDiagramProps {
  scene: PitchScene;
  label: string;
  markers?: PitchMarker[];
  highlightedMarker?: string | null;
}

function trianglePoints({ x, y }: PitchPoint): string {
  return `${x},${y - 3.8} ${x - 3.4},${y + 2.4} ${x + 3.4},${y + 2.4}`;
}

// The "YOU" label normally sits above the face, but flips below when someone (or an answer
// marker) is just above, e.g. a defender tight on your back, so the label never hides them.
function youLabelY(scene: PitchScene, markers: PitchMarker[]): number {
  const { you } = scene;
  const above = you.y - FACE_TOP - LABEL_GAP - LABEL_OUTLINE;
  const below = you.y + FACE_BOTTOM + LABEL_GAP + LABEL_OUTLINE + LABEL_CAP;
  const nearby = [...scene.teammates, ...scene.opponents, ...markers.map((m) => m.at)];
  const crowdedAbove = nearby.some(
    (p) => Math.abs(p.x - you.x) < 8 && you.y - p.y > 0 && you.y - p.y < 13.5,
  );
  const noRoomAbove = above - LABEL_CAP - LABEL_OUTLINE < 0;
  return crowdedAbove || noRoomAbove ? below : above;
}

function KeyPlayer({ at }: { at: PitchPoint }) {
  // Chrome draws a broken-picture icon for a face that fails to load; the plain disc is better.
  const [faceFailed, setFaceFailed] = useState(false);
  return (
    <g data-key-player="">
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

export default function PitchDiagram({
  scene,
  label,
  markers = [],
  highlightedMarker = null,
}: PitchDiagramProps) {
  const touchlineTop = scene.goal === 'top' ? GOAL_LINE_INSET : 0;
  const touchlineBottom =
    scene.goal === 'bottom' ? PITCH_HEIGHT - GOAL_LINE_INSET : PITCH_HEIGHT;

  return (
    <svg
      viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
      role="img"
      aria-label={label}
      className="block w-full h-auto"
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

      {scene.arrows?.map((arrow, i) => (
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

      {/* Drawn before everyone else, so a defender tight on your back stays in full view. */}
      <KeyPlayer at={scene.you} />
      {scene.teammates.map((p, i) => (
        <circle
          key={`t${i}`}
          cx={p.x}
          cy={p.y}
          r={3.2}
          fill="white"
          stroke={COLORS.dark}
          strokeWidth={0.8}
        />
      ))}
      {scene.opponents.map((p, i) => (
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
        x={scene.you.x}
        y={youLabelY(scene, markers)}
        textAnchor="middle"
        fontSize={3.4}
        fontWeight={700}
        fill="white"
        stroke={COLORS.dark}
        strokeWidth={0.8}
        paintOrder="stroke"
      >
        YOU
      </text>

      <circle
        cx={scene.ball.x}
        cy={scene.ball.y}
        r={1.7}
        fill="white"
        stroke={COLORS.ink}
        strokeWidth={0.5}
      />

      {markers.map((m) => {
        const highlighted = m.id === highlightedMarker;
        return (
          <g key={m.id}>
            <circle
              cx={m.at.x}
              cy={m.at.y}
              r={3.4}
              fill={highlighted ? '#bbf7d0' : '#fef3c7'}
              stroke={highlighted ? '#166534' : '#92400e'}
              strokeWidth={0.6}
              strokeDasharray={highlighted ? undefined : '1.2 0.8'}
            />
            <text
              x={m.at.x}
              y={m.at.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={3.6}
              fontWeight={700}
              fill={highlighted ? '#166534' : '#78350f'}
            >
              {m.id}
            </text>
          </g>
        );
      })}
    </svg>
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
