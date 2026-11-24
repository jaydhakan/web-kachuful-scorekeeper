import { ITEMS, itemOf, LEVEL_GIFTS, priceOf } from '@/wardrobe/catalog';
import { SLOTS, type Look, type LookItem, type Slot } from '@/wardrobe/types';
import type { OwnedItem } from '@/sync/types';

/** `id:v` keys of everything owned; an item is "owned" when any of its variants is. */
export const ownedKeys = (owned: readonly OwnedItem[]) =>
  new Set(owned.map((o) => `${o.id}:${o.v}`));
export const ownsItem = (owned: readonly OwnedItem[], id: string) => owned.some((o) => o.id === id);
export const ownsPair = (keys: Set<string>, it: LookItem) => keys.has(`${it.id}:${it.v}`);

/** A look with only owned pairs: what a saved look becomes when it's worn. */
export function keepOwned(look: Look, keys: Set<string>): Look {
  const out: Look = {};
  for (const s of SLOTS) {
    const it = look[s];
    if (it && ownsPair(keys, it)) out[s] = it;
  }
  return out;
}

/** The look's pairs that aren't owned, for "not yours yet". */
export const notOwned = (look: Look, keys: Set<string>) =>
  SLOTS.flatMap((s) => (look[s] && !ownsPair(keys, look[s]) ? [s] : []));

/** A random owned look: each slot is either empty or one owned pair, at random (`rand` is injectable for tests). */
export function shuffleLook(owned: readonly OwnedItem[], rand: () => number = Math.random): Look {
  const out: Look = {};
  for (const s of SLOTS) {
    const mine = owned.filter((o) => itemOf(o.id)?.slot === s);
    if (!mine.length || rand() < 0.25) continue;
    const o = mine[Math.floor(rand() * mine.length)];
    out[s] = { id: o.id, v: o.v };
  }
  return out;
}

/** How a locked item is got: its price in the Bazaar, a level, or an honour. */
export type LockReason =
  { kind: 'price'; price: number } | { kind: 'level'; level: number } | { kind: 'honour' };

export function lockReason(id: string, v: number, owned: readonly OwnedItem[]): LockReason {
  const level = Object.entries(LEVEL_GIFTS).find(([, g]) => g.id === id && g.v === v)?.[0];
  if (level) return { kind: 'level', level: Number(level) };
  const item = itemOf(id);
  const price = item ? priceOf(item, v, ownsItem(owned, id)) : null;
  return price == null ? { kind: 'honour' } : { kind: 'price', price };
}

/** Every item of one slot, catalogue order. */
export const itemsIn = (slot: Slot) => ITEMS.filter((i) => i.slot === slot);
