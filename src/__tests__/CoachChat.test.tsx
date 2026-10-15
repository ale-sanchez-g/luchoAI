import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CoachChat from '@/components/CoachChat';
import { MAX_MESSAGE_LENGTH } from '@/lib/guardrails';
import type { AIProviderConfig } from '@/types';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => children,
}));
jest.mock('@/lib/claude', () => ({
  sendMessage: jest.fn().mockResolvedValue('Scan before the ball arrives.'),
}));
jest.mock('@/lib/context', () => ({
  loadContextBatches: jest.fn().mockResolvedValue([]),
}));

const CONFIG: AIProviderConfig = {
  provider: 'anthropic',
  model: 'claude-opus-4-8',
  apiKey: 'sk-ant-test',
};

const PLACEHOLDER = 'Ask your coach about football...';

const scrollIntoView = jest.fn();

beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  global.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => 900,
  });
});

describe('CoachChat on a small phone', () => {
  it('scrolls the message list, never the page, so the header stays on screen', async () => {
    const { container } = render(<CoachChat providerConfig={CONFIG} playerProfile={null} />);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: 'How do I get better?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(screen.getByText(/Scan before the ball/)).toBeInTheDocument());

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(container.querySelector('.overflow-y-auto')).toHaveProperty('scrollTop', 900);
  });

  it('uses a 16px message box so iPhones do not zoom in on focus', () => {
    render(<CoachChat providerConfig={CONFIG} playerProfile={null} />);
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveClass('text-base');
  });

  it('lets the message list shrink instead of growing the page', () => {
    const { container } = render(<CoachChat providerConfig={CONFIG} playerProfile={null} />);
    expect(container.querySelector('.overflow-y-auto')).toHaveClass('min-h-0', 'flex-1');
  });
});

describe('CoachChat guardrails', () => {
  it('caps a message at the guardrail length, too short for a long jailbreak script', async () => {
    await act(async () => {
      render(<CoachChat providerConfig={CONFIG} playerProfile={null} />);
    });
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveAttribute(
      'maxlength',
      String(MAX_MESSAGE_LENGTH),
    );
  });
});
