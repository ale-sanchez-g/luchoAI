import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BreathingExercise from '@/components/BreathingExercise';

// Each timer is scheduled by an effect that only runs once React flushes, so advance one
// second per act() rather than jumping the clock in a single call.
function tick(seconds: number): void {
  for (let i = 0; i < seconds; i += 1) {
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('BreathingExercise', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('paces five rounds of breathing in for 4 and out for 6', () => {
    render(<BreathingExercise />);
    expect(screen.getByText('Ready?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText('Breathe in')).toBeInTheDocument();
    expect(screen.getByText('Round 1 of 5')).toBeInTheDocument();

    tick(4);
    expect(screen.getByText('Breathe out')).toBeInTheDocument();

    tick(6);
    expect(screen.getByText('Breathe in')).toBeInTheDocument();
    expect(screen.getByText('Round 2 of 5')).toBeInTheDocument();

    tick(40);
    expect(screen.getByText('Nice work!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go again' })).toBeInTheDocument();
  });

  it('stops part-way when the player taps Stop', () => {
    render(<BreathingExercise />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    tick(2);

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    tick(10);
    expect(screen.getByText('Ready?')).toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cleans up its timer when unmounted mid-exercise', () => {
    const { unmount } = render(<BreathingExercise />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
