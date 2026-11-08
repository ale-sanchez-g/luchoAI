/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout, { metadata, viewport } from '@/app/layout';

// next/font only works inside a Next.js build, so the test stands in a font with a known class.
jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'font-inter' }),
}));

describe('RootLayout', () => {
  it('wraps every page in an English document with the Inter font on the body', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>Page content</p>
      </RootLayout>,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<body class="font-inter"><p>Page content</p></body>');
  });

  it('names the app in the browser tab and when saved to a phone home screen', () => {
    expect(metadata.title).toBe('LuchoAI — Your Personal Football Coach');
    expect(metadata.description).toMatch(/young football players/);
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      title: 'LuchoAI',
      statusBarStyle: 'default',
    });
  });

  it('colours the browser bar pitch green', () => {
    expect(viewport.themeColor).toBe('#1a7f3c');
  });
});
