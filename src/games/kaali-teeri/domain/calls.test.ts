import { T0, kitGame } from './__fixtures__/kit';
import {
  canAdd,
  copyNeeded,
  partnersFor,
  validCalled,
  validPlayedBy,
  type CardRef,
  type Copy,
  type Rank,
  type Suit,
} from './index';

const c = (rank: Rank, suit: Suit, copy?: Copy): CardRef => ({ rank, suit, ...(copy && { copy }) });
const AS = c('A', 'spades'),
  KH = c('K', 'hearts'),
  QD = c('Q', 'diamonds'),
  JC = c('J', 'clubs');

describe('§2.3 calling partners', () => {
  it('calls exactly as many cards as the table has partners', () => {
    const pool = [AS, KH, QD, JC];
    for (const n of [4, 5, 6]) {
      const k = partnersFor(n);
      expect(validCalled(pool.slice(0, k), n)).toBe(true);
      expect(validCalled(pool.slice(0, k - 1), n)).toBe(false);
      expect(validCalled(pool.slice(0, k + 1), n)).toBe(false);
    }
    const two = pool.map((x) => ({ ...x, copy: 1 as const }));
    for (const n of [7, 8, 9, 10]) {
      const k = partnersFor(n);
      expect(validCalled(two.slice(0, k), n)).toBe(true);
      expect(validCalled(two.slice(0, k - 1), n)).toBe(false);
    }
  });

  it('a taken-out card can’t be called', () => {
    expect(canAdd(c('2', 'clubs'), [], 5)).toBe(false);
    expect(canAdd(c('2', 'hearts'), [], 5)).toBe(true);
    expect(canAdd(c('2', 'spades'), [], 6)).toBe(false);
    expect(canAdd(c('2', 'clubs', 1), [], 7)).toBe(false);
    expect(validCalled([c('2', 'diamonds')], 4)).toBe(true);
  });

  it('with one deck a card has no copy marker', () => {
    expect(copyNeeded(AS, 5)).toBe(false);
    expect(canAdd(AS, [], 5)).toBe(true);
    expect(canAdd(c('A', 'spades', 1), [], 5)).toBe(false);
    expect(canAdd(c('A', 'spades', 'other'), [], 5)).toBe(false);
  });

  it('with two decks each card is first played, second played or the other one', () => {
    expect(copyNeeded(AS, 7)).toBe(true);
    expect(canAdd(AS, [], 7)).toBe(false);
    for (const copy of [1, 2, 'other'] as const)
      expect(canAdd(c('A', 'spades', copy), [], 7)).toBe(true);
    expect(canAdd({ ...AS, copy: 3 as 1 }, [], 7)).toBe(false);
  });

  it('a card with one copy left after removal needs no marker', () => {
    const two = c('2', 'hearts');
    expect(copyNeeded(two, 9)).toBe(false);
    expect(canAdd(two, [], 9)).toBe(true);
    expect(canAdd(c('2', 'hearts', 1), [], 9)).toBe(false);
    expect(canAdd(c('2', 'hearts', 'other'), [], 9)).toBe(false);
  });

  it('a card can’t be called twice', () => {
    expect(canAdd(AS, [AS], 6)).toBe(false);
    expect(validCalled([AS, AS], 6)).toBe(false);
    expect(canAdd(c('A', 'spades', 1), [c('A', 'spades', 1)], 8)).toBe(false);
    expect(canAdd(c('A', 'spades', 2), [c('A', 'spades', 1)], 8)).toBe(true);
    expect(validCalled([c('A', 'spades', 1), c('A', 'spades', 2), c('K', 'spades', 1)], 8)).toBe(
      true,
    );
  });

  it('“the other one” can’t be combined with another call of the same card', () => {
    const other = c('A', 'spades', 'other');
    expect(canAdd(c('A', 'spades', 1), [other], 8)).toBe(false);
    expect(canAdd(other, [c('A', 'spades', 2)], 8)).toBe(false);
    expect(canAdd(other, [other], 8)).toBe(false);
    expect(canAdd(c('A', 'hearts', 1), [other], 8)).toBe(true);
  });

  it('no more cards once the partners are all called', () => {
    expect(canAdd(KH, [AS], 4)).toBe(false);
    expect(canAdd(KH, [AS], 6)).toBe(true);
  });
});

describe('§2.3 who played the called cards', () => {
  const g = kitGame({
    id: 'x',
    players: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    start: T0,
    hands: [
      {
        bidder: 0,
        bid: 350,
        called: [c('A', 'spades', 1), c('K', 'hearts', 'other'), c('Q', 'clubs', 2)],
        playedBy: [0, 3, null],
        phase: 'playing',
      },
    ],
  });
  const ids = g.players.map((p) => p.id);
  const h = g.hands[0];

  it('any seat may play a called card, the bidder included, and it may be unmarked during play', () => {
    expect(validPlayedBy(h, ids)).toBe(true);
    expect(validPlayedBy({ ...h, playedBy: ['p0', 'p1', 'p0'] }, ids)).toBe(true);
  });

  it('the bidder can’t play “the other one”: they hold the other copy', () => {
    expect(validPlayedBy({ ...h, playedBy: ['p1', 'p0', null] }, ids)).toBe(false);
  });

  it('only seats at the table, one entry per called card', () => {
    expect(validPlayedBy({ ...h, playedBy: ['zz', null, null] }, ids)).toBe(false);
    expect(validPlayedBy({ ...h, playedBy: [null, null] }, ids)).toBe(false);
  });
});
