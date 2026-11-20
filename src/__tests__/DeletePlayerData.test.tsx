import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import DeletePlayerData from '@/components/DeletePlayerData';
import {
  PLAYER_DATA_KEYS,
  STORAGE_KEYS,
  saveBestScore,
  saveCheckIn,
  savePlan,
  setPlayerProfile,
  setProviderConfig,
  spendFreeQuestion,
} from '@/lib/storage';

function seedPlayer(): void {
  setProviderConfig({ provider: 'openai', model: 'gpt-4o', apiKey: 'sk-test-key' });
  setPlayerProfile({
    name: 'Mia',
    age: 11,
    position: 'midfielder',
    skillLevel: 'beginner',
    goals: ['First touch'],
    weaknesses: [],
  });
  for (const date of ['2026-11-18', '2026-11-19']) {
    saveCheckIn({
      date,
      mood: 4,
      balance: { sleep: 3, football: 3, school: 3, people: 3, fun: 3 },
      proudOf: 'Kept going after a mistake',
    });
  }
  savePlan({ weeklyGoal: 'Sharper first touch', sessions: [], generatedAt: new Date() });
  saveBestScore('space', 3);
  spendFreeQuestion();
}

function savedLines(): string[] {
  return screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
}

describe('DeletePlayerData', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('lists what is saved on this device once the page has loaded', () => {
    seedPlayer();
    render(<DeletePlayerData freeTrial />);
    expect(savedLines()).toEqual([
      'A player profile',
      'An AI key for OpenAI (GPT)',
      '1 saved training plan',
      '2 wellbeing check-ins',
      'Game IQ best scores',
    ]);
  });

  it('asks first, then deletes everything about the player but keeps the free tries count', () => {
    seedPlayer();
    render(<DeletePlayerData freeTrial />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete my LuchoAI data' }));
    expect(screen.getByText(/Delete everything\? This can’t be undone/)).toBeInTheDocument();
    // Focus lands on the safe choice, not the one that deletes.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete everything' }));

    const done = screen.getByRole('status');
    expect(done).toHaveTextContent('Everything LuchoAI saved about you on this device');
    expect(done).toHaveFocus();
    for (const key of PLAYER_DATA_KEYS) expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.FREE_QUESTIONS_USED)).toBe('1');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps everything on Cancel and gives focus back to the delete button', () => {
    seedPlayer();
    render(<DeletePlayerData freeTrial />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete my LuchoAI data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Delete my LuchoAI data' })).toHaveFocus();
    expect(savedLines()).toHaveLength(5);
    expect(localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE)).not.toBeNull();
  });

  it('says nothing is saved, with no button, when only the free tries count is here', () => {
    spendFreeQuestion();
    render(<DeletePlayerData freeTrial />);
    expect(screen.getByText('Nothing about you is saved on this device right now.')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the free trial as having no key', () => {
    setProviderConfig({ provider: 'gemini', model: 'gemini-3.6-flash', apiKey: '', free: true });
    render(<DeletePlayerData freeTrial />);
    expect(savedLines()).toEqual(['Free questions with Google Gemini (no key saved)']);
  });

  it('still offers to delete saved data it cannot read', () => {
    localStorage.setItem(STORAGE_KEYS.PLAYER_PROFILE, 'not json');
    render(<DeletePlayerData freeTrial={false} />);
    expect(savedLines()).toEqual(['Some LuchoAI settings']);
    fireEvent.click(screen.getByRole('button', { name: 'Delete my LuchoAI data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete everything' }));
    expect(localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE)).toBeNull();
  });

  it('only mentions the free tries count in builds that have the free trial', () => {
    const { unmount } = render(<DeletePlayerData freeTrial={false} />);
    expect(screen.queryByText(/free tries/)).not.toBeInTheDocument();
    unmount();
    render(<DeletePlayerData freeTrial />);
    expect(screen.getByText(/count of free tries used stays/)).toBeInTheDocument();
  });

  it('explains what to do when the browser blocks deleting', () => {
    seedPlayer();
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<DeletePlayerData freeTrial />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete my LuchoAI data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete everything' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/browser settings/);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete my LuchoAI data' })).toHaveFocus();
  });
});
