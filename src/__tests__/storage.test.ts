import {
  getApiKey,
  setApiKey,
  clearApiKey,
  getPlayerProfile,
  setPlayerProfile,
  getProviderConfig,
  setProviderConfig,
  clearProviderConfig,
  getCheckIns,
  saveCheckIn,
  clearCheckIns,
  getBestScores,
  saveBestScore,
} from '@/lib/storage';
import { BALANCE_AREAS } from '@/lib/wellbeing';
import type { PlayerProfile, AIProviderConfig, WellbeingCheckIn, MoodLevel } from '@/types';

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

  describe('wellbeing check-ins', () => {
    function checkIn(date: string, mood: MoodLevel = 4): WellbeingCheckIn {
      return {
        date,
        mood,
        balance: { sleep: 3, football: 2, school: 3, people: 3, fun: 1 },
        proudOf: 'Kept going after a mistake',
      };
    }

    it('returns an empty list when nothing is stored', () => {
      expect(getCheckIns()).toEqual([]);
    });

    it('stores and retrieves a check-in', () => {
      saveCheckIn(checkIn('2026-10-13'));
      expect(getCheckIns()).toEqual([checkIn('2026-10-13')]);
    });

    it('replaces an earlier check-in from the same day', () => {
      saveCheckIn(checkIn('2026-10-13', 2));
      const result = saveCheckIn(checkIn('2026-10-13', 5));
      expect(result).toEqual([checkIn('2026-10-13', 5)]);
    });

    it('keeps check-ins sorted oldest to newest', () => {
      saveCheckIn(checkIn('2026-10-13'));
      saveCheckIn(checkIn('2026-10-11'));
      saveCheckIn(checkIn('2026-10-12'));
      expect(getCheckIns().map((c) => c.date)).toEqual(['2026-10-11', '2026-10-12', '2026-10-13']);
    });

    it('keeps only the most recent 30 check-ins', () => {
      for (let day = 1; day <= 31; day += 1) {
        saveCheckIn(checkIn(`2026-10-${String(day).padStart(2, '0')}`));
      }
      const stored = getCheckIns();
      expect(stored).toHaveLength(30);
      expect(stored[0].date).toBe('2026-10-02');
    });

    it('returns an empty list when the stored value is invalid JSON', () => {
      localStorage.setItem('luchoai_wellbeing_checkins', 'not-json');
      expect(getCheckIns()).toEqual([]);
    });

    it('drops malformed entries instead of crashing', () => {
      const valid = checkIn('2026-10-13');
      const partialBalance: Partial<WellbeingCheckIn['balance']> = { ...valid.balance };
      delete partialBalance.fun;
      localStorage.setItem(
        'luchoai_wellbeing_checkins',
        JSON.stringify([
          valid,
          null,
          'check-in',
          { ...valid, date: '13/10/2026' },
          { ...valid, mood: 6 },
          { ...valid, mood: 2.5 },
          { ...valid, balance: { ...valid.balance, sleep: 0 } },
          { ...valid, balance: partialBalance },
          { date: valid.date, mood: valid.mood, balance: valid.balance },
        ]),
      );
      expect(getCheckIns()).toEqual([valid]);
    });

    it('round-trips a check-in that answers every balance area on the page', () => {
      const balance = Object.fromEntries(BALANCE_AREAS.map((area) => [area.id, 2]));
      const full = { ...checkIn('2026-10-13'), balance } as WellbeingCheckIn;
      saveCheckIn(full);
      expect(getCheckIns()).toEqual([full]);
    });

    it('clears all check-ins', () => {
      saveCheckIn(checkIn('2026-10-13'));
      clearCheckIns();
      expect(getCheckIns()).toEqual([]);
    });
  });

  describe('game best scores', () => {
    it('returns no scores when nothing is stored', () => {
      expect(getBestScores()).toEqual({});
    });

    it('saves the first score for a theme', () => {
      expect(saveBestScore('space', 2)).toEqual({ space: 2 });
      expect(getBestScores()).toEqual({ space: 2 });
    });

    it('keeps the best score when a lower one is saved', () => {
      saveBestScore('press', 4);
      saveBestScore('press', 1);
      expect(getBestScores()).toEqual({ press: 4 });
    });

    it('raises the best score and leaves other themes alone', () => {
      saveBestScore('space', 2);
      saveBestScore('first-touch', 1);
      saveBestScore('first-touch', 3);
      expect(getBestScores()).toEqual({ space: 2, 'first-touch': 3 });
    });

    it('ignores invalid JSON and non-number values', () => {
      localStorage.setItem('luchoai_game_scores', 'not-json');
      expect(getBestScores()).toEqual({});
      localStorage.setItem('luchoai_game_scores', JSON.stringify({ space: 'lots', press: 3 }));
      expect(getBestScores()).toEqual({ press: 3 });
    });
  });
});
