/** The Wardrobe's shapes (backend-requests.md §3). Type-only, so anything may import it at no cost. */

export const SLOTS = ['outfit', 'headwear', 'neckwear', 'frame', 'aura', 'badge', 'title'] as const;
export type Slot = (typeof SLOTS)[number];

/** `honour` items are earned (a season title, being here early), never sold. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'honour';

export type SetId = 'shaadi' | 'cricket' | 'monsoon' | 'office' | 'sardi';

/** One worn item: its id and colour variant (0 when it has one). A jersey may carry its number. */
export interface LookItem {
  id: string;
  v: number;
  number?: number;
}

/** The worn set; every slot optional. `null` on a player means they never set one. */
export type Look = Partial<Record<Slot, LookItem>>;

export interface CatalogItem {
  id: string;
  slot: Slot;
  rarity: Rarity;
  /** Colour variants; titles have 1. */
  variants: number;
  /** The sets it belongs to (the muffler is in two). */
  sets: readonly SetId[];
  sellable: boolean;
}
