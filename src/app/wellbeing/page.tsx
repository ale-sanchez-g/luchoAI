import type { Metadata } from 'next';
import Header from '@/components/Header';
import WellbeingCheckIn from '@/components/WellbeingCheckIn';
import BreathingExercise from '@/components/BreathingExercise';
import { HELPLINES, HELPLINE_DIRECTORY_URL } from '@/lib/wellbeing';

export const metadata: Metadata = {
  title: 'Wellbeing — LuchoAI',
};

const MISTAKE_RESET = [
  {
    step: 'Notice it',
    text:
      'Mistakes are part of football. Even the best players in the world lose the ball lots ' +
      'of times every game.',
  },
  {
    step: 'Flush it',
    text:
      'Do your reset move: flush it away with your hand, brush it off your shoulders or wipe ' +
      'it off your forehead. Take one slow breath.',
  },
  {
    step: 'Next job!',
    text:
      'Say your cue word in your head, like “Next!”, and focus on what you can do right now: ' +
      'get back in position, find space, help a teammate.',
  },
];

const NERVES_TIPS = [
  'Butterflies are normal. They mean your body is getting ready to play.',
  "Try telling yourself “I'm excited!” instead of “I'm nervous”. Your body feels almost the " +
    'same either way.',
  'Focus on what you control: your effort, your attitude and how you help your teammates. ' +
    'Not the score.',
  'Do a minute of calm breathing before your warm-up.',
];

const BALANCE_FACTS = [
  {
    emoji: '🛌',
    title: 'Rest makes you better',
    text:
      'Take at least 1–2 days off organised sport every week. Your body gets stronger while ' +
      'it rests.',
  },
  {
    emoji: '⏱️',
    title: 'Keep it balanced',
    text:
      "A good rule: the hours of organised sport you do each week shouldn't be more than " +
      'your age. 12 years old = 12 hours max.',
  },
  {
    emoji: '🏀',
    title: 'Try other sports',
    text:
      'Playing different sports builds all-round skills and helps you avoid injuries from ' +
      'doing too much of one thing.',
  },
  {
    emoji: '🧠',
    title: 'You are more than a footballer',
    text:
      'Football is part of who you are, not all of who you are. Friends, family, school and ' +
      'hobbies matter too.',
  },
];

const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-200 p-5';

export default function WellbeingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Wellbeing</h1>
          <p className="text-gray-600 text-sm mt-1">
            Looking after your mind is part of being a great player. Check in with yourself, keep
            your life in balance, and use the reset tools when things get tough.
          </p>
        </div>

        <WellbeingCheckIn />

        <section aria-labelledby="toolkit-heading" className="space-y-4">
          <h2 id="toolkit-heading" className="text-lg font-bold text-gray-800">
            Reset toolkit
          </h2>
          <BreathingExercise />

          <div className={CARD}>
            <h3 className="font-bold text-gray-800">
              <span aria-hidden="true">🔄</span> After a mistake: flush it
            </h3>
            <ol className="mt-3 space-y-3">
              {MISTAKE_RESET.map((item, i) => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-pitch-green text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{item.step}</p>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className={CARD}>
            <h3 className="font-bold text-gray-800">
              <span aria-hidden="true">🦋</span> Big-game nerves
            </h3>
            <ul className="mt-3 space-y-2">
              {NERVES_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-pitch-green" aria-hidden="true">
                    &bull;
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="balance-heading" className="space-y-4">
          <h2 id="balance-heading" className="text-lg font-bold text-gray-800">
            Keep your balance
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {BALANCE_FACTS.map((fact) => (
              <div key={fact.title} className={CARD}>
                <p className="font-semibold text-gray-800 text-sm">
                  <span aria-hidden="true">{fact.emoji}</span> {fact.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">{fact.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="talk-to-someone"
          aria-labelledby="talk-heading"
          className="bg-pitch-dark text-white rounded-2xl p-5 space-y-4"
        >
          <h2 id="talk-heading" className="text-lg font-bold">
            <span aria-hidden="true">💬</span> Talk to someone
          </h2>
          <p className="text-sm text-green-100">
            You never have to deal with things on your own. If you feel sad, worried, stressed or
            scared, or if someone is hurting you or making you feel unsafe, talk to an adult you
            trust: a parent or carer, a teacher, your coach or a school counsellor.
          </p>

          <div>
            <p className="text-sm font-semibold">Free, confidential helplines for young people:</p>
            <ul className="mt-2 space-y-2">
              {HELPLINES.map((line) => (
                <li key={line.country} className="rounded-lg bg-white/10 px-3 py-2 text-sm">
                  <span className="text-green-200">{line.country}</span> ·{' '}
                  <span className="font-semibold">{line.name}</span>{' '}
                  <a
                    href={line.href}
                    className="whitespace-nowrap font-semibold text-yellow-300 underline"
                  >
                    {line.phone}
                  </a>
                  {line.textOption && <span className="text-green-100"> {line.textOption}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-green-100">
              Somewhere else?{' '}
              <a
                href={HELPLINE_DIRECTORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-yellow-300 underline"
              >
                Find a helpline in your country
              </a>
            </p>
          </div>

          <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-pitch-dark">
            In danger right now? Call your emergency number: 000 (Australia), 111 (New Zealand),
            999 (UK), 911 (US &amp; Canada) or 112 (Europe).
          </p>

          <p className="text-xs text-green-200">
            LuchoAI&apos;s coach is an AI. It can help with your football, but it isn&apos;t a
            counsellor. For feelings that are hard to handle, a real person is the best help.
          </p>
        </section>
      </main>
    </div>
  );
}
