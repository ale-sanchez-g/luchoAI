'use client';

import { useEffect, useState } from 'react';
import { getProviderConfig, getPlayerProfile, clearProviderConfig } from '@/lib/storage';
import type { PlayerProfile, AIProviderConfig } from '@/types';
import CoachChat from '@/components/CoachChat';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';
import { getProvider } from '@/lib/providers';

export default function CoachPage() {
  const [providerConfig, setProviderConfig] = useState<AIProviderConfig | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProviderConfig(getProviderConfig());
    setPlayerProfile(getPlayerProfile());
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-screen bg-gray-50" />;

  if (!providerConfig) {
    return <ApiKeySetup onKeySet={() => setProviderConfig(getProviderConfig())} />;
  }

  const providerDef = getProvider(providerConfig.provider);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div
        className="flex-1 max-w-2xl mx-auto w-full bg-white shadow-sm flex flex-col"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        <div className="border-b px-4 py-3 bg-pitch-dark text-white flex-shrink-0 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-sm">🤖 Coach LuchoAI</h1>
            {playerProfile && (
              <p className="text-green-300 text-xs">
                {playerProfile.name} · {playerProfile.position} · {playerProfile.skillLevel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-300">
              {providerDef.logo} {providerDef.name}
            </span>
            <button
              onClick={() => { clearProviderConfig(); setProviderConfig(null); }}
              className="text-xs text-green-300 hover:text-white underline"
            >
              Switch
            </button>
          </div>
        </div>
        <CoachChat providerConfig={providerConfig} playerProfile={playerProfile} />
      </div>
    </div>
  );
}
