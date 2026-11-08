'use client';

import { useState, useEffect } from 'react';
import type {
  TrainingPlan,
  PlayerPosition,
  PlayerProfile,
  AIProviderConfig,
  SavedPlan,
} from '@/types';
import { generateTrainingPlan } from '@/lib/claude';
import {
  getFreePlansLeft,
  getSavedPlans,
  savePlan,
  removeSavedPlan,
  setPlayerProfile,
  MAX_SAVED_PLANS,
} from '@/lib/storage';
import { isExploring, POSITION_AREAS } from '@/lib/positions';
import { loadContextBatches } from '@/lib/context';
import type { ContextMessage } from '@/lib/context';
import ErrorMessage from './ErrorMessage';
import Icon from './Icon';

interface TrainingPlanViewProps {
  providerConfig: AIProviderConfig;
  playerProfile: PlayerProfile | null;
  onProfileChange?: (profile: PlayerProfile) => void;
}

const FAVOURITE_SPOTS: { value: PlayerPosition; label: string }[] = [
  { value: 'forward', label: 'At the front' },
  { value: 'midfielder', label: 'In the middle' },
  { value: 'defender', label: 'At the back' },
  { value: 'goalkeeper', label: 'In goal' },
  { value: 'all-round', label: 'All of them!' },
];

const EXPLORER_BADGE =
  'mb-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800';
const SPOT_CHIP =
  'inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-sm ' +
  'font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pitch-green';
const SPOT_ON = 'border-pitch-green bg-pitch-green text-white';
const SPOT_OFF = 'border-gray-200 bg-white text-gray-700';

function favouriteNote(position: PlayerPosition): string {
  if (position === 'all-round') return 'Got it! Your next plan keeps trying every spot.';
  return (
    `Got it! Your next plan leans on ${POSITION_AREAS[position]}, with one session in a ` +
    'different spot.'
  );
}

interface ExplorerCheckInProps {
  profile: PlayerProfile;
  onProfileChange?: (profile: PlayerProfile) => void;
}

// A player still finding their position says which spot they enjoyed, and the next plan leans
// on it. They stay "exploring" either way: picking a favourite is not settling on it.
function ExplorerCheckIn({ profile, onProfileChange }: ExplorerCheckInProps) {
  const [answer, setAnswer] = useState<PlayerPosition | null>(null);

  function choose(position: PlayerPosition): void {
    const updated: PlayerProfile = { ...profile, position, exploring: true };
    setPlayerProfile(updated);
    setAnswer(position);
    onProfileChange?.(updated);
  }

  return (
    <section
      aria-labelledby="favourite-spot-heading"
      className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex items-center gap-3">
        <Icon name="star" size={32} />
        <div>
          <p className="text-xs font-bold text-amber-800">When you have tried them</p>
          <h3 id="favourite-spot-heading" className="font-bold text-gray-900">
            Which spot was the most fun?
          </h3>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="favourite-spot-heading"
        className="flex flex-wrap gap-2"
      >
        {FAVOURITE_SPOTS.map((spot) => (
          <label
            key={spot.value}
            className={`${SPOT_CHIP} ${answer === spot.value ? SPOT_ON : SPOT_OFF}`}
          >
            <input
              type="radio"
              name="favourite-spot"
              checked={answer === spot.value}
              onChange={() => choose(spot.value)}
              className="sr-only"
            />
            {spot.label}
          </label>
        ))}
      </div>
      <p role="status" className="text-sm text-gray-700">
        {answer
          ? favouriteNote(answer)
          : 'Your answer helps plan next week. You can keep exploring for as long as you like.'}
      </p>
    </section>
  );
}

export default function TrainingPlanView({
  providerConfig,
  playerProfile,
  onProfileChange,
}: TrainingPlanViewProps) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [viewedSavedId, setViewedSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read storage after hydration
    setSavedPlans(getSavedPlans());
  }, []);

  useEffect(() => {
    if (playerProfile) {
      loadContextBatches(playerProfile).then(setContextMessages);
    }
  }, [playerProfile]);

  async function handleGenerate(): Promise<void> {
    if (!playerProfile) return;
    setLoading(true);
    setError('');
    try {
      const generated = await generateTrainingPlan(providerConfig, playerProfile, contextMessages);
      setPlan(generated);
      setViewedSavedId(null);
      setSaveError('');
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Could not generate training plan: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSave(): void {
    if (!plan) return;
    const result = savePlan(plan);
    setSavedPlans(result.plans);
    if (result.ok) {
      setViewedSavedId(result.saved.id);
      setSaveError('');
    } else if (result.reason === 'full') {
      setSaveError(
        `You can keep ${MAX_SAVED_PLANS} plans. Remove one from your saved plans above to make room for this one.`,
      );
    } else {
      setSaveError('Could not save this plan. Your browser storage may be full or turned off.');
    }
  }

  function handleView(saved: SavedPlan): void {
    setPlan(saved.plan);
    setViewedSavedId(saved.id);
    setSaveError('');
    setError('');
  }

  function handleRemove(id: string): void {
    setSavedPlans(removeSavedPlan(id));
    if (viewedSavedId === id) setViewedSavedId(null);
    setSaveError('');
  }

  const freePlansLeft = providerConfig.free ? getFreePlansLeft() : null;
  const exploring = playerProfile !== null && isExploring(playerProfile);
  const outOfFreePlans = freePlansLeft === 0;

  if (!playerProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Set up your player profile first to generate a training plan.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Training Plan</h2>
          {plan && (
            <p className="text-xs text-gray-500">
              Generated {new Date(plan.generatedAt).toLocaleDateString()}
            </p>
          )}
          {freePlansLeft !== null && (
            <p className="text-xs text-gray-500">
              {outOfFreePlans
                ? 'No free plans left. Add your own API key to make more.'
                : `${freePlansLeft} free ${freePlansLeft === 1 ? 'plan' : 'plans'} left`}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || outOfFreePlans}
          className="w-full sm:w-auto bg-pitch-green text-white px-4 py-3 sm:py-2 rounded-lg font-semibold hover:bg-pitch-dark transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? 'Generating...' : plan ? 'Regenerate' : 'Generate Plan'}
        </button>
      </div>

      {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}

      <section aria-labelledby="saved-plans-heading" className="mb-6">
        <h3 id="saved-plans-heading" className="font-semibold text-pitch-dark text-sm">
          Saved plans ({savedPlans.length}/{MAX_SAVED_PLANS})
        </h3>
        {savedPlans.length === 0 ? (
          <p className="text-xs text-gray-500 mt-1">
            Save a plan to come back to it later. It stays in this browser only.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {savedPlans.map((saved) => (
              <li
                key={saved.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                  saved.id === viewedSavedId
                    ? 'border-pitch-green bg-pitch-green/10'
                    : 'border-gray-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 break-words">
                    {saved.plan.weeklyGoal}
                  </p>
                  <p className="text-xs text-gray-500">
                    Saved {new Date(saved.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => handleView(saved)}
                    className="px-3 py-2 rounded-lg border border-pitch-green text-pitch-dark text-xs font-semibold"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleRemove(saved.id)}
                    aria-label={`Remove saved plan: ${saved.plan.weeklyGoal}`}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {saveError && <ErrorMessage className="mb-4">{saveError}</ErrorMessage>}

      {plan && (
        <div className="space-y-4">
          <button
            onClick={handleSave}
            disabled={viewedSavedId !== null}
            className="w-full sm:w-auto border border-pitch-green text-pitch-dark px-4 py-3 sm:py-2 rounded-lg font-semibold text-sm disabled:opacity-60"
          >
            {viewedSavedId !== null ? 'Saved' : 'Save this plan'}
          </button>
          <div className="bg-pitch-green/10 border border-pitch-green/20 rounded-xl p-4">
            {exploring && (
              <p className={EXPLORER_BADGE}>
                Explorer week
              </p>
            )}
            <h3 className="font-semibold text-pitch-dark text-sm">Weekly Goal</h3>
            <p className="text-gray-700 mt-1 text-sm">{plan.weeklyGoal}</p>
            {exploring && (
              <p className="text-gray-700 mt-2 text-sm">
                This week you try different spots on the pitch. Notice which one is the most fun!
              </p>
            )}
          </div>

          {plan.sessions.map((session, i) => (
            <div key={session.id || i} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-pitch-dark text-white px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{session.title}</h3>
                  <p className="text-green-300 text-xs">{session.focus}</p>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap text-green-300 text-xs">{session.duration} min</span>
              </div>
              <div className="p-3 sm:p-4 space-y-3">
                {session.drills.map((drill, j) => (
                  <div key={j} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <span className="min-w-0 break-words font-medium text-sm text-gray-800">{drill.name}</span>
                      <span className="flex-shrink-0 whitespace-nowrap text-xs text-gray-500">{drill.duration} min</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 break-words">{drill.description}</p>
                    <ul className="space-y-1">
                      {drill.coachingPoints.map((point, k) => (
                        <li key={k} className="text-xs text-pitch-dark flex items-start gap-1 break-words">
                          <span className="text-pitch-green mt-0.5 flex-shrink-0">&bull;</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {session.notes && (
                  <p className="text-xs text-gray-500 italic">{session.notes}</p>
                )}
              </div>
            </div>
          ))}
          {exploring && (
            <ExplorerCheckIn profile={playerProfile} onProfileChange={onProfileChange} />
          )}
        </div>
      )}
    </div>
  );
}
