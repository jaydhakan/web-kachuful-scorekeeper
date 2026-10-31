import {
  bidOrder,
  curRound,
  demoGame,
  doneRounds,
  forbiddenFor,
  standings,
  totals,
  totalRounds,
  type Game,
} from '@/domain';
import { initialState, reducer, roundBanner } from './reducer';
import type { Action, AppState } from './types';
import { UNDO_LIMIT, pushSnapshot } from './undo';

const run = (s: AppState, ...as: Action[]) => as.reduce(reducer, s);
const demo = () => initialState(demoGame(), 'round', []);

/** Bids every seat in order, picking a legal number for the dealer. */
function bidAll(s: AppState): AppState {
  let st = s;
  while (curRound(st.game).phase === 'bidding') {
    const g = st.game,
      r = curRound(g),
      n = g.players.length;
    if (g.players.every((p) => r.bids[p.id] !== undefined) && !g.ui.hookWarn) break;
    const pI = bidOrder(g, r)[Math.min(g.ui.bidIdx, n - 1)];
    const isDealer = pI === r.dealerIndex;
    const forb = isDealer ? forbiddenFor(g, r) : null;
    const v = [1, 0, 2].find((x) => x !== forb)!;
    st = run(st, { type: 'bid', v });
    if (st.advance) st = run(st, { type: 'advanceBid', idx: st.advance.idx });
  }
  return st;
}

function playRound(s: AppState): AppState {
  let st = bidAll(s);
  st = run(st, { type: 'phase', phase: 'playing' }, { type: 'phase', phase: 'results' });
  const r = curRound(st.game);
  st.game.players.forEach((p, i) => {
    st = run(st, { type: 'setResult', id: p.id, v: i === r.firstPlayerIndex ? 'missed' : 'made' });
  });
  return run(st, { type: 'confirmRound' });
}

const setup = (n: number, length: 'endless' | '1cycle' | '2cycles' = 'endless') => {
  const seats = Array.from({ length: n }, (_, i) => ({ name: 'P' + i, emoji: 'x', color: 'c' }));
  return run(
    initialState(demoGame(), 'home', []),
    { type: 'startSetup', lg: null },
    { type: 'setupPatch', patch: { n, step: 3, seats, length } },
    { type: 'beginGame', id: 'g1', now: 1_000 },
  );
};

describe('undo ring', () => {
  it('keeps the newest 20 snapshots', () => {
    let st: string[] = [];
    for (let i = 0; i < 25; i++) st = pushSnapshot(st, String(i));
    expect(st).toHaveLength(UNDO_LIMIT);
    expect(st[0]).toBe('5');
    expect(st.at(-1)).toBe('24');
  });

  it('is capped by real actions too', () => {
    let st = demo();
    for (let i = 0; i < 25; i++) st = run(st, { type: 'bid', v: i % 3 });
    expect(st.undo).toHaveLength(20);
  });
});

describe('setup and starting a game', () => {
  it('begins a game from the setup state', () => {
    const st = setup(6);
    expect(st.screen).toBe('round');
    expect(st.game).toMatchObject({
      id: 'g1',
      maxCards: 8,
      status: 'active',
      direction: 'cw',
      firstDealerIndex: 0,
    });
    expect(st.game.players.map((p) => p.id)).toEqual(
      ['p', 'p', 'p', 'p', 'p', 'p'].map((_, i) => 'p' + (1000).toString(36) + i),
    );
    expect(st.undo).toEqual([]);
    expect(st.seq).toMatchObject({ prev: null, round: { index: 0, cards: 3 } });
  });

  it('swaps seats and keeps the dealer on the same person', () => {
    const st = run(
      setup(4),
      { type: 'startSetup', lg: null },
      {
        type: 'setupPatch',
        patch: {
          n: 4,
          dealer: 1,
          seats: ['a', 'b', 'c', 'd'].map((name) => ({ name, emoji: 'x', color: 'c' })),
        },
      },
      { type: 'setupSwap', a: 1, b: 3 },
    );
    expect(st.setup!.seats.map((x) => x!.name)).toEqual(['a', 'd', 'c', 'b']);
    expect(st.setup!.dealer).toBe(3);
  });

  it('opens with the first round banner only for peak or back-to-3 rounds', () => {
    const g = demoGame();
    expect(roundBanner(g, { cards: 10, index: 7 })).toBe('Peak round — 10 cards!');
    expect(roundBanner(g, { cards: 3, index: 15 })).toBe('Back to 3 — climbing again');
    expect(roundBanner(g, { cards: 3, index: 0 })).toBeNull();
    expect(roundBanner(g, { cards: 5, index: 2 })).toBeNull();
  });
});

describe('bidding', () => {
  it('saves a bid, makes it undoable and schedules the pointer to advance', () => {
    const st = run(demo(), { type: 'bid', v: 1 });
    expect(curRound(st.game).bids.p4).toBe(1);
    expect(st.undo).toHaveLength(1);
    expect(st.toast).toMatchObject({ msg: 'Bid saved', undo: true });
    expect(st.advance).toEqual({ idx: 3 });
    expect(run(st, { type: 'advanceBid', idx: 3 }).game.ui.bidIdx).toBe(3);
  });

  it('locks the dealer’s forbidden bid, counts a hook hit and stores nothing else', () => {
    let st = run(
      demo(),
      { type: 'bid', v: 1 },
      { type: 'advanceBid', idx: 3 },
      { type: 'bid', v: 1 },
      { type: 'advanceBid', idx: 4 },
    );
    const before = st.undo.length;
    expect(forbiddenFor(st.game, curRound(st.game))).toBe(2);
    st = run(st, { type: 'bid', v: 2 });
    expect(curRound(st.game).hookHits).toBe(1);
    expect(curRound(st.game).bids.p1).toBeUndefined();
    expect(st.undo).toHaveLength(before);
    st = run(st, { type: 'bid', v: 2 });
    expect(curRound(st.game).hookHits).toBe(2);
    st = run(st, { type: 'bid', v: 3 });
    expect(curRound(st.game).bids.p1).toBe(3);
  });

  it('drops the dealer’s bid and warns when an earlier edit makes it illegal', () => {
    let st = bidAll(demo());
    const r = curRound(st.game);
    expect(r.bids).toEqual({ p0: 1, p1: 1, p2: 2, p3: 3, p4: 1 });
    st = run(st, { type: 'pickSeat', k: 0 });
    // Aarav 1 → 2 makes the others total 8, so the dealer's 1 would now complete the 9 cards.
    st = run(st, { type: 'bid', v: 2 });
    expect(st.game.ui.hookWarn).toBe(true);
    expect(curRound(st.game).bids.p1).toBeUndefined();
    expect(st.advance).toEqual({ idx: 4 });
  });

  it('only jumps to a seat that has bid or is up now', () => {
    const st = demo();
    expect(run(st, { type: 'pickSeat', k: 0 }).game.ui.bidIdx).toBe(2);
    expect(run(st, { type: 'pickSeat', k: 2 }).game.ui.bidIdx).toBe(0);
    expect(run(st, { type: 'pickSeat', k: 4 }).game.ui.bidIdx).toBe(2);
  });

  it('undo reverts a bid and cancels the pending advance', () => {
    const st = run(demo(), { type: 'bid', v: 1 }, { type: 'undo' });
    expect(curRound(st.game).bids.p4).toBeUndefined();
    expect(st.advance).toBeNull();
    expect(st.toast?.msg).toBe('Undone');
  });
});

describe('results and rounds', () => {
  it('blocks confirming while everyone made', () => {
    let st = run(bidAll(demo()), { type: 'phase', phase: 'results' });
    st.game.players.forEach((p) => {
      st = run(st, { type: 'setResult', id: p.id, v: 'made' });
    });
    const same = run(st, { type: 'confirmRound' });
    expect(same).toBe(st);
    expect(curRound(same.game).phase).toBe('results');
  });

  it('exact tricks: stepper sets made/missed from the bid and clamps at 0 and the cards', () => {
    let st = run(bidAll(demo()), { type: 'phase', phase: 'results' }, { type: 'toggleExact' });
    const id = 'p2',
      bid = curRound(st.game).bids[id];
    expect(curRound(st.game).tricks![id]).toBe(0);
    st = run(st, { type: 'setTricks', id, d: -1 });
    expect(curRound(st.game).tricks![id]).toBe(0);
    for (let i = 0; i < bid; i++) st = run(st, { type: 'setTricks', id, d: 1 });
    expect(curRound(st.game).results[id]).toBe('made');
    for (let i = 0; i < 20; i++) st = run(st, { type: 'setTricks', id, d: 1 });
    expect(curRound(st.game).tricks![id]).toBe(9);
    st = run(st, { type: 'toggleExact' });
    expect(curRound(st.game).tricks).toBeNull();
  });

  it('confirming a round shows the summary with an undoable toast', () => {
    const st = playRound(demo());
    expect(doneRounds(st.game)).toHaveLength(7);
    expect(st.game.ui.view).toBe('summary');
    expect(st.sumAnim).toBe(true);
    expect(st.toast).toMatchObject({ msg: 'Round saved', undo: true });
  });

  it('undo across the summary returns to the results of that round', () => {
    const done = playRound(demo());
    const st = run(done, { type: 'undo' });
    expect(st.screen).toBe('round');
    expect(st.game.ui.view).toBe('round');
    expect(curRound(st.game).phase).toBe('results');
    expect(st.sumAnim).toBe(false);
    expect(st.dir).toBe(-1);
    expect(doneRounds(st.game)).toHaveLength(6);
  });

  it('undo after the next round starts returns to the summary', () => {
    const st = run(playRound(demo()), { type: 'nextRound' });
    expect(curRound(st.game).index).toBe(7);
    expect(st.seq).toMatchObject({
      prev: 1,
      round: { cards: 10 },
      banner: 'Peak round — 10 cards!',
    });
    const back = run(st, { type: 'undo' });
    expect(back.game.ui.view).toBe('summary');
    expect(curRound(back.game).phase).toBe('done');
  });

  it('shows the round banner once the deal animation ends', () => {
    const st = run(playRound(demo()), { type: 'nextRound' }, { type: 'seqDone' });
    expect(st.seq).toBeNull();
    expect(st.banner?.text).toBe('Peak round — 10 cards!');
    expect(run(st, { type: 'bannerDone' }).banner).toBeNull();
  });
});

describe('editing a past round', () => {
  it('recalculates all totals, including those after it, and keeps the edit undoable', () => {
    const st = demo();
    const before = totals(st.game);
    const r0 = st.game.rounds[0];
    const bids = { ...r0.bids, p0: 4 };
    const results = { ...r0.results, p0: 'made' as const };
    const out = run(st, { type: 'editRound', i: 0, bids, results });
    const after = totals(out.game);
    expect(after.p0).toBe(before.p0 - 10 + 40);
    expect(after.p1).toBe(before.p1);
    expect(standings(out.game).map((x) => x.p.name)).toEqual([
      'Kabir',
      'Aarav',
      'Dev',
      'Riya',
      'Meera',
    ]);
    expect(out.toast).toMatchObject({ msg: 'Round 1 updated', undo: true });
    expect(out.sheet).toEqual({ type: 'board' });
    expect(totals(run(out, { type: 'undo' }).game)).toEqual(before);
  });

  it('works when several later rounds exist and drops exact-tricks data', () => {
    const st = demo();
    const r3 = st.game.rounds[3];
    const out = run(st, {
      type: 'editRound',
      i: 3,
      bids: { ...r3.bids, p4: 0 },
      results: { ...r3.results, p4: 'made' },
    });
    expect(out.game.rounds[3].bids.p4).toBe(0);
    expect(out.game.rounds[3].tricks).toBeNull();
    expect(doneRounds(out.game)).toHaveLength(6);
    expect(curRound(out.game).phase).toBe('bidding');
  });
});

describe('finishing, rematch and undo', () => {
  it('finishes after the last round of a fixed-length game and goes to the winner', () => {
    let st = setup(3, '1cycle');
    const total = totalRounds(st.game);
    expect(total).toBe(16);
    for (let i = 0; i < total; i++) {
      st = playRound(st);
      if (i < total - 1) st = run(st, { type: 'nextRound' }, { type: 'seqDone' });
    }
    expect(st.game.status).toBe('finished');
    expect(st.screen).toBe('winner');
    expect(st.fresh).toBe(true);
    const back = run(st, { type: 'undo' });
    expect(back.game.status).toBe('active');
    expect(back.screen).toBe('round');
  });

  it('ending the game early crowns a winner and can be undone', () => {
    const st = run(playRound(demo()), { type: 'finishGame' });
    expect(st).toMatchObject({ screen: 'winner', fresh: true });
    expect(run(st, { type: 'undo' }).game.status).toBe('active');
  });

  it('a rematch keeps the players, moves the first dealer on and clears undo', () => {
    const st = run(demo(), { type: 'bid', v: 1 }, { type: 'rematch', id: 'g2', now: 5 });
    const g: Game = st.game;
    expect(g.id).toBe('g2');
    expect(g.players.map((p) => p.name)).toEqual(['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev']);
    expect(g.firstDealerIndex).toBe(1);
    expect(curRound(g)).toMatchObject({ index: 0, dealerIndex: 1, phase: 'bidding' });
    expect(st.undo).toEqual([]);
    expect(st.screen).toBe('round');
  });

  it('says so when there is nothing to undo', () => {
    expect(run(demo(), { type: 'undo' }).toast?.msg).toBe('Nothing to undo');
  });
});

describe('navigation and notes', () => {
  it('resumes a finished game on the winner screen', () => {
    const fin = run(demo(), { type: 'finishGame' }, { type: 'go', screen: 'home', dir: -1 });
    expect(run(fin, { type: 'resume' }).screen).toBe('winner');
    expect(run(demo(), { type: 'go', screen: 'home' }, { type: 'resume' }).screen).toBe('round');
  });

  it('gives each toast a fresh id so it replaces the previous one', () => {
    const a = run(demo(), { type: 'say', msg: 'one' });
    const b = run(a, { type: 'say', msg: 'two' });
    expect(b.toast!.id).not.toBe(a.toast!.id);
    expect(run(b, { type: 'toastDone' }).toast).toBeNull();
  });

  it('replaceGame (after a corrupt save) clears undo and the corrupt flag', () => {
    const st = run(
      { ...demo(), corrupt: true, undo: ['x'] },
      { type: 'replaceGame', game: demoGame() },
    );
    expect(st).toMatchObject({ corrupt: false, undo: [], screen: 'home' });
  });
});
