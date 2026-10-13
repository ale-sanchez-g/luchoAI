import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import DecisionGame from '@/components/DecisionGame';
import { DECISION_THEMES, getTheme } from '@/lib/decision-games';
import type { DecisionOption } from '@/types';

const SPACE = getTheme('space');
const FIRST = SPACE.scenarios[0];

function optionButton(option: DecisionOption): HTMLElement {
  return screen.getByRole('button', { name: `${option.id}. ${option.label}` });
}

function correctOption(index: number): DecisionOption {
  return SPACE.scenarios[index].options.find((o) => o.correct)!;
}

function playRound(answer: (index: number) => DecisionOption): void {
  fireEvent.click(screen.getByRole('button', { name: /Move into Space/ }));
  SPACE.scenarios.forEach((_scenario, i) => {
    fireEvent.click(optionButton(answer(i)));
    const next = i === SPACE.scenarios.length - 1 ? 'See my score' : /Next situation/;
    fireEvent.click(screen.getByRole('button', { name: next }));
  });
}

describe('DecisionGame', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers every decision theme', () => {
    render(<DecisionGame />);
    expect(screen.getByRole('heading', { name: 'Game IQ' })).toBeInTheDocument();
    DECISION_THEMES.forEach((theme) => {
      expect(screen.getByText(theme.title)).toBeInTheDocument();
    });
  });

  it('shows the pitch and situation for the first scenario', () => {
    render(<DecisionGame />);
    fireEvent.click(screen.getByRole('button', { name: /Move into Space/ }));
    expect(screen.getByRole('heading', { name: FIRST.title })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: new RegExp(FIRST.title) })).toBeInTheDocument();
    expect(screen.getByText(FIRST.situation)).toBeInTheDocument();
  });

  it('praises a correct decision, shows the cue and locks the answers', () => {
    render(<DecisionGame />);
    fireEvent.click(screen.getByRole('button', { name: /Move into Space/ }));
    fireEvent.click(optionButton(correctOption(0)));

    const feedback = screen.getByRole('status');
    expect(feedback).toHaveTextContent('Great decision!');
    expect(feedback).toHaveTextContent(FIRST.cue);
    FIRST.options.forEach((o) => {
      expect(screen.getByRole('button', { name: new RegExp(`^${o.id}\\. `) })).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: /Next situation/ })).toHaveFocus();
  });

  it('explains why the best option is better after a wrong decision', () => {
    render(<DecisionGame />);
    fireEvent.click(screen.getByRole('button', { name: /Move into Space/ }));
    const wrong = FIRST.options.find((o) => !o.correct)!;
    const correct = correctOption(0);
    fireEvent.click(optionButton(wrong));

    const feedback = screen.getByRole('status');
    expect(feedback).toHaveTextContent(wrong.feedback);
    expect(feedback).toHaveTextContent(`Why ${correct.id} is better`);
    expect(feedback).toHaveTextContent(correct.feedback);
  });

  it('scores a full round, unlocks pitch games and saves the best score', () => {
    render(<DecisionGame />);
    playRound(correctOption);

    expect(screen.getByText(`4 / ${SPACE.scenarios.length}`)).toBeInTheDocument();
    SPACE.pitchGames.forEach((game) => {
      expect(screen.getByRole('heading', { name: game.name })).toBeInTheDocument();
    });
    expect(JSON.parse(localStorage.getItem('luchoai_game_scores')!)).toEqual({ space: 4 });

    fireEvent.click(screen.getByRole('button', { name: 'Choose another game' }));
    expect(screen.getByText('Best: 4/4 · Play again')).toBeInTheDocument();
  });

  it('counts only correct answers and celebrates a new personal best', () => {
    localStorage.setItem('luchoai_game_scores', JSON.stringify({ space: 1 }));
    render(<DecisionGame />);
    playRound((i) =>
      i === 0 ? FIRST.options.find((o) => !o.correct)! : correctOption(i),
    );

    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText(/New personal best/)).toBeInTheDocument();
  });
});
