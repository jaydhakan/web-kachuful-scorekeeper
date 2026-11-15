import { describe, expect, it } from 'vitest';
import {
  NEWCOMER,
  SUIT_DEAL,
  T0,
  WHO,
  card,
  cards,
  doneHand,
  drawFor,
  lobby,
  ok,
  playOut,
  rulesWith,
  started,
  step,
  type Table,
} from './__fixtures__/kit';
import { deck, dealSeeded, displaySort, shuffleSeeded } from './cards';
import { partnerOf, teamOf } from './seats';
import { allowedBids, bidOrder, bidProblem, blindAllowed, minBidFor, nilAllowed } from './bidding';
import { legalPlays, playProblem } from './legal';
import { trickWinner } from './trick';
import { scoreHand, scoreTeam } from './scoring';
import { endResult, gameOver, totals } from './standings';
import { deadlineFor, timeoutBid, timeoutPlay } from './timer';
import { setRules, sit, tricksWon } from './rules';
import { viewFor } from './view';
import { dealerFor } from './table';
import { rulesOk } from './validate';
import type { Card, Play, Seat, SpHand } from './types';

const plays = (spec: Array<[Seat, string]>): Play[] =>
  spec.map(([seat, c]) => ({ seat, card: card(c) }));
const ids = (cs: Card[]) => cs.map((c) => `${c.rank}${c.suit[0]}`);

describe('§1.1 setup and deal', () => {
  it('seats 0 and 2 are team a, seats 1 and 3 team b; partners sit opposite', () => {
    expect([0, 1, 2, 3].map((s) => teamOf(s as Seat))).toEqual(['a', 'b', 'a', 'b']);
    expect([0, 1, 2, 3].map((s) => partnerOf(s as Seat))).toEqual([2, 3, 0, 1]);
  });

  it('a 52-card deck, no jokers, 13 to each seat', () => {
    const d = deck();
    expect(d).toHaveLength(52);
    expect(new Set(ids(d)).size).toBe(52);
    const hands = dealSeeded(7);
    expect(hands.map((h) => h.length)).toEqual([13, 13, 13, 13]);
    expect(new Set(hands.flat().map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });

  it('the seeded shuffle is the same for the same seed and differs between seeds', () => {
    expect(shuffleSeeded(42)).toEqual(shuffleSeeded(42));
    expect(shuffleSeeded(42)).not.toEqual(shuffleSeeded(43));
  });

  it('the hand sorts by suit with colours alternating, spades on the right, low to high', () => {
    const sorted = displaySort(cards('As 2h Kd 3c 10s 9h 2d Ac'));
    expect(ids(sorted)).toEqual(['2d', 'Kd', '3c', 'Ac', '2h', '9h', '10s', 'As']);
    expect(sorted.map((c) => c.suit)).toEqual([
      'diamonds',
      'diamonds',
      'clubs',
      'clubs',
      'hearts',
      'hearts',
      'spades',
      'spades',
    ]);
    expect(ids(displaySort(cards('Ah 2h 10h')))).toEqual(['2h', '10h', 'Ah']);
  });

  it('online: the highest card in the draw for deal deals first', () => {
    let t: Table = { state: lobby(), hands: null, now: T0 };
    for (const s of [0, 1, 2, 3] as Seat[]) t = ok(t, s, { type: 'ready' });
    t = ok(t, 0, { type: 'drawForDeal' }, { draw: cards('5c Qd 9h 2s') });
    expect(t.state.dealer).toBe(1);
    expect(t.state.phase).toBe('deal');
    expect(t.state.drawn).toEqual(cards('5c Qd 9h 2s'));
  });

  it('online: equal ranks in the draw go to the higher suit (spades, hearts, diamonds, clubs)', () => {
    let t: Table = { state: lobby(), hands: null, now: T0 };
    for (const s of [0, 1, 2, 3] as Seat[]) t = ok(t, s, { type: 'ready' });
    t = ok(t, 0, { type: 'drawForDeal' }, { draw: cards('Kd Kh 3c Kc') });
    expect(t.state.dealer).toBe(1);
  });

  it('table: the dealer moves one seat clockwise each hand, whatever the direction', () => {
    const g = { firstDealerIndex: 2 };
    expect([0, 1, 2, 3, 4].map((i) => dealerFor(g, i))).toEqual([2, 3, 0, 1, 2]);
  });

  it('online: after a hand the deal passes clockwise', () => {
    const t = playOut(started({ dealer: 3 }), [5, 3, 3, 2]);
    expect(t.state.phase).toBe('handEnd');
    expect(t.state.dealer).toBe(0);
    expect(t.state.turn).toBe(0);
  });

  it('bidding and play both start left of the dealer and go clockwise', () => {
    expect(bidOrder(3)).toEqual([0, 1, 2, 3]);
    expect(bidOrder(1)).toEqual([2, 3, 0, 1]);
    const t = started({ dealer: 1 });
    expect(t.state.phase).toBe('bidding');
    expect(t.state.turn).toBe(2);
  });
});

describe('§1.2 bidding', () => {
  const R = rulesWith();
  const none = [null, null, null, null];

  it('each player bids once, 0 to 13; nobody can pass', () => {
    expect(bidProblem(13, 0, none, R)).toBeNull();
    expect(bidProblem(1, 0, none, R)).toBeNull();
    expect(bidProblem(14, 0, none, R)).toBe('bad-bid');
    expect(bidProblem(-1, 0, none, R)).toBe('bad-bid');
    expect(bidProblem(2.5, 0, none, R)).toBe('bad-bid');
    let t = started();
    t = ok(t, 0, { type: 'bid', bid: 4 });
    expect(step(t, 0, { type: 'bid', bid: 4 }).res).toMatchObject({
      ok: false,
      error: { code: 'not_your_turn' },
    });
  });

  it('a bid of 0 is always Nil, allowed only while Nil is on', () => {
    expect(nilAllowed(R)).toBe(true);
    expect(bidProblem(0, 0, none, R)).toBeNull();
    const off = rulesWith({ nil: false });
    expect(nilAllowed(off)).toBe(false);
    expect(bidProblem(0, 0, none, off)).toBe('nil-off');
    expect(allowedBids(0, none, off)[0]).toBe(1);
    const t = started({ rules: { nil: false } });
    expect(step(t, 0, { type: 'bid', bid: 0 }).res).toMatchObject({
      ok: false,
      error: { code: 'invalid_action', reason: 'nil-off' },
    });
  });

  it('the team contract leaves out a partner who bid Nil', () => {
    const s = scoreTeam(
      doneHand({ bids: [0, 3, 4, 3], teamA: 4, nil: [0, null, null, null] }),
      'a',
    );
    expect(s.contract).toBe(4);
  });

  it('Blind Nil is off by default and needs Nil on', () => {
    expect(blindAllowed(R)).toBe(false);
    expect(blindAllowed(rulesWith({ blindNil: true }))).toBe(true);
    expect(blindAllowed(rulesWith({ blindNil: true, nil: false }))).toBe(false);
    const t = started();
    expect(step(t, 2, { type: 'blindNil' }).res).toMatchObject({
      ok: false,
      error: { reason: 'blind-off' },
    });
  });

  it('with Blind Nil off there is no gate: every hand shows as soon as it lands', () => {
    const t = started();
    expect(t.state.looked).toEqual([true, true, true, true]);
    for (const s of [0, 1, 2, 3] as Seat[])
      expect(viewFor(t.state, t.hands, s, t.now).me.hand).toHaveLength(13);
  });

  it('with Blind Nil on, a hand is withheld until that seat looks', () => {
    let t = started({ rules: { blindNil: true } });
    expect(t.state.looked).toEqual([false, false, false, false]);
    expect(viewFor(t.state, t.hands, 1, t.now).me.hand).toBeNull();
    t = ok(t, 1, { type: 'look' });
    expect(viewFor(t.state, t.hands, 1, t.now).me.hand).toEqual(SUIT_DEAL[1]);
    expect(viewFor(t.state, t.hands, 2, t.now).me.hand).toBeNull();
    // Nobody's view, nor the public state, ever carries another seat's cards.
    expect(JSON.stringify(viewFor(t.state, t.hands, 2, t.now))).not.toContain(
      JSON.stringify(card('7h')),
    );
    expect(viewFor(t.state, t.hands, null, t.now).me.hand).toBeNull();
  });

  it('bidding starts straight away; the seat to bid must look (or go blind) first', () => {
    let t = started({ rules: { blindNil: true } });
    expect(step(t, 0, { type: 'bid', bid: 3 }).res).toMatchObject({
      ok: false,
      error: { reason: 'look-first' },
    });
    t = ok(t, 0, { type: 'look' });
    t = ok(t, 0, { type: 'bid', bid: 3 });
    expect(t.state.turn).toBe(1);
  });

  it('Blind Nil chosen early is locked in and filled in when that turn comes', () => {
    let t = started({ rules: { blindNil: true } });
    t = ok(t, 2, { type: 'blindNil' });
    expect(t.state.bids[2]).toBeNull();
    expect(viewFor(t.state, t.hands, 2, t.now).table.blind[2]).toBe(true);
    // Hidden from everyone else until the bid is made, so earlier bidders can't play against it.
    expect(viewFor(t.state, t.hands, 1, t.now).table.blind[2]).toBe(false);
    expect(viewFor(t.state, t.hands, 2, t.now).me.hand).toBeNull();
    expect(step(t, 2, { type: 'look' }).res).toMatchObject({
      ok: false,
      error: { reason: 'blind-locked' },
    });
    t = ok(t, 0, { type: 'look' });
    t = ok(t, 0, { type: 'bid', bid: 4 });
    t = ok(t, 1, { type: 'look' });
    t = ok(t, 1, { type: 'bid', bid: 3 });
    expect(t.state.bids[2]).toBe(0);
    expect(t.state.blind[2]).toBe(true);
    expect(t.state.turn).toBe(3);
    expect(viewFor(t.state, t.hands, 1, t.now).table.blind[2]).toBe(true);
    expect(viewFor(t.state, t.hands, 2, t.now).me.hand).toHaveLength(13);
  });

  it('Blind Nil on your own turn is the bid at once', () => {
    let t = started({ rules: { blindNil: true } });
    t = ok(t, 0, { type: 'blindNil' });
    expect(t.state.bids[0]).toBe(0);
    expect(t.state.blind[0]).toBe(true);
    expect(t.state.turn).toBe(1);
  });

  it('Blind Nil is refused after looking', () => {
    let t = started({ rules: { blindNil: true } });
    t = ok(t, 3, { type: 'look' });
    expect(step(t, 3, { type: 'blindNil' }).res).toMatchObject({
      ok: false,
      error: { reason: 'looked' },
    });
  });

  it('minimum team bid: P bids 1, so Q must bid 3 or more, or Nil', () => {
    const on = rulesWith({ minTeamBid: 4 });
    const bids = [1, null, null, null];
    expect(minBidFor(2, bids, on)).toBe(3);
    expect(bidProblem(2, 2, bids, on)).toBe('below-min');
    expect(bidProblem(3, 2, bids, on)).toBeNull();
    expect(bidProblem(0, 2, bids, on)).toBeNull();
    expect(allowedBids(2, bids, on)).toEqual([0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('minimum team bid binds only the second partner, and not when either bids Nil', () => {
    const on = rulesWith({ minTeamBid: 4 });
    expect(minBidFor(0, [null, null, null, null], on)).toBe(1);
    expect(minBidFor(2, [0, null, null, null], on)).toBe(1);
    expect(minBidFor(2, [5, null, null, null], on)).toBe(1);
    expect(minBidFor(2, [1, null, null, null], rulesWith())).toBe(1);
  });

  it('minimum team bid is enforced online', () => {
    let t = started({ rules: { minTeamBid: 4 } });
    t = ok(t, 0, { type: 'bid', bid: 1 });
    t = ok(t, 1, { type: 'bid', bid: 2 });
    expect(step(t, 2, { type: 'bid', bid: 2 }).res).toMatchObject({
      ok: false,
      error: { reason: 'below-min' },
    });
    t = ok(t, 2, { type: 'bid', bid: 3 });
    expect(t.state.bids).toEqual([1, 2, 3, null]);
  });
});

describe('§1.3 play and spades broken', () => {
  it('the first lead is the player left of the dealer', () => {
    let t = started({ dealer: 3, deal: dealSeeded(3) });
    for (const b of [3, 3, 3, 3]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    expect(t.state.phase).toBe('playing');
    expect(t.state.turn).toBe(0);
  });

  it('follow suit if you can', () => {
    const hand = cards('2h Kh 3c As');
    const trick = plays([[0, '9h']]);
    expect(ids(legalPlays(hand, trick, false))).toEqual(['2h', 'Kh']);
    expect(playProblem(card('3c'), hand, trick, false)).toBe('must-follow');
    expect(playProblem(card('As'), hand, trick, true)).toBe('must-follow');
  });

  it("if you can't follow suit, play any card, a spade included (a cut), even before spades break", () => {
    const hand = cards('3c As 4d');
    const trick = plays([[0, '9h']]);
    expect(ids(legalPlays(hand, trick, false))).toEqual(['3c', 'As', '4d']);
    expect(playProblem(card('As'), hand, trick, false)).toBeNull();
  });

  it('nobody may lead a spade until spades are broken', () => {
    const hand = cards('2h As 3c');
    expect(ids(legalPlays(hand, [], false))).toEqual(['2h', '3c']);
    expect(playProblem(card('As'), hand, [], false)).toBe('spades-locked');
    expect(ids(legalPlays(hand, [], true))).toEqual(['2h', 'As', '3c']);
  });

  it('a hand of nothing but spades may lead one', () => {
    expect(ids(legalPlays(cards('As 2s'), [], false))).toEqual(['As', '2s']);
    expect(playProblem(card('2s'), cards('As 2s'), [], false)).toBeNull();
  });

  it('a card not in the hand is refused', () => {
    expect(playProblem(card('Qd'), cards('2h'), [], false)).toBe('not-in-hand');
  });

  it('spades break at the first cut', () => {
    // Dealer 0: seat 1 leads hearts; seats 2 and 3 throw off; seat 0, holding only spades, cuts.
    let t = started({ dealer: 0, deal: SUIT_DEAL });
    for (const b of [3, 3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    expect(t.state.turn).toBe(1);
    t = ok(t, 1, { type: 'play', card: card('2h') });
    t = ok(t, 2, { type: 'play', card: card('2d') });
    t = ok(t, 3, { type: 'play', card: card('2c') });
    expect(t.state.broken).toBe(false);
    t = ok(t, 0, { type: 'play', card: card('2s') });
    expect(t.state.broken).toBe(true);
    expect(t.state.tricks[0].winner).toBe(0);
    expect(t.state.turn).toBe(0);
  });

  it('leading from an all-spade hand breaks spades', () => {
    let t = started({ dealer: 3, deal: SUIT_DEAL });
    for (const b of [3, 3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    t = ok(t, 0, { type: 'play', card: card('5s') });
    expect(t.state.broken).toBe(true);
  });

  it('an illegal play is refused online with its reason', () => {
    const deal = [
      cards('2h 3h 4h 5h 6h 7h 8h 9h 10h Jh Qh Kh As'),
      cards('Ah 2s 3s 4s 5s 6s 7s 8s 9s 10s Js Qs Ks'),
      cards('2d 3d 4d 5d 6d 7d 8d 9d 10d Jd Qd Kd Ad'),
      cards('2c 3c 4c 5c 6c 7c 8c 9c 10c Jc Qc Kc Ac'),
    ];
    let t = started({ dealer: 3, deal });
    for (const b of [3, 3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    expect(step(t, 0, { type: 'play', card: card('As') }).res).toMatchObject({
      ok: false,
      error: { reason: 'spades-locked' },
    });
    t = ok(t, 0, { type: 'play', card: card('2h') });
    expect(step(t, 1, { type: 'play', card: card('2s') }).res).toMatchObject({
      ok: false,
      error: { reason: 'must-follow' },
    });
    expect(step(t, 1, { type: 'play', card: card('2d') }).res).toMatchObject({
      ok: false,
      error: { reason: 'not-in-hand' },
    });
    expect(step(t, 2, { type: 'play', card: card('2d') }).res).toMatchObject({
      ok: false,
      error: { code: 'not_your_turn' },
    });
  });

  it('the highest spade wins; with no spade, the highest card of the suit led', () => {
    expect(
      trickWinner(
        plays([
          [0, '9h'],
          [1, 'Ah'],
          [2, '2s'],
          [3, 'Kh'],
        ]),
      ),
    ).toBe(2);
    expect(
      trickWinner(
        plays([
          [0, '9h'],
          [1, '3s'],
          [2, '2s'],
          [3, 'Ks'],
        ]),
      ),
    ).toBe(3);
    expect(
      trickWinner(
        plays([
          [1, '9h'],
          [2, 'Ad'],
          [3, 'Kh'],
          [0, '2c'],
        ]),
      ),
    ).toBe(3);
    expect(
      trickWinner(
        plays([
          [2, '5c'],
          [3, 'Ah'],
          [0, 'Ad'],
          [1, '4c'],
        ]),
      ),
    ).toBe(2);
  });

  it('the winner leads next', () => {
    let t = started({ dealer: 0, deal: SUIT_DEAL });
    for (const b of [3, 3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    t = ok(t, 1, { type: 'play', card: card('Ah') });
    t = ok(t, 2, { type: 'play', card: card('2d') });
    t = ok(t, 3, { type: 'play', card: card('2c') });
    t = ok(t, 0, { type: 'play', card: card('2s') });
    expect(t.state.turn).toBe(0);
    expect(tricksWon(t.state)).toEqual([1, 0, 0, 0]);
  });
});

describe('§1.4 scoring: the worked examples (P = seat 0, Q = seat 2)', () => {
  const a = (h: Parameters<typeof doneHand>[0]) => scoreTeam(doneHand(h), 'a');

  it('E1: P 2, Q 3 (team 5); P 4, Q 1: made, who took which does not matter → +50, 0 bags', () => {
    expect(a({ bids: [2, 4, 3, 4], teamA: 5 })).toMatchObject({ points: 50, bags: 0, made: true });
  });
  it('E2: P 2, Q 3; P 4, Q 3: made, 2 over → +52, 2 bags', () => {
    expect(a({ bids: [2, 3, 3, 3], teamA: 7 })).toMatchObject({ points: 52, bags: 2, made: true });
  });
  it('E3: P 2, Q 3; P 4, Q 0: set, 4 against 5 → −50, and a set earns no bags', () => {
    expect(a({ bids: [2, 4, 3, 4], teamA: 4 })).toMatchObject({
      points: -50,
      bags: 0,
      made: false,
    });
  });
  it('E4: P Nil, Q 4; P 0, Q 5: Nil made +100, Q made 4 with 1 over +41 → +141, 1 bag', () => {
    const s = a({ bids: [0, 4, 4, 4], teamA: 5, nil: [0, null, null, null] });
    expect(s).toMatchObject({ points: 141, bags: 1, contract: 4, made: true });
    expect(s.nils).toEqual([{ seat: 0, blind: false, made: true, tricks: 0, points: 100 }]);
  });
  it("E5: P Nil, Q 4; P 2, Q 4: Nil failed −100, Q made +40, P's 2 tricks are bags +2 → −58", () => {
    const s = a({ bids: [0, 4, 4, 4], teamA: 6, nil: [2, null, null, null] });
    expect(s).toMatchObject({ points: -58, bags: 2, made: true, took: 4 });
  });
  it("E6: P Nil, Q 4; P 2, Q 3: Nil failed −100, Q set −40, P's 2 tricks still bags +2 → −138", () => {
    const s = a({ bids: [0, 4, 4, 4], teamA: 5, nil: [2, null, null, null] });
    expect(s).toMatchObject({ points: -138, bags: 2, made: false, took: 3 });
  });
  it('E7: P Blind Nil, Q 5; P 0, Q 6: +200 and +51 → +251, 1 bag', () => {
    const s = a({
      bids: [0, 3, 5, 3],
      blind: [true, false, false, false],
      teamA: 6,
      nil: [0, null, null, null],
    });
    expect(s).toMatchObject({ points: 251, bags: 1 });
  });
  it("E8: P Blind Nil, Q 5; P 1, Q 5: −200, Q made +50, P's trick a bag +1 → −149, 1 bag", () => {
    const s = a({
      bids: [0, 3, 5, 3],
      blind: [true, false, false, false],
      teamA: 6,
      nil: [1, null, null, null],
    });
    expect(s).toMatchObject({ points: -149, bags: 1 });
  });

  it('both partners Nil: each is scored on their own, and every trick they take is a bag', () => {
    const s = a({ bids: [0, 5, 0, 5], teamA: 2, nil: [0, null, 2, null] });
    expect(s).toMatchObject({ contract: 0, made: null, points: 100 - 100 + 2, bags: 2 });
  });

  it('the bag run: 52, 44, 63, then 33 with the tenth bag → −100 and 2 carried; total 92', () => {
    const run: SpHand[] = [
      doneHand({ index: 0, dealer: 3, bids: [3, 3, 2, 3], teamA: 7 }),
      doneHand({ index: 1, dealer: 0, bids: [2, 2, 2, 2], teamA: 8 }),
      doneHand({ index: 2, dealer: 1, bids: [3, 2, 3, 2], teamA: 9 }),
      doneHand({ index: 3, dealer: 2, bids: [1, 3, 2, 3], teamA: 6 }),
    ];
    let bags = { a: 0, b: 0 };
    const pts: number[] = [];
    for (const h of run) {
      const s = scoreHand(h, bags);
      pts.push(s.a.points);
      bags = { a: s.a.bagsAfter, b: s.b.bagsAfter };
    }
    expect(pts).toEqual([52, 44, 63, 33]);
    expect(scoreHand(run[3], { a: 9, b: 0 }).a).toMatchObject({
      penalty: 1,
      net: -67,
      bagsAfter: 12,
    });
    const t = totals(run);
    expect(t.a).toMatchObject({ score: 92, bags: 12, penalties: 1 });
    expect(t.a.bags % 10).toBe(2);
  });

  it('a total is the sum of hand points less 100 for every 10 bags', () => {
    const run = [
      doneHand({ bids: [1, 3, 1, 3], teamA: 13 }), // a: 20 + 11 bags
      doneHand({ index: 1, dealer: 0, bids: [1, 3, 1, 3], teamA: 13 }), // a: 20 + 11 bags
    ];
    const t = totals(run);
    expect(t.a.bags).toBe(22);
    expect(t.a.score).toBe(31 + 31 - 200);
  });

  it('online: the same scorer reads the tricks (a Nil made, a set, bags)', () => {
    // Seat 0 holds every spade and takes all 13; seat 1 bid Nil and took none.
    let t = started({ dealer: 3, deal: SUIT_DEAL });
    t = playOut(t, [5, 0, 3, 2]);
    const h = t.state.history[0];
    expect(h.teamTricks).toEqual([13, 0]);
    expect(h.nilTricks).toEqual([null, 0, null, null]);
    expect(h.tricks).toHaveLength(13);
    const s = scoreHand(h);
    expect(s.a).toMatchObject({ points: 85, bags: 5, made: true });
    expect(s.b).toMatchObject({ points: 100 - 20, bags: 0, made: false });
  });
});

describe('§1.5 end of the game', () => {
  const R = rulesWith();
  const S = (a: number, b: number) => ({ a, b });

  it('plays to 200 by default; checked at the end of a hand', () => {
    expect(R.target).toBe(200);
    expect(gameOver(S(199, 150), R)).toBeNull();
    expect(gameOver(S(200, 150), R)).toEqual({ winner: 'a', endedBy: 'target' });
  });

  it('both reach the target in one hand: the higher score wins', () => {
    expect(gameOver(S(205, 231), R)).toEqual({ winner: 'b', endedBy: 'target' });
  });

  it('a tie: play another hand', () => {
    expect(gameOver(S(210, 210), R)).toBe('tie');
  });

  it('Endless never ends on score', () => {
    expect(gameOver(S(5000, -3000), rulesWith({ target: null }))).toBeNull();
  });

  it('mercy off: no score is too low', () => {
    expect(gameOver(S(-500, 20), R)).toBeNull();
  });

  it('mercy on: a team below −200 loses; exactly −200 does not', () => {
    const m = rulesWith({ mercy: -200 });
    expect(gameOver(S(40, -210), m)).toEqual({ winner: 'a', endedBy: 'mercy' });
    expect(gameOver(S(40, -200), m)).toBeNull();
    expect(gameOver(S(-250, 0), rulesWith({ mercy: -200, target: null }))).toEqual({
      winner: 'b',
      endedBy: 'mercy',
    });
  });

  it('one team at the target while the other is below −200: the team at the target wins', () => {
    expect(gameOver(S(-230, 215), rulesWith({ mercy: -200 }))).toEqual({
      winner: 'b',
      endedBy: 'target',
    });
  });

  it('both below −200: the higher score wins; equal plays on', () => {
    const m = rulesWith({ mercy: -200 });
    expect(gameOver(S(-260, -230), m)).toEqual({ winner: 'b', endedBy: 'mercy' });
    expect(gameOver(S(-230, -230), m)).toBe('tie');
  });

  it('play to: 100, 200, 300, Endless or custom 50 to 1000 in tens', () => {
    for (const target of [100, 200, 300, null, 50, 250, 1000])
      expect(rulesOk(rulesWith({ target })), String(target)).toBe(true);
    for (const target of [40, 55, 1010, 0, -100])
      expect(rulesOk(rulesWith({ target })), String(target)).toBe(false);
  });

  it('online: the game finishes at the end of the hand that reaches the target', () => {
    // Seat 0 holds every spade and takes all 13: a bid 13 between them and makes 130.
    let t = started({ dealer: 3, deal: SUIT_DEAL, rules: { target: 100 } });
    t = playOut(t, [12, 1, 1, 1]);
    expect(t.state.status).toBe('finished');
    expect(t.state.result).toEqual({ winner: 'a', endedBy: 'target' });
    expect(t.state.finishedAt).toBe(t.now);
    expect(t.state.turn).toBeNull();
  });

  it('online: a tie at the target plays one more hand', () => {
    // An earlier hand left a 50, b 80; this one gives a 130 + 100 (seat 2's Nil) and b two Nils, 200: 280 each.
    const t0 = started({ dealer: 3, deal: SUIT_DEAL });
    const before = doneHand({ dealer: 2, bids: [2, 4, 3, 4], teamA: 5 });
    const t = playOut({ ...t0, state: { ...t0.state, history: [before] } }, [13, 0, 0, 0]);
    expect(totals(t.state.history).a.score).toBe(280);
    expect(totals(t.state.history).b.score).toBe(280);
    expect(t.state.status).toBe('playing');
    expect(t.state.phase).toBe('handEnd');
    expect(t.state.result).toBeNull();
  });
});

describe('§1.6 the turn timer', () => {
  it('a 30 s timer by default: the deadline is 30 s after the turn starts', () => {
    const t = started();
    expect(t.state.rules.timerSec).toBe(30);
    expect(t.state.deadline).toBe((t.state.turnStartedAt as number) + 30_000);
    expect(deadlineFor(t.state)).toBe(t.state.deadline);
    const sixty = started({ rules: { timerSec: 60 } });
    expect(sixty.state.deadline).toBe((sixty.state.turnStartedAt as number) + 60_000);
  });

  it('timeout before the deadline is refused as too early', () => {
    const t = started();
    expect(step(t, 2, { type: 'timeout' }, {}, 29_000).res).toMatchObject({
      ok: false,
      error: { reason: 'too-early' },
    });
  });

  it('any seated phone may send it; someone not seated may not', () => {
    const t = started();
    expect(step(t, null, { type: 'timeout' }, {}, 31_000).res).toMatchObject({
      ok: false,
      error: { code: 'not_your_turn' },
    });
    expect(step(t, 2, { type: 'timeout' }, {}, 31_000).res.ok).toBe(true);
  });

  it('a timed-out bid is the lowest the rules allow that is not Nil', () => {
    let t = started({ rules: { minTeamBid: 4 } });
    t = ok(t, 0, { type: 'bid', bid: 1 });
    t = ok(t, 1, { type: 'bid', bid: 2 });
    expect(timeoutBid(2, t.state.bids, t.state.rules)).toBe(3);
    t = ok(t, 3, { type: 'timeout' }, {}, 31_000);
    expect(t.state.bids[2]).toBe(3);
    expect(t.state.turn).toBe(3);
    expect(t.state.seats[2].timeouts).toBe(1);
  });

  it("a timed-out turn that hadn't looked shows the cards and bids", () => {
    let t = started({ rules: { blindNil: true } });
    t = ok(t, 1, { type: 'timeout' }, {}, 31_000);
    expect(t.state.looked[0]).toBe(true);
    expect(t.state.bids[0]).toBe(1);
  });

  it('a timed-out play is the lowest legal card (a spade only when nothing else is legal)', () => {
    expect(timeoutPlay(cards('Kh 2s 3c 5h'), [], true)).toEqual(card('3c'));
    expect(timeoutPlay(cards('Kh 2s 5h'), plays([[0, '4d']]), true)).toEqual(card('5h'));
    expect(timeoutPlay(cards('Kh 2s 5h'), plays([[0, '4h']]), true)).toEqual(card('5h'));
    expect(timeoutPlay(cards('Ks 2s'), [], false)).toEqual(card('2s'));
    let t = started({ dealer: 3, deal: SUIT_DEAL });
    for (const b of [3, 3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    t = ok(t, 1, { type: 'timeout' }, {}, 31_000);
    expect(t.state.trick).toEqual(plays([[0, '2s']]));
  });

  it('two timeouts in a row mark the seat away, and it then plays on a 5 s timer', () => {
    let t = started({ dealer: 3, deal: SUIT_DEAL });
    t = ok(t, 1, { type: 'timeout' }, {}, 31_000);
    for (const b of [3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    expect(t.state.seats[0]).toMatchObject({ timeouts: 1, away: false });
    t = ok(t, 2, { type: 'timeout' }, {}, 31_000);
    expect(t.state.seats[0]).toMatchObject({ timeouts: 2, away: true });
    for (const s of [1, 2, 3] as Seat[]) {
      const h = t.hands as Card[][];
      t = ok(t, s, { type: 'play', card: legalPlays(h[s], t.state.trick, t.state.broken)[0] });
    }
    expect(t.state.turn).toBe(0);
    expect(t.state.deadline).toBe((t.state.turnStartedAt as number) + 5000);
    expect(step(t, 1, { type: 'timeout' }, {}, 4000).res.ok).toBe(false);
    expect(step(t, 1, { type: 'timeout' }, {}, 5000).res.ok).toBe(true);
  });

  it('the person touching their phone again clears away', () => {
    let t = started({ dealer: 3, deal: SUIT_DEAL });
    t = ok(t, 1, { type: 'timeout' }, {}, 31_000);
    for (const b of [3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    t = ok(t, 2, { type: 'timeout' }, {}, 31_000);
    t = ok(t, 0, { type: 'ready' });
    expect(t.state.seats[0]).toMatchObject({ timeouts: 0, away: false });
  });

  it('a seat acting itself resets its run of timeouts', () => {
    let t = started({ dealer: 3, deal: SUIT_DEAL });
    t = ok(t, 1, { type: 'timeout' }, {}, 31_000);
    for (const b of [3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    t = ok(t, 0, { type: 'play', card: card('2s') });
    expect(t.state.seats[0].timeouts).toBe(0);
  });

  it('timeout on a turn already settled is a no-op, not an error', () => {
    let t = started();
    const rev = t.state.rev;
    t = ok(t, 2, { type: 'timeout' }, { rev }, 31_000);
    const late = step(t, 3, { type: 'timeout' }, { rev }, 10);
    expect(late.res).toMatchObject({ ok: true, noop: true });
    expect(late.state).toBe(t.state);
  });

  it('timeout with nothing to time out (between hands) is a no-op', () => {
    const t = playOut(started(), [3, 3, 3, 3]);
    expect(t.state.phase).toBe('handEnd');
    expect(step(t, 1, { type: 'timeout' }, {}, 99_000).res).toMatchObject({ ok: true, noop: true });
  });

  it('timer off: no deadline while the seat to act is connected', () => {
    const t = started({ rules: { timerSec: null } });
    expect(t.state.deadline).toBeNull();
    expect(deadlineFor(t.state)).toBeNull();
    // Seen moments ago, so its 60 s of absence hasn't even started.
    expect(step(t, 2, { type: 'timeout' }, { lastSeenAt: t.now + 600_000 }, 600_000).res.ok).toBe(
      false,
    );
  });

  it('timer off: a seat away for 60 s plays as a timeout would (D14a)', () => {
    let t = started({ rules: { timerSec: null } });
    const start = t.state.turnStartedAt as number;
    const seen = start - 120_000;
    expect(deadlineFor(t.state, seen)).toBe(start + 60_000);
    expect(deadlineFor(t.state, start + 10_000)).toBe(start + 70_000);
    expect(step(t, 2, { type: 'timeout' }, { lastSeenAt: seen }, 59_000).res.ok).toBe(false);
    t = ok(t, 2, { type: 'timeout' }, { lastSeenAt: seen }, 60_000);
    expect(t.state.bids[0]).toBe(1);
  });
});

describe('D12: the Ready step is kept', () => {
  it('draw for deal needs all four seated and ready, and only the host draws', () => {
    let t: Table = { state: lobby(), hands: null, now: T0 };
    for (const s of [0, 1, 2] as Seat[]) t = ok(t, s, { type: 'ready' });
    expect(step(t, 0, { type: 'drawForDeal' }, { draw: drawFor(0) }).res).toMatchObject({
      ok: false,
      error: { reason: 'not-ready' },
    });
    t = ok(t, 3, { type: 'ready' });
    t = ok(t, 3, { type: 'unready' });
    t = ok(t, 3, { type: 'ready' });
    expect(step(t, 1, { type: 'drawForDeal' }, { draw: drawFor(0) }).res).toMatchObject({
      ok: false,
      error: { code: 'not_your_turn' },
    });
    t = ok(t, 0, { type: 'drawForDeal' }, { draw: drawFor(2) });
    expect(t.state.status).toBe('playing');
    expect(t.state.dealer).toBe(2);
  });

  it('the dealer deals; anyone may after 15 s; the deal is the server’s, checked whole', () => {
    let t: Table = { state: lobby(), hands: null, now: T0 };
    for (const s of [0, 1, 2, 3] as Seat[]) t = ok(t, s, { type: 'ready' });
    t = ok(t, 0, { type: 'drawForDeal' }, { draw: drawFor(2) });
    expect(step(t, 1, { type: 'deal' }, { deal: SUIT_DEAL }, 14_000).res).toMatchObject({
      ok: false,
      error: { code: 'not_your_turn' },
    });
    const dup = SUIT_DEAL.map((h, i) => (i === 3 ? [...h.slice(1), card('As')] : h));
    expect(step(t, 2, { type: 'deal' }, { deal: dup }).res).toMatchObject({
      ok: false,
      error: { reason: 'bad-deal' },
    });
    t = ok(t, 1, { type: 'deal' }, { deal: SUIT_DEAL }, 15_000);
    expect(t.state.phase).toBe('bidding');
    expect(t.hands).toEqual(SUIT_DEAL);
  });

  it('seats fill from the lowest free one; a full table and a started game refuse', () => {
    const s = lobby();
    expect(s.seats.map((x) => x.who?.name)).toEqual(['Riya', 'Arjun', 'Dev', 'Meera']);
    expect(sit(s, NEWCOMER, undefined, T0)).toMatchObject({ ok: false, error: { reason: 'full' } });
    const t = started();
    expect(sit(t.state, NEWCOMER, undefined, T0)).toMatchObject({
      ok: false,
      error: { reason: 'started' },
    });
  });

  it('rules change only in the lobby, only by the host', () => {
    const s = lobby();
    const r = setRules(s, 0, rulesWith({ target: 300 }), 'Friday table', T0 + 1);
    expect(r.ok && r.state.rules.target).toBe(300);
    expect(r.ok && r.state.name).toBe('Friday table');
    expect(setRules(s, 1, rulesWith(), undefined, T0)).toMatchObject({
      ok: false,
      error: { code: 'not_your_turn' },
    });
    expect(setRules(s, 0, rulesWith({ target: 55 }), undefined, T0)).toMatchObject({
      ok: false,
      error: { reason: 'bad-rules' },
    });
    expect(setRules(started().state, 0, rulesWith(), undefined, T0)).toMatchObject({
      ok: false,
      error: { reason: 'started' },
    });
  });

  it('shuffle partners gives the host a different partner each time, three in a cycle', () => {
    let t: Table = { state: lobby(), hands: null, now: T0 };
    const partner = () => t.state.seats[partnerOf(t.state.host)].who?.name;
    const seen = [partner()];
    for (let i = 0; i < 3; i++) {
      t = ok(t, t.state.host, { type: 'shufflePartners' });
      seen.push(partner());
    }
    expect(new Set(seen.slice(0, 3)).size).toBe(3);
    expect(seen[3]).toBe(seen[0]);
    expect(t.state.seats[t.state.host].who?.name).toBe('Riya');
  });
});

describe('D14: leaving and the host’s controls', () => {
  /** One hand played (a 85, b 80), then the next dealt. */
  const afterOne = () => {
    let t = playOut(started({ dealer: 3, deal: SUIT_DEAL }), [5, 0, 3, 2]);
    t = ok(t, 0, { type: 'deal' }, { deal: SUIT_DEAL });
    return t;
  };

  it('End game: ends now; completed hands count, the hand in progress is dropped, higher wins', () => {
    let t = afterOne();
    t = ok(t, 1, { type: 'bid', bid: 3 });
    t = ok(t, 0, { type: 'endGame' });
    expect(t.state.status).toBe('finished');
    expect(t.state.history).toHaveLength(1);
    expect(t.state.result).toEqual({ winner: 'a', endedBy: 'end' });
    expect(t.state.turn).toBeNull();
    expect(t.state.deadline).toBeNull();
  });

  it('End game on equal totals is a draw', () => {
    expect(endResult({ a: 120, b: 120 })).toEqual({ winner: 'draw', endedBy: 'end' });
    expect(endResult({ a: 90, b: 120 })).toEqual({ winner: 'b', endedBy: 'end' });
  });

  it('End game in Endless ends the game the host chooses to end', () => {
    let t = playOut(started({ rules: { target: null }, deal: SUIT_DEAL }), [5, 0, 3, 2]);
    expect(t.state.status).toBe('playing');
    t = ok(t, 0, { type: 'endGame' });
    expect(t.state.result).toEqual({ winner: 'a', endedBy: 'end' });
  });

  it('Call it a draw: ends now as a draw for both teams', () => {
    let t = afterOne();
    t = ok(t, 0, { type: 'drawGame' });
    expect(t.state.status).toBe('finished');
    expect(t.state.result).toEqual({ winner: 'draw', endedBy: 'draw' });
  });

  it('Cancel game: no result, at any time, the lobby included', () => {
    let t = afterOne();
    t = ok(t, 0, { type: 'cancelGame' });
    expect(t.state.status).toBe('cancelled');
    expect(t.state.result).toBeNull();
    const l: Table = { state: lobby(), hands: null, now: T0 };
    expect(ok(l, 0, { type: 'cancelGame' }).state.status).toBe('cancelled');
  });

  it('only the host has these, and nothing more happens once a game is over', () => {
    const t = afterOne();
    for (const type of ['endGame', 'drawGame', 'cancelGame'] as const)
      expect(step(t, 1, { type }).res).toMatchObject({
        ok: false,
        error: { code: 'not_your_turn' },
      });
    const over = ok(t, 0, { type: 'drawGame' });
    expect(step(over, 1, { type: 'bid', bid: 3 }).res).toMatchObject({
      ok: false,
      error: { reason: 'finished' },
    });
    const l: Table = { state: lobby(), hands: null, now: T0 };
    expect(step(l, 0, { type: 'endGame' }).res).toMatchObject({
      ok: false,
      error: { reason: 'not-started' },
    });
  });

  it('Replace: the host opens an away seat between tricks; the newcomer takes over hand and score', () => {
    let t = started({ dealer: 3, deal: SUIT_DEAL });
    t = ok(t, 1, { type: 'timeout' }, {}, 31_000);
    for (const b of [3, 3, 4]) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
    expect(step(t, 0, { type: 'replace', seat: 2 }).res).toMatchObject({
      ok: false,
      error: { reason: 'not-away' },
    });
    t = ok(t, 2, { type: 'timeout' }, {}, 31_000);
    // Seat 0 (the host) is now away, so the host can't replace it; make seat 1 away instead.
    expect(step(t, 0, { type: 'replace', seat: 0 }).res).toMatchObject({
      ok: false,
      error: { reason: 'host-seat' },
    });
    const away1 = (x: Table): Table => ({
      ...x,
      state: {
        ...x.state,
        seats: x.state.seats.map((z, i) => (i === 1 ? { ...z, away: true } : z)),
      },
    });
    // Seat 0 led 2♠ on its timeout, so a trick is on the table.
    expect(step(away1(t), 0, { type: 'replace', seat: 1 }).res).toMatchObject({
      ok: false,
      error: { reason: 'mid-trick' },
    });
    let u = t;
    for (const s of [1, 2, 3] as Seat[]) {
      const h = u.hands as Card[][];
      u = ok(u, s, { type: 'play', card: legalPlays(h[s], u.state.trick, u.state.broken)[0] });
    }
    u = ok(away1(u), 0, { type: 'replace', seat: 1 });
    expect(u.state.paused).toBe('replace');
    expect(u.state.seats[1].who).toBeNull();
    expect(step(u, 0, { type: 'play', card: card('3s') }).res).toMatchObject({
      ok: false,
      error: { reason: 'paused' },
    });
    const r = sit(u.state, NEWCOMER, 1, u.now + 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.paused).toBeNull();
    expect(r.state.seats[1]).toMatchObject({ who: NEWCOMER, away: false, timeouts: 0 });
    expect(r.state.bids[1]).toBe(3);
    expect(viewFor(r.state, u.hands, 1, u.now).me.hand).toHaveLength(12);
  });

  it('Rematch: the host starts one once the game is over', () => {
    const t = afterOne();
    expect(step(t, 0, { type: 'rematch', id: 'next-1' }).res).toMatchObject({
      ok: false,
      error: { reason: 'not-finished' },
    });
    const over = ok(t, 0, { type: 'drawGame' });
    const r = ok(over, 0, { type: 'rematch', id: 'next-1' });
    expect(r.state.next).toBe('next-1');
    expect(step(r, 0, { type: 'rematch', id: 'next-2' }).res).toMatchObject({
      ok: false,
      error: { reason: 'already' },
    });
  });

  it('a hand in history records who played each seat', () => {
    const t = afterOne();
    expect(t.state.history[0].players).toEqual(WHO.map((w) => w.playerId));
  });
});
