import { describe, expect, it } from 'vitest';
import { scoreHand } from '@/games/spades/domain/scoring';
import type { SpHand } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { handHeadline } from './handHeadline';
import { fillLine, pickLine } from './pickLine';

describe('pickLine', () => {
  it('gives the same line for the same seed, on any phone', () => {
    const pool = s.winner.lines.won;
    expect(pickLine(pool, 'table-1:3')).toBe(pickLine(pool, 'table-1:3'));
  });

  it('reaches every line of a pool across seeds', () => {
    for (const pool of [s.winner.lines.won, s.winner.lines.lost, s.winner.lines.watch]) {
      const seen = new Set(Array.from({ length: 400 }, (_, i) => pickLine(pool, `t${i}:${i % 7}`)));
      expect(seen.size).toBe(pool.length);
    }
  });

  it('mixes the classic, Gen-Z and Desi lines in one pool', () => {
    const won = s.winner.lines.won;
    expect(won).toContain('{w} win!');
    expect(won).toContain('W secured 🏆');
    expect(won).toContain('Full paisa vasool');
  });

  it('fills {w} and {l} and leaves an unknown mark alone', () => {
    expect(fillLine('{w} beat {l} {x}', { w: 'You & Dev', l: 'Arjun & Meera' })).toBe(
      'You & Dev beat Arjun & Meera {x}',
    );
  });
});

const hand = (bids: number[], teamTricks: [number, number]): SpHand => ({
  index: 0,
  dealer: 0,
  bids,
  blind: [false, false, false, false],
  teamTricks,
  nilTricks: [null, null, null, null],
  phase: 'done',
});
const fresh = { a: 0, b: 0 };

describe('handHeadline', () => {
  it('says made for a team that took its contract and set for one that missed', () => {
    const h = hand([4, 3, 3, 2], [5, 8]);
    expect(s.summary.lines.made).toContain(handHeadline(h, fresh, 'b', 'x')!);
    const setLine = handHeadline(h, fresh, 'a', 'x')!;
    expect(setLine).toContain(s.sign(scoreHand(h, fresh).a.points));
    expect(setLine).not.toContain('{pts}');
  });

  it('calls a Boston for the team that swept and against the one that was swept', () => {
    const h = hand([4, 3, 3, 2], [13, 0]);
    expect(s.summary.lines.boston).toContain(handHeadline(h, fresh, 'a', 'x')!);
    expect(s.summary.lines.bostonAgainst).toContain(handHeadline(h, fresh, 'b', 'x')!);
  });

  it('has no line when both partners bid Nil', () => {
    expect(handHeadline(hand([0, 3, 0, 2], [4, 9]), fresh, 'a', 'x')).toBeNull();
  });
});
