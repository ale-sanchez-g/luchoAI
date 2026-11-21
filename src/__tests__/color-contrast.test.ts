/**
 * WCAG 2.1 AA colour contrast for the colour pairs LuchoAI paints (success criteria 1.4.3 and
 * 1.4.11): text needs 4.5:1 against its background; large text (24px, or 18.66px bold) and marks
 * that carry meaning, such as focus rings, need 3:1. The colours come from tailwind.config.ts and
 * Tailwind's palette, so changing a token re-checks every pair that uses it. e2e/wcag-aa.mjs holds
 * the built pages to the same floor in a real browser.
 */
import fs from 'fs';
import path from 'path';
import palette from 'tailwindcss/colors';
import tailwindConfig from '../../tailwind.config';

const ROOT = path.resolve(__dirname, '../..');
const BRAND = tailwindConfig.theme?.extend?.colors as Record<string, string>;
const SCALES = palette as unknown as Record<string, Record<string, string>>;

const FLOOR = { text: 4.5, 'large text': 3, mark: 3 } as const;

interface Pair {
  text: string;
  on: string;
  kind: keyof typeof FLOOR;
  where: string;
}

/**
 * A Tailwind colour name as hex. `name/10` is that colour at 10% over white, as the app has it.
 */
function tone(name: string): string {
  const [base, percent] = name.split('/');
  if (percent) return over(tone(base), Number(percent) / 100, '#ffffff');
  if (base === 'white') return '#ffffff';
  if (BRAND[base]) return BRAND[base];
  const [, scale, step] = /^([a-z]+)-(\d+)$/.exec(base) ?? [];
  const hex = scale ? SCALES[scale]?.[step] : undefined;
  if (!hex) throw new Error(`Unknown colour ${name}`);
  return hex;
}

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function over(top: string, alpha: number, base: string): string {
  const under = channels(base);
  const mixed = channels(top).map((t, i) => Math.round(t * alpha + under[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  // WCAG 2.1's own threshold; 2.2 writes 0.04045, and no 8-bit value falls between the two.
  const linear = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const [r, g, b] = channels(hex).map((c) => linear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio, 1 to 21. */
function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const ratioOf = (pair: Pair): number => contrast(tone(pair.text), tone(pair.on));

const PAIRS: Pair[] = [
  { text: 'gold', on: 'pitch-dark', kind: 'text', where: 'Header: the page you are on' },
  {
    text: 'gray-900',
    on: 'gold',
    kind: 'text',
    where: 'Gold hero button, step numbers and the tour play button',
  },
  { text: 'gray-900', on: 'yellow-400', kind: 'text', where: 'Gold hero button on hover' },
  { text: 'pitch-dark', on: 'gold', kind: 'text', where: 'Game IQ GO! button' },
  { text: 'pitch-dark', on: 'yellow-400', kind: 'text', where: 'Game IQ GO! button on hover' },
  { text: 'white', on: 'pitch-green', kind: 'text', where: 'Primary buttons, your chat messages' },
  { text: 'pitch-green', on: 'white', kind: 'text', where: 'Links and secondary buttons' },
  { text: 'pitch-green', on: 'gray-50', kind: 'text', where: 'Links on the page background' },
  { text: 'white', on: 'pitch-dark', kind: 'text', where: 'Header, dark cards and sections' },
  { text: 'pitch-dark', on: 'white', kind: 'text', where: 'Section titles' },
  { text: 'pitch-dark', on: 'red-50', kind: 'text', where: 'Error messages' },
  { text: 'green-50', on: 'pitch-dark', kind: 'text', where: 'Body text in the grown-ups section' },
  { text: 'green-100', on: 'pitch-dark', kind: 'text', where: 'Dark cards, helplines, Game IQ' },
  { text: 'green-200', on: 'pitch-dark', kind: 'text', where: 'Header: the other page links' },
  { text: 'yellow-300', on: 'pitch-dark', kind: 'text', where: 'Links on dark sections' },
  { text: 'gray-500', on: 'white', kind: 'text', where: 'Secondary text on cards' },
  { text: 'gray-500', on: 'gray-50', kind: 'text', where: 'Secondary text on the page' },
  { text: 'gray-600', on: 'white', kind: 'text', where: 'Section intros' },
  { text: 'gray-700', on: 'gray-50', kind: 'text', where: 'Card body text on muted cards' },
  { text: 'gray-800', on: 'gray-100', kind: 'text', where: 'Coach chat messages' },
  { text: 'gray-900', on: 'white', kind: 'text', where: 'Headings' },
  { text: 'green-900', on: 'green-100', kind: 'text', where: '"No AI key needed" badge' },
  { text: 'green-900', on: 'green-50', kind: 'text', where: 'Success cards' },
  { text: 'amber-900', on: 'amber-50', kind: 'text', where: 'Notice cards' },
  { text: 'amber-900', on: 'amber-100', kind: 'text', where: 'Game IQ answer letters' },
  { text: 'amber-800', on: 'amber-100', kind: 'text', where: 'Small amber badges' },
  { text: 'blue-900', on: 'blue-50', kind: 'text', where: 'Information cards' },
  { text: 'red-700', on: 'white', kind: 'text', where: 'Danger text' },
  { text: 'red-800', on: 'white', kind: 'text', where: 'Danger headings' },
  { text: 'white', on: 'red-600', kind: 'text', where: 'Delete-everything button' },
  { text: 'pitch-green', on: 'white', kind: 'mark', where: 'Focus ring' },
  { text: 'white', on: 'pitch-dark', kind: 'mark', where: 'Focus ring on dark grounds' },
  { text: 'gray-900', on: 'pitch-green', kind: 'mark', where: 'Outline of YOU on the pitch' },
];

// Pairs that were below the floor before this test was added (e2e/wcag-aa.mjs lists the same
// ones on the real pages). Each must stay below it until fixed: then move it up into PAIRS.
const KNOWN_GAPS: Pair[] = [
  { text: 'gray-400', on: 'white', kind: 'text', where: 'AI key set-up: the hint under the box' },
  { text: 'gray-400', on: 'gray-100', kind: 'text', where: 'Coach chat: time on a coach message' },
  { text: 'green-200', on: 'pitch-green', kind: 'text', where: 'Coach chat: time on your message' },
  { text: 'pitch-green', on: 'pitch-green/10', kind: 'text', where: 'Coach chat: "Switch"' },
  { text: 'gray-400', on: 'white', kind: 'mark', where: "This week's games: the ▾ on each game" },
];

describe('WCAG 2.1 AA colour contrast', () => {
  it.each(PAIRS.map((p) => [`${p.text} on ${p.on} (${p.where})`, p] as const))(
    '%s',
    (_name, pair) => {
      expect(ratioOf(pair)).toBeGreaterThanOrEqual(FLOOR[pair.kind]);
    },
  );

  it.each(KNOWN_GAPS.map((p) => [`${p.text} on ${p.on} (${p.where})`, p] as const))(
    'known gap, still below the floor: %s',
    (_name, pair) => {
      expect(ratioOf(pair)).toBeLessThan(FLOOR[pair.kind]);
    },
  );

  it('works the ratio out as WCAG 2.1 does', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBe(1);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrast('#f59e0b', '#0f5a2b')).toBeCloseTo(3.88, 2);
    expect(tone('pitch-green/10')).toBe('#e8f2ec');
  });
});

describe('gold is one colour', () => {
  it.each(['src/components/PitchDiagram.tsx', 'src/components/DrillDiagram.tsx'])(
    '%s draws YOU in the brand gold',
    (file) => {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(/\byou: '(#[0-9a-f]{6})'/.exec(source)?.[1]).toBe(tone('gold'));
    },
  );
});
