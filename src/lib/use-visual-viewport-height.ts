import { useEffect } from 'react';

/**
 * Keeps the CSS variable `--app-height` equal to the part of the screen the player can actually
 * see. On iPhones the on-screen keyboard shrinks the visual viewport without resizing the page,
 * so `100dvh` alone would leave the message box hidden behind the keyboard.
 */
export function useVisualViewportHeight(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;

    function update(): void {
      root.style.setProperty('--app-height', `${viewport?.height ?? window.innerHeight}px`);
      // iOS pans the page to reveal a focused input, which would carry the header off-screen.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    }

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      root.style.removeProperty('--app-height');
    };
  }, []);
}
