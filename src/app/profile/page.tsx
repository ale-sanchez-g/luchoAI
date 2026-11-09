'use client';

import { useStoredState } from '@/lib/use-stored-state';
import { getProviderConfig, getPlayerProfile } from '@/lib/storage';
import type { PlayerProfile, AIProviderConfig } from '@/types';
import PlayerProfileForm from '@/components/PlayerProfile';
import ApiKeySetup from '@/components/ApiKeySetup';
import Header from '@/components/Header';

export default function ProfilePage() {
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
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* The form picks set-up or edit when it mounts, so it must not remount on save. */}
        <PlayerProfileForm initialProfile={playerProfile} onSave={setPlayerProfile} />
      </main>
    </div>
  );
}
