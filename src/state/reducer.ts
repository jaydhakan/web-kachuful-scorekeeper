import {
  bidOrder,
  clone,
  curRound,
  blockedReason,
  forbiddenFor,
  onlyResult,
  maxFor,
  newRound,
  resultsState,
  streakMilestones,
  totalRounds,
  type Game,
  type Player,
} from '@/domain';
import { now } from '@/lib/clock';
import { messages as m } from '@/strings/messages';
import { parseSnapshot, type SavedScreen } from './persistence';
import { pushSnapshot } from './undo';
import type { Action, AppState, SetupState, Toast } from './types';

export function initialState(
  game: Game,
  screen: SavedScreen,
  undo: string[],
  corrupt = false,
): AppState {
  return {
    game,
    screen,
    nav: [],
    dir: 1,
    setup: null,
    undo,
    sheet: null,
    modal: null,
    toast: null,
    banner: null,
    seq: null,
    fresh: false,
    sumAnim: false,
    streakFx: null,
    advance: null,
    noteSeq: 0,
    autoResult: null,
    corrupt,
  };
}

const celebrate = (g: Game) => {
  const fx = streakMilestones(g);
  return fx.length ? fx : null;
};

const say = (s: AppState, msg: string, undo = false, link?: Toast['link']): AppState => ({
  ...s,
  noteSeq: s.noteSeq + 1,
  toast: { id: s.noteSeq + 1, msg, undo, ...(link && { link }) },
});

function commit(
  s: AppState,
  fn: (g: Game) => void,
  o: { undo?: boolean; toast?: string } = {},
): AppState {
  const g = clone(s.game);
  const undo = o.undo ? pushSnapshot(s.undo, JSON.stringify(s.game)) : s.undo;
  fn(g);
  g.updatedAt = now();
  g.rev = s.game.rev + 1;
  const next = { ...s, game: g, undo };
  return o.toast ? say(next, o.toast, !!o.undo) : next;
}

export const roundBanner = (g: Game, r: { cards: number; index: number }): string | null =>
  r.cards === g.maxCards
    ? m.banner.peak(r.cards)
    : r.cards === 3 && r.index > 0
      ? m.banner.backTo3
      : null;

const withBanner = (s: AppState, text: string | null): AppState =>
  text ? { ...s, noteSeq: s.noteSeq + 1, banner: { id: s.noteSeq + 1, text } } : s;

function freshGame(
  base: Pick<
    Game,
    'players' | 'direction' | 'firstDealerIndex' | 'decks' | 'maxCards' | 'lengthMode'
  >,
  id: string,
  syncId: string,
  t: number,
): Game {
  const g: Game = {
    id,
    syncId,
    rev: 1,
    createdAt: t,
    updatedAt: t,
    ...base,
    rounds: [],
    status: 'active',
    ui: { view: 'round', bidIdx: 0 },
  };
  g.rounds.push(newRound(g, 0));
  return g;
}

function begin(s: AppState, g: Game): AppState {
  const old = s.game;
  // A real game in progress (or just finished) stays one Undo away instead of being confirmed away.
  const keep = old.id !== 'demo' && old.rounds.some((r) => Object.keys(r.bids).length > 0);
  const next: AppState = {
    ...s,
    game: g,
    undo: keep ? pushSnapshot([], JSON.stringify(old)) : [],
    dir: 1,
    screen: 'round',
    seq: { round: g.rounds[0], prev: null, banner: roundBanner(g, g.rounds[0]) },
  };
  return keep ? say(next, m.toasts.previousSaved, true) : next;
}

function bid(s: AppState, v: number): AppState {
  const g = s.game,
    r = curRound(g),
    od = bidOrder(g, r),
    n = g.players.length,
    bi = g.ui.bidIdx;
  const pI = od[bi],
    p = g.players[pI];
  if (pI === r.dealerIndex && v === forbiddenFor(g, r)) {
    return commit(s, (gg) => {
      curRound(gg).hookHits = (curRound(gg).hookHits || 0) + 1;
    });
  }
  let next = bi;
  const out = commit(
    s,
    (gg) => {
      const rr = curRound(gg);
      rr.bids[p.id] = v;
      if (pI === rr.dealerIndex) gg.ui.hookWarn = false;
      const miss = od.findIndex((i) => rr.bids[gg.players[i].id] === undefined);
      if (miss >= 0) next = miss;
      else {
        const f = forbiddenFor(gg, rr),
          dl = gg.players[rr.dealerIndex];
        if (f != null && rr.bids[dl.id] === f) {
          delete rr.bids[dl.id];
          gg.ui.hookWarn = true;
        }
        next = n - 1;
      }
    },
    { undo: true, toast: m.toasts.bidSaved },
  );
  return { ...out, advance: next !== bi ? { idx: next } : s.advance };
}

function undoLast(s: AppState): AppState {
  if (!s.undo.length) return say(s, m.toasts.nothingToUndo);
  const undo = s.undo.slice(0, -1);
  const g = parseSnapshot(s.undo[s.undo.length - 1]);
  if (!g) return say({ ...s, undo }, m.toasts.nothingToUndo);
  // Undo is a change like any other as far as other devices are concerned.
  const base = {
    ...s,
    game: { ...g, rev: s.game.rev + 1, updatedAt: now() },
    undo,
    advance: null,
    sumAnim: false,
    streakFx: null,
    sheet: null,
    seq: null,
    dir: -1 as const,
  };
  return say({ ...base, screen: g.status === 'finished' ? 'winner' : 'round' }, m.toasts.undone);
}

function setupSeats(
  su: SetupState,
  f: (seats: SetupState['seats']) => SetupState['seats'],
): SetupState {
  return { ...su, seats: f(su.seats) };
}

/** `autoResult` lasts only until the next action, so a hint about it never outlives what it explains. */
export function reducer(s: AppState, a: Action): AppState {
  let n = step(s, a);
  // Going to a game screen leaves whatever was opened over it.
  if (n.nav.length && LEAVES_NAV.has(a.type)) n = { ...n, nav: [] };
  return a.type === 'setResult' || n.autoResult === null ? n : { ...n, autoResult: null };
}

const LEAVES_NAV = new Set<Action['type']>([
  'go',
  'resume',
  'startSetup',
  'beginGame',
  'rematch',
  'openGame',
]);

function step(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'go':
      return { ...s, dir: a.dir ?? 1, screen: a.screen };
    case 'startSetup':
      return {
        ...s,
        dir: 1,
        screen: 'setup',
        setup: {
          step: 1,
          decks: 1,
          n: null,
          dir: 'cw',
          seats: [],
          dealer: 0,
          length: 'endless',
          lg: a.lg,
        },
      };
    case 'setupPatch':
      return s.setup ? { ...s, setup: { ...s.setup, ...a.patch } } : s;
    case 'setupSeat':
      return s.setup
        ? { ...s, setup: setupSeats(s.setup, (x) => x.map((q, i) => (i === a.k ? a.seat : q))) }
        : s;
    case 'setupSeatPatch':
      return s.setup
        ? {
            ...s,
            setup: setupSeats(s.setup, (x) =>
              x.map((q, i) => (i === a.k && q ? { ...q, ...a.patch } : q)),
            ),
          }
        : s;
    case 'setupSwap': {
      if (!s.setup) return s;
      const seats = s.setup.seats.slice();
      [seats[a.a], seats[a.b]] = [seats[a.b], seats[a.a]];
      return {
        ...s,
        setup: { ...s.setup, seats, dealer: seats.indexOf(s.setup.seats[s.setup.dealer]) },
      };
    }
    case 'beginGame': {
      const S = s.setup;
      if (!S || !S.n) return s;
      const players: Player[] = S.seats.map((p, i) => ({
        id: 'p' + a.now.toString(36) + i,
        name: p?.name ?? '',
        emoji: p?.emoji ?? '',
        color: p?.color ?? '',
      }));
      const g = freshGame(
        {
          players,
          direction: S.dir,
          firstDealerIndex: S.dealer,
          decks: S.decks,
          maxCards: maxFor(S.n, S.decks),
          lengthMode: S.length,
        },
        a.id,
        a.syncId,
        a.now,
      );
      return begin(s, g);
    }
    case 'resume':
      return { ...s, dir: 1, screen: s.game.status === 'finished' ? 'winner' : 'round' };
    case 'bid':
      return bid(s, a.v);
    case 'advanceBid':
      return {
        ...commit(s, (g) => {
          g.ui.bidIdx = a.idx;
        }),
        advance: null,
      };
    case 'pickSeat': {
      const g = s.game,
        r = curRound(g);
      if (r.phase !== 'bidding') return s;
      const od = bidOrder(g, r),
        pos = od.indexOf(a.k),
        p = g.players[a.k];
      return r.bids[p.id] !== undefined || pos === g.ui.bidIdx
        ? commit(s, (gg) => {
            gg.ui.bidIdx = pos;
          })
        : s;
    }
    case 'phase':
      return commit({ ...s, dir: a.dir ?? 1 }, (g) => {
        curRound(g).phase = a.phase;
        if (a.phase === 'bidding') g.ui.bidIdx = 0;
        if (a.phase === 'playing') g.ui.hookWarn = false;
      });
    case 'setResult': {
      const r = curRound(s.game),
        ids = s.game.players.map((p) => p.id);
      // The screen greys these out; the rule is the domain's, so it holds whatever calls this.
      if (!r.tricks && blockedReason(r.cards, ids, r.bids, r.results, a.id, a.v)) return s;
      const next = { ...r.results, [a.id]: a.v };
      // The last player left has nothing to decide when only one result can work, so it is filled in.
      const open = ids.filter((id) => !next[id]);
      let auto: string | null = null;
      if (!r.tricks && open.length === 1) {
        const v = onlyResult(r.cards, ids, r.bids, next, open[0]);
        if (v) {
          next[open[0]] = v;
          auto = open[0];
        }
      }
      return {
        ...commit(s, (g) => {
          curRound(g).results = { ...next };
        }),
        autoResult: auto,
      };
    }
    case 'setTricks':
      return commit(s, (g) => {
        const r = curRound(g);
        if (!r.tricks) return;
        const v = Math.max(0, Math.min(r.cards, (r.tricks[a.id] || 0) + a.d));
        r.tricks[a.id] = v;
        r.results[a.id] = v === r.bids[a.id] ? 'made' : 'missed';
      });
    case 'toggleExact':
      return commit(s, (g) => {
        const r = curRound(g);
        if (r.tricks) r.tricks = null;
        else {
          const tricks: Record<string, number> = {};
          g.players.forEach((p) => {
            tricks[p.id] = r.results[p.id] === 'made' ? r.bids[p.id] : 0;
            r.results[p.id] = tricks[p.id] === r.bids[p.id] ? 'made' : 'missed';
          });
          r.tricks = tricks;
        }
      });
    case 'confirmRound': {
      if (!resultsState(s.game, curRound(s.game)).ok) return s;
      const c = {
        ...commit(
          s,
          (g) => {
            const r = curRound(g);
            r.phase = 'done';
            r.doneAt = now();
            if (g.rounds.length >= totalRounds(g)) {
              g.status = 'finished';
              g.finishedAt = r.doneAt;
            } else g.ui.view = 'summary';
          },
          { undo: true },
        ),
        dir: 1 as const,
      };
      return c.game.status === 'finished'
        ? { ...c, fresh: true, screen: 'winner' }
        : say(
            { ...c, sumAnim: true, streakFx: celebrate(c.game), screen: 'round' },
            m.toasts.roundSaved,
            true,
          );
    }
    case 'nextRound': {
      const pr = curRound(s.game);
      const c = commit(
        s,
        (g) => {
          g.rounds.push(newRound(g, pr.index + 1));
          g.ui = { view: 'round', bidIdx: 0 };
        },
        { undo: true },
      );
      const r = curRound(c.game);
      return { ...c, seq: { round: r, prev: pr.dealerIndex, banner: roundBanner(c.game, r) } };
    }
    case 'finishGame':
      return {
        ...commit(
          s,
          (g) => {
            g.status = 'finished';
            g.finishedAt = now();
          },
          { undo: true },
        ),
        fresh: true,
        dir: 1,
        screen: 'winner',
      };
    case 'rematch': {
      const old = s.game,
        n = old.players.length;
      const g = freshGame(
        {
          players: old.players.map((p) => ({ ...p })),
          direction: old.direction,
          firstDealerIndex: (old.firstDealerIndex + 1) % n,
          decks: old.decks,
          maxCards: old.maxCards,
          lengthMode: old.lengthMode,
        },
        a.id,
        a.syncId,
        a.now,
      );
      return begin(s, g);
    }
    case 'editRound':
      return {
        ...commit(
          s,
          (g) => {
            const rr = g.rounds[a.i];
            rr.bids = { ...a.bids };
            rr.results = { ...a.results };
            rr.tricks = null;
          },
          { undo: true, toast: m.toasts.roundUpdated(a.i + 1) },
        ),
        sheet: { type: 'board' },
      };
    case 'undo':
      return undoLast(s);
    case 'sheet':
      return { ...s, sheet: a.sheet };
    case 'modal':
      return { ...s, modal: a.modal };
    case 'seqDone':
      return withBanner({ ...s, seq: null }, s.seq?.banner ?? null);
    case 'say':
      return say(s, a.msg, a.undo, a.link);
    case 'navPush':
      return { ...s, nav: [...s.nav, a.route], dir: 1, sheet: null };
    case 'navPop':
      return s.nav.length ? { ...s, nav: s.nav.slice(0, -1), dir: -1 } : s;
    case 'navReset':
      return { ...s, nav: a.routes ?? [], dir: a.routes?.length ? 1 : -1, sheet: null };
    case 'toastDone':
      return { ...s, toast: null };
    case 'bannerDone':
      return { ...s, banner: null };
    case 'setFresh':
      return { ...s, fresh: a.v };
    case 'setSumAnim':
      return { ...s, sumAnim: a.v };
    case 'streakDone':
      return { ...s, streakFx: null };
    case 'openGame':
      return {
        ...s,
        game: a.game,
        undo: [],
        dir: 1,
        sheet: null,
        seq: null,
        streakFx: null,
        sumAnim: false,
        advance: null,
        screen: a.game.status === 'finished' ? 'winner' : 'round',
      };
    case 'replaceGame':
      return { ...s, game: a.game, undo: [], corrupt: false, screen: 'home' };
  }
}
