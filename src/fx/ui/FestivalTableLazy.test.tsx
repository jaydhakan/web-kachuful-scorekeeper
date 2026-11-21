import { render, waitFor } from '@testing-library/react';
import { FestivalTableLazy } from './FestivalTableLazy';

describe('the festival table, loaded on the day', () => {
  // The test setup reduces motion everywhere; the dressing needs motion on.
  const base = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (q: string) => ({ ...base(q), matches: false }) as MediaQueryList;
  });
  afterEach(() => {
    window.matchMedia = base;
    vi.useRealTimers();
  });

  it('dresses the felt on a festival day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2027-10-29T20:00:00+05:30'));
    const { container } = render(<FestivalTableLazy />);
    await waitFor(() => expect(container.querySelector('[data-festival="diwali"]')).not.toBeNull());
  });

  it('renders and fetches nothing on an ordinary day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2027-06-02T20:00:00+05:30'));
    const { container } = render(<FestivalTableLazy />);
    expect(container).toBeEmptyDOMElement();
  });
});
