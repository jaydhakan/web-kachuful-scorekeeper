import { describe, expect, it } from 'vitest';
import { newRound, resultsState, type Game, type Outcome } from './index';
import { blockedReason, canFinish, fits, tricksLeft } from './tricks';

// A round has exactly `cards` tricks. Made means the player won exactly their bid, so the bids of everyone
// marked Made can never add up to more than `cards`, and what is left over has to go to players who missed.
const ids = ['a', 'b', 'c', 'd', 'e'];
const five = { cards: 5, ids, bids: { a: 4, b: 2, c: 2, d: 2, e: 1 } };
const mark = (r: Record<string, Outcome>) => r;

describe('tricks left', () => {
  it('is the cards minus the bids of the players marked Made', () => {
    expect(tricksLeft(5, five.bids, {})).toBe(5);
    expect(tricksLeft(5, five.bids, mark({ a: 'made' }))).toBe(1);
    expect(tricksLeft(5, five.bids, mark({ a: 'made', b: 'missed' }))).toBe(1);
    expect(tricksLeft(5, five.bids, mark({ a: 'made', e: 'made' }))).toBe(0);
  });
});

describe('results that can add up to the tricks played', () => {
  const all = (o: Record<string, Outcome>) => fits(five.cards, five.ids, five.bids, o);

  it('rejects Made bids that add up to more than the cards (4 and 2 in a 5 card round)', () => {
    expect(all({ a: 'made', b: 'made', c: 'missed', d: 'missed', e: 'missed' })).toBe(false);
  });

  it('accepts the 4-bidder making it with the one trick left going to a player who missed', () => {
    expect(all({ a: 'made', b: 'missed', c: 'missed', d: 'missed', e: 'missed' })).toBe(true);
  });

  it('lets the 1-bidder make it as the last trick, with the others winning nothing', () => {
    expect(all({ a: 'made', e: 'made', b: 'missed', c: 'missed', d: 'missed' })).toBe(true);
  });

  it('needs the leftover tricks to go to players who did not win their own bid', () => {
    // 5 cards, 4 made, two missed players who both bid 1 and one trick left: 1 and 0 or 0 and 1 are both a made bid.
    const bids = { a: 1, b: 1, c: 4, d: 0 };
    expect(
      fits(5, ['a', 'b', 'c', 'd'], bids, { a: 'missed', b: 'missed', c: 'made', d: 'made' }),
    ).toBe(false);
  });

  it('gives a missed 0-bid player at least one trick', () => {
    const bids = { a: 2, b: 0, c: 0 };
    // 3 cards: a made leaves 1 trick, but two missed 0-bidders need at least one each.
    expect(fits(3, ['a', 'b', 'c'], bids, { a: 'made', b: 'missed', c: 'missed' })).toBe(false);
    expect(fits(3, ['a', 'b', 'c'], bids, { a: 'made', b: 'made', c: 'missed' })).toBe(true);
  });

  it('accepts everyone missing when the tricks can be shared out', () => {
    expect(all({ a: 'missed', b: 'missed', c: 'missed', d: 'missed', e: 'missed' })).toBe(true);
  });
});

describe('a partly filled round', () => {
  it('can still be finished while a choice is open', () => {
    expect(canFinish(5, ids, five.bids, { a: 'made' })).toBe(true);
    expect(canFinish(5, ids, five.bids, {})).toBe(true);
  });

  it('cannot be finished once the Made bids already pass the cards', () => {
    expect(canFinish(5, ids, five.bids, { a: 'made', b: 'made' })).toBe(false);
  });
});

describe('which choices to block, and why', () => {
  it('blocks Made for a bid that no longer fits, and says how many tricks are left', () => {
    expect(blockedReason(5, ids, five.bids, { a: 'made' }, 'b', 'made')).toEqual({
      kind: 'left',
      left: 1,
    });
  });

  it('still allows Made for a bid that fits, and Missed for anyone', () => {
    expect(blockedReason(5, ids, five.bids, { a: 'made' }, 'e', 'made')).toBeNull();
    expect(blockedReason(5, ids, five.bids, { a: 'made' }, 'b', 'missed')).toBeNull();
  });

  it('blocks nothing before anyone is marked', () => {
    for (const id of ids)
      for (const c of ['made', 'missed'] as const)
        expect(blockedReason(5, ids, five.bids, {}, id, c)).toBeNull();
  });

  it('gives a generic reason when it is not simply the tricks left', () => {
    const bids = { a: 2, b: 0, c: 0 };
    expect(
      blockedReason(3, ['a', 'b', 'c'], bids, { a: 'made', b: 'missed' }, 'c', 'missed'),
    ).toEqual({
      kind: 'sum',
    });
  });

  it('lets a mark be changed: the player being changed does not count against themselves', () => {
    expect(blockedReason(5, ids, five.bids, { a: 'made' }, 'a', 'missed')).toBeNull();
  });
});

describe('the results check on a real round', () => {
  const g = {
    players: ids.map((id) => ({ id, name: id, emoji: 'x', color: 'c' })),
    direction: 'cw',
    firstDealerIndex: 0,
    maxCards: 10,
    lengthMode: 'endless',
    rounds: [],
  } as unknown as Game;
  const round = (results: Record<string, Outcome>) => ({
    ...newRound(g, 2), // round 3 deals 5 cards
    bids: five.bids,
    results,
  });

  it('is not ok when the Made bids pass the cards, and says so', () => {
    const s = resultsState(
      g,
      round({ a: 'made', b: 'made', c: 'missed', d: 'missed', e: 'missed' }),
    );
    expect(s.ok).toBe(false);
    expect(s.msg).toBe('Made bids add up to 6 tricks — only 5 are played.');
  });

  it('is ok when the results can add up', () => {
    const s = resultsState(
      g,
      round({ a: 'made', b: 'missed', c: 'missed', d: 'missed', e: 'missed' }),
    );
    expect(s).toMatchObject({ ok: true, msg: '' });
  });

  it('explains a split that cannot work even when the Made bids fit', () => {
    const g4 = { ...g, players: g.players.slice(0, 4) } as Game;
    const r = {
      ...newRound(g4, 2),
      bids: { a: 1, b: 1, c: 4, d: 0 },
      results: { a: 'missed', b: 'missed', c: 'made', d: 'made' } as Record<string, Outcome>,
    };
    const s = resultsState(g4, r);
    expect(s.ok).toBe(false);
    expect(s.msg).toBe("These results can't add up to 5 tricks. Check again.");
  });
});
