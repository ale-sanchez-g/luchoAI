import { renderHook } from '@testing-library/react';
import { useVisualViewportHeight } from '@/lib/use-visual-viewport-height';

type Listener = () => void;

function mockViewport(height: number): {
  setHeight: (h: number) => void;
  fire: () => void;
  listeners: Listener[];
} {
  const listeners: Listener[] = [];
  const viewport = {
    height,
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
    removeEventListener: (_: string, fn: Listener) => {
      listeners.splice(listeners.indexOf(fn), 1);
    },
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  return {
    setHeight: (h) => {
      viewport.height = h;
    },
    fire: () => listeners.slice().forEach((fn) => fn()),
    listeners,
  };
}

const readHeight = (): string => document.documentElement.style.getPropertyValue('--app-height');

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
});

describe('useVisualViewportHeight', () => {
  it('sets --app-height to the visible height and follows the keyboard', () => {
    const vp = mockViewport(667);
    renderHook(() => useVisualViewportHeight());
    expect(readHeight()).toBe('667px');

    vp.setHeight(377);
    vp.fire();
    expect(readHeight()).toBe('377px');
  });

  it('cleans up its listeners and variable on unmount', () => {
    const vp = mockViewport(667);
    const { unmount } = renderHook(() => useVisualViewportHeight());
    expect(vp.listeners).toHaveLength(2);

    unmount();
    expect(vp.listeners).toHaveLength(0);
    expect(readHeight()).toBe('');
  });

  it('does nothing when the browser has no visual viewport', () => {
    expect(() => renderHook(() => useVisualViewportHeight())).not.toThrow();
    expect(readHeight()).toBe('');
  });
});
