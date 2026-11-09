'use client';

import { useStoredState } from '@/lib/use-stored-state';
import { getProviderConfig, getPlayerProfile } from '@/lib/storage';
import type { PlayerProfile, AIProviderConfig } from '@/types';
import TrainingPlanView from '@/components/TrainingPlan';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';

export default function TrainingPage() {
  const [providerConfig, setProviderConfig, ready] = useStoredState<AIProviderConfig | null>(
    getProviderConfig,
    null,
  );
  const [playerProfile, setPlayerProfile] = useStoredState<PlayerProfile | null>(
    getPlayerProfile,
    null,
  );

  if (!ready) return <div className="min-h-screen bg-gray-50" />;

  if (!providerConfig) {
    return <ApiKeySetup onKeySet={() => setProviderConfig(getProviderConfig())} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-3 py-5 sm:px-4 sm:py-8">
        <TrainingPlanView
          providerConfig={providerConfig}
          playerProfile={playerProfile}
          onProfileChange={setPlayerProfile}
        />
      </main>
    </div>
  );
}
