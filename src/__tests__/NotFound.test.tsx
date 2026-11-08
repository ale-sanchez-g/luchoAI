import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';

describe('NotFound', () => {
  it('tells the player the page is out of bounds', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
    expect(screen.getByText('This page is out of bounds.')).toBeInTheDocument();
  });

  it('offers a way back to the home page', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
  });

  it('shows the ball as a decorative icon at 28px or larger', () => {
    const { container } = render(<NotFound />);
    const icons = Array.from(container.querySelectorAll('img'));
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveAttribute('src', expect.stringMatching(/\/icons\/ball\.svg$/));
    expect(icons[0]).toHaveAttribute('alt', '');
    expect(Number(icons[0].getAttribute('width'))).toBeGreaterThanOrEqual(28);
  });
});
