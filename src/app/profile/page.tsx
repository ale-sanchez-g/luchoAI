'use client';

import { useEffect, useState } from 'react';
import { getProviderConfig, getPlayerProfile } from '@/lib/storage';
import type { PlayerProfile, AIProviderConfig } from '@/types';
import PlayerProfileForm from '@/components/PlayerProfile';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';

export default function ProfilePage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* The form picks set-up or edit when it mounts, so it must not remount on save. */}
        <PlayerProfileForm initialProfile={playerProfile} onSave={setPlayerProfile} />
      </main>
    </div>
  );
}
