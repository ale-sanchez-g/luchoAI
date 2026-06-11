'use client';

import { useEffect, useState } from 'react';
import { getApiKey, getPlayerProfile } from '@/lib/storage';
import type { PlayerProfile } from '@/types';
import PlayerProfileForm from '@/components/PlayerProfile';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';

export default function ProfilePage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [saved, setSaved] = useState(false);
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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Player Profile</h1>
        <p className="text-gray-500 text-sm mb-6">
          Tell your coach about yourself so advice is tailored to your game.
        </p>
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
            Profile saved! Your coach will use this to personalise advice.
          </div>
        )}
        <PlayerProfileForm
          initialProfile={playerProfile}
          onSave={(p) => {
            setPlayerProfile(p);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          }}
        />
      </main>
    </div>
  );
}
