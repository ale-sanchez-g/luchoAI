'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/coach', label: 'Coach' },
  { href: '/training', label: 'Training' },
  { href: '/games', label: 'Games' },
  { href: '/wellbeing', label: 'Wellbeing' },
  { href: '/profile', label: 'Profile' },
];

// Tailwind's `md`, as in the classes below: from here up the links fit in the bar.
const WIDE_SCREEN = '(min-width: 768px)';

// The open menu's top row copies the bar, so its X sits exactly where the menu button was.
const BAR = 'mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4';
const BRAND = 'flex flex-shrink-0 items-center gap-2 text-lg font-bold';
const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-white';
// 48px to tap, with the lines' right edge lined up with the page edge.
const BAR_BUTTON =
  `-mr-2.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${FOCUS_RING}`;
// The page you are on is gold with a bar under it (beside it in the menu): not colour alone.
const BAR_LINK =
  'relative block whitespace-nowrap rounded-lg px-3 py-3 text-sm font-medium transition-colors ' +
  FOCUS_RING;
const BAR_LINK_CURRENT =
  'text-gold after:absolute after:inset-x-3 after:bottom-1.5 after:h-[3px] after:rounded-full ' +
  'after:bg-gold';
const BAR_LINK_OTHER = 'text-green-200 hover:text-white';
const MENU =
  'm-0 h-full max-h-none w-full max-w-none scroll-pt-14 overflow-y-auto overscroll-contain ' +
  'bg-pitch-dark p-0 text-white motion-safe:animate-menu-in';
const MENU_LINK =
  'flex min-h-14 items-center border-l-4 pl-3 pr-4 text-xl font-semibold underline-offset-4 ' +
  'hover:underline focus-visible:outline focus-visible:-outline-offset-4 ' +
  'focus-visible:outline-2 focus-visible:outline-white';

interface LinesIconProps {
  open: boolean;
}

function LinesIcon({ open }: LinesIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
    >
      <path d={open ? 'M7 7l14 14M21 7L7 21' : 'M4 8h20M4 14h20M4 20h20'} />
    </svg>
  );
}

export default function Header() {
  // trailingSlash: true makes the pathname "/games/", which would never match "/games".
  const pathname = usePathname().replace(/\/+$/, '') || '/';
  const menuId = useId();
  const menuRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Without matchMedia (tests) the menu simply stays open until it is closed.
    if (typeof window.matchMedia !== 'function') return;
    const wide = window.matchMedia(WIDE_SCREEN);
    // A tablet turned sideways shows the links in the bar, so the full-screen menu goes.
    const closeWhenWide = (event: MediaQueryListEvent): void => {
      if (event.matches) menuRef.current?.close();
    };
    wide.addEventListener('change', closeWhenWide);
    return () => wide.removeEventListener('change', closeWhenWide);
  }, []);

  function openMenu(): void {
    menuRef.current?.showModal();
    setMenuOpen(true);
  }

  function closeMenu(): void {
    menuRef.current?.close();
  }

  // Runs however the menu closes: the X, a link, Escape or the screen turning wide.
  function onMenuClosed(): void {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <header className="sticky top-0 z-40 flex-shrink-0 bg-pitch-dark text-white shadow-lg">
      <div className={BAR}>
        <Link href="/" aria-label="LuchoAI home" className={`${BRAND} rounded-lg ${FOCUS_RING}`}>
          <Icon name="ball" size={32} />
          <span>LuchoAI</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map(({ href, label }) => {
              const current = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={`${BAR_LINK} ${current ? BAR_LINK_CURRENT : BAR_LINK_OTHER}`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={openMenu}
          className={`${BAR_BUTTON} md:hidden`}
        >
          <LinesIcon open={false} />
        </button>
      </div>

      {/* A modal dialog: it covers the screen, keeps focus inside, and Escape closes it. */}
      <dialog
        ref={menuRef}
        id={menuId}
        aria-label="Menu"
        onClose={onMenuClosed}
        className={MENU}
      >
        {/* Pinned, so the X stays in reach when a phone on its side has to scroll the menu. */}
        <div className="sticky top-0 bg-pitch-dark">
          <div className={BAR}>
            <span aria-hidden="true" className={BRAND}>
              <Icon name="ball" size={32} />
              LuchoAI
            </span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className={BAR_BUTTON}
            >
              <LinesIcon open />
            </button>
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-4xl pb-10 pt-4">
          <ul>
            {NAV.map(({ href, label }) => {
              const current = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={closeMenu}
                    aria-current={current ? 'page' : undefined}
                    className={`${MENU_LINK} ${
                      current ? 'border-gold text-gold' : 'border-transparent text-white'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </dialog>
    </header>
  );
}
