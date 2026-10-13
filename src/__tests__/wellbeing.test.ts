import {
  BALANCE_AREAS,
  HELPLINES,
  getBalanceTips,
  parseDateKey,
  shouldSuggestSupport,
  toDateKey,
} from '@/lib/wellbeing';
import type { BalanceArea, BalanceLevel, MoodLevel, WellbeingCheckIn } from '@/types';

const ALL_GOOD: Record<BalanceArea, BalanceLevel> = {
  sleep: 3,
  football: 3,
  school: 3,
  people: 3,
  fun: 3,
};

function checkIn(date: string, mood: MoodLevel): WellbeingCheckIn {
  return { date, mood, balance: ALL_GOOD, proudOf: '' };
}

function history(moods: MoodLevel[]): WellbeingCheckIn[] {
  return moods.map((mood, i) => checkIn(`2026-10-${String(i + 1).padStart(2, '0')}`, mood));
}

describe('wellbeing', () => {
  describe('date keys', () => {
    it('formats a local date as a zero-padded YYYY-MM-DD key', () => {
      expect(toDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    });

    it('parses a key back to local midnight of the same day', () => {
      const date = parseDateKey('2026-10-13');
      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 13]);
      expect(date.getHours()).toBe(0);
    });

    it('round-trips through toDateKey', () => {
      expect(toDateKey(parseDateKey('2026-02-28'))).toBe('2026-02-28');
    });
  });

  describe('getBalanceTips', () => {
    it('returns no tips when every area is going well', () => {
      expect(getBalanceTips(ALL_GOOD)).toEqual([]);
    });

    it('returns tips only for areas rated "Not really", in display order', () => {
      const tips = getBalanceTips({ ...ALL_GOOD, fun: 1, sleep: 1, school: 2 });
      expect(tips.map((t) => t.id)).toEqual(['sleep', 'fun']);
      expect(tips.every((t) => t.tip.length > 0)).toBe(true);
    });
  });

  describe('shouldSuggestSupport', () => {
    it('is false with no check-ins', () => {
      expect(shouldSuggestSupport([])).toBe(false);
    });

    it('is true straight away when the latest mood is "Really low"', () => {
      expect(shouldSuggestSupport(history([5, 5, 1]))).toBe(true);
    });

    it('is false after a single "Not great" day', () => {
      expect(shouldSuggestSupport(history([4, 4, 2]))).toBe(false);
    });

    it('is true when 3 of the last 5 check-ins were low', () => {
      expect(shouldSuggestSupport(history([2, 4, 2, 3, 2]))).toBe(true);
    });

    it('is true for a rough patch even if today is better', () => {
      expect(shouldSuggestSupport(history([2, 2, 2, 4]))).toBe(true);
    });

    it('ignores low days older than the last 5 check-ins', () => {
      expect(shouldSuggestSupport(history([1, 2, 2, 4, 4, 3, 4, 4]))).toBe(false);
    });
  });

  describe('content', () => {
    it('gives every balance area a question and a tip', () => {
      expect(BALANCE_AREAS.every((a) => a.question.length > 0 && a.tip.length > 0)).toBe(true);
    });

    it('uses dialable tel: links for every helpline', () => {
      HELPLINES.forEach((line) => {
        expect(line.href).toMatch(/^tel:\d+$/);
        expect(line.href.slice(4)).toBe(line.phone.replace(/\D/g, ''));
      });
    });
  });
});
