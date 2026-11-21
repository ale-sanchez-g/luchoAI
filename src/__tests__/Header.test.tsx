import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Header from '@/components/Header';

const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// jsdom knows <dialog> but not showModal() or close(): these do to it what a browser does.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement): void {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const linkNames = (scope: HTMLElement): string[] =>
  within(scope)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '');

describe('Header', () => {
  it('links to the Games and Wellbeing sections', () => {
    mockPathname.mockReturnValue('/');
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/games');
    expect(screen.getByRole('link', { name: 'Wellbeing' })).toHaveAttribute('href', '/wellbeing');
  });

  it('marks the current page, even with a trailing slash in the URL', () => {
    mockPathname.mockReturnValue('/wellbeing/');
    render(<Header />);
    const wellbeing = screen.getByRole('link', { name: 'Wellbeing' });
    expect(wellbeing).toHaveAttribute('aria-current', 'page');
    expect(wellbeing).toHaveClass('text-gold');
    expect(screen.getByRole('link', { name: 'Games' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Games' })).not.toHaveClass('text-gold');
  });

  it('marks Home only on the home page', () => {
    mockPathname.mockReturnValue('/');
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Coach' })).not.toHaveAttribute('aria-current');
  });

  it('has a menu button that says what it opens, and keeps the menu shut until tapped', () => {
    mockPathname.mockReturnValue('/');
    render(<Header />);
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const menu = screen.getByRole('dialog', { hidden: true });
    expect(button).toHaveAttribute('aria-controls', menu.id);
  });

  it('opens a menu with every page, in the bar order, the current one marked', () => {
    mockPathname.mockReturnValue('/games/');
    render(<Header />);
    const barLinks = linkNames(screen.getByRole('navigation', { name: 'Main' }));

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(linkNames(menu)).toEqual(['Home', 'Coach', 'Training', 'Games', 'Wellbeing', 'Profile']);
    expect(linkNames(menu)).toEqual(barLinks);
    expect(within(menu).getByRole('link', { name: 'Games' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(menu).getByRole('link', { name: 'Coach' })).not.toHaveAttribute('aria-current');
  });

  it('closes the menu with its X and puts focus back on the menu button', () => {
    mockPathname.mockReturnValue('/');
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes the menu when one of its links is tapped', () => {
    mockPathname.mockReturnValue('/');
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    // Tapping the page you are on navigates nowhere, so the menu must close itself.
    fireEvent.click(within(menu).getByRole('link', { name: 'Home' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
