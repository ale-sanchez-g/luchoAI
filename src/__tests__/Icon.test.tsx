import '@testing-library/jest-dom';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react';
import Icon from '@/components/Icon';
import { ICON_NAMES } from '@/lib/icons';

const ROOT = join(__dirname, '..', '..');
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
// An emoji written as an escape (\u{1F44B} or a surrogate pair) hides from the check above.
const ESCAPED_EMOJI = /\\u\{1F[0-9A-Fa-f]{3}\}|\\uD83[C-E]/;
// ✓ and ✗ are plain typographic marks, not emojis.
const ALLOWED = /[✓✗]/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('icon files', () => {
  it('ships an SVG for every icon name and nothing else', () => {
    const files = readdirSync(join(ROOT, 'public', 'icons')).sort();
    expect(files).toEqual(ICON_NAMES.map((n) => `${n}.svg`).sort());
  });

  it('keeps public/icons identical to the designer source in iconography/leaf', () => {
    for (const name of ICON_NAMES) {
      const served = readFileSync(join(ROOT, 'public', 'icons', `${name}.svg`), 'utf8');
      const source = readFileSync(join(ROOT, 'iconography', 'leaf', `${name}.svg`), 'utf8');
      expect(served).toBe(source);
    }
  });

  it('leaves no emoji in the app source', () => {
    const offenders = sourceFiles(join(ROOT, 'src')).filter((file) =>
      EMOJI.test(readFileSync(file, 'utf8').replace(ALLOWED, '')) ||
      ESCAPED_EMOJI.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

describe('Icon', () => {
  it('is decorative by default', () => {
    const { container } = render(<Icon name="ball" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('src', '/icons/ball.svg');
  });

  it('is named when a label is given', () => {
    const { getByRole } = render(<Icon name="trophy" label="Trophy" size={48} />);
    expect(getByRole('img', { name: 'Trophy' })).toHaveAttribute('width', '48');
  });
});
