import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('introduces LuchoAI as a football coach', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'LuchoAI' })).toBeInTheDocument();
    expect(screen.getByText(/Your AI-powered football coach/)).toBeInTheDocument();
  });

  it('sends players to the coach and to a training plan', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: 'Talk to Your Coach' })).toHaveAttribute(
      'href',
      '/coach',
    );
    expect(screen.getByRole('link', { name: 'Get Training Plan' })).toHaveAttribute(
      'href',
      '/training',
    );
  });

  it('links to games and wellbeing, which work without an API key', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: 'This week’s games' })).toHaveAttribute(
      'href',
      '/games',
    );
    expect(screen.getByRole('link', { name: 'Wellbeing Check-in' })).toHaveAttribute(
      'href',
      '/wellbeing',
    );
    expect(screen.getByText('No API key needed for these two.')).toBeInTheDocument();
  });

  it('describes all six features', () => {
    render(<HomePage />);
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'AI Football Coach',
      'Personalised Training Plans',
      'Weekly Games & Game IQ',
      'Wellbeing',
      'Skill Development',
      'Built for Young Players',
    ]);
  });

  it('uses only decorative icons at 28px or larger', () => {
    const { container } = render(<HomePage />);
    const icons = Array.from(container.querySelectorAll('img'));
    expect(icons).toHaveLength(9);
    for (const icon of icons) {
      expect(icon).toHaveAttribute('alt', '');
      expect(Number(icon.getAttribute('width'))).toBeGreaterThanOrEqual(28);
    }
  });
});
