import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import GamesHub from '@/components/GamesHub';
import { getTheme } from '@/lib/decision-games';
import { getWeeklyPlan } from '@/lib/game-library';

const NOW = new Date(2026, 9, 14, 10, 0);

function exactly(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

describe('GamesHub', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens on this week and offers Game IQ as the other tab', () => {
    render(<GamesHub />);

    expect(screen.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Game IQ' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('heading', { name: /This week.s games/ })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Game IQ' })).not.toBeInTheDocument();
  });

  it('switches to the Game IQ rounds and back', () => {
    render(<GamesHub />);
    fireEvent.click(screen.getByRole('tab', { name: 'Game IQ' }));

    expect(screen.getByRole('heading', { name: 'Game IQ' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /This week.s games/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'This week' }));
    expect(screen.getByRole('heading', { name: /This week.s games/ })).toBeVisible();
  });

  it('moves between tabs with the arrow keys', () => {
    render(<GamesHub />);
    const week = screen.getByRole('tab', { name: 'This week' });
    week.focus();
    fireEvent.keyDown(week, { key: 'ArrowRight' });

    const iq = screen.getByRole('tab', { name: 'Game IQ' });
    expect(iq).toHaveAttribute('aria-selected', 'true');
    expect(iq).toHaveFocus();
    fireEvent.keyDown(iq, { key: 'ArrowLeft' });
    expect(week).toHaveAttribute('aria-selected', 'true');
    expect(week).toHaveFocus();
  });

  it('plays the round of the week straight away', () => {
    render(<GamesHub />);
    const { quizTheme } = getWeeklyPlan(NOW, null);
    const theme = getTheme(quizTheme);
    fireEvent.click(screen.getByRole('button', { name: 'Play this round' }));

    expect(screen.getByRole('tab', { name: 'Game IQ' })).toHaveAttribute('aria-selected', 'true');
    const total = theme.scenarios.length;
    expect(
      screen.getByRole('heading', { name: exactly(`${theme.title} · 1 of ${total}`) }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: theme.scenarios[0].title })).toBeVisible();
  });

  it('keeps a round going when you peek at this week and come back', () => {
    render(<GamesHub />);
    fireEvent.click(screen.getByRole('button', { name: 'Play this round' }));
    const { quizTheme } = getWeeklyPlan(NOW, null);
    const first = getTheme(quizTheme).scenarios[0];
    const answer = `A. ${first.options[0].label}`;
    fireEvent.click(screen.getByRole('button', { name: exactly(answer) }));
    expect(screen.getByRole('status')).toHaveTextContent(first.cue);

    fireEvent.click(screen.getByRole('tab', { name: 'This week' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Game IQ' }));

    expect(screen.getByRole('status')).toHaveTextContent(first.cue);
  });
});
