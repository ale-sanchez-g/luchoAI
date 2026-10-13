import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';

const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('Header', () => {
  it('links to the Games and Wellbeing sections', () => {
    mockPathname.mockReturnValue('/');
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/games');
    expect(screen.getByRole('link', { name: 'Wellbeing' })).toHaveAttribute('href', '/wellbeing');
  });

  it('highlights the current page even with a trailing slash in the URL', () => {
    mockPathname.mockReturnValue('/wellbeing/');
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Wellbeing' })).toHaveClass('text-gold');
    expect(screen.getByRole('link', { name: 'Games' })).not.toHaveClass('text-gold');
  });

  it('highlights Home only on the home page', () => {
    mockPathname.mockReturnValue('/');
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('text-gold');
    expect(screen.getByRole('link', { name: 'Coach' })).not.toHaveClass('text-gold');
  });
});
