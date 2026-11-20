'use client';

import { useEffect, useRef, useState } from 'react';
import { useStoredState } from '@/lib/use-stored-state';
import { PROVIDERS } from '@/lib/providers';
import {
  clearPlayerData,
  getBestScores,
  getCheckIns,
  getPlayerProfile,
  getProviderConfig,
  getSavedPlans,
  hasPlayerData,
} from '@/lib/storage';
import ErrorMessage from './ErrorMessage';

interface DeletePlayerDataProps {
  freeTrial: boolean;
}

type Stage = 'idle' | 'confirming' | 'deleted';

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** What LuchoAI has saved in this browser right now, one line per kind of data. */
function describeSavedData(): string[] {
  const lines: string[] = [];
  if (getPlayerProfile()) lines.push('A player profile');
  const config = getProviderConfig();
  if (config?.free) {
    lines.push('Free questions with Google Gemini (no key saved)');
  } else if (config) {
    const company = PROVIDERS.find((p) => p.id === config.provider)?.name ?? 'an AI company';
    lines.push(`An AI key for ${company}`);
  }
  const plans = getSavedPlans().length;
  if (plans > 0) lines.push(count(plans, 'saved training plan', 'saved training plans'));
  const checkIns = getCheckIns().length;
  if (checkIns > 0) lines.push(count(checkIns, 'wellbeing check-in', 'wellbeing check-ins'));
  if (Object.keys(getBestScores()).length > 0) lines.push('Game IQ best scores');
  // Data the getters can't read, such as from an older version, is still there to delete.
  if (lines.length === 0 && hasPlayerData()) lines.push('Some LuchoAI settings');
  return lines;
}

export default function DeletePlayerData({ freeTrial }: DeletePlayerDataProps) {
  const [saved, setSaved, loaded] = useStoredState<string[]>(describeSavedData, []);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState('');
  const deleteRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const previousStage = useRef<Stage>('idle');

  // The button that was pressed is replaced, so move focus to what replaced it.
  useEffect(() => {
    if (stage === 'confirming') cancelRef.current?.focus();
    else if (stage === 'deleted') doneRef.current?.focus();
    else if (previousStage.current === 'confirming') deleteRef.current?.focus();
    previousStage.current = stage;
  }, [stage]);

  function handleDelete(): void {
    try {
      clearPlayerData();
    } catch {
      setError(
        'LuchoAI couldn’t delete everything. Clear this website’s data in your browser ' +
          'settings instead.',
      );
      setStage('idle');
      return;
    }
    setSaved([]);
    setStage('deleted');
  }

  return (
    <section
      id="delete"
      aria-labelledby="delete-heading"
      className="scroll-mt-16 space-y-4 rounded-2xl border-2 border-red-200 bg-white p-5"
    >
      <div>
        <h2 id="delete-heading" className="text-lg font-bold text-gray-800">
          Delete everything on this device
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          This deletes the profile, AI key, saved plans, check-ins and Game IQ scores from this
          browser. It can’t be undone.
          {freeTrial && ' The count of free tries used stays, so the free trial stays fair.'}
        </p>
      </div>

      {loaded &&
        stage !== 'deleted' &&
        (saved.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-gray-800">Saved here right now:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-gray-700">
              {saved.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-700">
            Nothing about you is saved on this device right now.
          </p>
        ))}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {stage === 'deleted' && (
        <p
          ref={doneRef}
          tabIndex={-1}
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-pitch-dark outline-none"
        >
          Done. Everything LuchoAI saved about you on this device has been deleted.
        </p>
      )}

      {stage === 'confirming' && (
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-sm font-semibold text-gray-800">
            Delete everything? This can’t be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Yes, delete everything
            </button>
            <button
              ref={cancelRef}
              type="button"
              onClick={() => setStage('idle')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === 'idle' && loaded && saved.length > 0 && (
        <button
          ref={deleteRef}
          type="button"
          onClick={() => {
            setError('');
            setStage('confirming');
          }}
          className="rounded-lg border-2 border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Delete my LuchoAI data
        </button>
      )}
    </section>
  );
}
