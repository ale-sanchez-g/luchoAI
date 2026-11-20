import fs from 'fs';
import path from 'path';
import { PROVIDERS } from '@/lib/providers';
import { STORAGE_KEYS } from '@/lib/storage';
import {
  AI_COMPANY_POLICIES,
  CONTROLS,
  PRIVACY_UPDATED,
  SHORT_VERSION,
  parentPoints,
  savedItems,
} from '@/lib/privacy';

describe('privacy page content', () => {
  it('describes every key LuchoAI saves in the browser, exactly once', () => {
    // Adding a storage key fails here until the privacy page says what it holds.
    const described = savedItems(true).flatMap((item) => item.keys);
    expect([...described].sort()).toEqual(Object.values(STORAGE_KEYS).sort());
  });

  it('only talks about the free trial in builds that have it', () => {
    const withoutTrial = JSON.stringify([savedItems(false), parentPoints(false)]);
    expect(withoutTrial).not.toMatch(/Try it free|free tries|free questions/i);
    const keys = savedItems(false).flatMap((item) => item.keys);
    expect(keys).not.toContain(STORAGE_KEYS.FREE_QUESTIONS_USED);
    expect(keys).not.toContain(STORAGE_KEYS.FREE_PLANS_USED);

    const withTrial = JSON.stringify([savedItems(true), parentPoints(true)]);
    expect(withTrial).toMatch(/Try it free/);
  });

  it('links every AI company to its own rules over https', () => {
    for (const provider of PROVIDERS) {
      const policy = AI_COMPANY_POLICIES[provider.id];
      expect(policy.href).toMatch(/^https:\/\/[^/]+\//);
      expect(policy.linkText.length).toBeGreaterThan(0);
    }
  });

  it('dates the page with the same day in both forms', () => {
    const date = new Date(`${PRIVACY_UPDATED.iso}T12:00:00Z`);
    const label = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    expect(label).toBe(PRIVACY_UPDATED.label);
  });

  it('names the buttons players really have for deleting things', () => {
    const text = JSON.stringify(CONTROLS);
    const source = (file: string): string =>
      fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    for (const [label, file] of [
      ['Clear history', 'components/WellbeingCheckIn.tsx'],
      ['Switch', 'app/coach/page.tsx'],
    ]) {
      expect(text).toContain(`“${label}”`);
      expect(source(file)).toMatch(new RegExp(`>\\s*${label}\\s*<`));
    }
  });

  it('keeps the short version short', () => {
    for (const point of SHORT_VERSION) {
      expect(point.text.split(/(?<=\.) /).length).toBeLessThanOrEqual(2);
    }
  });
});
