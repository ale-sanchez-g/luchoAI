import type { Metadata } from 'next';
import Header from '@/components/Header';
import DecisionGame from '@/components/DecisionGame';

export const metadata: Metadata = {
  title: 'Game IQ — LuchoAI',
};

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <DecisionGame />
      </main>
    </div>
  );
}
