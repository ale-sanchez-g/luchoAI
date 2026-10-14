'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

// The logo already links home, so "Home" gives up its space on small screens.
const NAV = [
  { href: '/', label: 'Home', hideOnMobile: true },
  { href: '/coach', label: 'Coach' },
  { href: '/training', label: 'Training' },
  { href: '/games', label: 'Games' },
  { href: '/wellbeing', label: 'Wellbeing' },
  { href: '/profile', label: 'Profile' },
];

export default function Header() {
  // trailingSlash: true makes the pathname "/games/", which would never match "/games".
  const pathname = usePathname().replace(/\/+$/, '') || '/';

  return (
    <header className="bg-pitch-dark text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="LuchoAI home"
          className="flex flex-shrink-0 items-center gap-2 font-bold text-lg"
        >
          <Icon name="ball" size={32} />
          <span className="hidden sm:inline">LuchoAI</span>
        </Link>
        <nav className="flex min-w-0 gap-3 overflow-x-auto [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
          {NAV.map(({ href, label, hideOnMobile }) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap text-sm font-medium transition-colors ${
                hideOnMobile ? 'hidden sm:inline' : ''
              } ${pathname === href ? 'text-gold' : 'text-green-200 hover:text-white'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
