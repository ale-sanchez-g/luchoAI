import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Icon from '@/components/Icon';
import DeletePlayerData from '@/components/DeletePlayerData';
import { getFreeKey } from '@/lib/free-key';
import { PROVIDERS } from '@/lib/providers';
import {
  AI_COMPANY_POLICIES,
  COMPANY_RULES,
  CONTROLS,
  FREE_TRIAL_NOTE,
  GITHUB_PRIVACY_URL,
  NEVER_SENT,
  NOT_SAVED,
  PRIVACY_UPDATED,
  PROFILE_SENT,
  PROJECT_ISSUES_URL,
  SENT,
  SHORT_VERSION,
  parentPoints,
  savedItems,
} from '@/lib/privacy';
import type { PrivacyPoint } from '@/lib/privacy';

export const metadata: Metadata = {
  title: 'Privacy — LuchoAI',
  description: 'What LuchoAI saves, where it goes and how to delete it.',
};

const CARD = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';
const SECTION_TITLE = 'text-lg font-bold text-gray-800';

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-pitch-green underline hover:text-pitch-dark"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function PointList({ points }: { points: PrivacyPoint[] }) {
  return (
    <ul className="space-y-3">
      {points.map((point) => (
        <li key={point.title} className="text-sm text-gray-700">
          <strong className="text-gray-900">{point.title}</strong> {point.text}
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  // The free trial only exists in builds made with the deploy's free key, so the page only
  // describes it when this build has one.
  const freeTrial = getFreeKey() !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-2xl space-y-10 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Privacy</h1>
          <p className="mt-1 text-gray-600">
            What LuchoAI saves, where it goes and how to delete it.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Last updated <time dateTime={PRIVACY_UPDATED.iso}>{PRIVACY_UPDATED.label}</time>
          </p>
        </div>

        <section
          aria-labelledby="short-heading"
          className="space-y-4 rounded-2xl bg-pitch-dark p-5 text-white"
        >
          <h2 id="short-heading" className="text-lg font-bold">
            The short version
          </h2>
          <ul className="space-y-3">
            {SHORT_VERSION.map((point) => (
              <li key={point.title} className="flex items-start gap-3">
                <Icon name="check-circle" />
                <p className="text-sm text-green-50">
                  <strong className="text-white">{point.title}</strong> {point.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Icon name="shield" size={40} />
          <p className="text-sm text-gray-800">
            <strong>Keep private things private.</strong> Your coach only needs football. Never
            tell it your address, your school, your phone number or a password.
          </p>
        </div>

        <section aria-labelledby="saved-heading" className="space-y-4">
          <h2 id="saved-heading" className={SECTION_TITLE}>
            What LuchoAI saves on this device
          </h2>
          <p className="text-sm text-gray-700">
            Everything is saved in this browser on this device, not on the internet.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {savedItems(freeTrial).map((item) => (
              <li key={item.title} className={CARD}>
                <p className="text-sm font-semibold text-gray-800">
                  <Icon name={item.icon} className="-my-1 mr-1" /> {item.title}
                </p>
                <p className="mt-1 text-sm text-gray-600">{item.text}</p>
              </li>
            ))}
          </ul>
          <PointList points={NOT_SAVED} />
        </section>

        <section aria-labelledby="sent-heading" className="space-y-4">
          <h2 id="sent-heading" className={SECTION_TITLE}>
            What leaves this device
          </h2>
          <p className="text-sm text-gray-700">
            LuchoAI has no server of its own. When the coach answers, this device sends the
            question straight to the AI company and shows you the reply.
          </p>
          <div className={`${CARD} space-y-3`}>
            <PointList points={SENT} />
            <p className="text-sm text-gray-700">{PROFILE_SENT}</p>
            <p className="text-sm text-gray-700">
              LuchoAI also sends its own coaching instructions and football guides. They say
              nothing about you.
            </p>
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Never sent anywhere:</strong> {NEVER_SENT}
            </p>
          </div>

          <h3 className="pt-2 font-bold text-gray-800">Which AI company gets it</h3>
          <p className="text-sm text-gray-700">Only the one your coach uses:</p>
          <ul className="space-y-2">
            {PROVIDERS.map((provider) => {
              const policy = AI_COMPANY_POLICIES[provider.id];
              const note = provider.id === 'gemini' && freeTrial ? FREE_TRIAL_NOTE : policy.note;
              return (
                <li key={provider.id} className="flex items-start gap-3 text-sm text-gray-700">
                  <Icon name={provider.logo} />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-gray-900">{provider.name}</p>
                    {note && <p>{note}</p>}
                    <p>
                      <ExternalLink href={policy.href}>{policy.linkText}</ExternalLink>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-gray-700">{COMPANY_RULES}</p>
        </section>

        <section aria-labelledby="website-heading" className="space-y-3">
          <h2 id="website-heading" className={SECTION_TITLE}>
            Visiting the website
          </h2>
          <p className="text-sm text-gray-700">
            LuchoAI is hosted on GitHub Pages. Like most websites, GitHub keeps a record of
            visitors’ internet addresses (IP addresses) to keep its service secure.{' '}
            <ExternalLink href={GITHUB_PRIVACY_URL}>GitHub privacy statement</ExternalLink>
          </p>
          <p className="text-sm text-gray-700">
            LuchoAI adds no adverts, analytics, trackers or cookies, and opening a page loads
            nothing from other companies.
          </p>
          <p className="text-sm text-gray-700">
            The Wellbeing page links to a list of helplines on another website, which has its own
            privacy rules.
          </p>
        </section>

        <section aria-labelledby="choices-heading" className="space-y-4">
          <h2 id="choices-heading" className={SECTION_TITLE}>
            You are in charge
          </h2>
          <div className={CARD}>
            <PointList points={CONTROLS} />
          </div>
        </section>

        <section
          aria-labelledby="parents-heading"
          className="space-y-4 rounded-2xl border border-pitch-green/30 bg-pitch-green/5 p-5"
        >
          <h2 id="parents-heading" className={SECTION_TITLE}>
            <Icon name="people" className="-my-1 mr-1" /> For parents and carers
          </h2>
          <PointList points={parentPoints(freeTrial)} />
        </section>

        <section aria-labelledby="changes-heading" className="space-y-3">
          <h2 id="changes-heading" className={SECTION_TITLE}>
            Changes and questions
          </h2>
          <p className="text-sm text-gray-700">
            If LuchoAI changes how it handles information, this page will change too, with a new
            date at the top.
          </p>
          <p className="text-sm text-gray-700">
            LuchoAI’s code is public on GitHub, so anyone can check what this page says.
            Grown-ups can ask a question there too. Questions on GitHub are public, so don’t
            include personal details.{' '}
            <ExternalLink href={PROJECT_ISSUES_URL}>Ask a question on GitHub</ExternalLink>
          </p>
        </section>

        <DeletePlayerData freeTrial={freeTrial} />
      </main>
    </div>
  );
}
