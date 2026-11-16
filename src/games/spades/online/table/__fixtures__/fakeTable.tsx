import { useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { dealSeeded } from '@/games/spades/domain/cards';
import { applyAction, newTable, sit } from '@/games/spades/domain/rules';
import { viewFor } from '@/games/spades/domain/view';
import {
  STANDARD_RULES,
  type Action,
  type Card,
  type Seat,
  type SpPublic,
  type SpRules,
  type SpView,
  type SpWho,
} from '@/games/spades/domain/types';
import {
  TableContext,
  type ActResult,
  type LinkStatus,
  type TableCtx,
} from '@/games/spades/online/state/tableContext';

/** Tests only: a table run by the real domain (`applyAction` + `viewFor`) over seeded deals, with no server. */

const who = (name: string, n: number, color: string): SpWho => ({
  userId: `u-${name.toLowerCase()}`,
  playerId: `00000000-0000-4000-8000-00000000000${n}`,
  name,
  emoji: ['🦊', '🐯', '🦄', '🐼'][n - 1],
  color,
  photoUrl: null,
});
/** Seats 0 and 2 are team a (Riya, Dev); 1 and 3 team b (Arjun, Meera). */
export const PEOPLE: SpWho[] = [
  who('Riya', 1, '#e8a87c'),
  who('Arjun', 2, '#7fb3d5'),
  who('Dev', 3, '#b49fdc'),
  who('Meera', 4, '#8fc9a3'),
];

const RANK_ORDER = ['A', 'K', 'Q', 'J'] as const;
/** A draw for deal that `dealer` wins. */
const drawFor = (dealer: Seat): Card[] => {
  const lows: Card[] = [
    { rank: 'K', suit: 'hearts' },
    { rank: 'Q', suit: 'diamonds' },
    { rank: 'J', suit: 'clubs' },
  ];
  return [0, 1, 2, 3].map((s) =>
    s === dealer ? { rank: RANK_ORDER[0], suit: 'spades' } : (lows.shift() as Card),
  );
};

export interface FakeOptions {
  rules?: Partial<SpRules>;
  /** The phone under test. */
  seat?: Seat;
  dealer?: Seat;
  seed?: number;
  /** Stop before the deal (the dealer's Hold to deal), or deal at once. */
  dealt?: boolean;
  /** A fixed deal for the first hand instead of the seed's. */
  deal?: Card[][];
}

export interface FakeTable {
  seat: Seat;
  state: SpPublic;
  hands: Card[][] | null;
  status: LinkStatus;
  busy: boolean;
  lastError: string | null;
  presence: boolean[];
  /** Server time = device time + this. */
  offset: number;
  /** Every action this phone sent, in order. */
  sent: Action[];
  /** The next action this phone sends is refused (a stand-in for a race lost at the server). */
  refuseNext: string | null;
  /** Hold actions in flight until `release()`, to see optimistic states. */
  hold: boolean;
  release: () => void;
  /** Another seat acts; throws if the domain refuses. */
  as: (seat: Seat, a: Action) => void;
  /** The seat to act makes its first legal move (bid `bid`, or play its first legal card). */
  auto: (bid?: number) => void;
  react: (seat: Seat, emoji: string) => void;
  view: () => SpView;
  subscribe: (f: () => void) => () => void;
  set: (p: Partial<Pick<FakeTable, 'status' | 'busy' | 'presence'>>) => void;
  ctx: () => TableCtx;
}

export function createFake(o: FakeOptions = {}): FakeTable {
  const seat = o.seat ?? 0;
  const dealer = o.dealer ?? 3;
  const seed = o.seed ?? 7;
  let deals = 0;
  const subs = new Set<() => void>();
  const reactSubs = new Set<(r: { seat: Seat; emoji: string }) => void>();
  const offset = 1_000_000;
  const now = () => Date.now() + offset;
  let snapshot: TableCtx | null = null;
  const tell = () => {
    snapshot = null;
    subs.forEach((f) => f());
  };

  let s = newTable({
    id: 't-1',
    code: 'KQ7M',
    name: "Riya's table",
    rules: { ...STANDARD_RULES, ...o.rules },
    host: PEOPLE[0],
    now: now(),
  });
  for (const w of PEOPLE.slice(1)) {
    const r = sit(s, w, undefined, now());
    if (r.ok) s = r.state;
  }
  const f: FakeTable = {
    seat,
    state: s,
    hands: null,
    status: 'live',
    busy: false,
    lastError: null,
    presence: [true, true, true, true],
    offset,
    sent: [],
    refuseNext: null,
    hold: false,
    release: () => undefined,
    as: (x, a) => {
      const r = run(x, a);
      if (!r.ok) throw new Error(`${a.type} by ${x}: ${JSON.stringify(r.error)}`);
      tell();
    },
    auto: (bid) => {
      const st = f.state;
      const x = st.turn as Seat;
      if (st.phase === 'bidding') {
        if (!st.looked[x]) f.as(x, { type: 'look' });
        f.as(x, { type: 'bid', bid: bid ?? 3 });
      } else if (st.phase === 'playing') {
        const hand = (f.hands as Card[][])[x];
        const led = st.trick[0]?.card.suit;
        const follow = led ? hand.filter((c) => c.suit === led) : [];
        const lead = st.broken ? hand : hand.filter((c) => c.suit !== 'spades');
        const c = (led ? (follow.length ? follow : hand) : lead.length ? lead : hand)[0];
        f.as(x, { type: 'play', card: c });
      } else if (st.phase === 'deal' || st.phase === 'handEnd') {
        f.as(st.dealer as Seat, { type: 'deal' });
      }
    },
    react: (x, emoji) => reactSubs.forEach((fn) => fn({ seat: x, emoji })),
    view: () => viewFor(f.state, f.hands, seat, now()),
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    set: (p) => {
      Object.assign(f, p);
      tell();
    },
    ctx: () =>
      (snapshot ??= {
        view: f.view(),
        invites: [null, null, null, null],
        presence: f.presence,
        status: f.status,
        clockOffset: offset,
        busy: f.busy,
        act,
        onReaction: (fn) => {
          reactSubs.add(fn);
          return () => reactSubs.delete(fn);
        },
        lastError: f.lastError,
        qrUrl: null,
      }),
  };

  function run(actor: Seat, a: Action) {
    const ctx: Parameters<typeof applyAction>[3] = { now: now(), hands: f.hands, rev: f.state.rev };
    if (a.type === 'deal')
      ctx.deal = deals === 0 && o.deal ? o.deal : dealSeeded(seed * 100 + deals);
    if (a.type === 'drawForDeal') ctx.draw = drawFor(dealer);
    const r = applyAction(f.state, a, actor, ctx);
    if (r.ok) {
      if (a.type === 'deal') deals++;
      f.state = r.state;
      f.hands = r.hands;
    }
    return r;
  }

  async function act(a: Action): Promise<ActResult> {
    f.sent.push(a);
    if (f.status !== 'live') return 'offline';
    if (f.hold) {
      f.busy = true;
      tell();
      await new Promise<void>((res) => {
        f.release = () => {
          f.hold = false;
          f.busy = false;
          res();
        };
      });
    }
    if (f.refuseNext) {
      f.lastError = f.refuseNext;
      f.refuseNext = null;
      tell();
      return 'refused';
    }
    if (a.type === 'react') return 'ok';
    const r = run(seat, a);
    f.lastError = r.ok ? null : r.error.code === 'invalid_action' ? r.error.reason : r.error.code;
    tell();
    return r.ok ? 'ok' : 'refused';
  }

  for (const x of [0, 1, 2, 3] as Seat[]) run(x, { type: 'ready' });
  run(0, { type: 'drawForDeal' });
  if (o.dealt !== false) run(dealer, { type: 'deal' });
  return f;
}

/** Provides the fake as the table's context, re-rendering on every change. */
export function FakeTableProvider({ fake, children }: { fake: FakeTable; children: ReactNode }) {
  const ctx = useSyncExternalStore(fake.subscribe, fake.ctx);
  const value = useMemo(() => ctx, [ctx]);
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}
