import type { SkillLevel } from '@/types';

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

// Short on purpose: the Skill Level box is half the width of a 320px phone. The stored value
// stays beginner/intermediate/advanced, which is what the coach prompt and old profiles use.
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Rookie',
  intermediate: 'Rising',
  advanced: 'Ace',
};
