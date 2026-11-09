import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import TrainingPlanView from '@/components/TrainingPlan';
import { generateTrainingPlan } from '@/lib/claude';
import { getPlayerProfile } from '@/lib/storage';
import type { AIProviderConfig, PlayerProfile, TrainingPlan } from '@/types';

jest.mock('@/lib/claude', () => ({ generateTrainingPlan: jest.fn() }));
jest.mock('@/lib/context', () => ({ loadContextBatches: jest.fn(() => Promise.resolve([])) }));

const CONFIG: AIProviderConfig = { provider: 'anthropic', model: 'm', apiKey: 'sk-ant-test' };

const PLAN: TrainingPlan = {
  weeklyGoal: 'Try every spot on the pitch',
  generatedAt: new Date(2026, 10, 4),
  sessions: ['At the front', 'In the middle', 'At the back', 'In goal'].map((spot, i) => ({
    id: `session-${i + 1}`,
    title: `Session ${i + 1}`,
    duration: 35,
    focus: `${spot}: games`,
    notes: 'Rest a day after.',
    drills: [
      { name: 'Game', duration: 10, description: 'Play.', coachingPoints: ['Have fun'] },
      { name: 'Weave', duration: 5, description: 'Go.', coachingPoints: [], setup: 'slalom' },
      { name: 'Odd', duration: 5, description: 'Go.', coachingPoints: [], setup: 'rondo' },
    ],
  })),
};

const MIA: PlayerProfile = {
  name: 'Mia',
  age: 9,
  position: 'all-round',
  exploring: true,
  skillLevel: 'beginner',
  goals: [],
  weaknesses: [],
};

async function showPlan(profile: PlayerProfile, onProfileChange = jest.fn()): Promise<void> {
  (generateTrainingPlan as jest.Mock).mockResolvedValue(PLAN);
  render(
    <TrainingPlanView
      providerConfig={CONFIG}
      playerProfile={profile}
      onProfileChange={onProfileChange}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Generate Plan' }));
  await screen.findByText('Try every spot on the pitch');
}

describe('TrainingPlanView explorer week', () => {
  beforeEach(() => localStorage.clear());

  it('marks the plan as an explorer week and asks which spot was the most fun', async () => {
    await showPlan(MIA);
    expect(screen.getByText('Explorer week')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Which spot was the most fun?' }),
    ).toBeInTheDocument();
  });

  it('leans the next plan on the favourite spot and keeps exploring', async () => {
    const onProfileChange = jest.fn();
    await showPlan(MIA, onProfileChange);
    fireEvent.click(screen.getByRole('radio', { name: 'In goal' }));
    const updated = { ...MIA, position: 'goalkeeper', exploring: true };
    expect(onProfileChange).toHaveBeenCalledWith(updated);
    expect(getPlayerProfile()).toEqual(updated);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Got it! Your next plan leans on goalkeeping, with one session in a different spot.',
    );
  });

  it('keeps trying every spot when they liked them all', async () => {
    await showPlan({ ...MIA, position: 'midfielder' });
    fireEvent.click(screen.getByRole('radio', { name: 'All of them!' }));
    expect(getPlayerProfile()?.position).toBe('all-round');
    expect(screen.getByRole('status')).toHaveTextContent('keeps trying every spot');
  });

  it('does not ask a player who is settled in their position', async () => {
    await showPlan({ ...MIA, position: 'defender', exploring: false });
    expect(screen.queryByText('Explorer week')).toBeNull();
    expect(screen.queryByText('Which spot was the most fun?')).toBeNull();
  });
});

describe('TrainingPlanView drill pictures', () => {
  beforeEach(() => localStorage.clear());

  it('shows a picture only for drills with a setup the app can draw', async () => {
    await showPlan({ ...MIA, position: 'forward', exploring: false });
    expect(screen.getAllByRole('img', { name: /in and out of a line of cones/ })).toHaveLength(4);
    expect(screen.getAllByRole('figure')).toHaveLength(4);
  });
});
