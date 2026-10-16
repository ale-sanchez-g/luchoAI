import type { IconName } from '@/lib/icons';

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'huggingface';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  /** Uses the site's shared key for a few free questions; apiKey is empty. */
  free?: boolean;
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

export interface SavedPlan {
  id: string;
  savedAt: string;
  plan: TrainingPlan;
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
  | 'shoot'
  | 'combine'
  | 'react-fast';

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
  icon: IconName;
  title: string;
  description: string;
  scenarios: DecisionScenario[];
  pitchGames: PitchGame[];
}

export type PlayerPosition = PlayerProfile['position'];

export type SkillLevel = PlayerProfile['skillLevel'];

export type SkillArea =
  | 'first-touch'
  | 'passing'
  | 'dribbling'
  | 'taking-on'
  | 'defending-1v1'
  | 'finishing'
  | 'goalkeeping'
  | 'movement'
  | 'team-defending'
  | 'transitions'
  | 'vision'
  | 'creativity'
  | 'athleticism'
  | 'teamwork';

// players and ages are inclusive [min, max] pairs. A game with players [1, 4] works alone
// and with up to three friends.
export interface LibraryGame {
  id: string;
  name: string;
  skill: SkillArea;
  also?: SkillArea[];
  players: [number, number];
  ages: [number, number];
  level: SkillLevel;
  minutes: number;
  noTwists?: TwistKind[];
  setup: string;
  howToPlay: string;
  focus: string;
  easier: string;
  harder: string;
}

export type TwistKind =
  | 'pace'
  | 'streak'
  | 'space'
  | 'foot'
  | 'touches'
  | 'attention'
  | 'call'
  | 'talk'
  | 'players'
  | 'target'
  | 'scoring'
  | 'handicap'
  | 'roles'
  | 'rules'
  | 'mindset';

export interface GameTwist {
  id: string;
  name: string;
  kind: TwistKind;
  rule: string;
  skills: SkillArea[] | 'all';
  minPlayers: number;
  level: SkillLevel;
  minAge?: number;
  except?: string[];
}

export interface MatchMission {
  id: string;
  title: string;
  mission: string;
  why: string;
  afterMatch: string;
  skill: SkillArea;
  ages: [number, number];
}

export type PlaySlot = 'solo' | 'friend' | 'team' | 'wildcard';

export type PickReason = 'goal' | 'position' | 'new';

export type FocusSource = 'goals' | 'position' | 'rotation';

export interface WeeklyPick {
  slot: PlaySlot;
  game: LibraryGame;
  twist: GameTwist | null;
  reason: PickReason;
}

export interface WeeklyPlan {
  week: number;
  startsOn: Date;
  focus: SkillArea;
  focusSource: FocusSource;
  picks: WeeklyPick[];
  mission: MatchMission | null;
  quizTheme: DecisionThemeId;
}
