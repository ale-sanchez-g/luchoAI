import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import HomePage from '@/app/page';
import { encodeFreeKey } from '@/lib/free-key';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

const STEP_TITLES = [
  'Switch on your AI coach',
  'Make your player profile',
  'Train with your coach',
  'Play, think and check in',
];

function stepsList(): HTMLElement {
  const section = screen.getByRole('region', { name: 'How it works' });
  return within(section).getByRole('list');
}

describe('HomePage', () => {
  const savedKey = process.env.NEXT_PUBLIC_FREE_KEY_ENC;
  afterEach(() => {
    if (savedKey === undefined) delete process.env.NEXT_PUBLIC_FREE_KEY_ENC;
    else process.env.NEXT_PUBLIC_FREE_KEY_ENC = savedKey;
  });

  it('says what LuchoAI is and who it is for', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your football coach, in your pocket' }),
    ).toBeInTheDocument();
    expect(screen.getByText('For football players aged 8 to 18')).toBeInTheDocument();
  });

  it('has the menu, so every page is one tap away', () => {
    render(<HomePage />);
    const nav = within(screen.getByRole('banner')).getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Training' })).toHaveAttribute(
      'href',
      '/training',
    );
  });

  it('starts new players at set-up and links to the steps', () => {
    render(<HomePage />);
    const starts = screen.getAllByRole('link', { name: 'Get started' });
    expect(starts).toHaveLength(2);
    for (const link of starts) expect(link).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
  });

  it('explains how it works in four steps, in order', () => {
    render(<HomePage />);
    const titles = within(stepsList())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(titles).toEqual(STEP_TITLES);
  });

  it('only promises the free trial when this build has the free key', () => {
    delete process.env.NEXT_PUBLIC_FREE_KEY_ENC;
    const { unmount } = render(<HomePage />);
    expect(screen.queryByText(/Try it free/)).not.toBeInTheDocument();
    expect(within(stepsList()).getByText(/A grown-up picks an AI company/)).toBeInTheDocument();
    unmount();

    process.env.NEXT_PUBLIC_FREE_KEY_ENC = encodeFreeKey('AIza-test-key-for-the-home-page');
    render(<HomePage />);
    expect(
      within(stepsList()).getByText(/Tap “Try it free” for 5 questions and 2 training plans/),
    ).toBeInTheDocument();
    expect(screen.getByText(/try 5 questions and 2 training plans for free/)).toBeInTheDocument();
  });

  it('says which parts need an AI key and links to each one', () => {
    render(<HomePage />);
    const section = screen.getByRole('region', { name: 'What you can do' });
    const cards = within(section).getAllByRole('listitem');
    const summary = cards.map((card) => ({
      title: within(card).getByRole('heading', { level: 3 }).textContent,
      tag: within(card).getByText(/AI key/).textContent,
      href: within(card).getByRole('link').getAttribute('href'),
    }));
    expect(summary).toEqual([
      { title: 'Coach chat', tag: 'Uses your AI key', href: '/coach' },
      { title: 'Training plans', tag: 'Uses your AI key', href: '/training' },
      { title: 'Games and Game IQ', tag: 'No AI key needed', href: '/games' },
      { title: 'Wellbeing', tag: 'No AI key needed', href: '/wellbeing' },
    ]);
  });

  it('tells grown-ups where data lives and that check-ins stay on the device', () => {
    render(<HomePage />);
    const section = screen.getByRole('region', { name: 'For parents, carers and coaches' });
    expect(within(section).getByText(/saved in this browser, on this device/)).toBeInTheDocument();
    expect(within(section).getByText(/never sent to the AI/)).toBeInTheDocument();
    expect(within(section).getByText(/set a spending limit/)).toBeInTheDocument();
  });

  it('is honest that questions and the profile go to the AI company', () => {
    render(<HomePage />);
    const section = screen.getByRole('region', { name: 'Questions' });
    expect(
      within(section).getByText(/your question and profile go to the AI company you picked/),
    ).toBeInTheDocument();
  });

  it('answers the common questions', () => {
    render(<HomePage />);
    const section = screen.getByRole('region', { name: 'Questions' });
    // Each summary ends with a decorative "+" that turns into a cross when open.
    const questions = Array.from(section.querySelectorAll('summary'), (s) =>
      s.textContent?.replace(/\+$/, ''),
    );
    expect(questions).toEqual([
      'What is an AI key?',
      'Does it cost anything?',
      'Where is my information saved?',
      'Who is LuchoAI for?',
    ]);
  });

  it('uses only decorative icons at 28px or larger', () => {
    const { container } = render(<HomePage />);
    const icons = Array.from(container.querySelectorAll('img'));
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon).toHaveAttribute('alt', '');
      expect(Number(icon.getAttribute('width'))).toBeGreaterThanOrEqual(28);
    }
  });

  it('tours the same four steps in the video as the page lists', () => {
    // The video's captions and voice-over come from its narration, which opens each step with
    // "Step n: <title>." (scripts/how-it-works-video.mjs reads the steps from there too).
    const lines: { text: string }[] = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../scripts/tour-voice/lines.json'), 'utf8'),
    );
    const videoSteps = lines.flatMap(({ text }) => {
      const step = text.match(/^Step (\d): (.+)\.$/);
      return step ? [`${step[1]}. ${step[2]}`] : [];
    });
    expect(videoSteps).toEqual(STEP_TITLES.map((title, i) => `${i + 1}. ${title}`));
  });
});
