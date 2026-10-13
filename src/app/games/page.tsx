import type { Metadata } from 'next';
import Header from '@/components/Header';
import GamesHub from '@/components/GamesHub';

export const metadata: Metadata = {
  title: 'Games — LuchoAI',
};

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <GamesHub />
      </main>
    </div>
  );
}
