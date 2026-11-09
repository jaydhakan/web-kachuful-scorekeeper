import {
  auction,
  dealerFor,
  speakingOrder,
  standings,
  totals,
  validate,
  type CardRef,
  type KtGame,
} from '@/games/kaali-teeri/domain';
import { kitGame, T0 } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import { UNDO_LIMIT } from '@/state/undo';
import { initialKtState, ktReducer, setupRules } from './reducer';
import { curHand, minNextBid, preview, shownPoints } from './select';
import { DEFAULT_PREFS, type KtAction, type KtLastGroup, type KtState } from './types';

const run = (s: KtState, ...as: KtAction[]) => as.reduce(ktReducer, s);
const empty = (prefs = DEFAULT_PREFS) => initialKtState(null, 'home', [], prefs);
const seat = (name: string, playerId?: string) => ({
  name,
  emoji: '🙂',
  color: '#FF8A65',
  ...(playerId && { playerId }),
});
const NAMES = ['Riya', 'Aarav', 'Kabir', 'Meera', 'Dev', 'Isha', 'Neel', 'Tara', 'Om', 'Zoya'];

/** A game begun through setup: n seats, dealer `dealer`, quick mode unless the prefs say otherwise. */
function started(n = 5, o: { dealer?: number; prefs?: KtState['prefs']; more?: KtAction[] } = {}) {
  const seats = NAMES.slice(0, n).map((x) => seat(x));
  return run(
    empty(o.prefs),
    { type: 'startSetup', lg: null },
    { type: 'setupCount', n },
    ...seats.map((q, k): KtAction => ({ type: 'setupSeat', k, seat: q })),
    { type: 'setupDealer', k: o.dealer ?? 0 },
    ...(o.more ?? []),
    {
      type: 'beginGame',
      id: 'kt1',
      syncId: 'sync-kt1',
      now: 1_000,
      playerIds: seats.map((_, i) => 'reg' + i),
    },
  );
}
const g = (s: KtState) => s.game!;
const ids = (s: KtState) => g(s).players.map((p) => p.id);
const card = (rank: CardRef['rank'], suit: CardRef['suit'], copy?: CardRef['copy']): CardRef => ({
  rank,
  suit,
  ...(copy !== undefined && { copy }),
});
const CARDS: CardRef[] = [
  card('A', 'hearts'),
  card('K', 'hearts'),
  card('Q', 'hearts'),
  card('J', 'hearts'),
];

/** Bid (quick), trump, the call, every card played, result entered as the defenders' points. */
function playHand(
  s: KtState,
  o: { bidder?: number; bid?: number; def?: number; by?: number[] } = {},
) {
  const n = g(s).players.length,
    partners = g(s).rules.partners,
    decks = g(s).rules.decks;
  const p = ids(s);
  const bidder = o.bidder ?? 0;
  let st = run(
    s,
    { type: 'quickBid', bidder: p[bidder], bid: o.bid ?? g(s).rules.minBid },
    { type: 'trump', suit: 'spades' },
    ...CARDS.slice(0, partners).map((c): KtAction => ({
      type: 'addCard',
      card: decks === 2 ? { ...c, copy: 1 } : c,
    })),
    { type: 'confirmCall' },
  );
  for (let i = 0; i < partners; i++)
    st = run(st, { type: 'markPlayed', i, by: p[o.by?.[i] ?? (bidder + 1 + i) % n] });
  return run(
    st,
    { type: 'toResult' },
    { type: 'points', entered: o.def ?? 60 },
    { type: 'confirmHand' },
  );
}

/** The reducer leaves illegal actions alone: the very same state comes back. */
const ignored = (s: KtState, a: KtAction) => expect(ktReducer(s, a)).toBe(s);

describe('setup', () => {
  it('starts on 4 seats, clockwise, the deck defaults, from nothing', () => {
    const s = run(empty(), { type: 'startSetup', lg: null });
    expect(s.screen).toBe('setup');
    expect(s.setup).toMatchObject({
      step: 1,
      n: 4,
      dir: 'cw',
      minBid: null,
      bidStep: 5,
      length: 'endless',
    });
    expect(s.setup!.seats).toEqual([null, null, null, null]);
    expect(setupRules(s.setup!)).toEqual({
      decks: 1,
      partners: 1,
      minBid: 150,
      step: 5,
      length: 'endless',
    });
  });

  it('starts from the last group: its count, direction and rules', () => {
    const lg: KtLastGroup = {
      players: NAMES.slice(0, 7).map((x) => seat(x)),
      direction: 'ccw',
      minBid: 400,
      step: 10,
      length: 'to1000',
      at: 1,
    };
    const s = run(empty(), { type: 'startSetup', lg });
    expect(s.setup).toMatchObject({ n: 7, dir: 'ccw', minBid: 400, bidStep: 10, length: 'to1000' });
    expect(s.setup!.seats.every((q) => q === null)).toBe(true);
    const seated = run(s, { type: 'setupLastGroup' });
    expect(seated.setup!.seats.map((q) => q?.name)).toEqual(NAMES.slice(0, 7));
    // A broken group is ignored rather than trusted.
    const bad = run(empty(), { type: 'startSetup', lg: { ...lg, players: [], minBid: 3 } });
    expect(bad.setup).toMatchObject({ n: 4, minBid: null, dir: 'cw' });
    ignored(bad, { type: 'setupLastGroup' });
  });

  it('player count: 4 to 10; seats, dealer and a custom minimum follow', () => {
    let s = run(empty(), { type: 'startSetup', lg: null }, { type: 'setupCount', n: 6 });
    s = run(s, { type: 'setupSeat', k: 5, seat: seat('Isha') }, { type: 'setupDealer', k: 5 });
    s = run(s, { type: 'setupMinBid', minBid: 200 });
    expect(s.setup!.minBid).toBe(200);
    for (const n of [3, 11, 5.5]) ignored(s, { type: 'setupCount', n });
    const five = run(s, { type: 'setupCount', n: 5 });
    expect(five.setup).toMatchObject({ n: 5, dealer: 0, minBid: 200 });
    expect(five.setup!.seats).toHaveLength(5);
    // Two decks: 200 is below their range, so the minimum goes back to the deck's (350).
    const seven = run(s, { type: 'setupCount', n: 7 });
    expect(seven.setup!.minBid).toBe(null);
    expect(setupRules(seven.setup!)).toMatchObject({ decks: 2, partners: 2, minBid: 350 });
  });

  it('minimum bid: half the deck + 5 to the deck − 5, on the step; the default is stored as null', () => {
    const s = run(empty(), { type: 'startSetup', lg: null });
    for (const minBid of [125, 250, 152, 132.5]) ignored(s, { type: 'setupMinBid', minBid });
    expect(run(s, { type: 'setupMinBid', minBid: 130 }).setup!.minBid).toBe(130);
    expect(run(s, { type: 'setupMinBid', minBid: 245 }).setup!.minBid).toBe(245);
    expect(run(s, { type: 'setupMinBid', minBid: 150 }).setup!.minBid).toBe(null);
    expect(
      run(s, { type: 'setupMinBid', minBid: 200 }, { type: 'setupMinBid', minBid: null }).setup!
        .minBid,
    ).toBe(null);
  });

  it('bid step 10 moves a custom minimum onto it', () => {
    const s = run(empty(), { type: 'startSetup', lg: null });
    expect(
      run(s, { type: 'setupMinBid', minBid: 155 }, { type: 'setupBidStep', step: 10 }).setup,
    ).toMatchObject({ bidStep: 10, minBid: 160 });
    expect(
      run(s, { type: 'setupMinBid', minBid: 245 }, { type: 'setupBidStep', step: 10 }).setup!
        .minBid,
    ).toBe(240);
    expect(
      run(s, { type: 'setupMinBid', minBid: 145 }, { type: 'setupBidStep', step: 10 }).setup!
        .minBid,
    ).toBe(null);
    const ten = run(s, { type: 'setupBidStep', step: 10 });
    ignored(ten, { type: 'setupMinBid', minBid: 165 });
    ignored(s, { type: 'setupBidStep', step: 7 as 5 });
  });

  it('direction and length', () => {
    const s = run(empty(), { type: 'startSetup', lg: null });
    expect(
      run(s, { type: 'setupDir', dir: 'ccw' }, { type: 'setupLength', length: 'to1000' }).setup,
    ).toMatchObject({ dir: 'ccw', length: 'to1000' });
    ignored(s, { type: 'setupDir', dir: 'up' as 'cw' });
    ignored(s, { type: 'setupLength', length: '8hands' as 'endless' });
  });

  it('seats: one person per seat; swap carries the dealer; patching keeps names unique', () => {
    let s = run(empty(), { type: 'startSetup', lg: null });
    s = run(
      s,
      { type: 'setupSeat', k: 0, seat: seat('Riya', 'r') },
      { type: 'setupSeat', k: 1, seat: seat('Dev') },
    );
    ignored(s, { type: 'setupSeat', k: 2, seat: seat(' riya ') });
    ignored(s, { type: 'setupSeat', k: 2, seat: seat('Someone', 'r') });
    ignored(s, { type: 'setupSeat', k: 4, seat: seat('Kabir') });
    ignored(s, { type: 'setupSeatPatch', k: 1, patch: { name: 'RIYA' } });
    ignored(s, { type: 'setupSeatPatch', k: 3, patch: { name: 'Om' } });
    expect(
      run(s, { type: 'setupSeatPatch', k: 1, patch: { emoji: '🦊' } }).setup!.seats[1]!.emoji,
    ).toBe('🦊');
    expect(run(s, { type: 'setupSeat', k: 0, seat: null }).setup!.seats[0]).toBe(null);
    s = run(s, { type: 'setupDealer', k: 1 }, { type: 'setupSwap', a: 1, b: 3 });
    expect(s.setup!.seats[3]!.name).toBe('Dev');
    expect(s.setup!.dealer).toBe(3);
    expect(run(s, { type: 'setupSwap', a: 3, b: 0 }).setup!.dealer).toBe(0);
    expect(run(s, { type: 'setupSwap', a: 0, b: 2 }).setup!.dealer).toBe(3);
    ignored(s, { type: 'setupSwap', a: 0, b: 4 });
    ignored(s, { type: 'setupDealer', k: 4 });
  });

  it('step 3 needs every seat filled', () => {
    const s = run(empty(), { type: 'startSetup', lg: null }, { type: 'setupStep', step: 2 });
    expect(s.setup!.step).toBe(2);
    ignored(s, { type: 'setupStep', step: 3 });
    const full = run(
      s,
      ...NAMES.slice(0, 4).map((x, k): KtAction => ({ type: 'setupSeat', k, seat: seat(x) })),
    );
    expect(run(full, { type: 'setupStep', step: 3 }).setup!.step).toBe(3);
  });

  it('setup actions without a setup are ignored', () => {
    ignored(empty(), { type: 'setupCount', n: 5 });
    ignored(empty(), { type: 'beginGame', id: 'x', syncId: 'y', now: 1, playerIds: [] });
  });
});

describe('beginning a game', () => {
  it('builds the game from the setup', () => {
    const s = started(5, {
      dealer: 2,
      more: [
        { type: 'setupMinBid', minBid: 160 },
        { type: 'setupDir', dir: 'ccw' },
      ],
    });
    expect(s.screen).toBe('game');
    expect(s.setup).toBe(null);
    expect(s.deal).toEqual({ index: 0, prev: null });
    expect(g(s)).toMatchObject({
      kind: 'kaali-teeri',
      schemaVersion: 1,
      id: 'kt1',
      syncId: 'sync-kt1',
      rev: 1,
      createdAt: 1_000,
      firstDealerIndex: 2,
      direction: 'ccw',
      status: 'active',
      rules: { decks: 1, partners: 1, minBid: 160, step: 5, length: 'endless' },
      ui: { view: 'hand' },
    });
    expect(g(s).players.map((p) => [p.name, p.playerId])).toEqual(
      NAMES.slice(0, 5).map((x, i) => [x, 'reg' + i]),
    );
    expect(g(s).hands).toEqual([
      {
        index: 0,
        dealerIndex: 2,
        phase: 'bidding',
        mode: 'quick',
        calls: [],
        bidder: null,
        bid: null,
        trump: null,
        called: [],
        playedBy: [],
        teamPoints: null,
        countedBy: null,
      },
    ]);
    expect(validate(g(s), Infinity)).toBe(null);
  });

  it('opens in the auction when this device prefers it', () => {
    expect(curHand(g(started(4, { prefs: { quick: false, countedBy: 'defenders' } }))).mode).toBe(
      'auction',
    );
  });

  it('refuses empty seats, missing or repeated registry ids', () => {
    const s = run(
      empty(),
      { type: 'startSetup', lg: null },
      ...NAMES.slice(0, 3).map((x, k): KtAction => ({ type: 'setupSeat', k, seat: seat(x) })),
    );
    ignored(s, {
      type: 'beginGame',
      id: 'a',
      syncId: 'b',
      now: 1,
      playerIds: ['1', '2', '3', '4'],
    });
    const full = run(s, { type: 'setupSeat', k: 3, seat: seat('Om') });
    ignored(full, {
      type: 'beginGame',
      id: 'a',
      syncId: 'b',
      now: 1,
      playerIds: ['1', '2', '3', '3'],
    });
    ignored(full, {
      type: 'beginGame',
      id: 'a',
      syncId: 'b',
      now: 1,
      playerIds: ['1', '2', '3', ''],
    });
    ignored(full, { type: 'beginGame', id: 'a', syncId: 'b', now: 1, playerIds: ['1', '2', '3'] });
  });
});

describe('quick bid', () => {
  it('records the winner and amount, then asks for trump', () => {
    const s = started();
    const b = run(s, { type: 'quickBid', bidder: ids(s)[3], bid: 180 });
    expect(curHand(g(b))).toMatchObject({
      phase: 'calling',
      bidder: ids(s)[3],
      bid: 180,
      calls: [],
    });
    expect(g(b).rev).toBe(2);
    expect(b.undo).toHaveLength(1);
    expect(b.toast).toMatchObject({ msg: 'Meera · 180', undo: true });
  });

  it('ignores an amount off the rules, an unknown bidder, or the auction', () => {
    const s = started();
    for (const bid of [145, 152, 255, 150.5])
      ignored(s, { type: 'quickBid', bidder: ids(s)[0], bid });
    ignored(s, { type: 'quickBid', bidder: 'nobody', bid: 150 });
    expect(run(s, { type: 'quickBid', bidder: ids(s)[0], bid: 250 }).game!.hands[0].bid).toBe(250);
    const a = run(s, { type: 'setMode', mode: 'auction' });
    ignored(a, { type: 'quickBid', bidder: ids(s)[0], bid: 150 });
    const b = run(s, { type: 'quickBid', bidder: ids(s)[0], bid: 150 });
    ignored(b, { type: 'quickBid', bidder: ids(s)[1], bid: 160 });
  });
});

describe('quick / auction switch', () => {
  it('is remembered for the device and switches the hand being bid', () => {
    const s = started();
    const a = run(s, { type: 'setMode', mode: 'auction' });
    expect(a.prefs.quick).toBe(false);
    expect(curHand(g(a)).mode).toBe('auction');
    const called = run(a, { type: 'call', what: 160 });
    const back = run(called, { type: 'setMode', mode: 'quick' });
    expect(curHand(g(back))).toMatchObject({ mode: 'quick', calls: [] });
    expect(back.prefs.quick).toBe(true);
    // The cleared call is said, with Undo; switching with no calls says nothing.
    expect(back.toast).toMatchObject({ msg: 'Quick mode: 1 auction call cleared', undo: true });
    expect(a.toast?.msg).not.toMatch(/cleared/);
    // Same mode: only the preference is touched.
    const same = run(s, { type: 'setMode', mode: 'quick' });
    expect(same.game).toBe(s.game);
    ignored(s, { type: 'setMode', mode: 'silent' as 'quick' });
  });

  it('after bidding it changes only the preference', () => {
    const s = run(started(), { type: 'quickBid', bidder: 'x', bid: 150 });
    const b = run(started(), { type: 'quickBid', bidder: started().game!.players[0].id, bid: 150 });
    expect(s.game!.hands[0].phase).toBe('bidding');
    const t = run(b, { type: 'setMode', mode: 'auction' });
    expect(t.game).toBe(b.game);
    expect(t.prefs.quick).toBe(false);
  });

  it('works with no game (from setup or home)', () => {
    expect(run(empty(), { type: 'setMode', mode: 'auction' }).prefs.quick).toBe(false);
  });
});

describe('auction', () => {
  const auc = (n = 5) => started(n, { prefs: { quick: false, countedBy: 'defenders' } });
  const order = (s: KtState) => speakingOrder(g(s), curHand(g(s)).index);

  it('runs turn by turn; a passer may come back; it ends when the rest pass in a row', () => {
    const s = auc();
    const o = order(s);
    expect(o[0]).toBe(ids(s)[1]);
    let st = run(
      s,
      { type: 'call', what: 160 },
      { type: 'call', what: 'pass' },
      { type: 'call', what: 170 },
    );
    expect(curHand(g(st)).calls).toEqual([
      { playerId: o[0], bid: 160 },
      { playerId: o[1], pass: true },
      { playerId: o[2], bid: 170 },
    ]);
    // Seat 2 of the order passed and bids again on its next turn.
    st = run(
      st,
      { type: 'call', what: 'pass' },
      { type: 'call', what: 'pass' },
      { type: 'call', what: 'pass' },
      { type: 'call', what: 180 },
    );
    expect(auction(curHand(g(st)).calls, o, g(st).rules)).toMatchObject({
      high: 180,
      holder: o[1],
      done: false,
    });
    st = run(st, ...Array.from({ length: 4 }, (): KtAction => ({ type: 'call', what: 'pass' })));
    expect(curHand(g(st))).toMatchObject({ phase: 'calling', bidder: o[1], bid: 180 });
    expect(st.banner?.text).toBe(
      `${g(st).players.find((p) => p.id === o[1])!.name} wins the bid at 180`,
    );
    expect(st.undo).toHaveLength(11);
    expect(validate(g(st), Infinity)).toBe(null);
    ignored(st, { type: 'call', what: 'pass' });
  });

  it('ignores a bid that is not higher, off the step, past the deck, or a forced take too early', () => {
    const s = run(auc(), { type: 'call', what: 170 });
    for (const what of [170, 165, 172, 255] as const) ignored(s, { type: 'call', what });
    ignored(s, { type: 'call', what: 'forced' });
    ignored(auc(), { type: 'call', what: 145 });
  });

  it('when everyone passes the first speaker must take it at the minimum', () => {
    let s = run(
      auc(4),
      ...Array.from({ length: 4 }, (): KtAction => ({ type: 'call', what: 'pass' })),
    );
    ignored(s, { type: 'call', what: 150 });
    ignored(s, { type: 'call', what: 'pass' });
    s = run(s, { type: 'call', what: 'forced' });
    expect(curHand(g(s))).toMatchObject({ phase: 'calling', bidder: order(s)[0], bid: 150 });
    expect(s.banner!.text).toMatch(/Nobody bid — .* takes it at 150/);
    expect(validate(g(s), Infinity)).toBe(null);
  });
});

describe('trump and the call', () => {
  const bid = (n = 5) => {
    const s = started(n);
    return run(s, { type: 'quickBid', bidder: ids(s)[0], bid: n > 6 ? 350 : 150 });
  };

  it('trump is any suit, changeable until the call is confirmed', () => {
    const s = run(bid(), { type: 'trump', suit: 'hearts' });
    expect(curHand(g(s)).trump).toBe('hearts');
    expect(curHand(g(run(s, { type: 'trump', suit: 'clubs' }))).trump).toBe('clubs');
    ignored(s, { type: 'trump', suit: 'hearts' });
    ignored(s, { type: 'trump', suit: 'stars' as 'hearts' });
    ignored(started(), { type: 'trump', suit: 'hearts' });
  });

  it('adds cards still in the deck, never twice, never more than the partners', () => {
    const s = bid(6);
    // Six players: all four 2s are out.
    ignored(s, { type: 'addCard', card: card('2', 'hearts') });
    ignored(s, { type: 'addCard', card: card('A', 'hearts', 1) });
    const one = run(s, { type: 'addCard', card: { ...card('A', 'hearts'), extra: 1 } as CardRef });
    expect(curHand(g(one))).toMatchObject({ called: [card('A', 'hearts')], playedBy: [null] });
    ignored(one, { type: 'addCard', card: card('A', 'hearts') });
    const two = run(one, { type: 'addCard', card: card('3', 'spades') });
    ignored(two, { type: 'addCard', card: card('K', 'hearts') });
    const removed = run(two, { type: 'removeCard', i: 0 });
    expect(curHand(g(removed))).toMatchObject({ called: [card('3', 'spades')], playedBy: [null] });
    ignored(two, { type: 'removeCard', i: 2 });
  });

  it('two decks: each card names its copy; "the other one" stands alone', () => {
    const s = bid(7);
    ignored(s, { type: 'addCard', card: card('A', 'hearts') });
    // 7 players: both 2♣ are out, so a 2 isn't callable, and a card out of one deck has no copy to name.
    const a = run(s, { type: 'addCard', card: card('A', 'hearts', 1) });
    ignored(a, { type: 'addCard', card: card('A', 'hearts', 1) });
    ignored(a, { type: 'addCard', card: card('A', 'hearts', 'other') });
    const both = run(a, { type: 'addCard', card: card('A', 'hearts', 2) });
    expect(curHand(g(both)).called).toHaveLength(2);
    ignored(both, { type: 'setCopy', i: 0, copy: 2 });
    ignored(both, { type: 'setCopy', i: 0, copy: 'other' });
    const other = run(a, { type: 'setCopy', i: 0, copy: 'other' });
    expect(curHand(g(other)).called[0]).toEqual(card('A', 'hearts', 'other'));
    ignored(other, { type: 'setCopy', i: 0, copy: 'other' });
    ignored(other, { type: 'setCopy', i: 3, copy: 1 });
    // One deck: nothing to choose.
    const single = run(bid(5), { type: 'addCard', card: card('A', 'hearts') });
    ignored(single, { type: 'setCopy', i: 0, copy: 1 });
  });

  it('confirming needs trump and every partner called', () => {
    const s = bid(6);
    const cards = run(
      s,
      { type: 'addCard', card: card('A', 'hearts') },
      { type: 'addCard', card: card('K', 'hearts') },
    );
    ignored(cards, { type: 'confirmCall' });
    const half = run(
      s,
      { type: 'trump', suit: 'spades' },
      { type: 'addCard', card: card('A', 'hearts') },
    );
    ignored(half, { type: 'confirmCall' });
    const ok = run(cards, { type: 'trump', suit: 'spades' }, { type: 'confirmCall' });
    expect(curHand(g(ok)).phase).toBe('playing');
    ignored(ok, { type: 'addCard', card: card('Q', 'hearts') });
    ignored(ok, { type: 'removeCard', i: 0 });
    expect(validate(g(ok), Infinity)).toBe(null);
  });
});

describe('playing and the result', () => {
  const playing = (n = 5) => {
    const s = started(n);
    const two = n > 6;
    return run(
      s,
      { type: 'quickBid', bidder: ids(s)[0], bid: two ? 400 : 180 },
      { type: 'trump', suit: 'spades' },
      ...CARDS.slice(0, g(s).rules.partners).map((c, i): KtAction => ({
        type: 'addCard',
        card: two ? { ...c, copy: i === 0 ? 'other' : 1 } : c,
      })),
      { type: 'confirmCall' },
    );
  };

  it('any seat can be marked, the bidder too; marks can change or clear', () => {
    const s = playing();
    const p = ids(s);
    const own = run(s, { type: 'markPlayed', i: 0, by: p[0] });
    expect(curHand(g(own)).playedBy).toEqual([p[0]]);
    expect(own.undo).toHaveLength(s.undo.length + 1);
    expect(curHand(g(run(own, { type: 'markPlayed', i: 0, by: p[2] }))).playedBy).toEqual([p[2]]);
    expect(curHand(g(run(own, { type: 'markPlayed', i: 0, by: null }))).playedBy).toEqual([null]);
    ignored(own, { type: 'markPlayed', i: 0, by: p[0] });
    ignored(s, { type: 'markPlayed', i: 0, by: 'stranger' });
    ignored(s, { type: 'markPlayed', i: 1, by: p[1] });
    ignored(started(), { type: 'markPlayed', i: 0, by: p[1] });
  });

  it('"the other one" is never the bidder\'s', () => {
    const s = playing(7);
    ignored(s, { type: 'markPlayed', i: 0, by: ids(s)[0] });
    expect(curHand(g(run(s, { type: 'markPlayed', i: 1, by: ids(s)[0] }))).playedBy).toEqual([
      null,
      ids(s)[0],
    ]);
  });

  it("points: the defenders' by default, the other side worked out; a switch keeps the number typed", () => {
    const s = run(
      playing(),
      { type: 'markPlayed', i: 0, by: ids(playing())[2] },
      { type: 'toResult' },
    );
    expect(curHand(g(s))).toMatchObject({
      phase: 'result',
      countedBy: 'defenders',
      teamPoints: null,
    });
    const sixty = run(s, { type: 'points', entered: 60 });
    expect(curHand(g(sixty))).toMatchObject({ teamPoints: 190, countedBy: 'defenders' });
    expect(sixty.undo).toBe(s.undo);
    const flipped = run(sixty, { type: 'countedBy', by: 'bidders' });
    expect(curHand(g(flipped))).toMatchObject({ teamPoints: 60, countedBy: 'bidders' });
    expect(flipped.prefs.countedBy).toBe('bidders');
    for (const entered of [-5, 255, 62, 12.5]) ignored(sixty, { type: 'points', entered });
    expect(curHand(g(run(sixty, { type: 'points', entered: null }))).teamPoints).toBe(null);
    ignored(s, { type: 'points', entered: null });
    ignored(s, { type: 'countedBy', by: 'defenders' });
    ignored(s, { type: 'countedBy', by: 'both' as 'defenders' });
    // Switching before any number only changes the side.
    expect(curHand(g(run(s, { type: 'countedBy', by: 'bidders' })))).toMatchObject({
      countedBy: 'bidders',
      teamPoints: null,
    });
  });

  it('a device that counts the bidding team starts the result there', () => {
    const s = run(
      playing(),
      { type: 'countedBy', by: 'bidders' },
      { type: 'toResult' },
      { type: 'points', entered: 190 },
    );
    expect(curHand(g(s))).toMatchObject({ countedBy: 'bidders', teamPoints: 190 });
  });

  it('back to play clears the points', () => {
    const s = run(
      playing(),
      { type: 'toResult' },
      { type: 'points', entered: 60 },
      { type: 'toPlay' },
    );
    expect(curHand(g(s))).toMatchObject({ phase: 'playing', teamPoints: null, countedBy: null });
    ignored(s, { type: 'toPlay' });
    ignored(s, { type: 'points', entered: 60 });
    ignored(started(), { type: 'toResult' });
  });

  it('confirming needs the points and every called card played', () => {
    const s = run(playing(), { type: 'toResult' }, { type: 'points', entered: 60 });
    ignored(s, { type: 'confirmHand' });
    ignored(run(playing(), { type: 'toResult' }, { type: 'markPlayed', i: 0, by: ids(s)[1] }), {
      type: 'confirmHand',
    });
    const done = run(s, { type: 'markPlayed', i: 0, by: ids(s)[1] }, { type: 'confirmHand' });
    const h = g(done).hands[0];
    expect(h.phase).toBe('done');
    expect(h.doneAt).toEqual(expect.any(Number));
    expect(g(done).ui.view).toBe('summary');
    expect(done.toast).toMatchObject({ msg: 'Hand 1 saved', undo: true });
    // Made at 180 with one partner: 180 each, never stored.
    expect(totals(g(done))).toEqual({
      [ids(s)[0]]: 180,
      [ids(s)[1]]: 180,
      [ids(s)[2]]: 0,
      [ids(s)[3]]: 0,
      [ids(s)[4]]: 0,
    });
    expect(validate(g(done), Infinity)).toBe(null);
  });

  it('preview shows what confirming would score', () => {
    const s = run(
      playing(),
      { type: 'markPlayed', i: 0, by: ids(playing())[0] },
      { type: 'toResult' },
    );
    expect(preview(g(s), 60, 'defenders')).toMatchObject({
      teamPoints: 190,
      made: true,
      sweep: 'none',
      slots: { [ids(s)[0]]: 2 },
    });
    expect(preview(g(s), 60, 'defenders')!.scores[ids(s)[0]]).toBe(360);
    expect(preview(g(s), 250, 'defenders')).toMatchObject({ made: false, sweep: 'defenders' });
  });
});

describe('between hands', () => {
  it("the next hand: dealer moves on, bidding again in this device's mode", () => {
    let s = playHand(started(5, { dealer: 3 }));
    ignored(started(), { type: 'nextHand' });
    s = run(s, { type: 'setMode', mode: 'auction' }, { type: 'nextHand' });
    expect(g(s).hands).toHaveLength(2);
    expect(curHand(g(s))).toMatchObject({
      index: 1,
      dealerIndex: 4,
      phase: 'bidding',
      mode: 'auction',
    });
    expect(g(s).ui.view).toBe('hand');
    expect(s.deal).toEqual({ index: 1, prev: 3 });
    expect(run(s, { type: 'dealDone' }).deal).toBe(null);
    ignored(s, { type: 'nextHand' });
    s = playHand(run(s, { type: 'setMode', mode: 'quick' }), { bidder: 2 });
    s = run(s, { type: 'nextHand' });
    expect(curHand(g(s)).dealerIndex).toBe(0);
    expect(dealerFor(g(s), 2)).toBe(0);
  });

  it('first to 1000 ends after the hand that reaches it', () => {
    let s = started(4, { more: [{ type: 'setupLength', length: 'to1000' }] });
    // Bidder and partner sweep (250 each) four times.
    for (let i = 0; i < 3; i++) s = run(playHand(s, { def: 0 }), { type: 'nextHand' });
    expect(g(s).status).toBe('active');
    s = playHand(s, { def: 0 });
    expect(g(s).status).toBe('finished');
    expect(g(s).finishedAt).toBe(g(s).hands[3].doneAt);
    expect(s.screen).toBe('winner');
    expect(s.fresh).toBe(true);
    expect(standings(g(s))[0].t).toBe(1000);
    expect(validate(g(s), Infinity)).toBe(null);
    ignored(s, { type: 'nextHand' });
    ignored(s, { type: 'quickBid', bidder: ids(s)[0], bid: 150 });
  });

  it('endless games play on past 1000', () => {
    let s = started(4);
    for (let i = 0; i < 5; i++) s = run(playHand(s, { def: 0 }), { type: 'nextHand' });
    expect(g(s).status).toBe('active');
  });
});

describe('ending a game', () => {
  it('finish: needs a hand done; the hand in play is dropped', () => {
    const s = started();
    ignored(s, { type: 'finishGame' });
    const one = run(
      playHand(s),
      { type: 'nextHand' },
      { type: 'quickBid', bidder: ids(s)[1], bid: 160 },
    );
    const f = run(one, { type: 'modal', modal: 'finish' }, { type: 'finishGame' });
    expect(g(f)).toMatchObject({ status: 'finished' });
    expect(g(f).hands).toHaveLength(1);
    expect(g(f).finishedAt).toEqual(expect.any(Number));
    expect(f).toMatchObject({ screen: 'winner', fresh: true, modal: null });
    expect(validate(g(f), Infinity)).toBe(null);
    ignored(f, { type: 'finishGame' });
    expect(run(f, { type: 'setFresh', v: false }).fresh).toBe(false);
  });

  it('abandon: no hand done leaves no game; with hands it ends and goes home', () => {
    const s = run(started(), { type: 'quickBid', bidder: ids(started())[0], bid: 150 });
    const gone = run(s, { type: 'abandon' });
    expect(gone).toMatchObject({ game: null, undo: [], screen: 'home' });
    ignored(gone, { type: 'abandon' });
    const played = run(playHand(started()), { type: 'nextHand' });
    const ended = run(played, { type: 'abandon' });
    expect(g(ended).status).toBe('finished');
    expect(g(ended).hands).toHaveLength(1);
    expect(ended.screen).toBe('home');
    expect(ended.toast).toMatchObject({ undo: true });
    expect(g(run(ended, { type: 'undo' })).status).toBe('active');
  });

  it('rematch: same seats and rules, the next dealer, the old game one Undo away', () => {
    const f = run(
      playHand(started(5, { dealer: 4, more: [{ type: 'setupMinBid', minBid: 200 }] })),
      { type: 'finishGame' },
    );
    const r = run(f, { type: 'rematch', id: 'kt2', syncId: 'sync-kt2', now: 9_000 });
    expect(g(r)).toMatchObject({
      id: 'kt2',
      syncId: 'sync-kt2',
      firstDealerIndex: 0,
      status: 'active',
      rev: 1,
    });
    expect(g(r).players).toEqual(g(f).players);
    expect(g(r).rules).toEqual(g(f).rules);
    expect(g(r).hands).toHaveLength(1);
    expect(r).toMatchObject({ screen: 'game', fresh: f.fresh, deal: { index: 0, prev: null } });
    expect(r.undo).toHaveLength(1);
    expect(r.toast!.msg).toBe('Previous game saved to History');
    ignored(empty(), { type: 'rematch', id: 'a', syncId: 'b', now: 1 });
  });

  it('a new game over one with no hand done leaves no undo trail', () => {
    const s = run(started(), { type: 'startSetup', lg: null });
    expect(s.screen).toBe('setup');
    const again = run(
      s,
      { type: 'setupCount', n: 4 },
      ...NAMES.slice(0, 4).map((x, k): KtAction => ({ type: 'setupSeat', k, seat: seat(x) })),
      { type: 'beginGame', id: 'kt3', syncId: 's3', now: 5, playerIds: ['a', 'b', 'c', 'd'] },
    );
    expect(again.undo).toEqual([]);
    expect(again.toast).toBe(null);
  });
});

describe('editing a done hand', () => {
  const twoHands = () =>
    run(playHand(run(playHand(started()), { type: 'nextHand' }), { bidder: 1 }));

  it('changes the hand and the totals follow', () => {
    const s = twoHands();
    const p = ids(s);
    const before = totals(g(s));
    const e = run(s, {
      type: 'editHand',
      i: 0,
      edit: {
        bidder: p[0],
        bid: 200,
        trump: 'hearts',
        called: [card('K', 'clubs')],
        playedBy: [p[0]],
        entered: 40,
        countedBy: 'defenders',
      },
    });
    expect(g(e).hands[0]).toMatchObject({
      bid: 200,
      trump: 'hearts',
      teamPoints: 210,
      playedBy: [p[0]],
      phase: 'done',
    });
    expect(totals(g(e))[p[0]]).toBe(before[p[0]] + 400 - 150);
    expect(e.sheet).toEqual({ type: 'board' });
    expect(e.toast).toMatchObject({ msg: 'Hand 1 updated', undo: true });
    expect(g(e).rev).toBe(g(s).rev + 1);
    expect(totals(g(run(e, { type: 'undo' })))).toEqual(before);
  });

  it('ignores an edit the rules refuse, or a hand not done', () => {
    const s = twoHands();
    const p = ids(s);
    const ok = {
      bidder: p[0],
      bid: 200,
      trump: 'hearts' as const,
      called: [card('K', 'clubs')],
      playedBy: [p[1]],
      entered: 40,
      countedBy: 'defenders' as const,
    };
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, bid: 145 } });
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, bidder: 'x' } });
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, called: [card('2', 'clubs')] } });
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, called: [], playedBy: [] } });
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, playedBy: ['x'] } });
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, entered: 255 } });
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, countedBy: 'nobody' as 'defenders' } });
    ignored(s, { type: 'editHand', i: 0, edit: { ...ok, trump: 'stars' as 'hearts' } });
    ignored(s, { type: 'editHand', i: 5, edit: ok });
    ignored(run(s, { type: 'nextHand' }), { type: 'editHand', i: 2, edit: ok });
    ignored(empty(), { type: 'editHand', i: 0, edit: ok });
  });

  it('an auction hand keeps its auction unless the winning bid changes', () => {
    const base = kitGame({
      id: 'a',
      players: ['a', 'b', 'c', 'd'],
      start: T0,
      hands: [
        {
          bidder: 1,
          bid: 160,
          team: 200,
          calls: [
            [0, 160],
            [1, 'pass'],
            [2, 'pass'],
            [3, 'pass'],
          ],
        },
      ],
    });
    const s = initialKtState(base, 'game', [], DEFAULT_PREFS);
    const h = base.hands[0];
    const edit = {
      bidder: h.bidder!,
      bid: 160,
      trump: 'clubs' as const,
      called: h.called,
      playedBy: h.playedBy as string[],
      entered: 50,
      countedBy: 'defenders' as const,
    };
    expect(g(run(s, { type: 'editHand', i: 0, edit })).hands[0]).toMatchObject({
      mode: 'auction',
      calls: h.calls,
      trump: 'clubs',
    });
    expect(
      g(run(s, { type: 'editHand', i: 0, edit: { ...edit, bid: 170 } })).hands[0],
    ).toMatchObject({ mode: 'quick', calls: [], bid: 170 });
  });

  it('an edit that takes someone to 1000 ends a First to 1000 game', () => {
    let s = started(4, { more: [{ type: 'setupLength', length: 'to1000' }] });
    for (let i = 0; i < 3; i++) s = run(playHand(s, { def: 0 }), { type: 'nextHand' });
    s = playHand(s, { def: 100 });
    expect(g(s).status).toBe('active');
    const p = ids(s),
      h = g(s).hands[3];
    const e = run(s, {
      type: 'editHand',
      i: 3,
      edit: {
        bidder: h.bidder!,
        bid: h.bid!,
        trump: h.trump!,
        called: h.called,
        playedBy: h.playedBy as string[],
        entered: 0,
        countedBy: 'defenders',
      },
    });
    expect(g(e).status).toBe('finished');
    expect(e.screen).toBe('winner');
    expect(p).toHaveLength(4);
  });
});

describe('undo', () => {
  it('steps back through committed changes and counts as a change', () => {
    const s = started();
    const b = run(
      s,
      { type: 'quickBid', bidder: ids(s)[1], bid: 170 },
      { type: 'trump', suit: 'clubs' },
    );
    const u = run(b, { type: 'undo' });
    expect(curHand(g(u))).toMatchObject({ phase: 'calling', trump: null });
    expect(g(u).rev).toBe(g(b).rev + 1);
    expect(u.toast!.msg).toBe('Undone');
    const uu = run(u, { type: 'undo' });
    expect(curHand(g(uu)).phase).toBe('bidding');
    expect(uu.screen).toBe('game');
    const none = run(uu, { type: 'undo' });
    expect(none.game).toBe(uu.game);
    expect(none.toast!.msg).toBe('Nothing to undo');
  });

  it('keeps the newest 20 snapshots', () => {
    let s = run(started(), { type: 'quickBid', bidder: ids(started())[0], bid: 150 });
    for (let i = 0; i < 25; i++) s = run(s, { type: 'trump', suit: i % 2 ? 'clubs' : 'hearts' });
    expect(s.undo).toHaveLength(UNDO_LIMIT);
    expect(JSON.parse(s.undo[0]).rev).toBe(7);
  });

  it('an unreadable snapshot is dropped', () => {
    const s = { ...started(), undo: ['{bad'] };
    const u = run(s, { type: 'undo' });
    expect(u.undo).toEqual([]);
    expect(u.game).toBe(s.game);
  });

  it('back to a finished game shows the podium', () => {
    const f = run(playHand(started()), { type: 'finishGame' });
    const r = run(f, { type: 'rematch', id: 'k', syncId: 's', now: 1 }, { type: 'undo' });
    expect(g(r).status).toBe('finished');
    expect(r.screen).toBe('winner');
  });
});

describe('every committed change', () => {
  it('raises rev and stamps updatedAt; every state of a whole game is one the server accepts', () => {
    vi.useFakeTimers({ now: T0 });
    try {
      let s = started(7, { prefs: { quick: false, countedBy: 'defenders' } });
      const states: KtState[] = [s];
      const step = (a: KtAction) => {
        const before = s;
        s = ktReducer(s, a);
        vi.advanceTimersByTime(1000);
        if (s.game !== before.game) {
          expect(g(s).rev).toBe(g(before).rev + 1);
          expect(g(s).updatedAt).toBeGreaterThanOrEqual(g(before).updatedAt);
        }
        states.push(s);
      };
      step({ type: 'call', what: 350 });
      for (let i = 0; i < 6; i++) step({ type: 'call', what: 'pass' });
      step({ type: 'trump', suit: 'diamonds' });
      step({ type: 'addCard', card: card('A', 'spades', 'other') });
      step({ type: 'addCard', card: card('K', 'spades', 2) });
      step({ type: 'confirmCall' });
      step({ type: 'markPlayed', i: 0, by: ids(s)[3] });
      step({ type: 'toResult' });
      step({ type: 'countedBy', by: 'bidders' });
      step({ type: 'points', entered: 500 });
      step({ type: 'markPlayed', i: 1, by: ids(s)[1] });
      step({ type: 'confirmHand' });
      step({ type: 'nextHand' });
      step({ type: 'undo' });
      step({ type: 'finishGame' });
      for (const st of states) expect(validate(g(st), T0 + 1e9)).toBe(null);
      expect(Object.values(totals(g(s)))).toEqual([0, 500, 0, 500, 0, 0, 0]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('screens and overlays', () => {
  it('opens and closes sheets, modals, toasts and banners', () => {
    const s = started();
    expect(run(s, { type: 'sheet', sheet: { type: 'card', i: null } }).sheet).toEqual({
      type: 'card',
      i: null,
    });
    expect(run(s, { type: 'modal', modal: 'abandon' }).modal).toBe('abandon');
    const t = run(s, { type: 'say', msg: 'Hi' });
    expect(t.toast).toEqual({ id: 1, msg: 'Hi', undo: false });
    expect(run(t, { type: 'toastDone' }).toast).toBe(null);
    expect(run({ ...s, banner: { id: 1, text: 'x' } }, { type: 'bannerDone' }).banner).toBe(null);
    expect(run(s, { type: 'go', screen: 'home', dir: -1 })).toMatchObject({
      screen: 'home',
      dir: -1,
    });
    expect(run(s, { type: 'go', screen: 'home' }, { type: 'resume' }).screen).toBe('game');
    ignored(empty(), { type: 'resume' });
  });

  it('pages stack over the screen, close one at a time, and any screen change closes them all', () => {
    const s = run(
      { ...started(), sheet: { type: 'menu' } },
      { type: 'openPage', route: { page: 'history' } },
      { type: 'openPage', route: { page: 'game', id: 'x' } },
    );
    expect(s).toMatchObject({
      dir: 1,
      sheet: null,
      pages: [{ page: 'history' }, { page: 'game', id: 'x' }],
    });
    const back = run(s, { type: 'closePage' });
    expect(back).toMatchObject({ dir: -1, pages: [{ page: 'history' }] });
    expect(run(back, { type: 'closePage' }).pages).toEqual([]);
    ignored(started(), { type: 'closePage' });
    expect(run(s, { type: 'resume' }).pages).toEqual([]);
    expect(run(s, { type: 'go', screen: 'home' }).pages).toEqual([]);
    expect(run(s, { type: 'startSetup', lg: null }).pages).toEqual([]);
    expect(run(s, { type: 'openGame', game: g(s) }).pages).toEqual([]);
  });

  it('opens a saved game; the repair answer clears the table', () => {
    const saved: KtGame = kitGame({
      id: 'z',
      players: ['a', 'b', 'c', 'd'],
      start: T0,
      hands: [{ bidder: 0, bid: 150, team: 100 }],
      finished: true,
    });
    const o = run(started(), { type: 'openGame', game: saved });
    expect(o).toMatchObject({ game: saved, undo: [], screen: 'winner' });
    const r = run(
      { ...initialKtState(null, 'home', [], DEFAULT_PREFS, true) },
      { type: 'repaired' },
    );
    expect(r).toMatchObject({ game: null, corrupt: false, screen: 'home' });
  });

  it('a saved "game" screen reopens only on a game in play', () => {
    expect(initialKtState(null, 'game', [], DEFAULT_PREFS).screen).toBe('home');
    expect(initialKtState(g(started()), 'game', [], DEFAULT_PREFS).screen).toBe('game');
  });
});

describe('what the screens read', () => {
  it('the next bid allowed, and the number to show back on the result screen', () => {
    const s = started(5, { prefs: { quick: false, countedBy: 'defenders' } });
    expect(minNextBid(g(s))).toBe(150);
    expect(minNextBid(g(run(s, { type: 'call', what: 245 })))).toBe(250);
    expect(minNextBid(g(run(s, { type: 'call', what: 250 })))).toBe(null);
    expect(shownPoints(g(playHand(started(), { def: 60 })))).toBe(60);
    expect(preview(g(started()), 60, 'defenders')).toBe(null);
  });
});
