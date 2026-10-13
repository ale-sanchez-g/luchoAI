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

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type BalanceArea = 'sleep' | 'football' | 'school' | 'people' | 'fun';

export type BalanceLevel = 1 | 2 | 3;

export interface WellbeingCheckIn {
  date: string;
  mood: MoodLevel;
  balance: Record<BalanceArea, BalanceLevel>;
  proudOf: string;
}

export type DecisionThemeId =
  | 'space'
  | 'first-touch'
  | 'press'
  | 'defend-together'
  | 'counter'
  | 'shoot';

export type BestScores = Partial<Record<DecisionThemeId, number>>;

export interface PitchPoint {
  x: number;
  y: number;
}

export interface PitchArrow {
  from: PitchPoint;
  to: PitchPoint;
  kind: 'pass' | 'run';
}

export interface PitchScene {
  goal?: 'top' | 'bottom';
  you: PitchPoint;
  ball: PitchPoint;
  teammates: PitchPoint[];
  opponents: PitchPoint[];
  arrows?: PitchArrow[];
}

export interface DecisionOption {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
  marker?: PitchPoint;
}

export interface DecisionScenario {
  id: string;
  title: string;
  situation: string;
  question: string;
  scene: PitchScene;
  options: DecisionOption[];
  cue: string;
}

export interface PitchGame {
  name: string;
  players: string;
  setup: string;
  howToPlay: string;
  focus: string;
  harder: string;
}

export interface DecisionTheme {
  id: DecisionThemeId;
  emoji: string;
  title: string;
  description: string;
  scenarios: DecisionScenario[];
  pitchGames: PitchGame[];
}
