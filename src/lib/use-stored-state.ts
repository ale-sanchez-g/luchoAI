import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface StoredState<T> {
  value: T;
  loaded: boolean;
}

/**
 * State that starts from a value saved in the browser (`localStorage`).
 *
 * The site is a static export: its HTML is built where `localStorage` does not exist, so the first
 * render must use `fallback` to match that HTML. The saved value is read once, straight after the
 * page hydrates. Returns `[value, setValue, loaded]`; `loaded` turns true once the saved value has
 * been read (or `setValue` was called), so pages can hold back until they know what is saved.
 *
 * This is the one place the app sets state from an effect on purpose. Components use this hook
 * rather than copying the pattern, so the lint rule keeps checking every other effect.
 */
export function useStoredState<T>(
  read: () => T,
  fallback: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [state, setState] = useState<StoredState<T>>({ value: fallback, loaded: false });
  // Keep the first `read` so an inline arrow does not re-run the effect on every render.
  const [readOnce] = useState(() => read);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read storage after hydration
    setState({ value: readOnce(), loaded: true });
  }, [readOnce]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setState((current) => ({
      value: next instanceof Function ? next(current.value) : next,
      loaded: true,
    }));
  }, []);

  return [state.value, setValue, state.loaded];
}
