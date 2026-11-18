import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('plays out what happens after an answer, and can show the best choice', () => {
    render(<DecisionGame />);
    fireEvent.click(screen.getByRole('button', { name: /Move into Space/ }));
    expect(screen.getByText(FIRST.question)).toBeInTheDocument();
    expect(screen.getByText('Drag YOU onto a letter, or tap one.')).toBeInTheDocument();

    const wrong = FIRST.options.find((o) => !o.correct)!;
    const best = correctOption(0);
    fireEvent.click(optionButton(wrong));
    expect(screen.getByText(wrong.result)).toBeInTheDocument();
    expect(screen.getByText(`You chose ${wrong.id}: ${wrong.label}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'See the best choice' }));
    expect(screen.getByText(best.result)).toBeInTheDocument();
    expect(screen.getByText(`Best choice ${best.id}: ${best.label}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Watch again' })).toBeInTheDocument();
  });

  it('takes an answer tapped on the pitch, just like a button', () => {
    const { container } = render(<DecisionGame />);
    fireEvent.click(screen.getByRole('button', { name: /Move into Space/ }));
    const best = correctOption(0);
    fireEvent.click(container.querySelector(`[data-marker="${best.id}"]`) as Element);
    expect(screen.getByRole('status')).toHaveTextContent('Great decision!');
    expect(container.querySelector('[data-marker]')).toBeNull();
    FIRST.options.forEach((o) => {
      expect(screen.getByRole('button', { name: new RegExp(`^${o.id}\\. `) })).toBeDisabled();
    });
  });

  describe('a "when" question', () => {
    const TIMING = SPACE.scenarios.findIndex((s) => s.timing);

    function reachTimingQuestion(): void {
      render(<DecisionGame />);
      fireEvent.click(screen.getByRole('button', { name: /Move into Space/ }));
      for (let i = 0; i < TIMING; i += 1) {
        fireEvent.click(optionButton(correctOption(i)));
        fireEvent.click(screen.getByRole('button', { name: /Next situation/ }));
      }
    }

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('answers with the moment you tap GO', () => {
      reachTimingQuestion();
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.getByText('Head down')).toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(2200);
      });
      expect(screen.getByText('Looks up!')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'GO!' }));
      expect(screen.getByRole('status')).toHaveTextContent('Great decision!');
    });

    it('counts waiting until the chance has gone as "too late"', () => {
      reachTimingQuestion();
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      act(() => {
        jest.advanceTimersByTime(8000);
      });
      const late = SPACE.scenarios[TIMING].options.find((o) => o.result === 'Too late!')!;
      expect(screen.getByRole('status')).toHaveTextContent(late.feedback);
      expect(screen.getByRole('button', { name: new RegExp(`^${late.id}\\. `) })).toHaveTextContent(
        'Your pick',
      );
    });
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
