import { expect } from 'vitest';
import { applyAction, newTable, sit } from '../rules';
import { legalPlays } from '../legal';
import {
  STANDARD_RULES,
  type Action,
  type Actor,
  type ApplyCtx,
  type ApplyResult,
  type Card,
  type Rank,
  type Seat,
  type SpGame,
  type SpHand,
  type SpPublic,
  type SpRules,
  type SpWho,
  type Suit,
} from '../types';

export const T0 = Date.UTC(2026, 10, 16, 18, 0);

const who = (name: string, n: number): SpWho => ({
  userId: `u-${name.toLowerCase()}`,
  playerId: `00000000-0000-4000-8000-00000000000${n}`,
  name,
  emoji: '🙂',
  color: '#f5a524',
  photoUrl: null,
});

/** Seats 0 and 2 (Riya, Dev) are team a; 1 and 3 (Arjun, Meera) team b. */
export const WHO: SpWho[] = [who('Riya', 1), who('Arjun', 2), who('Dev', 3), who('Meera', 4)];
export const NEWCOMER = who('Kabir', 5);

const SUIT: Record<string, Suit> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };

/** `card('10h')` → 10♥, `card('As')` → A♠. */
export function card(s: string): Card {
  return { rank: s.slice(0, -1).toUpperCase() as Rank, suit: SUIT[s.slice(-1).toLowerCase()] };
}
export const cards = (s: string): Card[] => (s.trim() ? s.trim().split(/\s+/).map(card) : []);

const RANKS_UP: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suitHand = (suit: Suit): Card[] => RANKS_UP.map((rank) => ({ rank, suit }));
/** Seat 0 holds every spade, seat 1 every heart, seat 2 every diamond, seat 3 every club. */
export const SUIT_DEAL: Card[][] = (['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).map(
  suitHand,
);

/** Cards for a draw for deal that the given seat wins. */
export function drawFor(dealer: Seat): Card[] {
  const low = cards('Kh Qd Jc');
  return [0, 1, 2, 3].map((s) => (s === dealer ? card('As') : (low.shift() as Card)));
}

export const rulesWith = (r: Partial<SpRules> = {}): SpRules => ({ ...STANDARD_RULES, ...r });

/** A table in play: its public state, the private hands, and the clock. */
export interface Table {
  state: SpPublic;
  hands: Card[][] | null;
  now: number;
}

export function lobby(rules: Partial<SpRules> = {}): SpPublic {
  let s = newTable({
    id: '70000000-0000-4000-8000-000000000001',
    code: 'KQ7M',
    name: "Riya's table",
    rules: rulesWith(rules),
    host: WHO[0],
    now: T0,
  });
  for (const w of WHO.slice(1)) {
    const r = sit(s, w, undefined, T0);
    if (!r.ok) throw new Error(`sit ${w.name}: ${JSON.stringify(r.error)}`);
    s = r.state;
  }
  return s;
}

/** Applies one action `dt` ms after the table's clock; the result is returned beside the new table. */
export function step(
  t: Table,
  actor: Actor,
  action: Action,
  ctx: Partial<ApplyCtx> = {},
  dt = 1000,
): Table & { res: ApplyResult } {
  const now = t.now + dt;
  const res = applyAction(t.state, action, actor, { now, hands: t.hands, ...ctx });
  return { state: res.state, hands: res.hands, now, res };
}

/** Like `step`, but the action must be accepted. */
export function ok(
  t: Table,
  actor: Actor,
  action: Action,
  ctx: Partial<ApplyCtx> = {},
  dt = 1000,
): Table {
  const r = step(t, actor, action, ctx, dt);
  expect(r.res.ok, `${action.type} by ${actor}: ${JSON.stringify(!r.res.ok && r.res.error)}`).toBe(
    true,
  );
  return { state: r.state, hands: r.hands, now: r.now };
}

/** Everyone ready, the draw won by `dealer`, and the deal made: bidding has begun. */
export function started(
  opts: { rules?: Partial<SpRules>; dealer?: Seat; deal?: Card[][] } = {},
): Table {
  const dealer = opts.dealer ?? 3;
  let t: Table = { state: lobby(opts.rules), hands: null, now: T0 };
  for (const s of [0, 1, 2, 3] as Seat[]) t = ok(t, s, { type: 'ready' });
  t = ok(t, 0, { type: 'drawForDeal' }, { draw: drawFor(dealer) });
  return ok(t, dealer, { type: 'deal' }, { deal: opts.deal ?? SUIT_DEAL });
}

/** Bids in turn order (looking first when the gate is up), then the seat to play always plays its first legal card. */
export function playOut(t: Table, bids: number[]): Table {
  for (const b of bids) {
    const seat = t.state.turn as Seat;
    if (!t.state.looked[seat]) t = ok(t, seat, { type: 'look' });
    t = ok(t, seat, { type: 'bid', bid: b });
  }
  while (t.state.status === 'playing' && t.state.phase === 'playing') {
    const seat = t.state.turn as Seat;
    const hands = t.hands as Card[][];
    const c = legalPlays(hands[seat], t.state.trick, t.state.broken)[0];
    t = ok(t, seat, { type: 'play', card: c });
  }
  return t;
}

/** A table-mode hand, done, from bids, team a's tricks and any Nil bidders' tricks. */
export function doneHand(h: {
  index?: number;
  dealer?: Seat;
  bids: number[];
  blind?: boolean[];
  teamA: number;
  nil?: (number | null)[];
}): SpHand {
  return {
    index: h.index ?? 0,
    dealer: h.dealer ?? 3,
    bids: h.bids,
    blind: h.blind ?? [false, false, false, false],
    teamTricks: [h.teamA, 13 - h.teamA],
    nilTricks: h.nil ?? h.bids.map(() => null),
    phase: 'done',
  };
}

export interface KitEntry {
  bids: (number | null)[];
  teamA?: number;
  nil?: (number | null)[];
  blind?: boolean[];
  phase?: SpHand['phase'];
}

/** A table-mode game from its hands, dealt clockwise from `first`, one hand every 10 minutes from T0. */
export function kitGame(
  entries: KitEntry[],
  extra: Partial<SpGame> & { first?: Seat } = {},
): SpGame {
  const first = extra.first ?? 0;
  const hands: SpHand[] = entries.map((e, i) => {
    const phase = e.phase ?? 'done';
    return {
      index: i,
      dealer: ((first + i) % 4) as Seat,
      bids: e.bids,
      blind: e.blind ?? [false, false, false, false],
      teamTricks: e.teamA === undefined ? null : [e.teamA, 13 - e.teamA],
      nilTricks: e.nil ?? [null, null, null, null],
      phase,
      ...(phase === 'done' && { doneAt: T0 + (i + 1) * 600_000 }),
    };
  });
  const updatedAt = T0 + Math.max(1, entries.length) * 600_000;
  return {
    kind: 'spades',
    schemaVersion: 1,
    id: 'g-1',
    syncId: '80000000-0000-4000-8000-000000000001',
    rev: entries.length + 1,
    createdAt: T0,
    updatedAt,
    players: WHO.map((w, i) => ({
      id: `p${i}`,
      name: w.name,
      emoji: w.emoji,
      color: w.color,
      playerId: w.playerId,
    })),
    firstDealerIndex: first,
    direction: 'cw',
    rules: rulesWith(),
    hands,
    status: 'active',
    ...extra,
  };
}
