import {
  bidProblem,
  blindAllowed,
  DRAW_RESULT,
  endResult,
  gameResult,
  gameTotals,
  newHand,
  rulesOk,
  scoresOf,
  STANDARD_RULES,
  tableHand,
  validate,
  type Seat as SeatK,
  type SpGame,
  type SpHand,
  type SpRules,
} from '@/games/spades/domain';
import { spTable } from '@/games/spades/strings/table';
import { now } from '@/lib/clock';
import { nameKey, type Seat } from '@/people';
import { pushSnapshot } from '@/state/undo';
import { CURRENT_SCHEMA } from './migrations';
import { parseSpSnapshot } from './persistence';
import {
  curHand,
  defaultEntry,
  enteredHand,
  entryOf,
  entryOk,
  fitEntry,
  hasDone,
  lastBidder,
  toBid,
} from './select';
import type { SpAction, SpLastGroup, SpSavedScreen, SpSetup, SpTableState } from './types';

const m = spTable.toasts;

/** Table mode has no turn timer; a game's rules are stored without one. */
export const tableRules = (r: SpRules): SpRules => ({ ...r, timerSec: null });

export function freshSetup(lg: SpLastGroup | null): SpSetup {
  return {
    step: 1,
    seats: [null, null, null, null],
    dir: lg?.direction ?? 'cw',
    dealer: 0,
    rules: tableRules(lg && rulesOk(lg.rules) ? lg.rules : STANDARD_RULES),
    lg,
  };
}

export function initialSpState(
  game: SpGame | null,
  screen: SpSavedScreen,
  undo: string[],
  lg: SpLastGroup | null,
  corrupt = false,
): SpTableState {
  const playing = screen === 'game' && game?.status === 'active';
  return {
    game,
    screen: playing ? 'game' : 'setup',
    dir: 1,
    setup: playing ? null : freshSetup(lg),
    entry: null,
    pages: [],
    undo,
    sheet: null,
    modal: null,
    toast: null,
    noteSeq: 0,
    fresh: false,
    corrupt,
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const say = (s: SpTableState, msg: string, undo = false): SpTableState => ({
  ...s,
  noteSeq: s.noteSeq + 1,
  toast: { id: s.noteSeq + 1, msg, undo },
});

type Live = SpTableState & { game: SpGame };
const live = (s: SpTableState): s is Live => !!s.game && s.game.status === 'active';
const inPhase = (s: SpTableState, ...p: SpHand['phase'][]): s is Live => {
  const h = live(s) ? curHand(s.game) : null;
  return !!h && p.includes(h.phase);
};

/** Every change to the game: a new revision and time, and a snapshot first when it can be undone. */
function commit(
  s: Live,
  fn: (g: SpGame) => void,
  o: { undo?: boolean; toast?: string } = {},
): Live {
  const g = clone(s.game);
  const undo = o.undo ? pushSnapshot(s.undo, JSON.stringify(s.game)) : s.undo;
  fn(g);
  g.updatedAt = now();
  g.rev = s.game.rev + 1;
  const next = { ...s, game: g, undo };
  return o.toast ? (say(next, o.toast, !!o.undo) as Live) : next;
}

function freshGame(
  base: Pick<SpGame, 'players' | 'direction' | 'firstDealerIndex' | 'rules'>,
  id: string,
  syncId: string,
  t: number,
): SpGame {
  const g: SpGame = {
    kind: 'spades',
    schemaVersion: CURRENT_SCHEMA,
    id,
    syncId,
    rev: 1,
    createdAt: t,
    updatedAt: t,
    ...base,
    hands: [],
    status: 'active',
  };
  g.hands.push(newHand(g));
  return g;
}

/** A game with a hand scored stays one Undo away when a new one starts; one without leaves no trace. */
function begin(s: SpTableState, g: SpGame): SpTableState {
  const old = s.game;
  const keep = hasDone(old);
  const next: SpTableState = {
    ...s,
    game: g,
    setup: null,
    entry: null,
    pages: [],
    undo: keep ? pushSnapshot([], JSON.stringify(old)) : [],
    dir: 1,
    screen: 'game',
    sheet: null,
    modal: null,
    fresh: false,
  };
  return keep ? say(next, m.previousSaved, true) : next;
}

// ---- Setup ----

/** Two seats can't hold one person: the same registry player or the same name. */
function clashes(seats: (Seat | null)[], k: number, seat: Seat): boolean {
  const key = nameKey(seat.name);
  return seats.some(
    (q, i) =>
      i !== k &&
      !!q &&
      ((!!seat.playerId && q.playerId === seat.playerId) || (!!key && nameKey(q.name) === key)),
  );
}

const okSeat = (k: number) => Number.isInteger(k) && k >= 0 && k < 4;

function setupStep(su: SpSetup, a: SpAction): SpSetup | null {
  switch (a.type) {
    case 'setupStep':
      if (a.step === 2 && su.seats.some((q) => !q || !q.name.trim())) return null;
      return { ...su, step: a.step };
    case 'setupSeat':
      if (!okSeat(a.k) || (a.seat && clashes(su.seats, a.k, a.seat))) return null;
      return { ...su, seats: su.seats.map((q, i) => (i === a.k ? a.seat : q)) };
    case 'setupSeatPatch': {
      const cur = su.seats[a.k];
      if (!cur) return null;
      const seat = { ...cur, ...a.patch };
      if (clashes(su.seats, a.k, seat)) return null;
      return { ...su, seats: su.seats.map((q, i) => (i === a.k ? seat : q)) };
    }
    case 'setupSwap': {
      if (!okSeat(a.a) || !okSeat(a.b)) return null;
      const seats = su.seats.slice();
      [seats[a.a], seats[a.b]] = [seats[a.b], seats[a.a]];
      // The dealer is a person, so the chip follows them to their new seat.
      const dealer = (su.dealer === a.a ? a.b : su.dealer === a.b ? a.a : su.dealer) as SeatK;
      return { ...su, seats, dealer };
    }
    case 'setupLastGroup':
      if (!su.lg || su.lg.players.length !== 4) return null;
      return {
        ...su,
        dir: su.lg.direction,
        seats: su.lg.players.map((p) => ({ ...p })),
        rules: tableRules(rulesOk(su.lg.rules) ? su.lg.rules : su.rules),
      };
    case 'setupDealer':
      return okSeat(a.k) ? { ...su, dealer: a.k as SeatK } : null;
    case 'setupRules':
      return rulesOk(a.rules) ? { ...su, rules: tableRules(a.rules) } : null;
    default:
      return null;
  }
}

function beginGame(s: SpTableState, a: Extract<SpAction, { type: 'beginGame' }>): SpTableState {
  const su = s.setup;
  if (!su) return s;
  const ids = a.playerIds;
  if (
    su.seats.some((q) => !q || !q.name.trim()) ||
    ids.length !== 4 ||
    ids.some((id) => !id) ||
    new Set(ids).size !== 4 ||
    !rulesOk(su.rules)
  )
    return s;
  const players = (su.seats as Seat[]).map((q, i) => ({
    id: 'p' + a.now.toString(36) + i,
    name: q.name,
    emoji: q.emoji,
    color: q.color,
    playerId: ids[i],
  }));
  return begin(
    s,
    freshGame(
      { players, direction: su.dir, firstDealerIndex: su.dealer, rules: tableRules(su.rules) },
      a.id,
      a.syncId,
      a.now,
    ),
  );
}

// ---- A hand ----

function bid(s: SpTableState, value: number, blind: boolean): SpTableState {
  if (!inPhase(s, 'bidding')) return s;
  const g = s.game,
    h = curHand(g)!;
  const seat = toBid(h);
  if (seat === null || bidProblem(value, seat, h.bids, g.rules)) return s;
  if (blind && (value !== 0 || !blindAllowed(g.rules))) return s;
  return commit(
    s,
    (gg) => {
      const hh = curHand(gg)!;
      hh.bids[seat] = value;
      hh.blind[seat] = blind;
    },
    { undo: true },
  );
}

function unbid(s: SpTableState): SpTableState {
  if (!inPhase(s, 'bidding')) return s;
  const seat = lastBidder(curHand(s.game)!);
  if (seat === null) return s;
  return commit(
    s,
    (gg) => {
      const hh = curHand(gg)!;
      hh.bids[seat] = null;
      hh.blind[seat] = false;
    },
    { undo: true, toast: m.bidUndone },
  );
}

function entry(s: SpTableState, a: Extract<SpAction, { type: 'entry' }>): SpTableState {
  const e = entryOf(s);
  if (!e || !live(s)) return s;
  const h = curHand(s.game)!;
  const next = { ...e, nilTricks: e.nilTricks.slice() };
  if (a.teamA !== undefined) next.teamA = a.teamA;
  if (a.seat !== undefined && a.nil !== undefined) {
    if (h.bids[a.seat] !== 0) return s;
    next.nilTricks[a.seat] = a.nil;
  }
  return { ...s, entry: fitEntry(h, next) };
}

/** Ends the game where it stands: a hand still being entered is dropped, as it was never scored. */
const dropOpen = (g: SpGame) => {
  if (curHand(g)?.phase !== 'done') g.hands.pop();
};

function saveHand(s: SpTableState): SpTableState {
  if (!inPhase(s, 'tricks')) return s;
  const h = curHand(s.game)!,
    e = entryOf(s)!;
  if (!entryOk(h, e)) return s;
  const c = commit(
    s,
    (g) => {
      const at = now();
      g.hands[g.hands.length - 1] = enteredHand(h, e, at);
      const r = gameResult(g);
      if (r && r !== 'tie') {
        g.status = 'finished';
        g.result = r;
        g.finishedAt = at;
      }
    },
    { undo: true, toast: m.handSaved(h.index + 1) },
  );
  return { ...c, entry: null, fresh: true, dir: 1 };
}

function nextHand(s: SpTableState): SpTableState {
  if (!inPhase(s, 'done')) return s;
  const c = commit(s, (g) => void g.hands.push(newHand(g)), { undo: true });
  return { ...c, entry: null, fresh: false, dir: 1 };
}

const ended = (s: Live): SpTableState => ({
  ...s,
  modal: null,
  sheet: null,
  entry: null,
  fresh: true,
  dir: 1,
  screen: 'winner',
});

/**
 * An edit is made only when the whole game still passes the server's upload check; a finished game's result is
 * worked out again from the hands, and a game the edit no longer ends goes on.
 */
function editHand(
  s: SpTableState,
  i: number,
  ed: Extract<SpAction, { type: 'editHand' }>['edit'],
): SpTableState {
  const g = s.game;
  if (!g || !Number.isInteger(i) || g.hands[i]?.phase !== 'done') return s;
  const old = g.hands[i];
  const nh = tableHand({
    index: i,
    dealer: old.dealer,
    bids: ed.bids,
    blind: ed.blind,
    teamA: ed.teamA,
    nilTricks: ed.nilTricks,
    ...(old.doneAt !== undefined && { doneAt: old.doneAt }),
  });
  const next: SpGame = clone({ ...g, hands: g.hands.map((x, k) => (k === i ? nh : x)) });
  let reopened = false;
  if (next.status === 'finished' && next.result) {
    if (next.result.endedBy === 'end') next.result = endResult(scoresOf(gameTotals(next)));
    else if (next.result.endedBy !== 'draw') {
      const r = gameResult(next);
      if (r && r !== 'tie') next.result = r;
      else {
        // The game no longer ends on its last hand: it goes on with the next one.
        next.status = 'active';
        delete next.result;
        delete next.finishedAt;
        next.hands.push(newHand(next));
        reopened = true;
      }
    }
  } else if (next.status === 'active' && curHand(next)?.phase === 'done') {
    const r = gameResult(next);
    if (r && r !== 'tie') {
      next.status = 'finished';
      next.result = r;
      next.finishedAt = now();
    }
  }
  const bad = validate(next, Infinity);
  if (bad) {
    const earlier =
      bad.reason === 'hands' && bad.handIndex !== null && bad.handIndex <= g.hands.length - 1;
    return say(s, earlier ? m.editEarlier : m.editRefused);
  }
  const c = commit(
    s as Live,
    (gg) => {
      for (const k of Object.keys(gg)) delete (gg as unknown as Record<string, unknown>)[k];
      Object.assign(gg, clone(next));
    },
    {
      undo: true,
      toast: m.handUpdated(i + 1),
    },
  );
  const nowOver = c.game.status === 'finished' && g.status === 'active';
  if (nowOver) return { ...c, sheet: null, fresh: true, dir: 1, screen: 'winner' as const };
  if (reopened) return { ...c, sheet: null, screen: 'game' as const };
  return { ...c, sheet: { type: 'board' } };
}

/** The next of the three ways four people can pair up, so a swap gives everyone a new partner. */
const swapped = <T>([a, b, c, d]: T[]): T[] => [a, c, d, b];

function undoLast(s: SpTableState, lg: SpLastGroup | null | undefined): SpTableState {
  if (!s.undo.length) return say(s, m.nothingToUndo);
  const undo = s.undo.slice(0, -1);
  const g = parseSpSnapshot(s.undo[s.undo.length - 1]);
  if (!g) return say({ ...s, undo }, m.nothingToUndo);
  // Undo is a change like any other as far as other devices are concerned.
  const rev = Math.max(g.rev, s.game?.rev ?? 0) + 1;
  const screen = g.status === 'active' ? 'game' : g.status === 'finished' ? 'winner' : 'setup';
  return say(
    {
      ...s,
      game: { ...g, rev, updatedAt: now() },
      undo,
      entry: null,
      sheet: null,
      modal: null,
      pages: [],
      fresh: false,
      dir: -1,
      screen,
      setup: screen === 'setup' ? (s.setup ?? freshSetup(lg ?? null)) : s.setup,
    },
    m.undone,
  );
}

export function spReducer(s: SpTableState, a: SpAction): SpTableState {
  switch (a.type) {
    case 'go':
      return { ...s, dir: a.dir ?? 1, screen: a.screen, pages: [], sheet: null };
    case 'sheet':
      return { ...s, sheet: a.sheet };
    case 'openPage':
      return { ...s, dir: 1, sheet: null, pages: [...s.pages, a.route] };
    case 'closePage':
      return s.pages.length ? { ...s, dir: -1, pages: s.pages.slice(0, -1) } : s;
    case 'modal':
      return { ...s, modal: a.modal };
    case 'say':
      return say(s, a.msg, a.undo);
    case 'toastDone':
      return { ...s, toast: null };
    case 'setFresh':
      return { ...s, fresh: a.v };

    case 'startSetup':
      return {
        ...s,
        dir: 1,
        screen: 'setup',
        sheet: null,
        modal: null,
        pages: [],
        setup: freshSetup(a.lg),
      };
    case 'setupStep':
    case 'setupSeat':
    case 'setupSeatPatch':
    case 'setupSwap':
    case 'setupLastGroup':
    case 'setupDealer':
    case 'setupRules': {
      const su = s.setup && setupStep(s.setup, a);
      return su ? { ...s, setup: su } : s;
    }
    case 'beginGame':
      return beginGame(s, a);

    case 'bid':
      return bid(s, a.bid, a.blind);
    case 'unbid':
      return unbid(s);
    case 'toTricks':
      if (!inPhase(s, 'bidding') || toBid(curHand(s.game)!) !== null) return s;
      return {
        ...commit(s, (g) => void (curHand(g)!.phase = 'tricks')),
        entry: defaultEntry(curHand(s.game)!),
        dir: 1,
      };
    case 'toBids':
      if (!inPhase(s, 'tricks')) return s;
      return { ...commit(s, (g) => void (curHand(g)!.phase = 'bidding')), entry: null, dir: -1 };
    case 'entry':
      return entry(s, a);
    case 'saveHand':
      return saveHand(s);
    case 'nextHand':
      return nextHand(s);
    case 'editHand':
      return editHand(s, a.i, a.edit);

    case 'endGame':
      if (!live(s) || !hasDone(s.game)) return s;
      return ended(
        commit(
          s,
          (g) => {
            dropOpen(g);
            g.status = 'finished';
            g.result = endResult(scoresOf(gameTotals(g)));
            g.finishedAt = now();
          },
          { undo: true },
        ),
      );
    case 'drawGame':
      if (!live(s) || !hasDone(s.game)) return s;
      return ended(
        commit(
          s,
          (g) => {
            dropOpen(g);
            g.status = 'finished';
            g.result = { ...DRAW_RESULT };
            g.finishedAt = now();
          },
          { undo: true },
        ),
      );
    case 'cancelGame': {
      if (!live(s)) return s;
      const base = { modal: null, sheet: null, entry: null, pages: [], dir: -1 as const };
      // Without a scored hand nothing is kept; with one, it stays in History as Cancelled.
      if (!hasDone(s.game))
        return say(
          { ...s, ...base, game: null, undo: [], screen: 'setup', setup: freshSetup(a.lg) },
          m.discarded,
        );
      const c = commit(
        s,
        (g) => {
          dropOpen(g);
          g.status = 'cancelled';
          g.finishedAt = now();
        },
        { undo: true, toast: m.cancelled },
      );
      return { ...c, ...base, screen: 'setup', setup: freshSetup(a.lg) };
    }
    case 'rematch': {
      const old = s.game;
      if (!old) return s;
      const players = (a.swap ? swapped(old.players) : old.players).map((p) => ({ ...p }));
      return begin(
        s,
        freshGame(
          {
            players,
            direction: old.direction,
            firstDealerIndex: (old.firstDealerIndex + 1) % 4,
            rules: { ...old.rules },
          },
          a.id,
          a.syncId,
          a.now,
        ),
      );
    }
    case 'undo':
      return undoLast(s, a.lg);
    case 'openGame':
      return {
        ...s,
        game: a.game,
        undo: [],
        entry: null,
        dir: 1,
        sheet: null,
        modal: null,
        pages: [],
        screen: a.game.status === 'active' ? 'game' : 'winner',
      };
    case 'repaired':
      return {
        ...s,
        game: null,
        undo: [],
        corrupt: false,
        screen: 'setup',
        setup: s.setup ?? freshSetup(null),
      };
    case 'syncGame':
      if (!s.game || a.game.syncId !== s.game.syncId) return s;
      if (!a.fresh) return { ...s, game: a.game };
      return {
        ...s,
        game: a.game,
        undo: [],
        entry: null,
        screen:
          a.game.status !== 'active' && s.screen === 'game'
            ? 'winner'
            : a.game.status === 'active' && s.screen === 'winner'
              ? 'game'
              : s.screen,
      };
    case 'renewSyncId': {
      if (!s.game) return s;
      const old = s.game.syncId;
      // Undo snapshots carry the id too; a uuid never appears anywhere else in them.
      return {
        ...s,
        game: { ...s.game, syncId: a.syncId },
        undo: s.undo.map((u) => u.split(old).join(a.syncId)),
      };
    }
  }
}
