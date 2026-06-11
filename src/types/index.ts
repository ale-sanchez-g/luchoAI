export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'huggingface';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

export interface PlayerProfile {
  name: string;
  age: number;
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  weaknesses: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Drill {
  name: string;
  duration: number;
  description: string;
  coachingPoints: string[];
}

export interface TrainingSession {
  id: string;
  title: string;
  duration: number;
  focus: string;
  drills: Drill[];
  notes: string;
}

export interface TrainingPlan {
  weeklyGoal: string;
  sessions: TrainingSession[];
  generatedAt: Date;
}
