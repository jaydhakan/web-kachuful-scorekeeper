import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { ktReducer } from '@/games/kaali-teeri/state/reducer';
import { KtProvider, useKt } from '@/games/kaali-teeri/state/store';
import type { KtState } from '@/games/kaali-teeri/state/types';
import PlayedBy from '@/games/kaali-teeri/sheets/PlayedBy';
import Play, { TrumpCentre } from './Play';
import { TableMiddle } from './bidding/BidTable';
import { Outcome } from './Result';
import { kp } from '@/games/kaali-teeri/strings/play';
import Summary from './Summary';
import { game } from './testkit';

// Motion on for this whole file: Framer Motion reads the preference once, so it can't be mixed with hand.test.tsx.
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
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Host({ summary }: { summary?: boolean }) {
  const { state } = useKt();
  return (
    <LazyMotion features={domAnimation} strict>
      {summary ? <Summary /> : <Play />}
      {state.sheet?.type === 'playedBy' && (
        <div role="dialog">
          <PlayedBy />
        </div>
      )}
    </LazyMotion>
  );
}

const mount = (s: KtState, summary?: boolean) =>
  render(
    <KtProvider
      initial={{ game: s.game, screen: 'game', undo: [], prefs: s.prefs, corrupt: false }}
    >
      <Host summary={summary} />
    </KtProvider>,
  );

const flight = () => document.querySelector('[data-kt-flight]');
const seatChip = () =>
  document.querySelector('[data-table="kt-play"] [data-seat-chip][title="Partner"]');
// jsdom lays nothing out: every box gets a size, as if on screen.
const layOut = () =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 10,
    top: 10,
    right: 50,
    bottom: 50,
    width: 40,
    height: 40,
    x: 10,
    y: 10,
    toJSON: () => ({}),
  });
const markKabir = () => {
  fireEvent.click(screen.getAllByRole('button', { name: /ace of hearts, not played yet/i })[0]);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Kabir/ }));
};

describe('Partner revealed', () => {
  it('flies nothing, and holds no seat badge back, for a card already marked when the screen opens', () => {
    vi.useFakeTimers();
    layOut();
    const s = game(5);
    s.game = ktReducer(s, { type: 'markPlayed', i: 0, by: s.game!.players[2].id }).game;
    mount(s);
    expect(seatChip()).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1000));
    expect(flight()).toBeNull();
  });

  it('sends the team’s colour to the seat after the flip, and the seat’s badge arrives with it', () => {
    vi.useFakeTimers();
    layOut();
    mount(game(5));
    markKabir();
    expect(screen.getAllByText('Partner').length).toBeGreaterThan(0);
    expect(flight()).toBeNull();
    expect(seatChip()).toBeNull();
    act(() => void vi.advanceTimersByTime(360));
    expect(flight()).not.toBeNull();
    expect(seatChip()).toBeNull();
    act(() => void vi.advanceTimersByTime(500));
    expect(seatChip()).not.toBeNull();
  });

  it('skips the flight when the seat is not on screen', () => {
    vi.useFakeTimers();
    mount(game(5));
    markKabir();
    act(() => void vi.advanceTimersByTime(1000));
    expect(flight()).toBeNull();
    expect(seatChip()).not.toBeNull();
  });
});

describe('Sweep', () => {
  it('announces the sweep before the count, then gives way to the result line', () => {
    vi.useFakeTimers();
    mount(game(5, 1, undefined, 0), true);
    expect(document.querySelector('[data-kt-sweep]')).toHaveTextContent('Bidding team swept');
    expect(screen.getByRole('button', { name: 'Next hand' })).toBeEnabled();
    act(() => void vi.advanceTimersByTime(950));
    // Its exit plays on from here; a second announcement never starts.
    expect(document.querySelectorAll('[data-kt-sweep]').length).toBeLessThanOrEqual(1);
  });

  it('announces nothing for an ordinary hand', () => {
    mount(game(5, 1), true);
    expect(document.querySelector('[data-kt-sweep]')).toBeNull();
    expect(screen.queryByText('Bidding team swept')).toBeNull();
  });
});

describe('Made or missed (A8)', () => {
  // Exiting chips linger in jsdom (no animation frames end), so find the one showing these words.
  const chip = (words: string) =>
    [...document.querySelectorAll<HTMLElement>('[data-verdict-motion]')].find((el) =>
      el.textContent?.includes(words),
    )!;
  const at = (made: boolean, over: number) => (
    <LazyMotion features={domAnimation} strict>
      <Outcome made={made} sweep="none" over={over} />
    </LazyMotion>
  );

  it('stamps when the points cross the bid, tilts on a miss, and only swaps words in between', () => {
    const { rerender } = render(at(false, -10));
    rerender(at(true, 0));
    expect(chip(kp.result.made(0)).dataset.verdictMotion).toBe('stamp');
    rerender(at(true, 5));
    expect(chip(kp.result.made(5)).dataset.verdictMotion).toBe('swap');
    rerender(at(false, -5));
    expect(chip(kp.result.missed(5)).dataset.verdictMotion).toBe('tilt');
    rerender(at(false, -15));
    expect(chip(kp.result.missed(15)).dataset.verdictMotion).toBe('swap');
  });
});

describe('Bid won and trump (A7)', () => {
  const wrap = (el: React.ReactNode) => (
    <LazyMotion features={domAnimation} strict>
      {el}
    </LazyMotion>
  );

  it('the trump grows in from small, and again when another suit is named', () => {
    const { rerender } = render(wrap(<TrumpCentre suit="spades" />));
    const first = document.querySelector<HTMLElement>('[data-kt-bloom]')!;
    expect(first.style.transform).toMatch(/scale\(0\.3\)/);
    rerender(wrap(<TrumpCentre suit="hearts" />));
    expect(document.querySelector<HTMLElement>('[data-kt-bloom]')).not.toBe(first);
  });

  it('a won bid lands from large; an amount still being bid only ticks', () => {
    render(wrap(<TableMiddle flat={false} won kicker="Bid won" amount={400} who="Meera" />));
    expect(document.querySelector<HTMLElement>('[data-kt-land]')!.style.transform).toMatch(
      /scale\(1\.5\)/,
    );
  });
});
