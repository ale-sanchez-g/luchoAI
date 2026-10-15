import { encodeFreeKey, decodeFreeKey, FREE_PLAN_LIMIT, FREE_QUESTION_LIMIT } from '@/lib/free-key';
import { getFreePlansLeft, getFreeQuestionsLeft, spendFreePlan, spendFreeQuestion } from '@/lib/storage';

describe('free key', () => {
  it('round-trips and hides the plain key', () => {
    const encoded = encodeFreeKey('AIzaSyExampleKey1234567890');
    expect(encoded).not.toContain('AIza');
    expect(decodeFreeKey(encoded)).toBe('AIzaSyExampleKey1234567890');
  });

  it('is unavailable when the build had no key', () => {
    expect(encodeFreeKey('')).toBe('');
    expect(decodeFreeKey('')).toBeNull();
    expect(decodeFreeKey(undefined)).toBeNull();
  });
});

describe('free question count', () => {
  beforeEach(() => localStorage.clear());

  it('counts down to zero and stays there', () => {
    expect(getFreeQuestionsLeft()).toBe(FREE_QUESTION_LIMIT);
    for (let i = 0; i < FREE_QUESTION_LIMIT + 2; i++) spendFreeQuestion();
    expect(getFreeQuestionsLeft()).toBe(0);
  });
});

describe('free plan count', () => {
  beforeEach(() => localStorage.clear());

  it('is counted apart from questions', () => {
    spendFreePlan();
    expect(getFreePlansLeft()).toBe(FREE_PLAN_LIMIT - 1);
    expect(getFreeQuestionsLeft()).toBe(FREE_QUESTION_LIMIT);
  });

  it('counts down to zero and stays there', () => {
    for (let i = 0; i < FREE_PLAN_LIMIT + 2; i++) spendFreePlan();
    expect(getFreePlansLeft()).toBe(0);
  });
});
