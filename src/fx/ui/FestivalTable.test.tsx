import { render } from '@testing-library/react';
import { FestivalTable } from './FestivalTable';

describe('the festival table', () => {
  // The test setup reduces motion everywhere; this one needs motion on.
  const base = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (q: string) => ({ ...base(q), matches: false }) as MediaQueryList;
  });
  afterEach(() => {
    window.matchMedia = base;
  });

  it('rings the felt with diyas on Diwali, hidden from screen readers', () => {
    const { container } = render(<FestivalTable now={Date.parse('2027-10-29T20:00:00+05:30')} />);
    const layer = container.querySelector('[data-festival="diwali"]')!;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.textContent).toBe('🪔'.repeat(8));
  });

  it('draws nothing on an ordinary day', () => {
    const { container } = render(<FestivalTable now={Date.parse('2027-06-02T20:00:00+05:30')} />);
    expect(container).toBeEmptyDOMElement();
  });
});
