import { act, render, renderHook, screen } from '@testing-library/react';
import { useStoredState } from '@/lib/use-stored-state';

describe('useStoredState', () => {
  it('reads the saved value once the page has loaded', () => {
    const { result } = renderHook(() => useStoredState(() => 'saved', 'fallback'));
    const [value, , loaded] = result.current;
    expect(value).toBe('saved');
    expect(loaded).toBe(true);
  });

  it('reads storage only once, even when given a new arrow on every render', () => {
    const read = jest.fn(() => 1);
    const { rerender } = renderHook(() => useStoredState(() => read(), 0));
    rerender();
    rerender();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('lets the component update the value, including from the previous one', () => {
    const { result } = renderHook(() => useStoredState(() => 1, 0));
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(6);
  });

  it('keeps a stable setter so it can be passed to children and effects', () => {
    const { result, rerender } = renderHook(() => useStoredState(() => 1, 0));
    const first = result.current[1];
    rerender();
    expect(result.current[1]).toBe(first);
  });

  it('loads several saved values in the same render, never half loaded', () => {
    const seen: string[] = [];
    function Page() {
      const [config, , ready] = useStoredState<string | null>(() => 'key', null);
      const [profile] = useStoredState<string | null>(() => 'Lucho', null);
      seen.push(`${ready}:${config}:${profile}`);
      return <p>{ready ? `${config} ${profile}` : 'loading'}</p>;
    }

    render(<Page />);
    expect(screen.getByText('key Lucho')).toBeTruthy();
    expect(seen).toEqual(['false:null:null', 'true:key:Lucho']);
  });
});
