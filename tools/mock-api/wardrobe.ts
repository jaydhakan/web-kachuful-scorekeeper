/**
 * The Wardrobe and the Bazaar for the in-memory API (backend-requests.md §3–§4): owned items, the worn and saved
 * looks, spending and the weekly stock. Spends and purchases are append-only here as on the server; level gifts and
 * honours are derived on read. Test controls: `POST /api/__mock/sikke` grants Sikke, `POST /api/__mock/bazaar/clock`
 * moves the Bazaar's clock (for the next week's stock).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import type {
  Activity,
  Balance,
  BazaarItem,
  OwnedItem,
  OwnedSource,
  Player,
  PlayerSummary,
  SavedLook,
} from '../../src/sync/types';
import type { CatalogItem, Look, LookItem, Slot } from '../../src/wardrobe/types';
import { SLOTS } from '../../src/wardrobe/types';
import { ITEMS, itemOf, LEVEL_GIFTS, PRICES, priceOf } from '../../src/wardrobe/catalog';
import { levelOf } from '../../src/progression/sikke';
import type { GameId } from '../../src/progression/types';

interface Me {
  id: string;
  playerId: string | null;
}
export interface RewardsCtx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  body: Record<string, unknown>;
  me: Me | null;
  m: string[];
}

/** A finished, non-void game of any kind, for honours and milestones. */
export interface Finished {
  game: GameId;
  gameId: string;
  endedAt: number;
  playerIds: string[];
}

/** What the server module lends the Wardrobe, gifts and milestones. */
export interface RewardsKit {
  on(
    method: string,
    path: string,
    h: (c: RewardsCtx) => unknown,
    access?: 'public' | 'auth' | 'admin',
  ): void;
  err(status: number, code: string, extra?: Record<string, unknown>): Error;
  page<T>(items: T[], cursor: unknown, limit?: number): { items: T[]; nextCursor: string | null };
  players(): Player[];
  resolve(id: string): string;
  summaryOf(playerId: string): PlayerSummary;
  /** Lifetime earned Sikke, as `GET /api/players/{id}/sikke` counts it (grants included). */
  earned(playerId: string): number;
  /** Every finished game of every kind. */
  finished(): Finished[];
  /** Everyone with a `season_champion` row in any game. */
  champions(): string[];
  /** Every live game's seats, for the circle. */
  seatings(): { playerIds: string[]; at: number }[];
  /** Marks a player changed, so `GET /api/players?updatedSince=` brings the new look. */
  touch(playerId: string): void;
  feed(item: Omit<Activity, 'id'>): void;
}

interface Stored {
  playerId: string;
  id: string;
  v: number;
  source: Extract<OwnedSource, 'bought' | 'gift'>;
  at: number;
}
interface Spend {
  id: string;
  playerId: string;
  kind: 'purchase' | 'gift';
  itemId: string;
  v: number;
  amount: number;
  at: number;
  giftId: string | null;
}

/** Before this moment (2026-11-25 00:00 Asia/Kolkata) a finished game makes a player one of the first. */
const PEHLE_BEFORE = Date.UTC(2026, 10, 24, 18, 30);
const WEEK = 7 * 864e5;
/** The Bazaar's week starts Monday 06:00 in Kolkata: 00:30 UTC. */
const WEEK_OFFSET = 30 * 60_000;

let kit: RewardsKit;
let stored: Stored[] = [];
let spends: Spend[] = [];
let purchases = new Map<string, unknown>();
let looks = new Map<string, Look>();
let saved = new Map<string, (SavedLook | null)[]>();
let grants = new Map<string, number>();
let skew = 0;
const now = () => Date.now() + skew;

/** Sikke a test granted a player, counted as earned. */
export const mockGrant = (playerId: string) => grants.get(playerId) ?? 0;
export const spentBy = (playerId: string) =>
  spends.filter((s) => s.playerId === playerId).reduce((n, s) => n + s.amount, 0);

export function balanceOf(playerId: string): Balance {
  const earned = kit.earned(playerId);
  const spent = spentBy(playerId);
  return { earned, spent, balance: earned - spent };
}

/** Purchases, gifts, level gifts and honours, one row per (item, variant). */
export function ownedOf(playerId: string): OwnedItem[] {
  const out: OwnedItem[] = [];
  const add = (id: string, v: number, source: OwnedSource, at: number | null) => {
    if (!out.some((o) => o.id === id && o.v === v)) out.push({ id, v, source, at });
  };
  for (const s of stored) if (s.playerId === playerId) add(s.id, s.v, s.source, s.at);
  const level = levelOf(kit.earned(playerId)).n;
  for (const [n, item] of Object.entries(LEVEL_GIFTS))
    if (level >= Number(n)) add(item.id, item.v, 'level', null);
  if (kit.champions().includes(playerId)) add('champions_shaal', 0, 'honour', null);
  if (kit.finished().some((g) => g.endedAt < PEHLE_BEFORE && g.playerIds.includes(playerId)))
    add('pehle_waale', 0, 'honour', null);
  return out;
}
const owns = (list: OwnedItem[], id: string, v: number) =>
  list.some((o) => o.id === id && o.v === v);

/** Records an owned pair; a new item bought in a colour also brings its variant 0. */
export function grantItem(
  playerId: string,
  id: string,
  v: number,
  source: Stored['source'],
  at: number,
) {
  const have = ownedOf(playerId);
  for (const x of v > 0 && !have.some((o) => o.id === id) ? [0, v] : [v])
    if (!owns(have, id, x)) stored.push({ playerId, id, v: x, source, at });
}

export function spend(s: Omit<Spend, 'id' | 'at'>) {
  spends.push({ ...s, id: randomUUID(), at: now() });
}

/** The look a player wears as stored, for every player embed; null when they never set one. */
export const lookOf = (playerId: string): Look | null => looks.get(playerId) ?? null;

/** A look with only owned pairs, as the server answers it. */
const ownedLook = (look: Look, have: OwnedItem[]): Look =>
  Object.fromEntries(
    Object.entries(look).filter(([, it]) => it && owns(have, it.id, it.v)),
  ) as Look;

/** A look's shape (slot, item, variant, jersey number); the slot at fault, or null. */
function badSlot(look: unknown): string | null {
  if (!look || typeof look !== 'object' || Array.isArray(look)) return 'look';
  for (const [slot, it] of Object.entries(look as Record<string, unknown>)) {
    if (!SLOTS.includes(slot as Slot)) return slot;
    if (it == null) continue;
    const x = it as Partial<LookItem>;
    const item = typeof x.id === 'string' ? itemOf(x.id) : undefined;
    if (!item || item.slot !== slot || !Number.isInteger(x.v) || x.v! < 0 || x.v! >= item.variants)
      return slot;
    if (
      x.number !== undefined &&
      (x.id !== 'jersey' || !Number.isInteger(x.number) || x.number < 0 || x.number > 99)
    )
      return slot;
  }
  return null;
}
/** Drops empty slots and anything the wire shouldn't carry. */
const tidy = (look: Record<string, LookItem | null>): Look =>
  Object.fromEntries(
    Object.entries(look)
      .filter(([, it]) => it)
      .map(([slot, it]) => [
        slot,
        { id: it!.id, v: it!.v, ...(it!.number !== undefined && { number: it!.number }) },
      ]),
  );

/** The ISO week (`2026-W48`) of the Monday a Bazaar week starts on, and when the next one starts. */
export function weekOf(t: number): { week: string; refreshesAt: number } {
  const shifted = new Date(t - WEEK_OFFSET);
  const day = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  const monday = day - ((shifted.getUTCDay() + 6) % 7) * 864e5;
  // ISO week: the week with the year's first Thursday is week 1.
  const thu = new Date(monday + 3 * 864e5);
  const jan1 = Date.UTC(thu.getUTCFullYear(), 0, 1);
  const n = Math.floor((thu.getTime() - jan1) / WEEK) + 1;
  return {
    week: `${thu.getUTCFullYear()}-W${String(n).padStart(2, '0')}`,
    refreshesAt: monday + WEEK + WEEK_OFFSET,
  };
}

/** Six rare-or-better items for the week, picked from the week key (not the server's PRNG; the app never computes it). */
export function stockOf(week: string): CatalogItem[] {
  let a = createHash('sha256').update(week).digest().readUInt32BE(0);
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (rarity: CatalogItem['rarity'], n: number, out: CatalogItem[]) => {
    const pool = ITEMS.filter((i) => i.sellable && i.rarity === rarity && !out.includes(i));
    for (let k = 0; k < n && pool.length; k++)
      out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  };
  const out: CatalogItem[] = [];
  if (Number(week.split('-W')[1]) % 3 === 0) pick('legendary', 1, out);
  pick('epic', rand() < 0.5 ? 1 : 2, out);
  pick('rare', 6 - out.length, out);
  return out;
}

const forSale = (item: CatalogItem, have: OwnedItem[]): BazaarItem => ({
  id: item.id,
  price: PRICES[item.rarity as keyof typeof PRICES],
  owned: have.filter((o) => o.id === item.id).map((o) => o.v),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The (item, variant) a write names, checked; `not_for_sale` for honours and unknown ids. */
export function sellable(body: Record<string, unknown>): [CatalogItem, number] {
  const item = typeof body.itemId === 'string' ? itemOf(body.itemId) : undefined;
  if (!item || !item.sellable) throw kit.err(422, 'not_for_sale');
  const v = body.v;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v >= item.variants)
    throw kit.err(422, 'invalid', { fields: { v: `0 to ${item.variants - 1}` } });
  return [item, v];
}
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);

export function wardrobeRoutes(k: RewardsKit) {
  kit = k;
  const { on, err } = k;
  const mine = (me: Me | null) => {
    const pid = me?.playerId ? kit.resolve(me.playerId) : null;
    if (!pid) throw err(409, 'no_player');
    return pid;
  };

  on('GET', '/api/me/wardrobe', ({ me }) => {
    const pid = mine(me);
    const have = ownedOf(pid);
    const slots = saved.get(pid) ?? [null, null, null];
    return {
      owned: have,
      look: ownedLook(looks.get(pid) ?? {}, have),
      saved: slots,
      balance: balanceOf(pid),
    };
  });
  on('PUT', '/api/me/wardrobe/look', ({ me, body }) => {
    const pid = mine(me);
    const bad = badSlot(body);
    if (bad) throw err(422, 'invalid_look', { slot: bad });
    const look = tidy(body as Record<string, LookItem | null>);
    const have = ownedOf(pid);
    const notOwned = Object.entries(look).find(([, it]) => !owns(have, it!.id, it!.v));
    if (notOwned) throw err(422, 'invalid_look', { slot: notOwned[0] });
    looks.set(pid, look);
    kit.touch(pid);
    return look;
  });
  on('PUT', '/api/me/wardrobe/saved/:slot', ({ me, body, m }) => {
    const pid = mine(me);
    const slot = Number(m[0]);
    if (![0, 1, 2].includes(slot)) throw err(404, 'not_found');
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 20)
      throw err(422, 'invalid', { fields: { name: '1 to 20 characters' } });
    const bad = badSlot(body.look);
    if (bad) throw err(422, 'invalid_look', { slot: bad });
    // A saved look may hold items not owned yet: they're dropped when it's worn.
    const out: SavedLook = { name, look: tidy(body.look as Record<string, LookItem | null>) };
    const slots = [...(saved.get(pid) ?? [null, null, null])];
    slots[slot] = out;
    saved.set(pid, slots);
    return out;
  });
  on('DELETE', '/api/me/wardrobe/saved/:slot', ({ me, m }) => {
    const pid = mine(me);
    const slot = Number(m[0]);
    if (![0, 1, 2].includes(slot)) throw err(404, 'not_found');
    const slots = [...(saved.get(pid) ?? [null, null, null])];
    slots[slot] = null;
    saved.set(pid, slots);
    return null;
  });

  on('GET', '/api/bazaar', ({ me }) => {
    const pid = me?.playerId ? kit.resolve(me.playerId) : null;
    const have = pid ? ownedOf(pid) : [];
    const { week, refreshesAt } = weekOf(now());
    return {
      week,
      refreshesAt,
      weekly: stockOf(week).map((i) => forSale(i, have)),
      always: ITEMS.filter((i) => i.sellable && i.rarity === 'common').map((i) => forSale(i, have)),
      balance: pid ? balanceOf(pid) : { earned: 0, spent: 0, balance: 0 },
    };
  });
  on('POST', '/api/bazaar/purchases', ({ me, body }) => {
    const pid = mine(me);
    if (!isUuid(body.purchaseId)) throw err(422, 'invalid', { fields: { purchaseId: 'a UUID' } });
    const key = `${pid}:${body.purchaseId}`;
    if (purchases.has(key)) return purchases.get(key);
    const [item, v] = sellable(body);
    const have = ownedOf(pid);
    if (owns(have, item.id, v)) throw err(409, 'already_owned');
    const ownsItem = have.some((o) => o.id === item.id);
    if (!ownsItem && item.rarity !== 'common' && !stockOf(weekOf(now()).week).includes(item))
      throw err(422, 'not_in_stock');
    const price = priceOf(item, v, ownsItem)!;
    const bal = balanceOf(pid);
    if (bal.balance < price || bal.balance < 0)
      throw err(422, 'not_enough_sikke', { balance: Math.max(0, bal.balance), price });
    const at = now();
    spend({ playerId: pid, kind: 'purchase', itemId: item.id, v, amount: price, giftId: null });
    grantItem(pid, item.id, v, 'bought', at);
    const out = {
      item: { id: item.id, v, source: 'bought', at } satisfies OwnedItem,
      balance: balanceOf(pid),
    };
    purchases.set(key, out);
    return out;
  });

  on(
    'POST',
    '/api/__mock/sikke',
    ({ body }) => {
      const p = kit
        .players()
        .find(
          (x) =>
            x.id === body.playerId ||
            (typeof body.name === 'string' && x.displayName === body.name),
        );
      const amount = Number(body.amount);
      if (!p || !Number.isFinite(amount))
        throw err(422, 'invalid', { fields: { playerId: 'a player', amount: 'Sikke' } });
      grants.set(p.id, mockGrant(p.id) + amount);
      return balanceOf(p.id);
    },
    'public',
  );
  on(
    'POST',
    '/api/__mock/bazaar/clock',
    ({ body }) => {
      const ms = Number(body.advanceMs);
      if (!Number.isFinite(ms)) throw err(422, 'invalid', { fields: { advanceMs: 'ms' } });
      skew += ms;
      return weekOf(now());
    },
    'public',
  );
}

/** Forgets every purchase, spend, look, grant and the clock (the server's seed()). */
export function resetWardrobe() {
  stored = [];
  spends = [];
  purchases = new Map();
  looks = new Map();
  saved = new Map();
  grants = new Map();
  skew = 0;
}
