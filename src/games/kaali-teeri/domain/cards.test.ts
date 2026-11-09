import { T0, kitGame } from './__fixtures__/kit';
import {
  RANKS,
  REMOVAL_ORDER,
  SUITS,
  cardPoints,
  cardsEach,
  copiesInPlay,
  decksFor,
  deckTotal,
  defaultRules,
  dealerFor,
  firstSpeaker,
  minBidRange,
  partnersFor,
  removedCards,
  rulesOk,
  speakingOrder,
  takeOut,
  type CardRef,
} from './index';

const SYM = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' } as const;
const label = (c: CardRef) => c.rank + SYM[c.suit];

describe('§2.1 players and decks', () => {
  it('4–6 players use one deck, 7–10 use two', () => {
    expect([4, 5, 6, 7, 8, 9, 10].map(decksFor)).toEqual([1, 1, 1, 2, 2, 2, 2]);
  });

  it('one deck holds 250 points, two hold 500', () => {
    expect(deckTotal(1)).toBe(250);
    expect(deckTotal(2)).toBe(500);
  });

  it('the partner count follows the player count', () => {
    expect([4, 5, 6, 7, 8, 9, 10].map(partnersFor)).toEqual([1, 1, 2, 2, 3, 3, 4]);
  });
});

describe('§2.1 card points', () => {
  it('3♠ is 30, A K Q J 10 are 10, every 5 is 5, the rest 0', () => {
    expect(cardPoints({ rank: '3', suit: 'spades' })).toBe(30);
    for (const suit of SUITS) {
      for (const rank of ['A', 'K', 'Q', 'J', '10'] as const)
        expect(cardPoints({ rank, suit })).toBe(10);
      expect(cardPoints({ rank: '5', suit })).toBe(5);
      for (const rank of ['9', '8', '7', '6', '4', '2'] as const)
        expect(cardPoints({ rank, suit })).toBe(0);
      if (suit !== 'spades') expect(cardPoints({ rank: '3', suit })).toBe(0);
    }
  });

  it('a deck adds up to 250', () => {
    const all = SUITS.flatMap((suit) => RANKS.map((rank) => cardPoints({ rank, suit })));
    expect(all).toHaveLength(52);
    expect(all.reduce((a, b) => a + b, 0)).toBe(250);
  });
});

describe('§2.1 equal dealing', () => {
  it('takes zero-point cards out in a fixed order', () => {
    expect(REMOVAL_ORDER.map(label)).toEqual('2♣ 2♦ 2♥ 2♠ 3♣ 3♦ 3♥ 4♣ 4♦ 4♥ 4♠'.split(' '));
    expect(REMOVAL_ORDER.every((c) => cardPoints(c) === 0)).toBe(true);
  });

  it('with two decks both copies go before the next card', () => {
    expect(takeOut(5, 1).map(label)).toEqual(['2♣', '2♦', '2♥', '2♠', '3♣']);
    expect(takeOut(9, 2).map(label)).toEqual('2♣ 2♣ 2♦ 2♦ 2♥ 2♥ 2♠ 2♠ 3♣'.split(' '));
    expect(takeOut(0, 2)).toEqual([]);
  });

  it.each([
    [4, '', 13],
    [5, '2♣ 2♦', 10],
    [6, '2♣ 2♦ 2♥ 2♠', 8],
    [7, '2♣ 2♣ 2♦ 2♦ 2♥ 2♥', 14],
    [8, '', 13],
    [9, '2♣ 2♣ 2♦ 2♦ 2♥', 11],
    [10, '2♣ 2♣ 2♦ 2♦', 10],
  ])('%i players: take out "%s", deal %i each', (n, out, each) => {
    expect(removedCards(n).map(label).join(' ')).toBe(out);
    expect(cardsEach(n)).toBe(each);
    expect(cardsEach(n) * n + removedCards(n).length).toBe(52 * decksFor(n));
  });

  it('counts the copies of a card left in play', () => {
    expect(copiesInPlay({ rank: '2', suit: 'hearts' }, 9)).toBe(1);
    expect(copiesInPlay({ rank: '2', suit: 'clubs' }, 9)).toBe(0);
    expect(copiesInPlay({ rank: 'A', suit: 'spades' }, 9)).toBe(2);
    expect(copiesInPlay({ rank: '2', suit: 'clubs' }, 5)).toBe(0);
    expect(copiesInPlay({ rank: '2', suit: 'hearts' }, 5)).toBe(1);
  });

  it('removing cards never changes the points in play', () => {
    for (let n = 4; n <= 10; n++)
      expect(removedCards(n).reduce((a, c) => a + cardPoints(c), 0)).toBe(0);
  });
});

describe('§2.1 dealer and direction', () => {
  const game = (firstDealer: number, direction: 'cw' | 'ccw') =>
    kitGame({
      id: 'x',
      players: ['a', 'b', 'c', 'd', 'e'],
      start: T0,
      firstDealer,
      direction,
      hands: [],
    });

  it('moves one seat per hand from the chosen first dealer', () => {
    const g = game(3, 'cw');
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => dealerFor(g, i))).toEqual([3, 4, 0, 1, 2, 3, 4]);
  });

  it('the player after the dealer speaks first', () => {
    const g = game(3, 'cw');
    expect([0, 1, 2].map((i) => firstSpeaker(g, i))).toEqual([4, 0, 1]);
    expect(speakingOrder(g, 0)).toEqual(['p4', 'p0', 'p1', 'p2', 'p3']);
  });

  it('direction changes the seat layout only, never the order', () => {
    const cw = game(1, 'cw'),
      ccw = game(1, 'ccw');
    for (let i = 0; i < 8; i++) {
      expect(dealerFor(ccw, i)).toBe(dealerFor(cw, i));
      expect(speakingOrder(ccw, i)).toEqual(speakingOrder(cw, i));
    }
  });
});

describe('§2.2 rules of the table', () => {
  it('defaults: min bid 150 / 350, step 5, endless, partners from the count', () => {
    expect(defaultRules(5)).toEqual({
      decks: 1,
      partners: 1,
      minBid: 150,
      step: 5,
      length: 'endless',
    });
    expect(defaultRules(10)).toEqual({
      decks: 2,
      partners: 4,
      minBid: 350,
      step: 5,
      length: 'endless',
    });
  });

  it('the minimum bid can go from half the total + 5 up to the total − 5', () => {
    expect(minBidRange(1)).toEqual({ lo: 130, hi: 245 });
    expect(minBidRange(2)).toEqual({ lo: 255, hi: 495 });
  });

  it('accepts only rules that fit the table', () => {
    const r = defaultRules(6);
    expect(rulesOk(r, 6)).toBe(true);
    expect(rulesOk({ ...r, minBid: 130 }, 6)).toBe(true);
    expect(rulesOk({ ...r, minBid: 245 }, 6)).toBe(true);
    expect(rulesOk({ ...r, minBid: 125 }, 6)).toBe(false);
    expect(rulesOk({ ...r, minBid: 250 }, 6)).toBe(false);
    expect(rulesOk({ ...r, minBid: 152 }, 6)).toBe(false);
    expect(rulesOk({ ...r, step: 10 }, 6)).toBe(true);
    expect(rulesOk({ ...r, step: 10, minBid: 155 }, 6)).toBe(false);
    expect(rulesOk({ ...r, step: 7 as 5 }, 6)).toBe(false);
    expect(rulesOk({ ...r, decks: 2 }, 6)).toBe(false);
    expect(rulesOk({ ...r, partners: 1 }, 6)).toBe(false);
    expect(rulesOk({ ...r, length: 'to1000' }, 6)).toBe(true);
    expect(rulesOk({ ...r, length: '8hands' as 'endless' }, 6)).toBe(false);
    expect(rulesOk(r, 7)).toBe(false);
  });
});
