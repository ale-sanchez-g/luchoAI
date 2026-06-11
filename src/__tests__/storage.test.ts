import {
  getApiKey,
  setApiKey,
  clearApiKey,
  getPlayerProfile,
  setPlayerProfile,
  getProviderConfig,
  setProviderConfig,
  clearProviderConfig,
} from '@/lib/storage';
import type { PlayerProfile, AIProviderConfig } from '@/types';

const SAMPLE_PROFILE: PlayerProfile = {
  name: 'Lucho',
  age: 14,
  position: 'midfielder',
  skillLevel: 'intermediate',
  goals: ['Improve passing range'],
  weaknesses: ['Weak foot'],
};

const SAMPLE_CONFIG: AIProviderConfig = {
  provider: 'anthropic',
  model: 'claude-opus-4-8',
  apiKey: 'sk-ant-test-key',
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('apiKey (legacy)', () => {
    it('returns null when no key is stored', () => {
      expect(getApiKey()).toBeNull();
    });

    it('stores and retrieves the api key', () => {
      setApiKey('sk-ant-test-key');
      expect(getApiKey()).toBe('sk-ant-test-key');
    });

    it('clears the api key', () => {
      setApiKey('sk-ant-test-key');
      clearApiKey();
      expect(getApiKey()).toBeNull();
    });
  });

  describe('providerConfig', () => {
    it('returns null when nothing is stored', () => {
      expect(getProviderConfig()).toBeNull();
    });

    it('stores and retrieves provider config', () => {
      setProviderConfig(SAMPLE_CONFIG);
      expect(getProviderConfig()).toEqual(SAMPLE_CONFIG);
    });

    it('falls back to legacy api key as anthropic config', () => {
      setApiKey('sk-ant-test-key');
      const config = getProviderConfig();
      expect(config).not.toBeNull();
      expect(config!.provider).toBe('anthropic');
      expect(config!.apiKey).toBe('sk-ant-test-key');
    });

    it('clears provider config', () => {
      setProviderConfig(SAMPLE_CONFIG);
      clearProviderConfig();
      expect(getProviderConfig()).toBeNull();
    });

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('luchoai_provider_config', 'not-json');
      expect(getProviderConfig()).toBeNull();
    });

    it('stores openai provider config', () => {
      const openaiConfig: AIProviderConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-test-openai-key',
      };
      setProviderConfig(openaiConfig);
      expect(getProviderConfig()).toEqual(openaiConfig);
    });
  });

  describe('playerProfile', () => {
    it('returns null when no profile is stored', () => {
      expect(getPlayerProfile()).toBeNull();
    });

    it('stores and retrieves player profile', () => {
      setPlayerProfile(SAMPLE_PROFILE);
      expect(getPlayerProfile()).toEqual(SAMPLE_PROFILE);
    });

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('luchoai_player_profile', 'not-json');
      expect(getPlayerProfile()).toBeNull();
    });
  });
});
