import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  SUITS,
  auction,
  canAdd,
  copyNeeded,
  deckTotal,
  dealerFor,
  decksFor,
  defaultRules,
  enteredPoints,
  gameOver,
  minBidRange,
  rulesOk,
  speakingOrder,
  teamPointsFrom,
  validBid,
  validCall,
  validCalled,
  validPlayedBy,
  validate,
  type Call,
  type CardRef,
  type KtGame,
  type KtHand,
  type KtMode,
  type KtRules,
  type Player,
} from '@/games/kaali-teeri/domain';
import { ktMessages as m } from '@/games/kaali-teeri/strings/messages';
import { now } from '@/lib/clock';
import { nameKey, type Seat } from '@/people';
import { pushSnapshot } from '@/state/undo';
import { CURRENT_SCHEMA } from './migrations';
import { parseKtSnapshot } from './persistence';
import { curHand } from './select';
import type { KtAction, KtPrefs, KtSavedScreen, KtSetup, KtState } from './types';

export function initialKtState(
  game: KtGame | null,
  screen: KtSavedScreen,
  undo: string[],
  prefs: KtPrefs,
  corrupt = false,
): KtState {
  return {
    game,
    screen: screen === 'game' && game?.status === 'active' ? 'game' : 'home',
    dir: 1,
    setup: null,
    undo,
    prefs,
    sheet: null,
    modal: null,
    toast: null,
    banner: null,
    deal: null,
    noteSeq: 0,
    fresh: false,
    corrupt,
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const hasDone = (g: KtGame | null) => !!g && g.hands.some((h) => h.phase === 'done');

const say = (s: KtState, msg: string, undo = false): KtState => ({
  ...s,
  noteSeq: s.noteSeq + 1,
  toast: { id: s.noteSeq + 1, msg, undo },
});
const withBanner = (s: KtState, text: string): KtState => ({
  ...s,
  noteSeq: s.noteSeq + 1,
  banner: { id: s.noteSeq + 1, text },
});

/** Every change to the game: a new revision and time, and a snapshot first when it can be undone. */
function commit(
  s: KtState & { game: KtGame },
  fn: (g: KtGame, h: KtHand) => void,
  o: { undo?: boolean; toast?: string } = {},
): KtState & { game: KtGame } {
  const g = clone(s.game);
  const undo = o.undo ? pushSnapshot(s.undo, JSON.stringify(s.game)) : s.undo;
  fn(g, curHand(g));
  g.updatedAt = now();
  g.rev = s.game.rev + 1;
  const next = { ...s, game: g, undo };
  return o.toast ? (say(next, o.toast, !!o.undo) as typeof next) : next;
}

const newHand = (g: KtGame, index: number, mode: KtMode): KtHand => ({
  index,
  dealerIndex: dealerFor(g, index),
  phase: 'bidding',
  mode,
  calls: [],
  bidder: null,
  bid: null,
  trump: null,
  called: [],
  playedBy: [],
  teamPoints: null,
  countedBy: null,
});

const modeOf = (p: KtPrefs): KtMode => (p.quick ? 'quick' : 'auction');
const nameOf = (g: KtGame, id: string | null) => g.players.find((p) => p.id === id)?.name ?? '';

function freshGame(
  base: Pick<KtGame, 'players' | 'direction' | 'firstDealerIndex' | 'rules'>,
  id: string,
  syncId: string,
  t: number,
  mode: KtMode,
): KtGame {
  const g: KtGame = {
    kind: 'kaali-teeri',
    schemaVersion: CURRENT_SCHEMA,
    id,
    syncId,
    rev: 1,
    createdAt: t,
    updatedAt: t,
    ...base,
    hands: [],
    status: 'active',
    ui: { view: 'hand' },
  };
  g.hands.push(newHand(g, 0, mode));
  return g;
}

/** A game with a hand done stays one Undo away when a new one starts; one without leaves no trace. */
function begin(s: KtState, g: KtGame): KtState {
  const old = s.game;
  const keep = !!old && old.id !== 'demo' && hasDone(old);
  const next: KtState = {
    ...s,
    game: g,
    setup: null,
    undo: keep ? pushSnapshot([], JSON.stringify(old)) : [],
    dir: 1,
    screen: 'game',
    sheet: null,
    modal: null,
    deal: { index: 0, prev: null },
  };
  return keep ? say(next, m.toasts.previousSaved, true) : next;
}

// ---- Setup ----

const defaultMin = (n: number) => defaultRules(n).minBid;

/** A custom minimum the table's decks and step allow; anything else is refused. */
const minBidOk = (min: number, n: number, step: 5 | 10) => {
  const { lo, hi } = minBidRange(decksFor(n));
  return Number.isInteger(min) && min >= lo && min <= hi && min % step === 0;
};

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

const resize = <T>(a: (T | null)[], n: number): (T | null)[] =>
  Array.from({ length: n }, (_, i) => a[i] ?? null);

function setupStep(su: KtSetup, a: KtAction): KtSetup | null {
  switch (a.type) {
    case 'setupStep':
      if (a.step === 3 && su.seats.some((q) => !q || !q.name.trim())) return null;
      return { ...su, step: a.step };
    case 'setupCount': {
      if (!Number.isInteger(a.n) || a.n < MIN_PLAYERS || a.n > MAX_PLAYERS) return null;
      const keep = su.minBid !== null && minBidOk(su.minBid, a.n, su.bidStep);
      return {
        ...su,
        n: a.n,
        seats: resize(su.seats, a.n),
        dealer: su.dealer < a.n ? su.dealer : 0,
        minBid: keep ? su.minBid : null,
      };
    }
    case 'setupDir':
      return a.dir === 'cw' || a.dir === 'ccw' ? { ...su, dir: a.dir } : null;
    case 'setupMinBid':
      if (a.minBid === null || a.minBid === defaultMin(su.n)) return { ...su, minBid: null };
      return minBidOk(a.minBid, su.n, su.bidStep) ? { ...su, minBid: a.minBid } : null;
    case 'setupBidStep': {
      if (a.step !== 5 && a.step !== 10) return null;
      if (su.minBid === null) return { ...su, bidStep: a.step };
      // A minimum off the new step moves up onto it (or down, at the top of the range).
      const { hi } = minBidRange(decksFor(su.n));
      let min = Math.ceil(su.minBid / a.step) * a.step;
      if (min > hi) min = Math.floor(hi / a.step) * a.step;
      return { ...su, bidStep: a.step, minBid: min === defaultMin(su.n) ? null : min };
    }
    case 'setupLength':
      return a.length === 'endless' || a.length === 'to1000' ? { ...su, length: a.length } : null;
    case 'setupSeat':
      if (a.k < 0 || a.k >= su.n || (a.seat && clashes(su.seats, a.k, a.seat))) return null;
      return { ...su, seats: su.seats.map((q, i) => (i === a.k ? a.seat : q)) };
    case 'setupSeatPatch': {
      const cur = su.seats[a.k];
      if (!cur) return null;
      const seat = { ...cur, ...a.patch };
      if (clashes(su.seats, a.k, seat)) return null;
      return { ...su, seats: su.seats.map((q, i) => (i === a.k ? seat : q)) };
    }
    case 'setupSwap': {
      if ([a.a, a.b].some((k) => k < 0 || k >= su.n)) return null;
      const seats = su.seats.slice();
      [seats[a.a], seats[a.b]] = [seats[a.b], seats[a.a]];
      // The dealer is a person, so the chip follows them to their new seat.
      const dealer = su.dealer === a.a ? a.b : su.dealer === a.b ? a.a : su.dealer;
      return { ...su, seats, dealer };
    }
    case 'setupLastGroup': {
      const lg = su.lg;
      if (!lg || lg.players.length < MIN_PLAYERS || lg.players.length > MAX_PLAYERS) return null;
      const n = lg.players.length;
      return {
        ...su,
        n,
        dir: lg.direction,
        seats: lg.players.map((p) => ({ ...p })),
        dealer: su.dealer < n ? su.dealer : 0,
        minBid: su.minBid !== null && minBidOk(su.minBid, n, su.bidStep) ? su.minBid : null,
      };
    }
    case 'setupDealer':
      return Number.isInteger(a.k) && a.k >= 0 && a.k < su.n ? { ...su, dealer: a.k } : null;
    default:
      return null;
  }
}

function startSetup(s: KtState, lg: KtSetup['lg']): KtState {
  const fits = !!lg && lg.players.length >= MIN_PLAYERS && lg.players.length <= MAX_PLAYERS;
  const n = fits ? lg.players.length : MIN_PLAYERS;
  const bidStep = fits && (lg.step === 5 || lg.step === 10) ? lg.step : 5;
  const min =
    fits && lg.minBid !== defaultMin(n) && minBidOk(lg.minBid, n, bidStep) ? lg.minBid : null;
  return {
    ...s,
    dir: 1,
    screen: 'setup',
    sheet: null,
    modal: null,
    setup: {
      step: 1,
      n,
      dir: fits ? lg.direction : 'cw',
      minBid: min,
      bidStep,
      length: fits && lg.length === 'to1000' ? 'to1000' : 'endless',
      seats: resize<Seat>([], n),
      dealer: 0,
      lg: lg ?? null,
    },
  };
}

/** The rules a setup plays by, or null when they don't fit the table. */
export function setupRules(su: KtSetup): KtRules | null {
  const r: KtRules = {
    ...defaultRules(su.n),
    minBid: su.minBid ?? defaultMin(su.n),
    step: su.bidStep,
    length: su.length,
  };
  return rulesOk(r, su.n) ? r : null;
}

function beginGame(s: KtState, a: Extract<KtAction, { type: 'beginGame' }>): KtState {
  const su = s.setup;
  if (!su) return s;
  const rules = setupRules(su);
  const seats = su.seats;
  const ids = a.playerIds;
  if (
    !rules ||
    seats.length !== su.n ||
    seats.some((q) => !q || !q.name.trim()) ||
    ids.length !== su.n ||
    ids.some((id) => !id) ||
    new Set(ids).size !== ids.length
  )
    return s;
  const players: Player[] = seats.map((q, i) => ({
    id: 'p' + a.now.toString(36) + i,
    name: q!.name,
    emoji: q!.emoji,
    color: q!.color,
    playerId: ids[i],
  }));
  const g = freshGame(
    { players, direction: su.dir, firstDealerIndex: su.dealer, rules },
    a.id,
    a.syncId,
    a.now,
    modeOf(s.prefs),
  );
  return begin(s, g);
}

// ---- The hand ----

type Live = KtState & { game: KtGame };
const live = (s: KtState): s is Live => !!s.game && s.game.status === 'active';
const inPhase = (s: KtState, ...p: KtHand['phase'][]): s is Live =>
  live(s) && p.includes(curHand(s.game).phase);

/** Only a card's rank, suit and (when both copies are in play) its copy are kept. */
const cleanCard = (c: CardRef): CardRef => ({
  rank: c.rank,
  suit: c.suit,
  ...(c.copy !== undefined && { copy: c.copy }),
});

function setMode(s: KtState, mode: KtMode): KtState {
  if (mode !== 'quick' && mode !== 'auction') return s;
  const prefs = { ...s.prefs, quick: mode === 'quick' };
  const t = prefs.quick === s.prefs.quick ? s : { ...s, prefs };
  if (!inPhase(t, 'bidding') || curHand(t.game).mode === mode) return t;
  return commit(
    t,
    (_, h) => {
      h.mode = mode;
      // Quick mode keeps no auction; switching back starts the auction over.
      h.calls = [];
    },
    { undo: true },
  );
}

function call(s: KtState, what: KtAction & { type: 'call' }): KtState {
  if (!inPhase(s, 'bidding')) return s;
  const g = s.game,
    h = curHand(g);
  if (h.mode !== 'auction') return s;
  const order = speakingOrder(g, h.index);
  const st = auction(h.calls, order, g.rules);
  if (!st.toSpeak) return s;
  const w = what.what;
  const c: Call =
    w === 'pass'
      ? { playerId: st.toSpeak, pass: true }
      : w === 'forced'
        ? { playerId: st.toSpeak, forced: g.rules.minBid }
        : { playerId: st.toSpeak, bid: w };
  if (!validCall(h.calls, order, g.rules, c)) return s;
  const next = commit(
    s,
    (_, hh) => {
      hh.calls.push(c);
      const done = auction(hh.calls, order, g.rules);
      if (done.done) {
        hh.bidder = done.holder;
        hh.bid = done.high;
        hh.phase = 'calling';
      }
    },
    { undo: true },
  );
  const nh = curHand(next.game);
  if (nh.phase !== 'calling') return next;
  const text = 'forced' in c ? m.banner.forced : m.banner.won;
  return withBanner(next, text(nameOf(g, nh.bidder), nh.bid!));
}

function quickBid(s: KtState, bidder: string, bid: number): KtState {
  if (!inPhase(s, 'bidding')) return s;
  const g = s.game;
  if (curHand(g).mode !== 'quick' || !g.players.some((p) => p.id === bidder)) return s;
  if (!validBid(bid, g.rules)) return s;
  return commit(
    s,
    (_, h) => {
      h.bidder = bidder;
      h.bid = bid;
      h.phase = 'calling';
    },
    { undo: true, toast: m.toasts.bidSaved(nameOf(g, bidder), bid) },
  );
}

function markPlayed(s: KtState, i: number, by: string | null): KtState {
  if (!inPhase(s, 'playing', 'result')) return s;
  const g = s.game,
    h = curHand(g);
  if (!Number.isInteger(i) || i < 0 || i >= h.called.length || h.playedBy[i] === by) return s;
  const playedBy = h.playedBy.map((p, k) => (k === i ? by : p));
  if (
    !validPlayedBy(
      { ...h, playedBy },
      g.players.map((p) => p.id),
    )
  )
    return s;
  return commit(s, (_, hh) => void (hh.playedBy = playedBy), { undo: true });
}

function points(s: KtState, entered: number | null): KtState {
  if (!inPhase(s, 'result')) return s;
  const g = s.game,
    total = deckTotal(g.rules.decks);
  if (entered === null) {
    return curHand(g).teamPoints === null ? s : commit(s, (_, h) => void (h.teamPoints = null));
  }
  if (!Number.isInteger(entered) || entered < 0 || entered > total || entered % 5 !== 0) return s;
  const by = curHand(g).countedBy ?? s.prefs.countedBy;
  return commit(s, (_, h) => {
    h.countedBy = by;
    h.teamPoints = teamPointsFrom(entered, by, total);
  });
}

function countedBy(s: KtState, by: KtState['prefs']['countedBy']): KtState {
  if (by !== 'defenders' && by !== 'bidders') return s;
  const t = s.prefs.countedBy === by ? s : { ...s, prefs: { ...s.prefs, countedBy: by } };
  if (!inPhase(t, 'result') || curHand(t.game).countedBy === by) return t;
  const g = t.game;
  // The number typed stays; it now counts the other side.
  const entered = enteredPoints(curHand(g), g.rules);
  return commit(t, (_, h) => {
    h.countedBy = by;
    if (entered !== null) h.teamPoints = teamPointsFrom(entered, by, deckTotal(g.rules.decks));
  });
}

function confirmHand(s: KtState): KtState {
  if (!inPhase(s, 'result')) return s;
  const g = s.game,
    h = curHand(g);
  if (
    h.teamPoints === null ||
    h.countedBy === null ||
    h.playedBy.includes(null) ||
    !validPlayedBy(
      h,
      g.players.map((p) => p.id),
    )
  )
    return s;
  const c = commit(
    s,
    (gg, hh) => {
      hh.phase = 'done';
      hh.doneAt = now();
      if (gameOver(gg)) {
        gg.status = 'finished';
        gg.finishedAt = hh.doneAt;
      } else gg.ui.view = 'summary';
    },
    { undo: true },
  );
  return c.game.status === 'finished'
    ? { ...c, fresh: true, dir: 1, screen: 'winner' }
    : say({ ...c, dir: 1, screen: 'game' }, m.toasts.handSaved(h.index + 1), true);
}

function nextHand(s: KtState): KtState {
  if (!live(s) || curHand(s.game).phase !== 'done') return s;
  const prev = curHand(s.game).dealerIndex;
  const c = commit(
    s,
    (g, h) => {
      g.hands.push(newHand(g, h.index + 1, modeOf(s.prefs)));
      g.ui = { view: 'hand' };
    },
    { undo: true },
  );
  return { ...c, dir: 1, deal: { index: curHand(c.game).index, prev } };
}

/** Ends the game where it stands: a hand still being played is dropped, as it was never scored. */
const finished = (s: Live): Live =>
  commit(
    s,
    (g) => {
      if (curHand(g).phase !== 'done') g.hands.pop();
      g.status = 'finished';
      g.finishedAt = now();
    },
    { undo: true },
  );

function editHand(s: KtState, i: number, e: KtAction & { type: 'editHand' }): KtState {
  const g = s.game;
  if (!g || !Number.isInteger(i) || !g.hands[i] || g.hands[i].phase !== 'done') return s;
  const ed = e.edit,
    h = g.hands[i];
  const total = deckTotal(g.rules.decks);
  if (
    !Number.isInteger(ed.entered) ||
    ed.entered < 0 ||
    ed.entered > total ||
    (ed.countedBy !== 'defenders' && ed.countedBy !== 'bidders')
  )
    return s;
  // A changed bidder or amount no longer matches the auction, so the hand keeps only its result (quick).
  const keepAuction = h.mode === 'auction' && ed.bidder === h.bidder && ed.bid === h.bid;
  const nh: KtHand = {
    ...h,
    mode: keepAuction ? 'auction' : 'quick',
    calls: keepAuction ? h.calls : [],
    bidder: ed.bidder,
    bid: ed.bid,
    trump: ed.trump,
    called: ed.called.map(cleanCard),
    playedBy: [...ed.playedBy],
    countedBy: ed.countedBy,
    teamPoints: teamPointsFrom(ed.entered, ed.countedBy, total),
  };
  const hands = g.hands.map((x, k) => (k === i ? nh : x));
  // The domain's upload check is the rule: an edit the server would refuse is never made.
  if (!SUITS.includes(ed.trump) || validate({ ...g, hands }, Infinity)) return s;
  const c = commit(
    s as Live,
    (gg) => {
      gg.hands[i] = clone(nh);
      if (gg.status === 'active' && curHand(gg).phase === 'done' && gameOver(gg)) {
        gg.status = 'finished';
        gg.finishedAt = now();
      }
    },
    { undo: true, toast: m.toasts.handUpdated(i + 1) },
  );
  return c.game.status === 'finished' && g.status === 'active'
    ? { ...c, sheet: null, fresh: true, dir: 1, screen: 'winner' }
    : { ...c, sheet: { type: 'board' } };
}

function undoLast(s: KtState): KtState {
  if (!s.undo.length) return say(s, m.toasts.nothingToUndo);
  const undo = s.undo.slice(0, -1);
  const g = parseKtSnapshot(s.undo[s.undo.length - 1]);
  if (!g) return say({ ...s, undo }, m.toasts.nothingToUndo);
  // Undo is a change like any other as far as other devices are concerned.
  const rev = Math.max(g.rev, s.game?.rev ?? 0) + 1;
  return say(
    {
      ...s,
      game: { ...g, rev, updatedAt: now() },
      undo,
      sheet: null,
      modal: null,
      deal: null,
      dir: -1,
      screen: g.status === 'finished' ? 'winner' : 'game',
    },
    m.toasts.undone,
  );
}

export function ktReducer(s: KtState, a: KtAction): KtState {
  switch (a.type) {
    case 'go':
      return { ...s, dir: a.dir ?? 1, screen: a.screen };
    case 'resume':
      return s.game
        ? { ...s, dir: 1, screen: s.game.status === 'finished' ? 'winner' : 'game' }
        : s;
    case 'sheet':
      return { ...s, sheet: a.sheet };
    case 'modal':
      return { ...s, modal: a.modal };
    case 'say':
      return say(s, a.msg, a.undo);
    case 'toastDone':
      return { ...s, toast: null };
    case 'bannerDone':
      return { ...s, banner: null };
    case 'dealDone':
      return { ...s, deal: null };
    case 'setFresh':
      return { ...s, fresh: a.v };

    case 'startSetup':
      return startSetup(s, a.lg);
    case 'setupStep':
    case 'setupCount':
    case 'setupDir':
    case 'setupMinBid':
    case 'setupBidStep':
    case 'setupLength':
    case 'setupSeat':
    case 'setupSeatPatch':
    case 'setupSwap':
    case 'setupLastGroup':
    case 'setupDealer': {
      const su = s.setup && setupStep(s.setup, a);
      return su ? { ...s, setup: su } : s;
    }
    case 'beginGame':
      return beginGame(s, a);

    case 'setMode':
      return setMode(s, a.mode);
    case 'quickBid':
      return quickBid(s, a.bidder, a.bid);
    case 'call':
      return call(s, a);

    case 'trump':
      if (!inPhase(s, 'calling') || !SUITS.includes(a.suit) || curHand(s.game).trump === a.suit)
        return s;
      return commit(s, (_, h) => void (h.trump = a.suit), { undo: true });
    case 'addCard': {
      if (!inPhase(s, 'calling')) return s;
      const card = cleanCard(a.card);
      if (!canAdd(card, curHand(s.game).called, s.game.players.length)) return s;
      return commit(
        s,
        (_, h) => {
          h.called.push(card);
          h.playedBy.push(null);
        },
        { undo: true },
      );
    }
    case 'removeCard':
      if (!inPhase(s, 'calling') || !curHand(s.game).called[a.i]) return s;
      return commit(
        s,
        (_, h) => {
          h.called.splice(a.i, 1);
          h.playedBy.splice(a.i, 1);
        },
        { undo: true },
      );
    case 'setCopy': {
      if (!inPhase(s, 'calling')) return s;
      const n = s.game.players.length,
        called = curHand(s.game).called,
        c = called[a.i];
      if (!c || c.copy === a.copy || !copyNeeded(c, n)) return s;
      const card = { ...c, copy: a.copy };
      const others = called.filter((_, k) => k !== a.i);
      if (!canAdd(card, others, n)) return s;
      return commit(s, (_, h) => void (h.called[a.i] = card), { undo: true });
    }
    case 'confirmCall': {
      if (!inPhase(s, 'calling')) return s;
      const h = curHand(s.game);
      if (!h.trump || !validCalled(h.called, s.game.players.length)) return s;
      return commit(s, (_, hh) => void (hh.phase = 'playing'), { undo: true });
    }

    case 'markPlayed':
      return markPlayed(s, a.i, a.by);
    case 'toResult':
      if (!inPhase(s, 'playing')) return s;
      return commit(s, (_, h) => {
        h.phase = 'result';
        h.countedBy = s.prefs.countedBy;
      });
    case 'toPlay':
      if (!inPhase(s, 'result')) return s;
      // A hand in play has no points yet.
      return commit(s, (_, h) => {
        h.phase = 'playing';
        h.teamPoints = null;
        h.countedBy = null;
      });
    case 'countedBy':
      return countedBy(s, a.by);
    case 'points':
      return points(s, a.entered);
    case 'confirmHand':
      return confirmHand(s);

    case 'nextHand':
      return nextHand(s);
    case 'finishGame':
      if (!live(s) || !hasDone(s.game)) return s;
      return { ...finished(s), modal: null, fresh: true, dir: 1, screen: 'winner' };
    case 'abandon':
      if (!live(s)) return s;
      // With a hand scored it ends where it stands and stays in History; without, it leaves no trace.
      if (!hasDone(s.game))
        return {
          ...s,
          game: null,
          undo: [],
          modal: null,
          sheet: null,
          deal: null,
          dir: -1,
          screen: 'home',
        };
      return say(
        { ...finished(s), modal: null, sheet: null, deal: null, dir: -1, screen: 'home' },
        m.toasts.gameEnded,
        true,
      );
    case 'editHand':
      return editHand(s, a.i, a);
    case 'rematch': {
      const old = s.game;
      if (!old) return s;
      const g = freshGame(
        {
          players: old.players.map((p) => ({ ...p })),
          direction: old.direction,
          firstDealerIndex: (old.firstDealerIndex + 1) % old.players.length,
          rules: { ...old.rules },
        },
        a.id,
        a.syncId,
        a.now,
        modeOf(s.prefs),
      );
      return begin(s, g);
    }
    case 'undo':
      return undoLast(s);
    case 'openGame':
      return {
        ...s,
        game: a.game,
        undo: [],
        dir: 1,
        sheet: null,
        modal: null,
        deal: null,
        screen: a.game.status === 'finished' ? 'winner' : 'game',
      };
    case 'repaired':
      return { ...s, game: null, undo: [], corrupt: false, screen: 'home' };
  }
}
