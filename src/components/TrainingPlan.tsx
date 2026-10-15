'use client';

import { useState, useEffect } from 'react';
import type { TrainingPlan, PlayerProfile, AIProviderConfig } from '@/types';
import { generateTrainingPlan } from '@/lib/claude';
import { getFreePlansLeft } from '@/lib/storage';
import { loadContextBatches } from '@/lib/context';
import type { ContextMessage } from '@/lib/context';
import ErrorMessage from './ErrorMessage';

interface TrainingPlanViewProps {
  providerConfig: AIProviderConfig;
  playerProfile: PlayerProfile | null;
}

export default function TrainingPlanView({ providerConfig, playerProfile }: TrainingPlanViewProps) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([]);

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
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Could not generate training plan: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  const freePlansLeft = providerConfig.free ? getFreePlansLeft() : null;
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

      {plan && (
        <div className="space-y-4">
          <div className="bg-pitch-green/10 border border-pitch-green/20 rounded-xl p-4">
            <h3 className="font-semibold text-pitch-dark text-sm">Weekly Goal</h3>
            <p className="text-gray-700 mt-1 text-sm">{plan.weeklyGoal}</p>
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
        </div>
      )}
    </div>
  );
}
