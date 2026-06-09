import Link from 'next/link';

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Football Coach',
    description:
      'Chat with your personal AI coach any time. Get advice on technique, tactics, and mindset.',
  },
  {
    icon: '📋',
    title: 'Personalised Training Plans',
    description:
      'Generate weekly training sessions tailored to your position, age, and skill level.',
  },
  {
    icon: '⚽',
    title: 'Skill Development',
    description: 'From basic dribbling to advanced tactics — grow every aspect of your game.',
  },
  {
    icon: '💪',
    title: 'Built for Young Players',
    description: 'Encouraging, age-appropriate coaching designed for players aged 8–18.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pitch-dark via-pitch-green to-green-400">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="text-7xl mb-4">⚽</div>
          <h1 className="text-5xl font-black text-white mb-4">LuchoAI</h1>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Your AI-powered football coach. Get personalised training, expert advice, and the tools
            to reach your full potential.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/coach"
              className="bg-white text-pitch-dark font-bold px-8 py-3 rounded-full hover:bg-green-50 transition-colors text-lg shadow-lg"
            >
              Talk to Your Coach
            </Link>
            <Link
              href="/training"
              className="bg-gold text-pitch-dark font-bold px-8 py-3 rounded-full hover:bg-yellow-400 transition-colors text-lg shadow-lg"
            >
              Get Training Plan
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-green-100 text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
