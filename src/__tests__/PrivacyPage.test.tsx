import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import PrivacyPage from '@/app/privacy/page';
import { encodeFreeKey } from '@/lib/free-key';
import { PROVIDERS } from '@/lib/providers';
import { AI_COMPANY_POLICIES, PRIVACY_UPDATED } from '@/lib/privacy';

jest.mock('next/navigation', () => ({
  usePathname: () => '/privacy',
}));

describe('PrivacyPage', () => {
  const savedKey = process.env.NEXT_PUBLIC_FREE_KEY_ENC;
  afterEach(() => {
    if (savedKey === undefined) delete process.env.NEXT_PUBLIC_FREE_KEY_ENC;
    else process.env.NEXT_PUBLIC_FREE_KEY_ENC = savedKey;
    localStorage.clear();
  });

  it('says what it covers and when it was last changed', () => {
    const { container } = render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument();
    expect(
      screen.getByText(/What LuchoAI saves, where it goes and how to delete it/),
    ).toBeVisible();
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('dateTime', PRIVACY_UPDATED.iso);
    expect(time).toHaveTextContent(PRIVACY_UPDATED.label);
  });

  it('starts with the short version and ends with the delete button', () => {
    render(<PrivacyPage />);
    const sections = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent?.trim());
    expect(sections).toEqual([
      'The short version',
      'What LuchoAI saves on this device',
      'What leaves this device',
      'Visiting the website',
      'You are in charge',
      'For parents and carers',
      'Changes and questions',
      'Delete everything on this device',
    ]);
  });

  it('promises check-ins stay on the device and says what does leave it', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/never leave this device and are never sent to the AI/)).toBeVisible();
    const sent = screen.getByRole('region', { name: 'What leaves this device' });
    expect(
      within(sent).getByText(/the recent messages in the chat and your profile/),
    ).toBeVisible();
    expect(
      within(sent).getByText('wellbeing check-ins, saved plans and Game IQ scores.'),
    ).toBeVisible();
  });

  it('names every AI company and links to its rules in a new tab', () => {
    render(<PrivacyPage />);
    const sent = screen.getByRole('region', { name: 'What leaves this device' });
    for (const provider of PROVIDERS) {
      expect(within(sent).getByText(provider.name)).toBeVisible();
      const { href, linkText } = AI_COMPANY_POLICIES[provider.id];
      const link = within(sent).getByRole('link', { name: `${linkText} (opens in a new tab)` });
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('opens every outside link in a new tab without giving it access to this page', () => {
    const { container } = render(<PrivacyPage />);
    const outside = Array.from(container.querySelectorAll('a')).filter((a) =>
      /^https?:/.test(a.getAttribute('href') ?? ''),
    );
    expect(outside.length).toBeGreaterThanOrEqual(PROVIDERS.length + 2);
    for (const link of outside) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('describes the free trial only when this build has the free key', () => {
    delete process.env.NEXT_PUBLIC_FREE_KEY_ENC;
    const { unmount } = render(<PrivacyPage />);
    expect(screen.queryByText(/Try it free/)).not.toBeInTheDocument();
    unmount();

    process.env.NEXT_PUBLIC_FREE_KEY_ENC = encodeFreeKey('AIza-test-key-for-the-privacy-page');
    render(<PrivacyPage />);
    const sent = screen.getByRole('region', { name: 'What leaves this device' });
    expect(within(sent).getByText(/free questions and plans go to Google/)).toBeVisible();
    const parents = screen.getByRole('region', { name: 'For parents and carers' });
    expect(within(parents).getByText(/needs no grown-up/)).toBeVisible();
  });

  it('uses only decorative icons at 28px or larger', () => {
    const { container } = render(<PrivacyPage />);
    for (const icon of Array.from(container.querySelectorAll('img'))) {
      expect(icon).toHaveAttribute('alt', '');
      expect(Number(icon.getAttribute('width'))).toBeGreaterThanOrEqual(28);
    }
  });
});
