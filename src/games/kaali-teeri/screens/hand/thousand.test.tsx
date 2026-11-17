import { act } from '@testing-library/react';
import { kitGame } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import { renderKt } from '@/games/kaali-teeri/test/render';
import Summary from './Summary';

/** Riya (seat 0) bids 250 and her team sweeps four hands: 250 each time, so the fourth takes her to 1,000. */
const crossing = (start: number) =>
  kitGame({
    id: 't',
    players: ['Riya', 'Aarav', 'Meera', 'Kabir'],
    start,
    hands: [0, 1, 2, 3].map(() => ({ bidder: 0, bid: 250, team: 250 })),
  });

// Motion on for this file (Framer reads the preference once, so it can't share a file with reduced-motion tests).
beforeEach(() => {
  window.matchMedia = (q: string) =>
    ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
});
afterEach(() => vi.useRealTimers());

describe('reaching 1,000 on the hand summary', () => {
  it('turns the total gold and stamps 1000 on it once it has counted up', () => {
    vi.useFakeTimers();
    // The last hand was confirmed just now, so the summary counts up.
    renderKt(<Summary />, crossing(Date.now() - 20 * 60_000));
    const cell = () => document.querySelector('[data-thousand]');
    expect(cell()?.getAttribute('data-thousand')).toBe('counting');
    // A sweep first holds its beat (900ms), then the stages count up (to 1.5s).
    act(() => vi.advanceTimersByTime(2500));
    expect(cell()?.getAttribute('data-thousand')).toBe('gold');
    expect(cell()?.textContent).toContain('1000');
  });

  it('shows it settled when the summary is reopened later', () => {
    renderKt(<Summary />, crossing(Date.now() - 60 * 60_000));
    expect(document.querySelector('[data-thousand="gold"]')).not.toBeNull();
  });
});
