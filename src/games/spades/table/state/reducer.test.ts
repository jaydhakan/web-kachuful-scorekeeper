import {
  bidOrder,
  gameTotals,
  STANDARD_RULES,
  validate,
  type SpGame,
  type SpRules,
} from '@/games/spades/domain';
import { UNDO_LIMIT } from '@/state/undo';
import fixture from './__fixtures__/sp-v1-save.json';
import { initialSpState, spReducer } from './reducer';
import { curHand, entryOf, preview } from './select';
import type { SpAction, SpTableState } from './types';

const run = (s: SpTableState, ...as: SpAction[]) => as.reduce(spReducer, s);
const NAMES = ['Riya', 'Arjun', 'Dev', 'Meera'];
const seat = (name: string) => ({ name, emoji: '🙂', color: '#FF8A65' });

function started(rules: Partial<SpRules> = {}, dealer = 0): SpTableState {
  return run(
    initialSpState(null, 'setup', [], null),
    ...NAMES.map((n, k): SpAction => ({ type: 'setupSeat', k, seat: seat(n) })),
    { type: 'setupRules', rules: { ...STANDARD_RULES, ...rules } },
    { type: 'setupStep', step: 2 },
    { type: 'setupDealer', k: dealer },
    {
      type: 'beginGame',
      id: 'sp1',
      syncId: 'sync-sp1',
      now: 1e12,
      playerIds: ['i0', 'i1', 'i2', 'i3'],
    },
  );
}

/** Every bid of the hand, by seat, entered in bidding order. */
function bids(s: SpTableState, by: number[], blind: boolean[] = [false, false, false, false]) {
  const h = curHand(s.game!)!;
  return run(
    s,
    ...bidOrder(h.dealer).map((k): SpAction => ({ type: 'bid', bid: by[k], blind: blind[k] })),
  );
}

/** A whole hand: bids, then team a's tricks and each Nil bidder's, saved. */
function hand(
  s: SpTableState,
  by: number[],
  teamA: number,
  nil: (number | null)[] = [],
  blind?: boolean[],
) {
  let t = run(bids(s, by, blind), { type: 'toTricks' }, { type: 'entry', teamA });
  nil.forEach((n, k) => {
    if (n !== null && n !== undefined) t = run(t, { type: 'entry', seat: k as 0, nil: n });
  });
  return run(t, { type: 'saveHand' });
}

const lastLine = (s: SpTableState) => {
  const g = s.game!;
  const t = gameTotals(g);
  return { a: t.a, b: t.b };
};

describe('setup', () => {
  it('needs four different people before the dealer step, and starts with Standard rules minus the timer', () => {
    let s = run(initialSpState(null, 'setup', [], null), {
      type: 'setupSeat',
      k: 0,
      seat: seat('Riya'),
    });
    expect(run(s, { type: 'setupStep', step: 2 }).setup!.step).toBe(1);
    s = run(s, { type: 'setupSeat', k: 1, seat: seat('riya') });
    expect(s.setup!.seats[1]).toBe(null);
    const g = started().game!;
    expect(g.rules).toEqual({ ...STANDARD_RULES, timerSec: null });
    expect(g.players.map((p) => p.name)).toEqual(NAMES);
    expect(g.hands).toHaveLength(1);
    expect(validate(g, Infinity)).toBe(null);
  });

  it('refuses rules Edit rules never offers', () => {
    const s = run(initialSpState(null, 'setup', [], null), {
      type: 'setupRules',
      rules: { ...STANDARD_RULES, target: 7 },
    });
    expect(s.setup!.rules.target).toBe(200);
  });

  it('the dealer chip follows a person who is moved', () => {
    let s = run(
      initialSpState(null, 'setup', [], null),
      ...NAMES.map((n, k): SpAction => ({ type: 'setupSeat', k, seat: seat(n) })),
      { type: 'setupDealer', k: 1 },
      { type: 'setupSwap', a: 1, b: 2 },
    );
    expect(s.setup!.dealer).toBe(2);
    s = run(s, { type: 'setupSwap', a: 0, b: 3 });
    expect(s.setup!.dealer).toBe(2);
  });
});

describe('bidding', () => {
  it('goes round from the dealer’s left; 0 is Nil; a bid the rules forbid is ignored', () => {
    let s = started({}, 1);
    s = run(s, { type: 'bid', bid: 3, blind: false });
    expect(curHand(s.game!)!.bids).toEqual([null, null, 3, null]);
    s = run(s, { type: 'bid', bid: 14, blind: false });
    expect(curHand(s.game!)!.bids).toEqual([null, null, 3, null]);
    s = run(s, { type: 'bid', bid: 0, blind: true });
    expect(curHand(s.game!)!.bids[3]).toBe(null);
    s = run(s, { type: 'bid', bid: 0, blind: false });
    expect(curHand(s.game!)!.bids[3]).toBe(0);
  });

  it('Nil off refuses 0; the minimum team bid refuses taking the team below 4', () => {
    let s = started({ nil: false });
    s = run(s, { type: 'bid', bid: 0, blind: false });
    expect(curHand(s.game!)!.bids[1]).toBe(null);
    s = started({ minTeamBid: 4 });
    // Seat 1 bids 1; seat 2 any; seat 3 (seat 1's partner) must bid 3 or more, or Nil.
    s = run(s, { type: 'bid', bid: 1, blind: false }, { type: 'bid', bid: 2, blind: false });
    expect(run(s, { type: 'bid', bid: 2, blind: false }).game!.hands[0].bids[3]).toBe(null);
    expect(run(s, { type: 'bid', bid: 3, blind: false }).game!.hands[0].bids[3]).toBe(3);
    expect(run(s, { type: 'bid', bid: 0, blind: false }).game!.hands[0].bids[3]).toBe(0);
  });

  it('Blind Nil only when the rules allow it, and only on a Nil', () => {
    let s = started({ blindNil: true });
    s = run(s, { type: 'bid', bid: 2, blind: true });
    expect(curHand(s.game!)!.bids[1]).toBe(null);
    s = run(s, { type: 'bid', bid: 0, blind: true });
    expect(curHand(s.game!)!.blind[1]).toBe(true);
  });

  it('Undo bid takes back the last bid; every bid is one Undo away', () => {
    let s = run(
      started(),
      { type: 'bid', bid: 3, blind: false },
      { type: 'bid', bid: 4, blind: false },
    );
    s = run(s, { type: 'unbid' });
    expect(curHand(s.game!)!.bids).toEqual([null, 3, null, null]);
    s = run(s, { type: 'undo' });
    expect(curHand(s.game!)!.bids).toEqual([null, 3, 4, null]);
    s = run(s, { type: 'undo' }, { type: 'undo' });
    expect(curHand(s.game!)!.bids).toEqual([null, null, null, null]);
  });

  it('Play the hand waits for all four bids and starts Tricks at team a’s contract', () => {
    let s = run(started(), { type: 'bid', bid: 3, blind: false }, { type: 'toTricks' });
    expect(curHand(s.game!)!.phase).toBe('bidding');
    s = run(bids(started(), [3, 4, 2, 3]), { type: 'toTricks' });
    expect(curHand(s.game!)!.phase).toBe('tricks');
    expect(entryOf(s)).toMatchObject({ teamA: 5, nilTricks: [null, null, null, null] });
    s = run(s, { type: 'toBids' });
    expect(curHand(s.game!)!.phase).toBe('bidding');
  });
});

describe('scoring through the screens (plan §1.7)', () => {
  // Team a is P (seat 0) and Q (seat 2); team b bids 3 and 3 throughout.
  const cases: [
    string,
    number[],
    number,
    (number | null)[],
    number,
    number,
    Partial<SpRules>?,
    boolean[]?,
  ][] = [
    ['E1', [2, 3, 3, 3], 5, [], 50, 0],
    ['E2', [2, 3, 3, 3], 7, [], 52, 2],
    ['E3', [2, 3, 3, 3], 4, [], -50, 0],
    ['E4', [0, 3, 4, 3], 5, [0], 141, 1],
    ['E5', [0, 3, 4, 3], 6, [2], -58, 2],
    ['E6', [0, 3, 4, 3], 5, [2], -138, 2],
    ['E7', [0, 3, 5, 3], 6, [0], 251, 1, { blindNil: true }, [true, false, false, false]],
    ['E8', [0, 3, 5, 3], 6, [1], -149, 1, { blindNil: true }, [true, false, false, false]],
  ];
  it.each(cases)('%s', (_, by, teamA, nil, points, bags, rules = {}, blind) => {
    const s = hand(started(rules), by, teamA, nil, blind);
    const t = lastLine(s);
    expect(t.a.score).toBe(points);
    expect(t.a.bags).toBe(bags);
    expect(validate(s.game!, Infinity)).toBe(null);
  });

  it('the preview before saving matches what is saved', () => {
    const s = run(
      bids(started(), [0, 3, 4, 3]),
      { type: 'toTricks' },
      { type: 'entry', teamA: 6 },
      { type: 'entry', seat: 0, nil: 2 },
    );
    const g = s.game!;
    expect(preview(g, curHand(g)!, entryOf(s)!).a.points).toBe(-58);
  });

  it('a Nil bidder can’t take more than the team; double Nil splits the team’s tricks', () => {
    let s = run(bids(started(), [0, 3, 0, 3]), { type: 'toTricks' });
    expect(entryOf(s)).toMatchObject({ teamA: 0, nilTricks: [0, null, 0, null] });
    s = run(s, { type: 'entry', teamA: 3 }, { type: 'entry', seat: 0, nil: 9 });
    expect(entryOf(s)!.nilTricks).toEqual([3, null, 0, null]);
    s = run(s, { type: 'entry', seat: 0, nil: 1 });
    expect(entryOf(s)!.nilTricks).toEqual([1, null, 2, null]);
    s = run(s, { type: 'saveHand' });
    expect(gameTotals(s.game!).a).toMatchObject({ score: -200 + 3, bags: 3 });
  });

  it('the bag run carries bags and takes 100 at ten (plan §1.7)', () => {
    let s = started();
    // Team a bids 5, 4, 6, 3 and takes 7, 8, 9, 6; team b bids 1 and 1 (made with what is left only when it can be).
    for (const [a, took] of [
      [5, 7],
      [4, 8],
      [6, 9],
      [3, 6],
    ]) {
      s = hand(s, [a - 1, 1, 1, 1], took);
      s = run(s, { type: 'nextHand' });
    }
    expect(gameTotals(s.game!).a).toMatchObject({ score: 92, bags: 12, penalties: 1 });
  });
});

describe('the end of a game', () => {
  const big = [6, 3, 6, 1];
  it('reaching the target finishes the game on save; the summary leads to the winner', () => {
    let s = started({ target: 100 });
    s = hand(s, big, 13);
    expect(s.game!.status).toBe('finished');
    expect(s.game!.result).toEqual({ winner: 'a', endedBy: 'target' });
    expect(s.screen).toBe('game');
    expect(s.fresh).toBe(true);
    expect(run(s, { type: 'nextHand' }).game!.hands).toHaveLength(1);
    expect(validate(s.game!, Infinity)).toBe(null);
  });

  it('a tie at the target plays another hand', () => {
    let s = started({ target: 100 });
    // Both teams bid 5 and take a share that leaves them level at 100+.
    s = hand(s, [5, 5, 5, 5], 7);
    s = run(s, { type: 'nextHand' });
    s = hand(s, [5, 5, 5, 5], 6);
    expect(gameTotals(s.game!).a.score).toBe(gameTotals(s.game!).b.score);
    expect(s.game!.status).toBe('active');
  });

  it('End game drops the hand in progress and the higher total wins (D14)', () => {
    let s = started({ target: null });
    s = run(hand(s, big, 13), { type: 'nextHand' }, { type: 'bid', bid: 3, blind: false });
    s = run(s, { type: 'endGame' });
    expect(s.game!.status).toBe('finished');
    expect(s.game!.hands).toHaveLength(1);
    expect(s.game!.result).toEqual({ winner: 'a', endedBy: 'end' });
    expect(s.screen).toBe('winner');
    expect(validate(s.game!, Infinity)).toBe(null);
  });

  it('End game and Call it a draw need a scored hand', () => {
    expect(run(started(), { type: 'endGame' }).game!.status).toBe('active');
    expect(run(started(), { type: 'drawGame' }).game!.status).toBe('active');
  });

  it('Call it a draw ends it as a draw for both teams (D14)', () => {
    const s = run(hand(started(), big, 13), { type: 'nextHand' }, { type: 'drawGame' });
    expect(s.game!.result).toEqual({ winner: 'draw', endedBy: 'draw' });
    expect(validate(s.game!, Infinity)).toBe(null);
  });

  it('Cancel keeps a scored game as Cancelled with no result; with nothing scored it leaves no trace (D14)', () => {
    let s = run(hand(started(), big, 13), { type: 'nextHand' }, { type: 'cancelGame', lg: null });
    expect(s.game!.status).toBe('cancelled');
    expect(s.game!.result).toBeUndefined();
    expect(s.game!.hands).toHaveLength(1);
    expect(s.screen).toBe('setup');
    expect(validate(s.game!, Infinity)).toBe(null);
    s = run(s, { type: 'undo' });
    expect(s.game!.status).toBe('active');
    expect(s.screen).toBe('game');
    s = run(started(), { type: 'cancelGame', lg: null });
    expect(s.game).toBe(null);
  });

  it('Rematch keeps or swaps partners, and the dealer moves on', () => {
    const done = hand(started({ target: 100 }), big, 13);
    const same = run(done, { type: 'rematch', id: 'sp2', syncId: 's2', now: 2e12, swap: false });
    expect(same.game!.players.map((p) => p.name)).toEqual(NAMES);
    expect(same.game!.firstDealerIndex).toBe(1);
    expect(same.undo).toHaveLength(1);
    const swap = run(done, { type: 'rematch', id: 'sp2', syncId: 's2', now: 2e12, swap: true });
    expect(swap.game!.players.map((p) => p.name)).toEqual(['Riya', 'Dev', 'Meera', 'Arjun']);
  });
});

describe('edit and undo', () => {
  it('Edit hand changes the scores and is undoable', () => {
    let s = run(hand(started(), [2, 3, 3, 3], 5), { type: 'nextHand' });
    s = run(s, {
      type: 'editHand',
      i: 0,
      edit: {
        bids: [2, 3, 3, 3],
        blind: [false, false, false, false],
        teamA: 7,
        nilTricks: [null, null, null, null],
      },
    });
    expect(gameTotals(s.game!).a.score).toBe(52);
    expect(s.sheet).toEqual({ type: 'board' });
    s = run(s, { type: 'undo' });
    expect(gameTotals(s.game!).a.score).toBe(50);
  });

  it('an edit the rules refuse changes nothing and says so', () => {
    const s = run(hand(started(), [2, 3, 3, 3], 5), { type: 'nextHand' });
    const t = run(s, {
      type: 'editHand',
      i: 0,
      edit: {
        bids: [0, 3, 4, 3],
        blind: [true, false, false, false],
        teamA: 5,
        nilTricks: [1, null, null, null],
      },
    });
    expect(t.game).toBe(s.game);
    expect(t.toast?.msg).toMatch(/doesn’t fit/);
  });

  it('an edit that ends the game earlier is refused', () => {
    let s = started({ target: 100 });
    s = run(hand(s, [3, 3, 3, 3], 6), { type: 'nextHand' });
    s = run(hand(s, [3, 3, 3, 3], 6), { type: 'nextHand' });
    const t = run(s, {
      type: 'editHand',
      i: 0,
      edit: {
        bids: [6, 3, 6, 1],
        blind: [false, false, false, false],
        teamA: 13,
        nilTricks: [null, null, null, null],
      },
    });
    expect(t.game).toBe(s.game);
    expect(t.toast?.msg).toMatch(/earlier/);
  });

  it('an edit to the deciding hand that no longer decides reopens the game', () => {
    let s = hand(started({ target: 100 }), [6, 3, 6, 1], 13);
    expect(s.game!.status).toBe('finished');
    s = run(s, {
      type: 'editHand',
      i: 0,
      edit: {
        bids: [2, 3, 3, 3],
        blind: [false, false, false, false],
        teamA: 5,
        nilTricks: [null, null, null, null],
      },
    });
    expect(s.game!.status).toBe('active');
    expect(s.game!.hands).toHaveLength(2);
    expect(validate(s.game!, Infinity)).toBe(null);
  });

  it('the undo ring keeps the newest snapshots only', () => {
    let s = started();
    for (let i = 0; i < 30; i++)
      s = run(s, { type: 'bid', bid: 3, blind: false }, { type: 'unbid' });
    expect(s.undo.length).toBe(UNDO_LIMIT);
  });

  it('a fresh copy from the server replaces the game and clears Undo; another game’s is ignored', () => {
    const s = run(started(), { type: 'bid', bid: 3, blind: false });
    const g: SpGame = { ...s.game!, rev: 99 };
    expect(run(s, { type: 'syncGame', game: g, fresh: true })).toMatchObject({ game: g, undo: [] });
    expect(run(s, { type: 'syncGame', game: { ...g, syncId: 'x' }, fresh: true }).game).toBe(
      s.game,
    );
  });

  it('a new sync id rewrites the game and its undo snapshots', () => {
    const s = run(
      started(),
      { type: 'bid', bid: 3, blind: false },
      { type: 'renewSyncId', syncId: 'fresh-id' },
    );
    expect(s.game!.syncId).toBe('fresh-id');
    expect(s.undo.every((u) => u.includes('fresh-id') && !u.includes('sync-sp1'))).toBe(true);
  });

  it('the saved fixture plays on: Meera has bid, Riya is next', () => {
    const g = structuredClone(fixture) as unknown as SpGame;
    const s = run(initialSpState(g, 'game', [], null), { type: 'bid', bid: 4, blind: false });
    expect(s.screen).toBe('game');
    expect(curHand(s.game!)!.bids).toEqual([4, null, null, 2]);
  });
});
