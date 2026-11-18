'use client';

import { useEffect, useRef, useState } from 'react';
import { useStoredState } from '@/lib/use-stored-state';
import type {
  BestScores,
  DecisionOption,
  DecisionTheme,
  DecisionThemeId,
  PitchScene,
} from '@/types';
import { DECISION_THEMES, getTheme } from '@/lib/decision-games';
import { getBestScores, saveBestScore } from '@/lib/storage';
import { useVisualViewportHeight } from '@/lib/use-visual-viewport-height';
import { PitchLegend } from './PitchDiagram';
import LivePitch from './LivePitch';
import type { PitchRun } from './LivePitch';
import Icon from './Icon';
import type { IconName } from '@/lib/icons';

const CARD = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';
// On phones a round fills the screen (below the iPhone's floating address bar) so the pitch, the
// answers and Next are all in view with no scrolling; from `sm` up it is an ordinary page.
const SCENARIO_SHELL =
  'fixed inset-x-0 top-0 z-50 flex h-[var(--app-height,100dvh)] flex-col gap-1.5 overflow-hidden ' +
  'overscroll-none bg-gray-50 px-3 pb-10 pt-2 [@media(max-height:600px)]:pb-3 sm:static sm:z-auto sm:block sm:h-auto ' +
  'sm:space-y-4 sm:overflow-visible sm:bg-transparent sm:p-0';
const BACK_LINK =
  'shrink-0 whitespace-nowrap text-sm font-medium text-pitch-green hover:underline';

function resultMessage(score: number, total: number): { icon: IconName; text: string } {
  if (score === total) return { icon: 'star', text: 'Perfect! You read the game like a pro.' };
  if (score * 2 >= total) {
    return { icon: 'dumbbell', text: 'Great thinking! Check the cues below to get even sharper.' };
  }
  return {
    icon: 'sprout',
    text: 'Every great player learns by trying. Read the cues and have another go!',
  };
}

function optionClass(option: DecisionOption, selected: string | null): string {
  const base =
    'w-full rounded-xl border-2 px-3 py-1 text-left text-sm transition-colors sm:py-2';
  if (selected === null) {
    return `${base} border-gray-200 bg-white text-gray-800 hover:border-pitch-green`;
  }
  if (option.correct) return `${base} border-green-600 bg-green-50 text-gray-800`;
  if (option.id === selected) return `${base} border-amber-500 bg-amber-50 text-gray-800`;
  return `${base} border-gray-200 bg-white text-gray-500`;
}

interface ThemePickerProps {
  bestScores: BestScores;
  onPick: (id: DecisionThemeId) => void;
}

function ThemePicker({ bestScores, onPick }: ThemePickerProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Game IQ</h1>
        <p className="text-gray-600 text-sm mt-1">
          Great players make great decisions. Watch the play, make your move on the pitch, see
          what happens, and learn the cues top players look for.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {DECISION_THEMES.map((theme) => {
          const best = bestScores[theme.id];
          const total = theme.scenarios.length;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onPick(theme.id)}
              className="flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-pitch-green"
            >
              <Icon name={theme.icon} size={56} />
              <span className="mt-2 font-bold text-gray-800">{theme.title}</span>
              <span className="mt-1 text-xs text-gray-600">{theme.description}</span>
              <span className="mt-auto pt-3 text-xs font-semibold text-pitch-green">
                {best === undefined
                  ? `${total} situations · Play`
                  : `Best: ${best}/${total} · Play again`}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Finish a round to unlock games you can play on the pitch with friends or your team.
      </p>
    </div>
  );
}

interface ScenarioViewProps {
  theme: DecisionTheme;
  index: number;
  selected: string | null;
  onChoose: (optionId: string) => void;
  onNext: () => void;
  onQuit: () => void;
}

function ScenarioView({ theme, index, selected, onChoose, onNext, onQuit }: ScenarioViewProps) {
  useVisualViewportHeight();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const scenario = theme.scenarios[index];
  const total = theme.scenarios.length;
  const correct = scenario.options.find((o) => o.correct);
  const chosen = scenario.options.find((o) => o.id === selected);
  const [run, setRun] = useState<{ id: number; run: PitchRun }>({ id: 0, run: { kind: 'lead' } });

  function startRun(next: PitchRun): void {
    setRun((current) => ({ id: current.id + 1, run: next }));
  }

  // Answers come from the pitch (a drop, a tap or GO) or from the buttons; either way the pitch
  // then plays out what happens next.
  function choose(optionId: string, from: PitchScene = scenario.scene): void {
    if (selected !== null) return;
    onChoose(optionId);
    startRun({ kind: 'outcome', option: optionId, from });
  }

  // Each new situation replaces the buttons the player just used, so move focus (and scroll)
  // back to the top of the game instead of leaving it stranded at the bottom of the page.
  useEffect(() => {
    headingRef.current?.focus();
  }, [scenario.id]);

  // Answering disables the option buttons, which would drop keyboard focus back to the top of
  // the page; hand it to the Next button instead. Without scrolling, so the play stays in view.
  useEffect(() => {
    if (selected !== null) nextRef.current?.focus({ preventScroll: true });
  }, [selected]);

  const answered = selected !== null;

  return (
    <div className={SCENARIO_SHELL}>
      {/* One row on phones (back, progress, which situation) to leave the pitch more room. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={onQuit}
          className={BACK_LINK}
        >
          ← All games
        </button>
        <ol
          className="order-2 flex min-w-8 flex-1 gap-1 sm:order-last sm:basis-full"
          aria-hidden="true"
        >
          {theme.scenarios.map((s, i) => (
            <li
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                i < index ? 'bg-pitch-green' : i === index ? 'bg-gold' : 'bg-gray-200'
              }`}
            />
          ))}
        </ol>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="order-3 text-right text-sm font-medium text-gray-600 focus:outline-none sm:order-2"
        >
          <Icon name={theme.icon} className="mr-1 -my-1" />{' '}
          <span className="max-sm:sr-only">{theme.title} · </span>
          <span className="whitespace-nowrap">
            {index + 1} of {total}
          </span>
        </h1>
      </div>

      <div
        className={
          'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 ' +
          'bg-white shadow-sm sm:block sm:flex-none sm:overflow-hidden'
        }
      >
        {/* On phones the title leads the situation on one line to save room for the pitch. */}
        <div className="shrink-0 px-4 pb-1.5 pt-2 sm:space-y-1 sm:pb-3 sm:pt-4">
          <h2 className="inline font-bold text-gray-800 sm:block">{scenario.title}</h2>{' '}
          <p
            className={`inline text-[13px] leading-snug text-gray-700 sm:block sm:text-sm ${
              answered ? 'max-sm:hidden' : ''
            }`}
          >
            {scenario.situation}
          </p>
        </div>
        <LivePitch
          scenario={scenario}
          run={run.run}
          runId={run.id}
          selected={selected}
          onChoose={choose}
          onRun={startRun}
        />
        {/* On phones this part scrolls on its own if a very small screen cannot fit it, while the
            Next button below it never moves. Once answered, the strip under the pitch already says
            what was picked, so the option buttons make room for the feedback. */}
        <div
          className={
            'min-h-0 shrink space-y-2 overflow-y-auto px-3 pt-3 ' +
            `sm:space-y-3 sm:overflow-visible sm:px-4 sm:pt-4 ${chosen ? '' : 'pb-3 sm:pb-4'}`
          }
        >
          <div className={`space-y-1.5 sm:space-y-2 ${answered ? 'max-sm:hidden' : ''}`}>
            {scenario.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={answered}
                onClick={() => choose(option.id)}
                className={optionClass(option, selected)}
              >
                <span className="font-bold">{option.id}.</span> {option.label}
                {answered && option.correct && (
                  <span className="font-bold text-green-700"> ✓ Best choice</span>
                )}
                {option.id === selected && !option.correct && (
                  <span className="font-bold text-amber-700"> ✗ Your pick</span>
                )}
              </button>
            ))}
          </div>

          {chosen && correct && (
            <div
              role="status"
              className={`rounded-xl border p-2.5 text-[13px] leading-snug sm:p-3 sm:text-sm ${
                chosen.correct ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <p className="font-semibold text-gray-800">
                {chosen.correct ? (
                  <>
                    <Icon name="check-circle" className="mr-1 -my-1" /> Great decision!
                  </>
                ) : (
                  <>
                    <Icon name="thinking" className="mr-1 -my-1" /> Good try, but there&apos;s a
                    better option
                  </>
                )}
              </p>
              <p className="mt-0.5 text-gray-700 sm:mt-1">{chosen.feedback}</p>
              {!chosen.correct && (
                <p className="mt-1.5 text-gray-700 sm:mt-2">
                  <span className="font-semibold">Why {correct.id} is better:</span>{' '}
                  {correct.feedback}
                </p>
              )}
              <p className="mt-1.5 text-pitch-dark sm:mt-2">
                <span className="font-semibold">Coach&apos;s cue:</span> {scenario.cue}
              </p>
            </div>
          )}

        </div>
        {chosen && correct && (
          <div className="shrink-0 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
            <button
              ref={nextRef}
              type="button"
              onClick={onNext}
              className="w-full rounded-lg bg-pitch-green py-2.5 font-semibold text-white transition-colors hover:bg-pitch-dark"
            >
              {index === total - 1 ? 'See my score' : 'Next situation →'}
            </button>
          </div>
        )}
      </div>

      <div className="hidden shrink-0 sm:block">
        <PitchLegend />
      </div>
    </div>
  );
}

interface RoundSummaryProps {
  theme: DecisionTheme;
  score: number;
  newBest: boolean;
  onReplay: () => void;
  onMenu: () => void;
}

function RoundSummary({ theme, score, newBest, onReplay, onMenu }: RoundSummaryProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = theme.scenarios.length;
  const result = resultMessage(score, total);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-pitch-dark p-6 text-center text-white">
        <div>
          <Icon name={result.icon} size={72} />
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-sm font-semibold uppercase tracking-wide text-green-200 focus:outline-none"
        >
          {theme.title}: your score
        </h1>
        <p className="text-4xl font-black">
          {score} / {total}
        </p>
        <p className="mt-1 text-green-100">{result.text}</p>
        {newBest && (
          <p className="mt-2 font-semibold text-yellow-300">
            New personal best! <Icon name="trophy" className="ml-1 -my-1" />
          </p>
        )}
      </div>

      <section aria-labelledby="cues-heading" className={CARD}>
        <h2 id="cues-heading" className="font-bold text-gray-800">
          Cues to remember
        </h2>
        <ul className="mt-3 space-y-2">
          {theme.scenarios.map((s) => (
            <li key={s.id} className="flex gap-2 text-sm text-gray-700">
              <span className="text-pitch-green" aria-hidden="true">
                &bull;
              </span>
              {s.cue}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pitch-games-heading" className="space-y-3">
        <div>
          <h2 id="pitch-games-heading" className="font-bold text-gray-800">
            <Icon name="ball" className="mr-1 -my-1" /> Take it to the pitch
          </h2>
          <p className="text-sm text-gray-600">
            Decisions get sharper with real practice. Try these games with friends or your team.
          </p>
        </div>
        {theme.pitchGames.map((game) => (
          <article key={game.name} className={CARD}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-bold text-pitch-dark">{game.name}</h3>
              <span className="whitespace-nowrap text-xs text-gray-500">{game.players}</span>
            </div>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-gray-800">Set up</dt>
                <dd className="text-gray-600">{game.setup}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-800">How to play</dt>
                <dd className="text-gray-600">{game.howToPlay}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-800">Decision focus</dt>
                <dd className="text-gray-600">{game.focus}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-800">Make it harder</dt>
                <dd className="text-gray-600">{game.harder}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="rounded-lg bg-pitch-green px-5 py-2 font-semibold text-white transition-colors hover:bg-pitch-dark"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg border-2 border-pitch-green px-5 py-2 font-semibold text-pitch-green transition-colors hover:bg-pitch-green/10"
        >
          Choose another game
        </button>
      </div>
    </div>
  );
}

interface DecisionGameProps {
  initialThemeId?: DecisionThemeId | null;
}

export default function DecisionGame({ initialThemeId = null }: DecisionGameProps) {
  const [bestScores, setBestScores] = useStoredState<BestScores>(getBestScores, {});
  const [themeId, setThemeId] = useState<DecisionThemeId | null>(initialThemeId);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [newBest, setNewBest] = useState(false);

  const theme = themeId === null ? null : getTheme(themeId);

  function start(id: DecisionThemeId): void {
    setThemeId(id);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setNewBest(false);
  }

  function choose(optionId: string): void {
    if (!theme || selected !== null) return;
    setSelected(optionId);
    if (theme.scenarios[index].options.some((o) => o.id === optionId && o.correct)) {
      setScore((s) => s + 1);
    }
  }

  function next(): void {
    if (!theme) return;
    if (index < theme.scenarios.length - 1) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    const previousBest = bestScores[theme.id];
    setNewBest(previousBest !== undefined && score > previousBest);
    try {
      setBestScores(saveBestScore(theme.id, score));
    } catch {
      // Best scores are a bonus; the round result still shows if storage is unavailable.
    }
    setFinished(true);
  }

  if (!theme) return <ThemePicker bestScores={bestScores} onPick={start} />;

  if (finished) {
    return (
      <RoundSummary
        theme={theme}
        score={score}
        newBest={newBest}
        onReplay={() => start(theme.id)}
        onMenu={() => setThemeId(null)}
      />
    );
  }

  return (
    <ScenarioView
      key={theme.scenarios[index].id}
      theme={theme}
      index={index}
      selected={selected}
      onChoose={choose}
      onNext={next}
      onQuit={() => setThemeId(null)}
    />
  );
}
