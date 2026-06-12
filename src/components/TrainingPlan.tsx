'use client';

import { useState, useEffect } from 'react';
import type { TrainingPlan, PlayerProfile, AIProviderConfig } from '@/types';
import { generateTrainingPlan } from '@/lib/claude';
import { loadContextBatches } from '@/lib/context';
import type { ContextMessage } from '@/lib/context';

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

  if (!playerProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Set up your player profile first to generate a training plan.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Training Plan</h2>
          {plan && (
            <p className="text-xs text-gray-500">
              Generated {new Date(plan.generatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-pitch-green text-white px-4 py-2 rounded-lg font-semibold hover:bg-pitch-dark transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? 'Generating...' : plan ? 'Regenerate' : 'Generate Plan'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {plan && (
        <div className="space-y-4">
          <div className="bg-pitch-green/10 border border-pitch-green/20 rounded-xl p-4">
            <h3 className="font-semibold text-pitch-dark text-sm">Weekly Goal</h3>
            <p className="text-gray-700 mt-1 text-sm">{plan.weeklyGoal}</p>
          </div>

          {plan.sessions.map((session, i) => (
            <div key={session.id || i} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-pitch-dark text-white px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{session.title}</h3>
                  <p className="text-green-300 text-xs">{session.focus}</p>
                </div>
                <span className="text-green-300 text-xs">{session.duration} min</span>
              </div>
              <div className="p-4 space-y-3">
                {session.drills.map((drill, j) => (
                  <div key={j} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-800">{drill.name}</span>
                      <span className="text-xs text-gray-500">{drill.duration} min</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{drill.description}</p>
                    <ul className="space-y-1">
                      {drill.coachingPoints.map((point, k) => (
                        <li key={k} className="text-xs text-pitch-dark flex items-start gap-1">
                          <span className="text-pitch-green mt-0.5">&bull;</span>
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
