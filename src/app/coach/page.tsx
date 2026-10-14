'use client';

import { useEffect, useState } from 'react';
import { getProviderConfig, getPlayerProfile, clearProviderConfig } from '@/lib/storage';
import type { PlayerProfile, AIProviderConfig } from '@/types';
import CoachChat from '@/components/CoachChat';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';
import Icon from '@/components/Icon';
import { getProvider } from '@/lib/providers';
import { useVisualViewportHeight } from '@/lib/use-visual-viewport-height';

export default function CoachPage() {
  const [providerConfig, setProviderConfig] = useState<AIProviderConfig | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [ready, setReady] = useState(false);
  useVisualViewportHeight();

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
    <div className="flex h-[var(--app-height,100dvh)] flex-col overflow-hidden bg-gray-50">
      <Header />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col bg-white shadow-sm">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b bg-pitch-dark px-4 py-1.5 text-white sm:py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold">
              <Icon name="robot" className="mr-1 -my-1" /> Coach LuchoAI
            </h1>
            {playerProfile && (
              <p className="truncate text-xs text-green-300">
                {playerProfile.name} · {playerProfile.position} · {playerProfile.skillLevel}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-green-300">
              <Icon name={providerDef.logo} />
              <span className="sr-only sm:not-sr-only">{providerDef.name}</span>
            </span>
            <button
              onClick={() => { clearProviderConfig(); setProviderConfig(null); }}
              className="px-1 py-2 text-xs text-green-300 hover:text-white underline"
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
