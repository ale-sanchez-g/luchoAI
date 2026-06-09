'use client';

import { useEffect, useState } from 'react';
import { getApiKey, getPlayerProfile } from '@/lib/storage';
import type { PlayerProfile } from '@/types';
import TrainingPlanView from '@/components/TrainingPlan';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';

export default function TrainingPage(): JSX.Element {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setApiKey(getApiKey());
    setPlayerProfile(getPlayerProfile());
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-screen bg-gray-50" />;

  if (!apiKey) {
    return <ApiKeySetup onKeySet={() => setApiKey(getApiKey())} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <TrainingPlanView apiKey={apiKey} playerProfile={playerProfile} />
      </main>
    </div>
  );
}
