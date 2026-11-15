import { bidProblem, blindAllowed } from './bidding';
import { TRICKS, distinctCards, drawWinner, isCard, isDeal, sameCard } from './cards';
import { playProblem } from './legal';
import { SEATS, isSeat, nextSeat } from './seats';
import { DRAW_RESULT, endResult, gameOver, scoresOf, totals, type Totals } from './standings';
import {
  AWAY_AFTER,
  DEAL_ANYONE_MS,
  deadlineFor,
  timedTurn,
  timeoutBid,
  timeoutPlay,
} from './timer';
import { trickWinner } from './trick';
import { rulesOk } from './validate';
import type {
  Action,
  Actor,
  ApplyCtx,
  ApplyResult,
  Card,
  Refusal,
  Seat,
  SeatResult,
  SpHand,
  SpPublic,
  SpReason,
  SpResult,
  SpRules,
  SpSeat,
  SpWho,
  TrickRec,
} from './types';

export const NAME_MAX = 40;
/** The six reactions a seat may send; anything else is refused. */
export const REACTIONS = ['👏', '😬', '🔥', '😂', '🙏', '🫣'] as const;

const bad = (reason: SpReason): Refusal => ({ code: 'invalid_action', reason });
const notYours: Refusal = { code: 'not_your_turn' };
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'code' in x;
const four = <T>(v: T): T[] => [v, v, v, v];
const emptySeat = (): SpSeat => ({ who: null, ready: false, away: false, timeouts: 0 });

export const isOver = (s: Pick<SpPublic, 'status'>) =>
  s.status === 'finished' || s.status === 'cancelled';
export const seatOf = (s: Pick<SpPublic, 'seats'>, userId: string): Seat | null => {
  const i = s.seats.findIndex((x) => x.who?.userId === userId);
  return i < 0 ? null : (i as Seat);
};
/** Tricks each seat has taken this hand. */
export function tricksWon(s: Pick<SpPublic, 'tricks'>): number[] {
  const won = four(0);
  for (const t of s.tricks) won[t.winner]++;
  return won;
}
/** The last finished trick: this hand's, or the previous hand's between hands. */
export function lastTrick(s: Pick<SpPublic, 'tricks' | 'history'>): TrickRec | null {
  const prev = s.history[s.history.length - 1]?.tricks;
  return s.tricks[s.tricks.length - 1] ?? prev?.[prev.length - 1] ?? null;
}
export const totalsOf = (s: Pick<SpPublic, 'history'>): Totals => totals(s.history);

export interface NewTable {
  id: string;
  code: string;
  name: string;
  rules: SpRules;
  host: SpWho;
  now: number;
}

/** A table as created: the host in seat 0, the rest empty. */
export function newTable(t: NewTable): SpPublic {
  const seats = SEATS.map(emptySeat);
  seats[0] = { ...seats[0], who: t.host };
  return {
    kind: 'spades-online',
    schemaVersion: 1,
    id: t.id,
    code: t.code,
    name: t.name,
    rev: 1,
    createdAt: t.now,
    updatedAt: t.now,
    status: 'lobby',
    paused: null,
    host: 0,
    rules: t.rules,
    seats,
    drawn: null,
    dealer: null,
    phase: 'draw',
    bids: four(null),
    blind: four(false),
    looked: four(false),
    trick: [],
    tricks: [],
    broken: false,
    turn: null,
    turnStartedAt: null,
    deadline: null,
    history: [],
    result: null,
    next: null,
  };
}

/** A changed state, stamped: rev, time and the timer's deadline. */
function stamp(s: SpPublic, prevRev: number, now: number): SpPublic {
  return { ...s, rev: prevRev + 1, updatedAt: now, deadline: deadlineFor(s) };
}

/** Hosts keep their seat; the other three move one place round, so the host's partner changes each time. */
function rotatePartners(s: SpPublic): SpSeat[] {
  const h = s.host;
  const at = (k: number) => ((h + k) % 4) as Seat;
  const seats = s.seats.slice();
  seats[at(2)] = s.seats[at(1)];
  seats[at(3)] = s.seats[at(2)];
  seats[at(1)] = s.seats[at(3)];
  return seats;
}

/**
 * The join route and an accepted seat invite: in the lobby, take a free seat (the lowest when none is named) or
 * move; while a Replace has paused the game, take the open seat, and play resumes.
 */
export function sit(state: SpPublic, who: SpWho, seat: Seat | undefined, now: number): SeatResult {
  const fail = (error: Refusal): SeatResult => ({ ok: false, error, state });
  if (seat !== undefined && !isSeat(seat)) return fail(bad('bad-seat'));
  if (isOver(state)) return fail(bad('finished'));
  const at = seatOf(state, who.userId);
  const seats = state.seats.slice();
  if (state.status === 'lobby') {
    if (at !== null) {
      if (seat === undefined || seat === at) return { ok: true, state };
      if (seats[seat].who) return fail(bad('seat-taken'));
      seats[seat] = seats[at];
      seats[at] = emptySeat();
      const host = state.host === at ? seat : state.host;
      return { ok: true, state: stamp({ ...state, seats, host }, state.rev, now) };
    }
    const free = seats.findIndex((x) => !x.who);
    if (free < 0) return fail(bad('full'));
    const to = seat ?? (free as Seat);
    if (seats[to].who) return fail(bad('seat-taken'));
    seats[to] = { ...emptySeat(), who };
    return { ok: true, state: stamp({ ...state, seats }, state.rev, now) };
  }
  if (state.paused !== 'replace') return fail(bad('started'));
  if (at !== null) return fail(bad('already'));
  const open = seats.findIndex((x) => !x.who) as Seat;
  if (seat !== undefined && seat !== open) return fail(bad('seat-taken'));
  seats[open] = { who, ready: true, away: false, timeouts: 0 };
  const next: SpPublic = {
    ...state,
    seats,
    paused: null,
    turnStartedAt: state.turn === null ? state.turnStartedAt : now,
  };
  return { ok: true, state: stamp(next, state.rev, now) };
}

/** The rules route: host only, lobby only. */
export function setRules(
  state: SpPublic,
  actor: Actor,
  rules: SpRules,
  name: string | undefined,
  now: number,
): SeatResult {
  const fail = (error: Refusal): SeatResult => ({ ok: false, error, state });
  if (actor !== state.host) return fail(notYours);
  if (isOver(state)) return fail(bad('finished'));
  if (state.status !== 'lobby') return fail(bad('started'));
  if (!rulesOk(rules)) return fail(bad('bad-rules'));
  const n = name === undefined ? state.name : name.trim();
  if (!n || n.length > NAME_MAX) return fail(bad('bad-rules'));
  return { ok: true, state: stamp({ ...state, rules: { ...rules }, name: n }, state.rev, now) };
}

export interface Rematch {
  id: string;
  code: string;
  now: number;
  /** Swap partners: everyone but the host moves one seat round. */
  swap?: boolean;
}

/** The rematch's lobby: the same people, rules and name, nobody ready yet. */
export function rematchTable(old: SpPublic, r: Rematch): SpPublic {
  const fresh = newTable({
    id: r.id,
    code: r.code,
    name: old.name,
    rules: old.rules,
    host: old.seats[old.host].who as SpWho,
    now: r.now,
  });
  const seats = old.seats.map((x) => ({ ...emptySeat(), who: x.who }));
  const base = { ...fresh, host: old.host, seats };
  return r.swap ? { ...base, seats: rotatePartners(base) } : base;
}

interface W {
  s: SpPublic;
  hands: Card[][] | null;
}
type Step = W | Refusal | 'noop';

function finish(s: SpPublic, result: SpResult | null, now: number): SpPublic {
  return {
    ...s,
    status: result ? 'finished' : 'cancelled',
    result,
    finishedAt: now,
    paused: null,
    turn: null,
    turnStartedAt: null,
  };
}

/** The 13th trick is in: the hand goes to history (public now), then the game ends or the deal passes on. */
function endHand(s: SpPublic, now: number): SpPublic {
  const won = tricksWon(s);
  const hand: SpHand = {
    index: s.history.length,
    dealer: s.dealer as Seat,
    bids: s.bids.slice(),
    blind: s.blind.slice(),
    teamTricks: [won[0] + won[2], won[1] + won[3]],
    nilTricks: s.bids.map((b, i) => (b === 0 ? won[i] : null)),
    tricks: s.tricks,
    players: s.seats.map((x) => x.who?.playerId ?? null),
    phase: 'done',
    doneAt: now,
  };
  const history = [...s.history, hand];
  const over = gameOver(scoresOf(totals(history)), s.rules);
  if (over && over !== 'tie') return finish({ ...s, history }, over, now);
  const dealer = nextSeat(s.dealer as Seat);
  return { ...s, history, phase: 'handEnd', dealer, turn: dealer, turnStartedAt: now };
}

/** Records a bid, fills in any Blind Nil whose turn it now is, and starts play after the fourth. */
function placeBid(s: SpPublic, seat: Seat, bid: number, blind: boolean, now: number): SpPublic {
  const bids = s.bids.slice(),
    looked = s.looked.slice(),
    blinds = s.blind.slice();
  bids[seat] = bid;
  looked[seat] = true;
  if (blind) blinds[seat] = true;
  let next = nextSeat(seat);
  while (bids[next] === null && blinds[next]) {
    bids[next] = 0;
    looked[next] = true;
    next = nextSeat(next);
  }
  const base = { ...s, bids, looked, blind: blinds, turnStartedAt: now };
  if (bids.some((b) => b === null)) return { ...base, turn: next };
  return { ...base, phase: 'playing', turn: nextSeat(s.dealer as Seat), trick: [] };
}

function playCard(w: W, seat: Seat, card: Card, now: number): W {
  const s = w.s;
  const hands = (w.hands as Card[][]).map((h, i) =>
    i === seat ? h.filter((c) => !sameCard(c, card)) : h,
  );
  const trick = [...s.trick, { seat, card }];
  const broken = s.broken || card.suit === 'spades';
  if (trick.length < 4)
    return { s: { ...s, trick, broken, turn: nextSeat(seat), turnStartedAt: now }, hands };
  const winner = trickWinner(trick);
  const next: SpPublic = {
    ...s,
    trick: [],
    tricks: [...s.tricks, { plays: trick, winner }],
    broken,
    turn: winner,
    turnStartedAt: now,
  };
  return { s: next.tricks.length === TRICKS ? endHand(next, now) : next, hands };
}

const needHands = (w: W): Card[][] => {
  if (!w.hands) throw new Error('spades: the hands are missing for a table in play');
  return w.hands;
};

function timeout(w: W, ctx: ApplyCtx): Step {
  const s = w.s;
  if (!timedTurn(s)) return 'noop';
  const deadline = deadlineFor(s, ctx.lastSeenAt);
  if (deadline === null || ctx.now < deadline) {
    // The sender saw an older turn, which has since been settled by someone else.
    return ctx.rev !== undefined && ctx.rev < s.rev ? 'noop' : bad('too-early');
  }
  const seat = s.turn as Seat;
  let out: W;
  if (s.phase === 'bidding') {
    out = {
      s: placeBid(s, seat, timeoutBid(seat, s.bids, s.rules), false, ctx.now),
      hands: w.hands,
    };
  } else {
    const hand = needHands(w)[seat];
    out = playCard(w, seat, timeoutPlay(hand, s.trick, s.broken), ctx.now);
  }
  const seats = out.s.seats.slice();
  const timeouts = seats[seat].timeouts + 1;
  seats[seat] = { ...seats[seat], timeouts, away: timeouts >= AWAY_AFTER };
  return { ...out, s: { ...out.s, seats } };
}

function lobbyStep(w: W, a: Action, seat: Seat, ctx: ApplyCtx): Step {
  const s = w.s;
  const isHost = seat === s.host;
  switch (a.type) {
    case 'ready':
    case 'unready': {
      const ready = a.type === 'ready';
      if (s.seats[seat].ready === ready) return 'noop';
      const seats = s.seats.slice();
      seats[seat] = { ...seats[seat], ready };
      return { ...w, s: { ...s, seats } };
    }
    case 'shufflePartners':
      if (!isHost) return notYours;
      return { ...w, s: { ...s, seats: rotatePartners(s) } };
    case 'drawForDeal': {
      if (!isHost) return notYours;
      if (!s.seats.every((x) => x.who && x.ready)) return bad('not-ready');
      if (!distinctCards(ctx.draw, 4)) return bad('bad-draw');
      const dealer = drawWinner(ctx.draw);
      return {
        ...w,
        s: {
          ...s,
          status: 'playing',
          phase: 'deal',
          drawn: ctx.draw.slice(),
          dealer,
          turn: dealer,
          turnStartedAt: ctx.now,
        },
      };
    }
    case 'cancelGame':
      return isHost ? { ...w, s: finish(s, null, ctx.now) } : notYours;
    case 'endGame':
    case 'drawGame':
    case 'replace':
      return isHost ? bad('not-started') : notYours;
    case 'rematch':
      return isHost ? bad('not-finished') : notYours;
    default:
      return bad('not-started');
  }
}

function playStep(w: W, a: Action, seat: Seat, ctx: ApplyCtx): Step {
  const s = w.s;
  const isHost = seat === s.host;
  const host = (f: () => Step): Step => (isHost ? f() : notYours);
  switch (a.type) {
    case 'endGame':
      return host(() => ({ ...w, s: finish(s, endResult(scoresOf(totalsOf(s))), ctx.now) }));
    case 'drawGame':
      return host(() => ({ ...w, s: finish(s, DRAW_RESULT, ctx.now) }));
    case 'cancelGame':
      return host(() => ({ ...w, s: finish(s, null, ctx.now) }));
    case 'rematch':
      return host(() => bad('not-finished'));
  }
  if (s.paused) return bad('paused');
  switch (a.type) {
    case 'ready': {
      // "I'm back": the only thing Ready means once the game has started.
      const x = s.seats[seat];
      return x.away || x.timeouts ? w : 'noop';
    }
    case 'unready':
    case 'shufflePartners':
    case 'drawForDeal':
      return bad('started');
    case 'deal': {
      if (s.phase !== 'deal' && s.phase !== 'handEnd') return bad('wrong-phase');
      const late = ctx.now >= (s.turnStartedAt as number) + DEAL_ANYONE_MS;
      if (seat !== s.dealer && !late) return notYours;
      if (!isDeal(ctx.deal)) return bad('bad-deal');
      const gate = blindAllowed(s.rules);
      return {
        s: {
          ...s,
          phase: 'bidding',
          bids: four(null),
          blind: four(false),
          looked: four(!gate),
          trick: [],
          tricks: [],
          broken: false,
          turn: nextSeat(s.dealer as Seat),
          turnStartedAt: ctx.now,
        },
        hands: ctx.deal.map((h) => h.slice()),
      };
    }
    case 'look': {
      if (s.looked[seat]) return 'noop';
      if (s.phase !== 'bidding') return bad('wrong-phase');
      if (s.blind[seat]) return bad('blind-locked');
      const looked = s.looked.slice();
      looked[seat] = true;
      return { ...w, s: { ...s, looked } };
    }
    case 'blindNil': {
      if (s.phase !== 'bidding') return bad('wrong-phase');
      if (!blindAllowed(s.rules)) return bad('blind-off');
      if (s.bids[seat] !== null) return bad('already-bid');
      if (s.looked[seat]) return bad('looked');
      if (s.blind[seat]) return 'noop';
      if (s.turn === seat) return { ...w, s: placeBid(s, seat, 0, true, ctx.now) };
      const blind = s.blind.slice();
      blind[seat] = true;
      return { ...w, s: { ...s, blind } };
    }
    case 'bid': {
      if (s.phase !== 'bidding') return bad('wrong-phase');
      if (s.turn !== seat) return notYours;
      if (!s.looked[seat]) return bad('look-first');
      const why = bidProblem(a.bid, seat, s.bids, s.rules);
      if (why) return bad(why);
      return { ...w, s: placeBid(s, seat, a.bid, false, ctx.now) };
    }
    case 'play': {
      if (s.phase !== 'playing') return bad('wrong-phase');
      if (s.turn !== seat) return notYours;
      if (!isCard(a.card)) return bad('bad-card');
      const card = { rank: a.card.rank, suit: a.card.suit };
      const why = playProblem(card, needHands(w)[seat], s.trick, s.broken);
      if (why) return bad(why);
      return playCard(w, seat, card, ctx.now);
    }
    case 'replace': {
      if (!isHost) return notYours;
      if (!isSeat(a.seat)) return bad('bad-seat');
      if (a.seat === s.host) return bad('host-seat');
      if (!s.seats[a.seat].away) return bad('not-away');
      if (s.trick.length) return bad('mid-trick');
      const seats = s.seats.slice();
      seats[a.seat] = emptySeat();
      return { ...w, s: { ...s, seats, paused: 'replace' } };
    }
    default:
      return bad('wrong-phase');
  }
}

function overStep(w: W, a: Action, seat: Seat | null): Step {
  if (a.type === 'timeout') return 'noop';
  if (a.type !== 'rematch') return bad('finished');
  if (seat !== w.s.host) return notYours;
  if (w.s.next !== null) return bad('already');
  if (typeof a.id !== 'string' || !a.id) return bad('wrong-phase');
  return { ...w, s: { ...w.s, next: a.id } };
}

/**
 * The game's one rule engine: the server (and the mock API) run every action through it, with the private hands
 * and any randomness in `ctx`. On a refusal the state and hands come back unchanged; `noop` changes nothing.
 */
export function applyAction(
  state: SpPublic,
  action: Action,
  actor: Actor,
  ctx: ApplyCtx,
): ApplyResult {
  const w: W = { s: state, hands: ctx.hands };
  const seat = actor !== null && isSeat(actor) && state.seats[actor].who ? actor : null;
  let out: Step;
  if (action.type === 'react') {
    if (seat === null) out = notYours;
    else out = (REACTIONS as readonly string[]).includes(action.emoji) ? 'noop' : bad('bad-emoji');
  } else if (isOver(state)) out = overStep(w, action, seat);
  else if (seat === null) out = notYours;
  else if (action.type === 'timeout') out = timeout(w, ctx);
  else if (state.status === 'lobby') out = lobbyStep(w, action, seat, ctx);
  else out = playStep(w, action, seat, ctx);

  if (out === 'noop') return { ok: true, state, hands: ctx.hands, noop: true };
  if (isRefusal(out)) return { ok: false, error: out, state, hands: ctx.hands };
  let s = out.s;
  // Any move of the person's own, other than a timeout their phone sent, means they are back.
  if (
    seat !== null &&
    action.type !== 'timeout' &&
    s.seats[seat].who?.userId === state.seats[seat].who?.userId
  ) {
    const x = s.seats[seat];
    if (x.away || x.timeouts) {
      const seats = s.seats.slice();
      seats[seat] = { ...x, away: false, timeouts: 0 };
      s = { ...s, seats };
    }
  }
  return { ok: true, state: stamp(s, state.rev, ctx.now), hands: out.hands, noop: false };
}
