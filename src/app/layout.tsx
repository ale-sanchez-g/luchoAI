import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LuchoAI — Your Personal Football Coach',
  appleWebApp: { capable: true, title: 'LuchoAI', statusBarStyle: 'default' },
  description:
    'AI-augmented coaching for young football players. Get personalised training plans, skill advice, and tactical guidance.',
};

export const viewport: Viewport = {
  themeColor: '#1a7f3c',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
