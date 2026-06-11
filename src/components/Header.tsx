'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/coach', label: 'Coach' },
  { href: '/training', label: 'Training' },
  { href: '/profile', label: 'Profile' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-pitch-dark text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span>⚽</span>
          <span>LuchoAI</span>
        </Link>
        <nav className="flex gap-4">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname === href ? 'text-gold' : 'text-green-200 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
