'use client';

import { useEffect, useState } from 'react';
import { getApiKey, getPlayerProfile } from '@/lib/storage';
import type { PlayerProfile } from '@/types';
import CoachChat from '@/components/CoachChat';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';

export default function CoachPage() {
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div
        className="flex-1 max-w-2xl mx-auto w-full bg-white shadow-sm flex flex-col"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        <div className="border-b px-4 py-3 bg-pitch-dark text-white flex-shrink-0">
          <h1 className="font-bold text-sm">🤖 Coach LuchoAI</h1>
          {playerProfile && (
            <p className="text-green-300 text-xs">
              {playerProfile.name} · {playerProfile.position} · {playerProfile.skillLevel}
            </p>
          )}
        </div>
        <CoachChat apiKey={apiKey} playerProfile={playerProfile} />
      </div>
    </div>
  );
}
