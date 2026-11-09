/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { useStoredState } from '@/lib/use-stored-state';

describe('useStoredState during the static build', () => {
  it('renders the fallback without touching storage, so the HTML matches the first render', () => {
    const read = jest.fn(() => 'saved');
    function Probe() {
      const [value, , loaded] = useStoredState(read, 'fallback');
      return <p>{`${value}:${loaded}`}</p>;
    }

    expect(renderToStaticMarkup(<Probe />)).toBe('<p>fallback:false</p>');
    expect(read).not.toHaveBeenCalled();
  });
});
