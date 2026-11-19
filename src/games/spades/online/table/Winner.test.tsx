import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Seat, SpHand, SpPublic } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { createFake } from './__fixtures__/fakeTable';
import { Winner } from './Winner';

vi.mock('@/games/spades/progress/OnlineReel', () => ({ default: () => null }));

// Seats 0 and 2 (Riya, Dev) bid 4 + 3 and take 9: made. Seats 1 and 3 take 4 of a 6: set.
const hand: SpHand = {
  index: 0,
  dealer: 0,
  bids: [4, 3, 3, 3],
  blind: [false, false, false, false],
  teamTricks: [9, 4],
  nilTricks: [null, null, null, null],
  phase: 'done',
};
const names = ['Riya', 'Arjun', 'Dev', 'Meera'];

const show = (me: Seat | null, winner: 'a' | 'b' | 'draw', id = 't-1') => {
  const table: SpPublic = {
    ...createFake().state,
    id,
    status: 'finished',
    history: [hand],
    result: { winner, endedBy: 'target' },
  };
  render(
    <Winner
      table={table}
      me={me}
      names={names}
      faces={[null, null, null, null]}
      host={false}
      act={vi.fn()}
      onHome={vi.fn()}
      onToast={vi.fn()}
    />,
  );
};
const title = () => screen.getByRole('heading', { level: 1 }).textContent ?? '';
const fill = (line: string, w: string, l: string) => line.replaceAll('{w}', w).replaceAll('{l}', l);

describe('the online winner screen', () => {
  it('picks the title from the won pool for a winner, naming their own pair', () => {
    show(0, 'a');
    expect(s.winner.lines.won.map((x) => fill(x, 'You & Dev', 'Arjun & Meera'))).toContain(title());
    expect(screen.getByText(/^You & Dev won \d+ to −?\d+/)).toBeInTheDocument();
  });

  it('picks from the lost pool for the losing pair, and says plainly who won', () => {
    show(1, 'a');
    expect(s.winner.lines.lost.map((x) => fill(x, 'Riya & Dev', 'You & Arjun'))).toContain(title());
    expect(screen.getByText(/^Riya & Dev won \d+ to −?\d+/)).toBeInTheDocument();
  });

  it('names both pairs for someone watching', () => {
    show(null, 'b');
    expect(s.winner.lines.watch.map((x) => fill(x, 'Arjun & Meera', 'Riya & Dev'))).toContain(
      title(),
    );
  });

  it('picks the same title again for the same table, and varies across tables', () => {
    show(0, 'a', 'same');
    const first = title();
    document.body.innerHTML = '';
    show(0, 'a', 'same');
    expect(title()).toBe(first);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      document.body.innerHTML = '';
      show(0, 'a', `table-${i}`);
      seen.add(title());
    }
    expect(seen.size).toBeGreaterThan(3);
  });
});
