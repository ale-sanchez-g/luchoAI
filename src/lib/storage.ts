import type { PlayerProfile } from '@/types';

const KEYS = {
  API_KEY: 'luchoai_api_key',
  PLAYER_PROFILE: 'luchoai_player_profile',
} as const;

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEYS.API_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEYS.API_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(KEYS.API_KEY);
}

export function getPlayerProfile(): PlayerProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.PLAYER_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function setPlayerProfile(profile: PlayerProfile): void {
  localStorage.setItem(KEYS.PLAYER_PROFILE, JSON.stringify(profile));
}
