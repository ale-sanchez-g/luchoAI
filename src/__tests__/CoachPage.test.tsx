import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import CoachPage from '@/app/coach/page';
import { setProviderConfig } from '@/lib/storage';

jest.mock('next/navigation', () => ({
  usePathname: () => '/coach',
}));
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => children,
}));
jest.mock('@/lib/claude', () => ({
  sendMessage: jest.fn(),
}));
jest.mock('@/lib/context', () => ({
  loadContextBatches: jest.fn().mockResolvedValue([]),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  global.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

afterEach(() => localStorage.clear());

describe('CoachPage', () => {
  // WCAG 2.4.1 Bypass Blocks: screen-reader users jump past the header links to the chat by its
  // landmark or its heading. e2e/wcag-aa.mjs checks every page for the same in a browser.
  it('puts the chat in a main landmark that starts with a heading', async () => {
    setProviderConfig({ provider: 'anthropic', model: 'claude-opus-4-8', apiKey: 'sk-ant-test' });
    render(<CoachPage />);

    const main = await screen.findByRole('main');
    const heading = within(main).getByRole('heading', { level: 1, name: 'Chat with your coach' });
    expect(main.firstElementChild).toBe(heading);
    expect(within(main).getByRole('region', { name: 'Messages' })).toBeInTheDocument();
    expect(within(main).getByRole('textbox', { name: 'Message to your coach' })).toBeVisible();
    expect(screen.getByRole('banner')).not.toContainElement(main);
  });
});
