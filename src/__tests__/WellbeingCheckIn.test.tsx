import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import WellbeingCheckIn from '@/components/WellbeingCheckIn';
import { BALANCE_AREAS, toDateKey } from '@/lib/wellbeing';
import type { BalanceArea, BalanceLevel, WellbeingCheckIn as CheckIn } from '@/types';

const STORAGE_KEY = 'luchoai_wellbeing_checkins';
const ALL_GOOD: Record<BalanceArea, BalanceLevel> = {
  sleep: 3,
  football: 3,
  school: 3,
  people: 3,
  fun: 3,
};

function answer(mood: string, lowAreas: BalanceArea[] = []): void {
  fireEvent.click(screen.getByRole('radio', { name: mood }));
  BALANCE_AREAS.forEach((area) => {
    const group = screen.getByRole('radiogroup', { name: area.question });
    const level = lowAreas.includes(area.id) ? 'Not really' : 'Yes';
    fireEvent.click(within(group).getByRole('radio', { name: level }));
  });
}

function storeCheckIns(checkIns: CheckIn[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkIns));
}

describe('WellbeingCheckIn', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('only lets the player save once every question is answered', () => {
    render(<WellbeingCheckIn />);
    const save = screen.getByRole('button', { name: 'Save check-in' });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: 'Good' }));
    expect(save).toBeDisabled();

    answer('Good');
    expect(save).toBeEnabled();
  });

  it('saves the check-in on this device and shows tips for low areas', () => {
    render(<WellbeingCheckIn />);
    answer('Good', ['sleep']);
    fireEvent.change(screen.getByLabelText(/proud of today/), {
      target: { value: '  Scored with my left foot  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    expect(screen.getByRole('status')).toHaveTextContent('Good days are worth noticing');
    expect(screen.getByText(BALANCE_AREAS.find((a) => a.id === 'sleep')!.tip)).toBeInTheDocument();
    expect(screen.queryByText(/things are tough/)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([
      {
        date: toDateKey(new Date()),
        mood: 4,
        balance: { ...ALL_GOOD, sleep: 1 },
        proudOf: 'Scored with my left foot',
      },
    ]);
  });

  it('points the player to a trusted adult when they feel really low', () => {
    render(<WellbeingCheckIn />);
    answer('Really low');
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    expect(screen.getByText(/things are tough/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See who you can talk to' })).toHaveAttribute(
      'href',
      '#talk-to-someone',
    );
  });

  it("shows today's result if the player already checked in, and lets them update it", () => {
    storeCheckIns([{ date: toDateKey(new Date()), mood: 5, balance: ALL_GOOD, proudOf: '' }]);
    render(<WellbeingCheckIn />);

    expect(screen.getByText(/Love that energy/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save check-in' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Update today's check-in" }));
    expect(screen.getByRole('radio', { name: 'Great' })).toBeChecked();
  });

  it('lets the player delete their check-in history', () => {
    storeCheckIns([
      { date: '2026-01-01', mood: 3, balance: ALL_GOOD, proudOf: '' },
      { date: '2026-01-02', mood: 4, balance: ALL_GOOD, proudOf: '' },
    ]);
    render(<WellbeingCheckIn />);
    expect(screen.getByText('Your recent check-ins')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(screen.queryByText('Your recent check-ins')).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
