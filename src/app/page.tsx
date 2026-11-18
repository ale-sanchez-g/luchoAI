import Link from 'next/link';
import Header from '@/components/Header';
import HowItWorksVideo from '@/components/HowItWorksVideo';
import Icon from '@/components/Icon';
import { FREE_PLAN_LIMIT, FREE_QUESTION_LIMIT, getFreeKey } from '@/lib/free-key';
import type { IconName } from '@/lib/icons';
import { MAX_SAVED_PLANS } from '@/lib/storage';

interface Step {
  icon: IconName;
  title: string;
  text: string;
}

interface Area {
  href: string;
  icon: IconName;
  title: string;
  text: string;
  needsKey: boolean;
  linkText: string;
}

interface Point {
  title: string;
  text: string;
}

interface Question {
  question: string;
  answer: string;
}

const KEY_COMPANIES = 'Claude, OpenAI, Gemini or Hugging Face';

// The free trial only exists in builds made with the deploy's free key, so the page only
// promises it when this build has one.
function firstStep(freeTrial: boolean): Step {
  return {
    icon: 'robot',
    title: 'Switch on your AI coach',
    text: freeTrial
      ? `Tap “Try it free” for ${FREE_QUESTION_LIMIT} questions and ${FREE_PLAN_LIMIT} ` +
        `training plans. To keep going, a grown-up pastes in an AI key from ${KEY_COMPANIES}.`
      : `A grown-up picks an AI company (${KEY_COMPANIES}) and pastes in its AI key. ` +
        'It stays on this device.',
  };
}

const STEPS_AFTER_KEY: Step[] = [
  {
    icon: 'star',
    title: 'Make your player profile',
    text:
      'Answer five quick questions: who is filling it in, name and age, where you play, your ' +
      'level and your goals. A parent can do it too.',
  },
  {
    icon: 'chat',
    title: 'Train with your coach',
    text:
      'Ask your coach anything about football. Then make a weekly training plan, with a ' +
      'picture of how to set up each drill.',
  },
  {
    icon: 'ball',
    title: 'Play, think and check in',
    text:
      'Play new games every Monday, test your decisions in Game IQ and check in with how you ' +
      'feel. No AI key needed for these.',
  },
];

const AREAS: Area[] = [
  {
    href: '/coach',
    icon: 'speaking',
    title: 'Coach chat',
    text:
      'Ask about skills, your position, nerves before a big game or how to practise at home. ' +
      'Your coach only talks football.',
    needsKey: true,
    linkText: 'Open the coach',
  },
  {
    href: '/training',
    icon: 'clipboard',
    title: 'Training plans',
    text:
      'A week of sessions made for your age, position and goals, with a picture of each ' +
      `drill. Save up to ${MAX_SAVED_PLANS} plans to come back to.`,
    needsKey: true,
    linkText: 'Make a plan',
  },
  {
    href: '/games',
    icon: 'brain',
    title: 'Games and Game IQ',
    text:
      'Four new games every Monday: on your own, with a friend, with a group and something ' +
      'new. In Game IQ you move yourself to the best spot on the pitch.',
    needsKey: false,
    linkText: "See this week's games",
  },
  {
    href: '/wellbeing',
    icon: 'heart',
    title: 'Wellbeing',
    text:
      'A 30-second check-in, calm breathing, a reset for after mistakes and free helplines ' +
      'if you need to talk to someone.',
    needsKey: false,
    linkText: 'Check in',
  },
];

const GROWN_UP_POINTS: Point[] = [
  {
    title: 'No sign-up.',
    text:
      'There are no accounts. The profile, plans and check-ins are saved in this browser, on ' +
      'this device.',
  },
  {
    title: 'A coach that sticks to football.',
    text:
      'It is set up to turn down homework, code and other topics. If a child shares a worry, ' +
      'it encourages them to talk to a trusted adult.',
  },
  {
    title: 'Check-ins stay private.',
    text: 'Wellbeing check-ins never leave the device and are never sent to the AI.',
  },
  {
    title: 'You stay in charge of the AI.',
    text:
      'Your key is only sent to the AI company you picked. AI companies can charge for use, ' +
      'so check their prices and set a spending limit.',
  },
  {
    title: 'Games made for playing without a coach.',
    text: 'No heading, nobody gets knocked out, and exercise is never a punishment.',
  },
  {
    title: 'An AI can get things wrong.',
    text:
      'LuchoAI helps with football. It is not a doctor or a counsellor, so stay involved. The ' +
      'Wellbeing page lists free helplines.',
  },
];

function questions(freeTrial: boolean): Question[] {
  return [
    {
      question: 'What is an AI key?',
      answer:
        'A code, a bit like a password, from an AI company such as Anthropic (Claude), ' +
        'OpenAI, Google (Gemini) or Hugging Face. It lets LuchoAI ask that AI for coaching ' +
        'tips. A grown-up makes one on the company’s website and pastes it in once.',
    },
    {
      question: 'Does it cost anything?',
      answer:
        'LuchoAI is free, and so are the games, Game IQ and the wellbeing tools. The coach and ' +
        'training plans use your AI key, and the AI company may charge for that.' +
        (freeTrial
          ? ` You can try ${FREE_QUESTION_LIMIT} questions and ${FREE_PLAN_LIMIT} training ` +
            'plans for free first.'
          : ''),
    },
    {
      question: 'Where is my information saved?',
      answer:
        'Your profile, plans and check-ins are saved only in this browser, on this device, ' +
        'and clearing your browser data deletes them. When you chat or make a plan, your ' +
        'question and profile go to the AI company you picked so it can answer. Check-ins ' +
        'never leave the device.',
    },
    {
      question: 'Who is LuchoAI for?',
      answer:
        'Football players aged 8 to 18, from beginners to advanced. Younger players get ' +
        'simpler words and can try every position before choosing one.',
    },
  ];
}

const GOLD_BUTTON =
  'rounded-full bg-gold px-8 py-3.5 text-center text-lg font-bold text-gray-900 shadow-lg ' +
  'transition-colors hover:bg-yellow-400';
const OUTLINE_BUTTON =
  'rounded-full border-2 border-white/70 px-6 py-3 text-center text-lg font-semibold ' +
  'text-white transition-colors hover:bg-white/10';
const SECTION = 'mx-auto max-w-4xl px-4 py-12 sm:py-16';
const SECTION_TITLE = 'text-3xl font-black text-pitch-dark sm:text-4xl';

// Faint pitch markings behind the hero.
function PitchLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="white"
      strokeWidth="3"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
    >
      <rect x="40" y="40" width="1120" height="620" rx="6" />
      <line x1="600" y1="40" x2="600" y2="660" />
      <circle cx="600" cy="350" r="95" />
      <circle cx="600" cy="350" r="6" fill="white" />
      <rect x="40" y="190" width="170" height="320" />
      <rect x="40" y="275" width="60" height="150" />
      <rect x="990" y="190" width="170" height="320" />
      <rect x="1100" y="275" width="60" height="150" />
    </svg>
  );
}

export default function HomePage() {
  const freeTrial = getFreeKey() !== null;
  const steps = [firstStep(freeTrial), ...STEPS_AFTER_KEY];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-pitch-dark to-pitch-green text-white">
          <PitchLines />
          <div className="relative mx-auto grid max-w-4xl items-center gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_auto] lg:gap-12">
            <div>
              <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                For football players aged 8 to 18
              </p>
              <h1 className="mt-4 text-[1.75rem] font-black leading-tight min-[360px]:text-[2rem] sm:text-5xl">
                <span className="block">Your football coach,</span>{' '}
                <span className="block">in your pocket</span>
              </h1>
              <p className="mt-4 max-w-xl text-lg text-green-50">
                LuchoAI answers your football questions, makes you a training plan, gives you new
                games every week and helps you look after how you feel.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/profile" className={GOLD_BUTTON}>
                  Get started
                </Link>
                <a href="#how-it-works" className={OUTLINE_BUTTON}>
                  How it works
                </a>
              </div>
              <p className="mt-4 text-sm text-green-50">
                No sign-up. No AI key yet?{' '}
                <Link href="/games" className="font-semibold text-yellow-300 underline">
                  Games
                </Link>{' '}
                and{' '}
                <Link href="/wellbeing" className="font-semibold text-yellow-300 underline">
                  Wellbeing
                </Link>{' '}
                work without one.
              </p>
            </div>
            <HowItWorksVideo />
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-14 bg-white">
          <div className={SECTION}>
            <h2 id="how-heading" className={SECTION_TITLE}>
              How it works
            </h2>
            <p className="mt-2 text-gray-600">
              Four steps from your first visit to your first training session.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {steps.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-lg font-black text-gray-900"
                    >
                      {i + 1}
                    </span>
                    <Icon name={step.icon} size={44} />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-700">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="inside-heading">
          <div className={SECTION}>
            <h2 id="inside-heading" className={SECTION_TITLE}>
              What you can do
            </h2>
            <p className="mt-2 text-gray-600">
              Everything is in the menu at the top of every page.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {AREAS.map((area) => (
                <li
                  key={area.href}
                  className="relative flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-5 transition-colors hover:border-pitch-green"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon name={area.icon} size={48} />
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        area.needsKey
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-green-100 text-green-900'
                      }`}
                    >
                      {area.needsKey ? 'Uses your AI key' : 'No AI key needed'}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-gray-900">{area.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-gray-700">{area.text}</p>
                  {/* The link covers the whole card, so the card is one big tap target. */}
                  <Link
                    href={area.href}
                    className="mt-4 font-semibold text-pitch-green after:absolute after:inset-0 after:rounded-2xl"
                  >
                    {area.linkText} <span aria-hidden="true">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="grown-ups-heading" className="bg-pitch-dark text-white">
          <div className={`${SECTION} lg:grid lg:grid-cols-[2fr_3fr] lg:gap-12`}>
            <div>
              <Icon name="shield" size={56} />
              <h2 id="grown-ups-heading" className="mt-3 text-3xl font-black sm:text-4xl">
                For parents, carers and coaches
              </h2>
              <p className="mt-2 text-green-100">
                LuchoAI is made for children, so it keeps things simple and private.
              </p>
            </div>
            <ul className="mt-8 space-y-4 lg:mt-0">
              {GROWN_UP_POINTS.map((point) => (
                <li key={point.title} className="flex items-start gap-3">
                  <Icon name="check-circle" size={32} />
                  <p className="text-green-50">
                    <strong className="text-white">{point.title}</strong> {point.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="questions-heading" className="bg-white">
          <div className={SECTION}>
            <h2 id="questions-heading" className={SECTION_TITLE}>
              Questions
            </h2>
            <div className="mt-6 space-y-3">
              {questions(freeTrial).map((q) => (
                <details
                  key={q.question}
                  className="group rounded-2xl border border-gray-200 bg-gray-50 open:bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-base font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                    {q.question}
                    <span
                      aria-hidden="true"
                      className="text-2xl leading-none text-pitch-green transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="px-4 pb-4 text-gray-700">{q.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-pitch-green to-pitch-dark text-white">
          <div className={`${SECTION} text-center`}>
            <Icon name="trophy" size={56} />
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Ready for your first session?</h2>
            <p className="mt-2 text-green-50">
              Set up your coach and profile in a couple of minutes.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/profile" className={GOLD_BUTTON}>
                Get started
              </Link>
              <Link href="/games" className={OUTLINE_BUTTON}>
                Play this week&apos;s games
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
