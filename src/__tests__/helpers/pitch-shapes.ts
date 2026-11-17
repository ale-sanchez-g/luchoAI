import { distance } from '@/lib/pitch-play';
import type { PitchPoint, PitchScene } from '@/types';

// Shared by the Game IQ tests: how far something is from the players as they are drawn.

/** How far a point is from an opponent's triangle (0 when inside it). */
export function gapToTriangle(p: PitchPoint, { x, y }: PitchPoint): number {
  const corners = [
    { x, y: y - 3.8 },
    { x: x - 3.4, y: y + 2.4 },
    { x: x + 3.4, y: y + 2.4 },
  ];
  const side = (a: PitchPoint, b: PitchPoint): number =>
    (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const signs = corners.map((c, i) => Math.sign(side(c, corners[(i + 1) % 3])));
  if (signs.every((s) => s >= 0) || signs.every((s) => s <= 0)) return 0;
  return Math.min(
    ...corners.map((a, i) => {
      const b = corners[(i + 1) % 3];
      const along =
        ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) /
        ((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      const t = Math.max(0, Math.min(1, along));
      return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }),
  );
}

/**
 * The space between a circle and the nearest player or the ball; negative means they overlap.
 * YOU is the round head plus the orange collar below it; the face art has see-through corners.
 */
export function clearOfPlayers(c: PitchPoint, r: number, scene: PitchScene): number {
  const head = distance(c, scene.you) - 5.3;
  const collar = distance(c, { x: scene.you.x, y: scene.you.y + 1.32 }) - 5.1;
  return (
    Math.min(
      head,
      collar,
      distance(c, scene.ball) - 1.7,
      ...scene.teammates.map((t) => distance(c, t) - 3.2),
      ...scene.opponents.map((o) => gapToTriangle(c, o)),
    ) - r
  );
}
