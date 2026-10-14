'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { BalanceArea, BalanceLevel, MoodLevel, WellbeingCheckIn as CheckIn } from '@/types';
import {
  BALANCE_AREAS,
  BALANCE_LEVELS,
  MOODS,
  getBalanceTips,
  getMood,
  parseDateKey,
  shouldSuggestSupport,
  toDateKey,
} from '@/lib/wellbeing';
import { clearCheckIns, getCheckIns, saveCheckIn } from '@/lib/storage';
import Icon from './Icon';

type BalanceDraft = Partial<Record<BalanceArea, BalanceLevel>>;

const RECENT_COUNT = 7;
const MAX_PROUD_OF_LENGTH = 140;

function isComplete(draft: BalanceDraft): draft is Record<BalanceArea, BalanceLevel> {
  return BALANCE_AREAS.every((area) => draft[area.id] !== undefined);
}

interface CheckInResultProps {
  checkIn: CheckIn;
  supportNeeded: boolean;
  onEdit: () => void;
}

function CheckInResult({ checkIn, supportNeeded, onEdit }: CheckInResultProps) {
  const mood = getMood(checkIn.mood);
  const tips = getBalanceTips(checkIn.balance);

  return (
    <div className="space-y-4">
      <p role="status" className="flex items-center gap-3 text-gray-800">
        <Icon name={mood.icon} size={40} />
        {mood.message}
      </p>

      {supportNeeded && (
        <div className="rounded-xl border-2 border-gold bg-amber-50 p-4 text-sm text-gray-800 space-y-1">
          <p className="font-semibold">It sounds like things are tough right now.</p>
          <p>
            Talking about it really helps. Please tell an adult you trust how you&apos;re feeling:
            a parent or carer, a teacher, or your coach.{' '}
            <a href="#talk-to-someone" className="font-semibold text-pitch-dark underline">
              See who you can talk to
            </a>
          </p>
        </div>
      )}

      {tips.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Balance boosters for you</h3>
          {tips.map((area) => (
            <div key={area.id} className="rounded-xl bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-800">
                <Icon name={area.icon} className="mr-1 -my-1" /> {area.label}
              </p>
              <p className="text-sm text-gray-600 mt-1">{area.tip}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-700">
          Your balance looks good. Nice work looking after yourself!
        </p>
      )}

      {checkIn.proudOf && (
        <p className="text-sm text-gray-700">
          <Icon name="medal" className="mr-1 -my-1" /> Proud of: &ldquo;{checkIn.proudOf}&rdquo;
        </p>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="text-sm font-medium text-pitch-green hover:underline"
      >
        Update today&apos;s check-in
      </button>
    </div>
  );
}

export default function WellbeingCheckIn() {
  const [history, setHistory] = useState<CheckIn[]>([]);
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [balance, setBalance] = useState<BalanceDraft>({});
  const [proudOf, setProudOf] = useState('');
  const [editing, setEditing] = useState(true);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = getCheckIns();
    setHistory(stored);
    const today = stored.find((c) => c.date === toDateKey(new Date()));
    if (today) {
      setMood(today.mood);
      setBalance(today.balance);
      setProudOf(today.proudOf);
      setEditing(false);
    }
  }, []);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (mood === null || !isComplete(balance)) return;
    try {
      setHistory(
        saveCheckIn({
          date: toDateKey(new Date()),
          mood,
          balance,
          proudOf: proudOf.trim().slice(0, MAX_PROUD_OF_LENGTH),
        }),
      );
      setEditing(false);
      setError('');
    } catch {
      setError("Your check-in couldn't be saved. Check that your browser allows saving data.");
    }
  }

  function handleClear(): void {
    clearCheckIns();
    setHistory([]);
    setMood(null);
    setBalance({});
    setProudOf('');
    setEditing(true);
    setConfirmingClear(false);
  }

  const todayCheckIn = history.find((c) => c.date === toDateKey(new Date()));
  const recent = history.slice(-RECENT_COUNT);
  const answered =
    (mood === null ? 0 : 1) +
    BALANCE_AREAS.filter((area) => balance[area.id] !== undefined).length;
  const totalQuestions = BALANCE_AREAS.length + 1;

  return (
    <section
      aria-labelledby="check-in-heading"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-6"
    >
      <div>
        <h2 id="check-in-heading" className="text-lg font-bold text-gray-800">
          Daily check-in
        </h2>
        <p className="text-sm text-gray-600">
          Takes 30 seconds. Saved only on this device, never sent to the AI coach or anyone else.
        </p>
      </div>

      {todayCheckIn && !editing ? (
        <CheckInResult
          checkIn={todayCheckIn}
          supportNeeded={shouldSuggestSupport(history)}
          onEdit={() => setEditing(true)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset>
            <legend className="font-semibold text-gray-800 mb-3">
              How are you feeling today?
            </legend>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <label key={m.level} className="cursor-pointer">
                  <input
                    type="radio"
                    name="mood"
                    value={m.level}
                    checked={mood === m.level}
                    onChange={() => setMood(m.level)}
                    className="peer sr-only"
                  />
                  <span className="flex h-full flex-col items-center gap-1 rounded-xl border-2 border-gray-200 px-1 py-2 text-center transition-colors hover:border-gray-300 peer-checked:border-pitch-green peer-checked:bg-pitch-green/10 peer-focus-visible:ring-2 peer-focus-visible:ring-pitch-green">
                    <Icon name={m.icon} size={40} />
                    <span className="text-xs font-medium text-gray-700">{m.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-gray-800">How&apos;s your balance?</legend>
            <p className="text-sm text-gray-600 mb-3">
              Great players have a life outside football too.{' '}
              <span className="whitespace-nowrap">
                <Icon name="smile" className="-my-1" /> Yes
              </span>{' '}
              &middot;{' '}
              <span className="whitespace-nowrap">
                <Icon name="neutral" className="-my-1" /> Sort of
              </span>{' '}
              &middot;{' '}
              <span className="whitespace-nowrap">
                <Icon name="worried" className="-my-1" /> Not really
              </span>
            </p>
            <div className="space-y-2">
              {BALANCE_AREAS.map((area) => (
                <div
                  key={area.id}
                  role="radiogroup"
                  aria-labelledby={`balance-${area.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
                >
                  <span id={`balance-${area.id}`} className="flex items-center gap-2 text-sm text-gray-800">
                    <Icon name={area.icon} />
                    {area.question}
                  </span>
                  <div className="flex flex-shrink-0 gap-1">
                    {BALANCE_LEVELS.map((lvl) => (
                      <label key={lvl.level} title={lvl.label} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`balance-${area.id}`}
                          value={lvl.level}
                          checked={balance[area.id] === lvl.level}
                          onChange={() =>
                            setBalance((prev) => ({ ...prev, [area.id]: lvl.level }))
                          }
                          aria-label={lvl.label}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 bg-white transition-colors hover:border-gray-300 peer-checked:border-pitch-green peer-checked:bg-pitch-green/10 peer-focus-visible:ring-2 peer-focus-visible:ring-pitch-green"
                        >
                          <Icon name={lvl.icon} size={32} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="proud-of" className="block font-semibold text-gray-800 mb-1">
              One thing I&apos;m proud of today{' '}
              <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              id="proud-of"
              type="text"
              maxLength={MAX_PROUD_OF_LENGTH}
              value={proudOf}
              onChange={(e) => setProudOf(e.target.value)}
              placeholder="e.g. I kept trying after a mistake"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pitch-green text-sm"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={answered < totalQuestions}
              className="bg-pitch-green text-white px-5 py-2 rounded-lg font-semibold hover:bg-pitch-dark transition-colors disabled:opacity-50"
            >
              Save check-in
            </button>
            <span className="text-xs text-gray-500">
              {answered} of {totalQuestions} answered
            </span>
          </div>
        </form>
      )}

      {recent.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800 text-sm">Your recent check-ins</h3>
            {confirmingClear ? (
              <span className="flex items-center gap-3 text-xs">
                <span className="text-gray-600">Delete all check-ins?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-semibold text-red-600 hover:underline"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="text-gray-600 hover:underline"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="text-xs text-gray-500 hover:underline"
              >
                Clear history
              </button>
            )}
          </div>
          <ol className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {recent.map((c) => {
              const m = getMood(c.mood);
              const date = parseDateKey(c.date);
              return (
                <li
                  key={c.date}
                  className="flex min-w-[3.5rem] flex-col items-center rounded-xl bg-gray-50 px-2 py-1"
                >
                  <Icon name={m.icon} size={32} />
                  <span className="text-xs text-gray-600" aria-hidden="true">
                    {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </span>
                  <span className="sr-only">
                    {date.toLocaleDateString(undefined, { dateStyle: 'full' })}: {m.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
