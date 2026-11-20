import type { AIProvider } from '@/types';
import type { IconName } from './icons';
import { FREE_PLAN_LIMIT, FREE_QUESTION_LIMIT } from './free-key';
import { MAX_CHECKINS, MAX_SAVED_PLANS, STORAGE_KEYS } from './storage';
import type { StorageKey } from './storage';

/** Change this whenever what LuchoAI saves, or what it sends and where, changes. */
export const PRIVACY_UPDATED = { iso: '2026-11-20', label: '20 November 2026' };

export interface PrivacyPoint {
  title: string;
  text: string;
}

export interface SavedItem extends PrivacyPoint {
  icon: IconName;
  /** The storage keys this item covers. privacy.test.ts checks every key LuchoAI writes is here. */
  keys: readonly StorageKey[];
}

export interface CompanyPolicy {
  href: string;
  linkText: string;
  note?: string;
}

export const SHORT_VERSION: PrivacyPoint[] = [
  {
    title: 'No sign-up.',
    text: 'LuchoAI never asks for an email address, a password or a phone number.',
  },
  {
    title: 'Saved on this device.',
    text:
      'Your profile, plans and check-ins stay in this browser. LuchoAI has no server of its ' +
      'own to send them to, so the people who make it never see them.',
  },
  {
    title: 'Sent only to get an answer.',
    text:
      'When you ask the coach a question or make a plan, your question and profile go ' +
      'straight to the AI company your coach uses, so it can reply.',
  },
  {
    title: 'Check-ins stay private.',
    text: 'Wellbeing check-ins never leave this device and are never sent to the AI.',
  },
  {
    title: 'No ads, no tracking.',
    text: 'LuchoAI has no adverts, no analytics and no cookies.',
  },
  {
    title: 'Delete it any time.',
    text: 'The button at the bottom of this page deletes everything LuchoAI saved here.',
  },
];

/** What LuchoAI keeps in this browser. Only builds with the free trial keep a count of it. */
export function savedItems(freeTrial: boolean): SavedItem[] {
  const items: SavedItem[] = [
    {
      icon: 'star',
      title: 'Your player profile',
      text:
        'Your first name or nickname, age, where you play, your level, your goals and what you ' +
        'want to work on, and who filled it in. The coach uses it to fit advice and plans to you.',
      keys: [STORAGE_KEYS.PLAYER_PROFILE],
    },
    {
      icon: 'robot',
      title: 'Your AI company and key',
      text:
        'The AI company and model that were picked, and the AI key, so LuchoAI can ask that ' +
        'AI your questions.' +
        (freeTrial ? ' “Try it free” saves no key.' : ''),
      keys: [STORAGE_KEYS.PROVIDER_CONFIG, STORAGE_KEYS.API_KEY],
    },
    {
      icon: 'clipboard',
      title: 'Saved training plans',
      text: `Up to ${MAX_SAVED_PLANS} plans you chose to keep.`,
      keys: [STORAGE_KEYS.SAVED_PLANS],
    },
    {
      icon: 'heart',
      title: 'Wellbeing check-ins',
      text:
        'How you felt, how balanced your days were and what you were proud of, for your last ' +
        `${MAX_CHECKINS} check-ins.`,
      keys: [STORAGE_KEYS.WELLBEING_CHECKINS],
    },
    {
      icon: 'brain',
      title: 'Game IQ scores',
      text: 'Your best score in each Game IQ theme.',
      keys: [STORAGE_KEYS.GAME_SCORES],
    },
  ];
  if (freeTrial) {
    items.push({
      icon: 'stopwatch',
      title: 'Free tries used',
      text:
        `How many of the ${FREE_QUESTION_LIMIT} free questions and ${FREE_PLAN_LIMIT} free ` +
        'plans have been used here. It is just a number, kept so the free trial stays fair.',
      keys: [STORAGE_KEYS.FREE_QUESTIONS_USED, STORAGE_KEYS.FREE_PLANS_USED],
    });
  }
  return items;
}

export const NOT_SAVED: PrivacyPoint[] = [
  {
    title: 'Chats with the coach are not saved.',
    text: 'They disappear when you leave or reload the coach page.',
  },
  {
    title: 'Anyone using this browser can see what is saved.',
    text: 'On a shared or school computer, delete it when you finish.',
  },
];

export const SENT: PrivacyPoint[] = [
  {
    title: 'When you ask the coach a question:',
    text: 'your question, the recent messages in the chat and your profile.',
  },
  {
    title: 'When you make a training plan:',
    text: 'your profile.',
  },
];

// The fields buildSystemPrompt and buildTrainingPlanPrompt put in front of the AI.
export const PROFILE_SENT =
  'Your profile here means your first name or nickname, age, where you play, level, goals ' +
  'and what you want to work on.';

export const NEVER_SENT = 'wellbeing check-ins, saved plans and Game IQ scores.';

/**
 * Where each AI company explains what it does with what it receives. Keyed by provider, so adding
 * a provider fails to compile until the privacy page says where its questions go.
 */
export const AI_COMPANY_POLICIES: Record<AIProvider, CompanyPolicy> = {
  anthropic: {
    href: 'https://www.anthropic.com/legal/privacy',
    linkText: 'Anthropic privacy policy',
  },
  openai: {
    href: 'https://openai.com/policies/privacy-policy/',
    linkText: 'OpenAI privacy policy',
  },
  gemini: {
    href: 'https://ai.google.dev/gemini-api/terms',
    linkText: 'Gemini API terms',
  },
  huggingface: {
    href: 'https://huggingface.co/docs/inference-providers/security',
    linkText: 'Hugging Face data security',
    note:
      'Hugging Face passes each question to a partner company that runs the AI model, and ' +
      'that company’s rules apply too.',
  },
};

export const FREE_TRIAL_NOTE =
  '“Try it free” uses Google Gemini with LuchoAI’s own key, so free questions and plans go ' +
  'to Google.';

export const COMPANY_RULES =
  'Each company has its own rules about how long it keeps what it receives, whether its staff ' +
  'can read it and whether it uses it to improve its AI. With your own key, the rules of the ' +
  'account that key came from apply, so check that company’s privacy policy and account ' +
  'settings.';

export const GITHUB_PRIVACY_URL =
  'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';

export const PROJECT_ISSUES_URL = 'https://github.com/ale-sanchez-g/luchoAI/issues';

export const CONTROLS: PrivacyPoint[] = [
  {
    title: 'See it.',
    text:
      'Your profile is on the Profile page, plans on the Training page and check-ins on the ' +
      'Wellbeing page.',
  },
  {
    title: 'Change it.',
    text: 'Edit your profile on the Profile page at any time.',
  },
  {
    title: 'Delete some of it.',
    text:
      'Remove a saved plan on the Training page, tap “Clear history” under your check-ins, or ' +
      'tap “Switch” on the coach page to remove the AI key.',
  },
  {
    title: 'Delete all of it.',
    text:
      'Use the button at the bottom of this page, or clear this website’s data in your ' +
      'browser settings.',
  },
  {
    title: 'What an AI company already has.',
    text:
      'LuchoAI can’t delete it, because LuchoAI never had it. If you used your own key, ask ' +
      'that company through the account the key came from.',
  },
];

export function parentPoints(freeTrial: boolean): PrivacyPoint[] {
  return [
    {
      title: 'A grown-up should make the AI key.',
      text:
        'It comes from an account with an AI company. The account holder chooses which ' +
        'company gets the questions and can set a spending limit.',
    },
    ...(freeTrial
      ? [
          {
            title: '“Try it free” needs no grown-up.',
            text:
              `It sends up to ${FREE_QUESTION_LIMIT} questions and ${FREE_PLAN_LIMIT} plans to ` +
              'Google with LuchoAI’s own key. To choose the company yourself, add your own key ' +
              'instead.',
          },
        ]
      : []),
    {
      title: 'LuchoAI can’t see the chats.',
      text:
        'Nobody at LuchoAI reads what your child asks the coach, and LuchoAI alerts no one. If ' +
        'a child shares a worry, the coach encourages them to talk to a trusted adult, so stay ' +
        'involved.',
    },
    {
      title: 'Set it up together.',
      text:
        'LuchoAI is for players aged 8 to 18. With younger players, make the profile together ' +
        'and stay nearby while they chat.',
    },
  ];
}
