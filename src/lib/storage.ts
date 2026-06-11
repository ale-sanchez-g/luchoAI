import type { PlayerProfile, AIProviderConfig } from '@/types';

const KEYS = {
  API_KEY: 'luchoai_api_key',
  PLAYER_PROFILE: 'luchoai_player_profile',
  PROVIDER_CONFIG: 'luchoai_provider_config',
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

export function getProviderConfig(): AIProviderConfig | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.PROVIDER_CONFIG);
  if (raw) {
    try {
      return JSON.parse(raw) as AIProviderConfig;
    } catch {
      return null;
    }
  }
  // Backwards compat: migrate old anthropic-only key
  const legacyKey = localStorage.getItem(KEYS.API_KEY);
  if (legacyKey) {
    return { provider: 'anthropic', model: 'claude-opus-4-8', apiKey: legacyKey };
  }
  return null;
}

export function setProviderConfig(config: AIProviderConfig): void {
  localStorage.setItem(KEYS.PROVIDER_CONFIG, JSON.stringify(config));
  if (config.provider === 'anthropic') {
    localStorage.setItem(KEYS.API_KEY, config.apiKey);
  }
}

export function clearProviderConfig(): void {
  localStorage.removeItem(KEYS.PROVIDER_CONFIG);
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
