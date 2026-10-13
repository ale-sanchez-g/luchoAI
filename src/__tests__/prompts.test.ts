import { BASE_SYSTEM_PROMPT, buildSystemPrompt } from '@/lib/prompts';
import type { PlayerProfile } from '@/types';

const SAMPLE_PROFILE: PlayerProfile = {
  name: 'Lucho',
  age: 11,
  position: 'forward',
  skillLevel: 'beginner',
  goals: ['Score more goals'],
  weaknesses: ['Nerves before games'],
};

describe('prompts', () => {
  it('tells the coach to signpost trusted adults, helplines and emergency help', () => {
    expect(BASE_SYSTEM_PROMPT).toMatch(/not a counsellor/);
    expect(BASE_SYSTEM_PROMPT).toMatch(/trusted adult/);
    expect(BASE_SYSTEM_PROMPT).toMatch(/Wellbeing page/);
    expect(BASE_SYSTEM_PROMPT).toMatch(/emergency number/);
  });

  it('returns the base prompt when there is no profile', () => {
    expect(buildSystemPrompt(null)).toBe(BASE_SYSTEM_PROMPT);
  });

  it('keeps the safety guidance when a profile is added', () => {
    const prompt = buildSystemPrompt(SAMPLE_PROFILE);
    expect(prompt.startsWith(BASE_SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain('Name: Lucho');
  });
});
