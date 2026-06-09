import { getApiKey, setApiKey, clearApiKey, getPlayerProfile, setPlayerProfile } from '@/lib/storage';
import type { PlayerProfile } from '@/types';

const SAMPLE_PROFILE: PlayerProfile = {
  name: 'Lucho',
  age: 14,
  position: 'midfielder',
  skillLevel: 'intermediate',
  goals: ['Improve passing range'],
  weaknesses: ['Weak foot'],
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('apiKey', () => {
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
