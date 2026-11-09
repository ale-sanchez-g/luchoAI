import { useId } from 'react';
import { DRILL_SETUPS } from '@/lib/drill-setups';
import type { DrillPathKind, DrillPoint, DrillSetup } from '@/lib/drill-setups';

const WIDTH = 100;
const HEIGHT = 56;

const COLORS = {
  grass: '#1a7f3c',
  dark: '#0f5a2b',
  ink: '#111827',
  you: '#f59e0b',
  helper: '#2563eb',
  cone: '#f97316',
  dribble: '#fde68a',
  pass: '#ffffff',
  run: '#bfdbfe',
  wall: '#9ca3af',
};

const PATH_STYLE: Record<DrillPathKind, { stroke: string; dash?: string; width: number }> = {
  dribble: { stroke: COLORS.dribble, dash: '2.4 1.6', width: 0.9 },
  pass: { stroke: COLORS.pass, width: 0.8 },
  run: { stroke: COLORS.run, dash: '0.6 1.4', width: 1 },
};

const LEGEND: Record<DrillPathKind, string> = {
  dribble: 'Dribble with the ball',
  pass: 'Pass or shoot',
  run: 'Run or walk',
};

function Person({ at, color, label }: { at: DrillPoint; color: string; label: string }) {
  const labelY = at.y < 12 ? at.y + 9.5 : at.y - 5.2;
  return (
    <g>
      <circle cx={at.x} cy={at.y} r={3.4} fill={color} stroke={COLORS.ink} strokeWidth={0.8} />
      <text
        x={at.x}
        y={labelY}
        textAnchor="middle"
        fontSize={4.6}
        fontWeight={700}
        fill="white"
        stroke={COLORS.dark}
        strokeWidth={1}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}

function Cone({ at }: { at: DrillPoint }) {
  return (
    <polygon
      points={`${at.x},${at.y - 2.6} ${at.x - 2.2},${at.y + 1.8} ${at.x + 2.2},${at.y + 1.8}`}
      fill={COLORS.cone}
      stroke="white"
      strokeWidth={0.4}
      strokeLinejoin="round"
    />
  );
}

function Goal({ side }: { side: 'left' | 'right' }) {
  const x = side === 'right' ? WIDTH - 6 : 2;
  return (
    <g>
      <rect
        x={x}
        y={16}
        width={4}
        height={24}
        fill="white"
        fillOpacity={0.25}
        stroke="white"
        strokeWidth={0.8}
      />
      {[20, 24, 28, 32, 36].map((y) => (
        <line key={y} x1={x} y1={y} x2={x + 4} y2={y} stroke="white" strokeWidth={0.3} />
      ))}
    </g>
  );
}

function Wall() {
  return (
    <g>
      <rect x={WIDTH - 10} y={6} width={6} height={44} fill={COLORS.wall} stroke="white" />
      <text
        x={WIDTH - 7}
        y={28}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={4}
        fontWeight={700}
        fill={COLORS.ink}
        transform={`rotate(-90 ${WIDTH - 7} 28)`}
      >
        WALL
      </text>
    </g>
  );
}

function PathKey({ kind }: { kind: DrillPathKind }) {
  const style = PATH_STYLE[kind];
  return (
    <li className="flex items-center gap-1.5">
      <svg viewBox="0 0 20 8" className="h-3 w-6" aria-hidden="true">
        <rect width={20} height={8} rx={1.5} fill={COLORS.grass} />
        <line
          x1={2}
          y1={4}
          x2={18}
          y2={4}
          stroke={style.stroke}
          strokeWidth={1.6}
          strokeDasharray={style.dash ? '3 2' : undefined}
          strokeLinecap="round"
        />
      </svg>
      {LEGEND[kind]}
    </li>
  );
}

/** A top-down picture of how to lay out a drill, with a key for the lines it uses. */
export default function DrillDiagram({ setup }: { setup: DrillSetup }) {
  const { scene, alt } = DRILL_SETUPS[setup];
  // useId output has characters that are awkward inside url(#...), so keep letters and digits.
  const markerId = `drill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const kinds = [...new Set(scene.paths.map((p) => p.kind))];

  return (
    <figure className="mb-3 max-w-sm">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={alt}
        className="block h-auto w-full rounded-lg"
      >
        <defs>
          {kinds.map((kind) => (
            <marker
              key={kind}
              id={`${markerId}-${kind}`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={PATH_STYLE[kind].stroke} />
            </marker>
          ))}
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill={COLORS.grass} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 25} width={12.5} height={HEIGHT} fill="white" fillOpacity={0.05} />
        ))}
        {scene.goal && <Goal side={scene.goal} />}
        {scene.wall && <Wall />}
        {scene.paths.map((path, i) => (
          <path
            key={i}
            d={path.d}
            fill="none"
            stroke={PATH_STYLE[path.kind].stroke}
            strokeWidth={PATH_STYLE[path.kind].width}
            strokeDasharray={PATH_STYLE[path.kind].dash}
            strokeLinecap="round"
            markerEnd={`url(#${markerId}-${path.kind})`}
          />
        ))}
        {scene.cones.map((cone, i) => (
          <Cone key={i} at={cone} />
        ))}
        {scene.helper && <Person at={scene.helper} color={COLORS.helper} label="HELPER" />}
        <Person at={scene.you} color={COLORS.you} label="YOU" />
        {scene.ball && (
          <circle
            cx={scene.ball.x}
            cy={scene.ball.y}
            r={1.8}
            fill="white"
            stroke={COLORS.ink}
            strokeWidth={0.5}
          />
        )}
      </svg>
      {kinds.length > 0 && (
        <figcaption>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {kinds.map((kind) => (
              <PathKey key={kind} kind={kind} />
            ))}
          </ul>
        </figcaption>
      )}
    </figure>
  );
}
