'use client';

import { useEffect, useState } from 'react';

const BREATHE_IN_SECONDS = 4;
const BREATHE_OUT_SECONDS = 6;
const ROUNDS = 5;

type Phase = 'idle' | 'in' | 'out' | 'done';

// Literal class strings so Tailwind generates the arbitrary durations; each transition lasts
// exactly as long as the breath it paces.
const CIRCLE_CLASSES: Record<Phase, string> = {
  idle: 'scale-100 duration-500',
  in: 'scale-150 duration-[4000ms]',
  out: 'scale-100 duration-[6000ms]',
  done: 'scale-100 duration-500',
};

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Ready?',
  in: 'Breathe in',
  out: 'Breathe out',
  done: 'Nice work!',
};

export default function BreathingExercise() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (phase !== 'in' && phase !== 'out') return;
    const timer = setTimeout(() => {
      if (secondsLeft > 1) {
        setSecondsLeft(secondsLeft - 1);
      } else if (phase === 'in') {
        setPhase('out');
        setSecondsLeft(BREATHE_OUT_SECONDS);
      } else if (round < ROUNDS) {
        setRound(round + 1);
        setPhase('in');
        setSecondsLeft(BREATHE_IN_SECONDS);
      } else {
        setPhase('done');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, round]);

  function start(): void {
    setRound(1);
    setPhase('in');
    setSecondsLeft(BREATHE_IN_SECONDS);
  }

  const active = phase === 'in' || phase === 'out';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h3 className="font-bold text-gray-800">
        <span aria-hidden="true">🌬️</span> Calm breathing
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Breathing out slowly tells your body it&apos;s safe to calm down. Breathe in through your
        nose for {BREATHE_IN_SECONDS}, then out through your mouth for {BREATHE_OUT_SECONDS}, like
        slowly blowing out birthday candles. Great before a game or after a tough moment.
      </p>

      <div className="flex h-48 items-center justify-center">
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full border-4 border-pitch-green bg-pitch-green/20 transition-transform ease-in-out motion-reduce:transition-none ${CIRCLE_CLASSES[phase]}`}
        >
          {active && (
            <span className="text-2xl font-bold text-pitch-dark" aria-hidden="true">
              {secondsLeft}
            </span>
          )}
        </div>
      </div>

      <p aria-live="polite" className="text-center font-semibold text-pitch-dark">
        {PHASE_LABELS[phase]}
      </p>
      <p className="text-center text-xs text-gray-500 h-4">
        {active && `Round ${round} of ${ROUNDS}`}
      </p>

      <div className="mt-3 flex justify-center">
        {active ? (
          <button
            type="button"
            onClick={() => setPhase('idle')}
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="bg-pitch-green text-white px-5 py-2 rounded-lg font-semibold hover:bg-pitch-dark transition-colors text-sm"
          >
            {phase === 'done' ? 'Go again' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
}
