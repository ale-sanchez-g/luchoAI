import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

// Without matchMedia (very old browsers, tests) nothing moves: a still picture is always safe.
function prefersStill(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia(REDUCED_MOTION).matches;
}

/** True when the device asks for less motion, so plays jump straight to how they end. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersStill, () => true);
}

/**
 * Milliseconds since run `runId` started, updated every animation frame until `length` has
 * passed; then `onEnd` runs once. A new `runId` starts again from 0. With `still` it returns
 * `length` straight away and never ticks.
 */
export function usePlayClock(
  runId: number,
  length: number,
  still: boolean,
  onEnd?: () => void,
): number {
  const [tick, setTick] = useState({ runId: -1, elapsed: 0 });
  const onEndRef = useRef(onEnd);
  useLayoutEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    if (still) return undefined;
    let frame = 0;
    let start: number | null = null;
    function step(now: number): void {
      if (start === null) start = now;
      const elapsed = Math.min(now - start, length);
      setTick({ runId, elapsed });
      if (elapsed < length) frame = requestAnimationFrame(step);
      else onEndRef.current?.();
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [runId, length, still]);

  if (still) return length;
  return tick.runId === runId ? tick.elapsed : 0;
}
