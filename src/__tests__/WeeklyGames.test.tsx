import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import WeeklyGames from '@/components/WeeklyGames';
import { getTheme } from '@/lib/decision-games';
import { getWeeklyPlan } from '@/lib/game-library';
import { safetyNotes } from '@/lib/game-library/safety';
import { getSkillArea } from '@/lib/game-library/skills';
import type { PlayerProfile } from '@/types';

// Wednesday 14 October 2026, in the week that starts Monday 12 October.
const NOW = new Date(2026, 9, 14, 10, 0);

const PROFILE: PlayerProfile = {
  name: 'Sam',
  age: 12,
  position: 'midfielder',
  skillLevel: 'beginner',
  goals: ['Improve my first touch', 'Score more goals'],
  weaknesses: [],
};

function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem('luchoai_player_profile', JSON.stringify(profile));
}

describe('WeeklyGames', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the focus and four games picked from the player goals', () => {
    saveProfile(PROFILE);
    render(<WeeklyGames onPlayRound={jest.fn()} />);
    const plan = getWeeklyPlan(NOW, PROFILE);

    expect(screen.getByRole('heading', { name: /This week.s games/ })).toBeInTheDocument();
    const focusLabel = getSkillArea(plan.focus).label;
    expect(screen.getByText("This week's focus")).toBeInTheDocument();
    expect(screen.getAllByText(focusLabel, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText('Picked from your goals, Sam.')).toBeInTheDocument();
    expect(plan.picks).toHaveLength(4);
    plan.picks.forEach((pick) => {
      expect(screen.getByRole('heading', { name: pick.game.name })).toBeInTheDocument();
    });
    ['On your own', 'With a friend', 'With a group', 'Something new'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('opens the first game and leaves the others closed', () => {
    saveProfile(PROFILE);
    const { container } = render(<WeeklyGames onPlayRound={jest.fn()} />);
    const cards = Array.from(container.querySelectorAll('details'));
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.open)).toEqual([true, false, false, false]);
  });

  it('spells out how to play, how to make it easier and harder, and an optional twist', () => {
    saveProfile(PROFILE);
    const { container } = render(<WeeklyGames onPlayRound={jest.fn()} />);
    const plan = getWeeklyPlan(NOW, PROFILE);
    const first = plan.picks[0];
    const card = container.querySelector('details') as HTMLElement;

    expect(card).toHaveTextContent(first.game.setup);
    expect(card).toHaveTextContent(first.game.howToPlay);
    expect(card).toHaveTextContent(first.game.easier);
    expect(card).toHaveTextContent(first.game.harder);
    if (first.twist) {
      expect(card).toHaveTextContent(`Optional twist: ${first.twist.name}`);
      expect(card).toHaveTextContent(first.twist.rule);
      expect(card).toHaveTextContent('Skip it if it does not suit the way you are playing.');
    }
  });

  it('adds stay-safe reminders to the games that need them', () => {
    saveProfile(PROFILE);
    const { container } = render(<WeeklyGames onPlayRound={jest.fn()} />);
    const plan = getWeeklyPlan(NOW, PROFILE);
    const cards = Array.from(container.querySelectorAll('details'));

    plan.picks.forEach((pick, i) => {
      const notes = safetyNotes(pick.game);
      notes.forEach((note) => expect(cards[i]).toHaveTextContent(note));
      if (notes.length === 0) expect(cards[i]).not.toHaveTextContent('Stay safe');
    });
  });

  it('gives a match mission to try in a real game', () => {
    saveProfile(PROFILE);
    render(<WeeklyGames onPlayRound={jest.fn()} />);
    const { mission } = getWeeklyPlan(NOW, PROFILE);

    expect(mission).not.toBeNull();
    expect(screen.getByRole('heading', { name: /Take it to your next match/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: mission!.title })).toBeInTheDocument();
    expect(screen.getByText(mission!.mission)).toBeInTheDocument();
    expect(screen.getByText(mission!.afterMatch, { exact: false })).toBeInTheDocument();
  });

  it('starts the Game IQ round of the week', () => {
    saveProfile(PROFILE);
    const onPlayRound = jest.fn();
    render(<WeeklyGames onPlayRound={onPlayRound} />);
    const { quizTheme } = getWeeklyPlan(NOW, PROFILE);

    expect(screen.getByText(getTheme(quizTheme).title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play this round' }));
    expect(onPlayRound).toHaveBeenCalledWith(quizTheme);
  });

  it('asks a new player to add goals, and links to the profile page', () => {
    render(<WeeklyGames onPlayRound={jest.fn()} />);

    expect(screen.getByText('A different skill each week, so you try everything.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Profile page' })).toHaveAttribute('href', '/profile');
    expect(getWeeklyPlan(NOW, null).picks).toHaveLength(4);
  });

  it('changes the games on Monday', () => {
    saveProfile(PROFILE);
    const thisWeek = getWeeklyPlan(NOW, PROFILE);
    const nextWeek = getWeeklyPlan(new Date(2026, 9, 19, 9, 0), PROFILE);
    expect(nextWeek.picks.map((p) => p.game.id)).not.toEqual(thisWeek.picks.map((p) => p.game.id));

    jest.setSystemTime(new Date(2026, 9, 19, 9, 0));
    render(<WeeklyGames onPlayRound={jest.fn()} />);
    nextWeek.picks.forEach((pick) => {
      expect(screen.getByRole('heading', { name: pick.game.name })).toBeInTheDocument();
    });
  });

  it('points an older player who wants to work on heading towards their coach', () => {
    saveProfile({ ...PROFILE, age: 16, goals: ['Better heading'] });
    render(<WeeklyGames onPlayRound={jest.fn()} />);

    expect(screen.getByRole('note')).toHaveTextContent('best learned at training with your coach');
  });

  it('tells a younger player heading is a skill for later', () => {
    saveProfile({ ...PROFILE, age: 9, goals: ['Better heading'] });
    render(<WeeklyGames onPlayRound={jest.fn()} />);

    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('a skill for later');
    expect(note).not.toHaveTextContent('at training with your coach');
  });

  it('shows no heading note to players who did not ask for it', () => {
    saveProfile(PROFILE);
    render(<WeeklyGames onPlayRound={jest.fn()} />);

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('reminds players to play safely, rest and stop after a knock to the head', () => {
    saveProfile(PROFILE);
    render(<WeeklyGames onPlayRound={jest.fn()} />);

    const safety = screen.getByRole('group', { name: 'Play it safe' });
    expect(safety).toHaveTextContent('away from roads, driveways, car parks, windows and water');
    expect(safety).toHaveTextContent('bang your head, or feel dizzy, sick or confused');
    expect(safety).toHaveTextContent('Do not play again until a doctor says it is okay');
    expect(safety).toHaveTextContent('Ask a grown-up first');
  });

  it('copes with a damaged saved profile', () => {
    localStorage.setItem('luchoai_player_profile', '{"name": 7, "age": "ten"}');
    render(<WeeklyGames onPlayRound={jest.fn()} />);

    expect(screen.getByRole('heading', { name: /This week.s games/ })).toBeInTheDocument();
  });
});
