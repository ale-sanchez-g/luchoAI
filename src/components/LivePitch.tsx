'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DecisionOption, DecisionScenario, PitchScene } from '@/types';
import {
  actorAt,
  leadTimeline,
  outcomeTimeline,
  sceneAt,
  timelineMs,
  timingPlay,
  windowAt,
} from '@/lib/pitch-play';
import { usePlayClock, usePrefersReducedMotion } from '@/lib/use-play-clock';
import PitchDiagram from './PitchDiagram';
import type { PitchAim, PitchCallout, PitchMarker } from './PitchDiagram';

/** What the pitch is playing: the build-up, a "when" play, or what happens after an answer. */
export type PitchRun =
  | { kind: 'lead'; skip?: boolean }
  | { kind: 'timing' }
  | { kind: 'outcome'; option: string; from: PitchScene; review?: boolean };

type Stage = 'lead' | 'decide' | 'ready' | 'timing' | 'outcome' | 'done';

interface LivePitchProps {
  scenario: DecisionScenario;
  run: PitchRun;
  /** Changes for every new run, so a replay starts again from the beginning. */
  runId: number;
  selected: string | null;
  /** `from` is where everyone stood when the answer came, for a GO tap mid-play. */
  onChoose: (optionId: string, from?: PitchScene) => void;
  onRun: (run: PitchRun) => void;
}

const STRIP_BUTTON =
  'shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white sm:py-1.5 ' +
  'sm:text-sm ' +
  'transition-colors hover:bg-white/25';
const GOLD_BUTTON =
  'shrink-0 rounded-full bg-gold text-pitch-dark transition-colors hover:bg-yellow-400';

function hint(aim: PitchAim, scenario: DecisionScenario, option: (id: string) => string): string {
  const what = scenario.control === 'you' ? 'YOU' : 'the ball';
  if (aim.kind === 'dragging') {
    return aim.over === null ? 'Drop it on a letter to choose.' : `Let go for ${option(aim.over)}`;
  }
  if (aim.kind === 'tapped') return `Press and hold ${what}, then drag onto a letter.`;
  if (aim.kind === 'missed') return 'That was not on a letter. Try again, or tap a letter.';
  return `Drag ${what} onto a letter, or tap one.`;
}

export default function LivePitch({
  scenario,
  run,
  runId,
  selected,
  onChoose,
  onRun,
}: LivePitchProps) {
  const reduceMotion = usePrefersReducedMotion();
  // The hint under the pitch belongs to one go: a replay starts again with a clean hint.
  const [aimState, setAimState] = useState<{ runId: number; aim: PitchAim }>({
    runId,
    aim: { kind: 'idle' },
  });
  const aim: PitchAim = aimState.runId === runId ? aimState.aim : { kind: 'idle' };
  const goRef = useRef<HTMLButtonElement>(null);

  const timing = useMemo(() => (scenario.timing ? timingPlay(scenario) : null), [scenario]);
  const timeline = useMemo(() => {
    if (run.kind === 'outcome') return outcomeTimeline(scenario, run.option, run.from);
    if (run.kind === 'timing' && timing) return timing.timeline;
    return leadTimeline(scenario);
  }, [scenario, run, timing]);
  const length = timelineMs(timeline);

  function finishTiming(): void {
    if (!timing || selected !== null) return;
    const last = timing.windows[timing.windows.length - 1];
    onChoose(last.option, sceneAt(timing.timeline, length));
  }

  // A "when" play has to run in real time even with reduced motion: it just jumps between moments.
  const still = run.kind !== 'timing' && (reduceMotion || (run.kind === 'lead' && !!run.skip));
  const elapsed = usePlayClock(
    runId,
    length,
    still,
    run.kind === 'timing' ? finishTiming : undefined,
  );
  const playing = elapsed < length;

  let stage: Stage;
  if (run.kind === 'lead') stage = playing ? 'lead' : timing ? 'ready' : 'decide';
  else if (run.kind === 'timing') stage = 'timing';
  else stage = playing ? 'outcome' : 'done';

  const moment = timing && stage === 'timing' ? windowAt(timing.windows, elapsed) : undefined;
  const scene =
    moment && reduceMotion ? sceneAt(timeline, moment.end) : sceneAt(timeline, elapsed);

  useEffect(() => {
    if (stage === 'timing') goRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const find = (id: string): DecisionOption | undefined =>
    scenario.options.find((o) => o.id === id);
  const optionText = (id: string): string => `${id}: ${find(id)?.label ?? ''}`;
  const best = scenario.options.find((o) => o.correct);

  function go(): void {
    if (moment && selected === null) onChoose(moment.option, scene);
  }

  const deciding = stage === 'decide' && selected === null;
  const markers: PitchMarker[] = deciding
    ? scenario.options.flatMap((o) => (o.marker ? [{ id: o.id, target: o.marker }] : []))
    : [];
  const watched = scenario.timing ? actorAt(scene, scenario.timing.watch) : undefined;
  const watchedAtStart = scenario.timing ? actorAt(scenario.scene, scenario.timing.watch) : null;
  // The bubble goes on the side away from the ball, so the ball stays in view.
  const below = !!watchedAtStart && scenario.scene.ball.y < watchedAtStart.y;
  const callout: PitchCallout | null =
    moment && watched ? { at: watched, text: moment.cue, below } : null;

  const outcome = run.kind === 'outcome' ? run : null;
  const shown = outcome ? find(outcome.option) : undefined;
  const chosen = selected === null ? undefined : find(selected);
  // Once a play is over its buttons go under the words on phones, so the words keep their width.
  return (
    <div
      data-live-pitch=""
      data-stage={stage}
      className="flex flex-1 flex-col sm:block sm:flex-none"
    >
      {/* On phones the game fills the screen: the band takes whatever height is left and the
          pitch is the biggest 4:3 box that fits it, so the answers and Next stay on screen. On
          wider screens the pitch is capped at about half the screen height instead; the dark
          band frames it like a stadium. */}
      <div
        className={
          'min-h-[6.5rem] flex-1 bg-pitch-dark [container-type:size] max-sm:flex ' +
          'max-sm:items-center max-sm:justify-center sm:min-h-0 sm:flex-none ' +
          'sm:[container-type:normal]'
        }
      >
        <div
          className={
            'mx-auto w-[min(100cqw,calc(100cqh*4/3))] sm:w-auto ' +
            'sm:max-w-[max(320px,calc(52svh*4/3))]'
          }
          onClick={stage === 'timing' ? go : undefined}
        >
          <PitchDiagram
            scene={scene}
            label={`${scenario.title}. ${scenario.situation}`}
            markers={markers}
            showArrows={stage === 'decide' || stage === 'ready'}
            callout={callout}
            answer={
              deciding
                ? {
                  control: scenario.control,
                  onChoose: (id) => onChoose(id),
                  onAim: (next) => setAimState({ runId, aim: next }),
                }
                : undefined
            }
          />
        </div>
      </div>

      <div
        className={
          'flex shrink-0 items-start justify-between gap-3 bg-pitch-dark px-4 py-1.5 text-white ' +
          'sm:py-3'
        }
      >
        {stage === 'lead' && (
          <>
            <p className="text-sm text-green-100">Watch the play…</p>
            <button
              type="button"
              className={STRIP_BUTTON}
              onClick={() => onRun({ kind: 'lead', skip: true })}
            >
              Skip
            </button>
          </>
        )}

        {stage === 'decide' && (
          <>
            <div className="min-w-0">
              <p className="font-semibold">{scenario.question}</p>
              <p
                className="mt-0.5 text-sm text-green-100 [@media(max-height:600px)]:hidden"
                data-pitch-hint=""
              >
                {hint(aim, scenario, optionText)}
              </p>
            </div>
            <button type="button" className={STRIP_BUTTON} onClick={() => onRun({ kind: 'lead' })}>
              Replay
            </button>
          </>
        )}

        {stage === 'ready' && (
          <>
            <div className="min-w-0">
              <p className="font-semibold">{scenario.question}</p>
              <p className="mt-0.5 text-sm text-green-100">
                Press Start, then tap GO! the moment you would make your run.
              </p>
            </div>
            <button
              type="button"
              className={`${GOLD_BUTTON} px-4 py-2 font-bold`}
              onClick={() => onRun({ kind: 'timing' })}
            >
              Start
            </button>
          </>
        )}

        {stage === 'timing' && (
          <>
            <p className="text-sm text-green-100">Watch the passer. Tap GO! when it is time.</p>
            <button
              ref={goRef}
              type="button"
              className={`${GOLD_BUTTON} px-6 py-2 text-lg font-black`}
              onClick={go}
            >
              GO!
            </button>
          </>
        )}

        {(stage === 'outcome' || stage === 'done') && outcome && shown && (
          <>
            <div className="min-w-0">
              {stage === 'done' ? (
                <p
                  className={`inline-block rounded-full px-3 py-0.5 font-bold ${
                    shown.correct ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
                  }`}
                  data-pitch-result=""
                >
                  {shown.result}
                </p>
              ) : (
                <p className="text-sm text-green-100">
                  {outcome.review ? 'Watch the best choice…' : 'Watch…'}
                </p>
              )}
              <p className="mt-1 text-sm text-green-100">
                {outcome.review ? 'Best choice' : 'You chose'} {optionText(shown.id)}
              </p>
            </div>
            {stage === 'done' && (
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                <button
                  type="button"
                  className={STRIP_BUTTON}
                  onClick={() => onRun({ ...outcome })}
                >
                  Watch again
                </button>
                {chosen && !chosen.correct && best && shown.id !== best.id && (
                  <button
                    type="button"
                    className={STRIP_BUTTON}
                    onClick={() =>
                      onRun({
                        kind: 'outcome',
                        option: best.id,
                        from: scenario.scene,
                        review: true,
                      })
                    }
                  >
                    See the best choice
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
