import { act, render, screen, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import type { Game, Outcome } from '@/games/kachuful/domain';
import { kitGame } from '@/games/kachuful/domain/__fixtures__/kit';
import { AppProvider, useApp } from '@/games/kachuful/state/store';
import { Summary, climbFor, climbOrders, comeback, landOrder, soleMiss } from './Summary';

const ranked = (...rows: [string, number][]) => rows.map(([id, rank]) => ({ p: { id }, rank }));

describe('comeback: two or more places up, into sole first', () => {
  it('last to first among five passes each rival in turn', () => {
    const prev = ranked(['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5]);
    const cur = ranked(['e', 1], ['a', 2], ['b', 3], ['c', 4], ['d', 5]);
    expect(comeback(prev, cur)).toBe('e');
    expect(climbFor(prev, cur)).toEqual([
      ['a', 'b', 'c', 'e', 'd'],
      ['a', 'b', 'e', 'c', 'd'],
      ['a', 'e', 'b', 'c', 'd'],
      ['e', 'a', 'b', 'c', 'd'],
    ]);
  });

  it('third to first takes two steps', () => {
    const prev = ranked(['a', 1], ['b', 2], ['c', 3]);
    const cur = ranked(['c', 1], ['a', 2], ['b', 3]);
    expect(climbFor(prev, cur)).toEqual([
      ['a', 'c', 'b'],
      ['c', 'a', 'b'],
    ]);
  });

  it('ends on the final order even when the rivals changed places among themselves', () => {
    expect(climbOrders(['a', 'b', 'c', 'd'], ['d', 'b', 'a', 'c'], 'd')).toEqual([
      ['a', 'b', 'd', 'c'],
      ['a', 'd', 'b', 'c'],
      ['d', 'b', 'a', 'c'],
    ]);
  });

  it('second to first is an ordinary lead change', () => {
    const prev = ranked(['a', 1], ['b', 2], ['c', 3]);
    const cur = ranked(['b', 1], ['a', 2], ['c', 3]);
    expect(comeback(prev, cur)).toBeNull();
    expect(climbFor(prev, cur)).toEqual([]);
  });

  it('is not a comeback from first-equal, even from the third row of a tie', () => {
    const prev = ranked(['a', 1], ['b', 1], ['c', 1], ['d', 4]);
    const cur = ranked(['c', 1], ['a', 2], ['b', 2], ['d', 4]);
    expect(climbFor(prev, cur)).toEqual([]);
  });

  it('is not a comeback when first place is shared afterwards', () => {
    const prev = ranked(['a', 1], ['b', 2], ['c', 3]);
    const cur = ranked(['a', 1], ['c', 1], ['b', 3]);
    expect(climbFor(prev, cur)).toEqual([]);
  });

  it('counts places by rank: second-equal to first is one place, whatever the row', () => {
    const prev = ranked(['a', 1], ['b', 2], ['c', 2]);
    const cur = ranked(['c', 1], ['a', 2], ['b', 3]);
    expect(climbFor(prev, cur)).toEqual([]);
  });
});

describe('everyone but one made it', () => {
  const players = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i }));
  const results = (n: number, missed: number[]): Record<string, Outcome> =>
    Object.fromEntries(
      players(n).map((p, i) => [p.id, missed.includes(i) ? 'missed' : 'made'] as const),
    );

  it('five players, one miss: names the one who missed', () => {
    expect(soleMiss(players(5), results(5, [3]))?.name).toBe('P3');
  });

  it('five players, two misses: nothing', () => {
    expect(soleMiss(players(5), results(5, [1, 3]))).toBeNull();
  });

  it('three players, one miss: nothing, it happens too often', () => {
    expect(soleMiss(players(3), results(3, [0]))).toBeNull();
  });

  it('the made players land in bid order, and only on such a round', () => {
    const g = kitGame({ id: 'k', players: ['a', 'b', 'c', 'd', 'e'], rounds: [], start: 0 });
    // Bidding starts at seat 2 and seat 3 missed.
    expect(landOrder(g.players, [2, 3, 4, 0, 1], results(5, [3]))).toEqual({
      p2: 0,
      p4: 1,
      p0: 2,
      p1: 3,
    });
    expect(landOrder(g.players, [2, 3, 4, 0, 1], results(5, [1, 3]))).toEqual({});
  });
});

/** Five players; before the last round Eve is last, then she alone bids big and makes it while Asha misses. */
function comebackGame(): Game {
  const g = kitGame({
    id: 'cb',
    players: ['a', 'b', 'c', 'd', 'e'],
    names: ['Asha', 'Bela', 'Chirag', 'Dev', 'Eve'],
    rounds: [{ made: [true, true, true, true, false] }, { made: [false, true, true, true, true] }],
    start: 1_000,
  });
  g.rounds.pop();
  g.ui = { view: 'summary', bidIdx: 0 };
  const [p0, p1, p2, p3, p4] = g.players.map((p) => p.id);
  // 40, 30, 20, 10, −10 and then 30, 40, 30, 20, 80.
  g.rounds[0].bids = { [p0]: 4, [p1]: 3, [p2]: 2, [p3]: 1, [p4]: 1 };
  g.rounds[1].bids = { [p0]: 1, [p1]: 1, [p2]: 1, [p3]: 1, [p4]: 9 };
  return g;
}

describe('the phone summary plays a comeback', () => {
  // Motion on for this file: Framer Motion reads the preference once.
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

  /** Opens the summary the way confirming a round does: with the sequence still to play. */
  function Host({ gone }: { gone?: boolean }) {
    const { state, actions } = useApp();
    const [open, setOpen] = useState(false);
    useEffect(() => {
      actions.setSumAnim(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- once
    }, []);
    useEffect(() => {
      if (state.sumAnim) setOpen(true);
    }, [state.sumAnim]);
    return open && !gone ? <Summary /> : <p data-testid="anim">{String(state.sumAnim)}</p>;
  }
  const tree = (gone?: boolean) => (
    <AppProvider initial={{ game: comebackGame(), screen: 'round', undo: [], corrupt: false }}>
      <Host gone={gone} />
    </AppProvider>
  );
  const order = () => {
    const rows = within(screen.getByRole('region', { name: 'Standings' }));
    return ['Asha', 'Bela', 'Chirag', 'Dev', 'Eve']
      .map((n) => [n, rows.getByText(n)] as const)
      .sort(([, a], [, b]) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )
      .map(([n]) => n);
  };
  const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it('Eve passes one rival every 170ms from the reorder stage, and the later stages wait for her', () => {
    vi.useFakeTimers();
    render(tree());
    expect(order()).toEqual(['Asha', 'Bela', 'Chirag', 'Dev', 'Eve']);
    tick(1849);
    expect(order()).toEqual(['Asha', 'Bela', 'Chirag', 'Dev', 'Eve']);
    tick(1);
    expect(order()).toEqual(['Asha', 'Bela', 'Chirag', 'Eve', 'Dev']);
    tick(170);
    expect(order()).toEqual(['Asha', 'Bela', 'Eve', 'Chirag', 'Dev']);
    tick(170);
    expect(order()).toEqual(['Asha', 'Eve', 'Bela', 'Chirag', 'Dev']);
    tick(170);
    // 2360ms: the final order, ties in seat order.
    expect(order()).toEqual(['Eve', 'Bela', 'Asha', 'Chirag', 'Dev']);
    const std = screen.getByRole('region', { name: 'Standings' });
    // The leader's ring arrives 600ms after the last step (2450 + 510), not at 2450.
    tick(599);
    expect(std.querySelector('.ring-1')).toBeNull();
    tick(1);
    expect(std.querySelector('.ring-1')).not.toBeNull();
  });

  it('the sequence ends 510ms later than usual and leaves nothing running', () => {
    vi.useFakeTimers();
    const { rerender } = render(tree());
    tick(3909);
    rerender(tree(true));
    expect(screen.getByTestId('anim')).toHaveTextContent('true');
    rerender(tree());
    tick(3909);
    rerender(tree(true));
    expect(screen.getByTestId('anim')).toHaveTextContent('true');
    rerender(tree());
    tick(3910);
    rerender(tree(true));
    expect(screen.getByTestId('anim')).toHaveTextContent('false');
  });

  it('leaving mid-climb clears every timer of the sequence', () => {
    vi.useFakeTimers();
    const { rerender } = render(tree());
    tick(2100);
    const during = vi.getTimerCount();
    rerender(tree(true));
    // Stages 3 to 5, the last climb step and the end of the sequence were still pending.
    expect(during - vi.getTimerCount()).toBeGreaterThanOrEqual(5);
    tick(5000);
    expect(screen.getByTestId('anim')).toHaveTextContent('true');
  });

  it('says who missed once the deltas land, and lands the made players in bid order', () => {
    vi.useFakeTimers();
    render(tree());
    const line = screen.getByRole('status');
    expect(line).toBeEmptyDOMElement();
    // Eve's total is also a signed number (−10), so the deltas are picked out by their pill.
    const deltas = () =>
      within(screen.getByRole('region', { name: 'Standings' }))
        .queryAllByText(/^[+−-]\d+$/)
        .filter((e) => e.className.includes('rounded-xl')).length;
    tick(350);
    expect(line).toHaveTextContent('Everyone but Asha made it');
    // The miss and the first made player land together; the other three follow 60ms apart.
    expect(deltas()).toBe(2);
    tick(60);
    expect(deltas()).toBe(3);
    tick(120);
    expect(deltas()).toBe(5);
  });
});
