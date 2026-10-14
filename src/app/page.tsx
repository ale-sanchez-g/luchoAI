import Link from 'next/link';
import Icon from '@/components/Icon';
import type { IconName } from '@/lib/icons';

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'robot',
    title: 'AI Football Coach',
    description:
      'Chat with your personal AI coach any time. Get advice on technique, tactics, and mindset.',
  },
  {
    icon: 'clipboard',
    title: 'Personalised Training Plans',
    description:
      'Generate weekly training sessions tailored to your position, age, and skill level.',
  },
  {
    icon: 'brain',
    title: 'Weekly Games & Game IQ',
    description:
      'New games every Monday, picked for your goals, plus decision games on space, first ' +
      'touch, pressing, counters and when to shoot or pass.',
  },
  {
    icon: 'heart',
    title: 'Wellbeing',
    description:
      'Daily check-ins, calm breathing, and reset tools to keep your mind and life in balance.',
  },
  {
    icon: 'ball',
    title: 'Skill Development',
    description: 'From basic dribbling to advanced tactics — grow every aspect of your game.',
  },
  {
    icon: 'dumbbell',
    title: 'Built for Young Players',
    description: 'Encouraging, age-appropriate coaching designed for players aged 8–18.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pitch-dark via-pitch-green to-green-400">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="mb-4">
            <Icon name="ball" size={96} />
          </div>
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
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <Link
              href="/games"
              className="border-2 border-white/60 text-white font-semibold px-5 py-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Icon name="brain" size={28} className="mr-1" /> This week’s games
            </Link>
            <Link
              href="/wellbeing"
              className="border-2 border-white/60 text-white font-semibold px-5 py-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Icon name="heart" size={28} className="mr-1" /> Wellbeing Check-in
            </Link>
          </div>
          <p className="mt-2 text-sm text-green-100">No API key needed for these two.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
              <Icon name={f.icon} size={48} className="mb-3" />
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-green-100 text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
