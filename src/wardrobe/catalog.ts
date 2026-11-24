import type { CatalogItem, Look, LookItem, Rarity, SetId, Slot } from './types';

/**
 * The Wardrobe's catalogue (REWARDS-PLAN §4.4, backend-requests.md §3). The app owns it; the backend copies
 * `contract/fixtures/wardrobe-catalog.json` (catalog.export.test.ts) and keeps a parity test.
 */

type Row = [id: string, rarity: Rarity, variants: number, sets?: SetId | readonly SetId[]];

const c = 'common',
  r = 'rare',
  e = 'epic',
  l = 'legendary',
  h = 'honour';

const ROWS: Record<Slot, Row[]> = {
  outfit: [
    ['kurta', c, 6],
    ['hoodie', c, 4],
    ['office_shirt', c, 3, 'office'],
    ['cricket_whites', c, 1, 'cricket'],
    ['jersey', r, 4],
    ['nehru_jacket', r, 4],
    ['knit_sweater', r, 4, 'sardi'],
    ['raincoat', r, 3, 'monsoon'],
    ['shawl', e, 4],
    ['dupatta', e, 4],
    ['sherwani', e, 3, 'shaadi'],
    ['lungi_banian', l, 3],
    ['champions_shaal', h, 1],
  ],
  headwear: [
    ['safa', e, 3, 'shaadi'],
    ['cricket_cap', c, 3, 'cricket'],
    ['umbrella_hat', r, 3, 'monsoon'],
    ['monkey_cap', r, 3, 'sardi'],
    ['shades', r, 2],
    ['headphones', c, 3],
  ],
  neckwear: [
    ['gold_chain', e, 1, 'shaadi'],
    ['whistle', c, 1, 'cricket'],
    ['muffler', r, 4, ['monsoon', 'sardi']],
    ['id_lanyard', c, 3, 'office'],
    ['marigold_mala', r, 1],
    ['bow_tie', c, 4],
  ],
  frame: [
    ['marigold_frame', r, 1, 'shaadi'],
    ['stumps_frame', c, 1, 'cricket'],
    ['raindrop_frame', r, 1, 'monsoon'],
    ['grid_frame', c, 1, 'office'],
    ['frost_frame', r, 1, 'sardi'],
    ['gold_ring', e, 1],
    ['neon_ring', r, 3],
  ],
  aura: [
    ['smoke', c, 2],
    ['sunburst', r, 2],
    ['diya_glow', r, 1],
    ['starfield', e, 1],
  ],
  badge: [
    ['pehle_waale', h, 1],
    ['chai_cup', c, 1],
    ['spade_pin', c, 1],
    ['lucky_seven', r, 1],
  ],
  title: [
    ['last_bench', c, 1],
    ['chai_pe_charcha', c, 1],
    ['pakka_player', r, 1],
    ['card_shark', r, 1],
    ['taash_ustaad', e, 1],
  ],
};

export const ITEMS: readonly CatalogItem[] = Object.entries(ROWS).flatMap(([slot, rows]) =>
  rows.map(([id, rarity, variants, sets]) => ({
    id,
    slot: slot as Slot,
    rarity,
    variants,
    sets: sets === undefined ? [] : typeof sets === 'string' ? [sets] : sets,
    sellable: rarity !== 'honour',
  })),
);

const byId = new Map(ITEMS.map((i) => [i.id, i]));
export const itemOf = (id: string): CatalogItem | undefined => byId.get(id);

/** Sikke per rarity; honour items have no price. Variant 0 comes with the item, each further one costs `VARIANT_PRICE`. */
export const PRICES: Record<Exclude<Rarity, 'honour'>, number> = {
  common: 100,
  rare: 300,
  epic: 750,
  legendary: 1800,
};
export const VARIANT_PRICE = 50;

/** What a buyer pays for one (item, variant) pair when they already own `ownsItem` of it. */
export const priceOf = (item: CatalogItem, v: number, ownsItem: boolean): number | null => {
  if (!item.sellable || item.rarity === 'honour') return null;
  if (ownsItem) return v === 0 ? 0 : VARIANT_PRICE;
  return PRICES[item.rarity] + (v > 0 ? VARIANT_PRICE : 0);
};

/** The free item each level brings (derived on read by the server, never stored). */
export const LEVEL_GIFTS: Record<number, LookItem> = {
  2: { id: 'kurta', v: 0 },
  3: { id: 'cricket_cap', v: 0 },
  4: { id: 'bow_tie', v: 0 },
  5: { id: 'neon_ring', v: 0 },
  6: { id: 'starfield', v: 0 },
};

/** Each set's pieces by slot: four, except Office, which has no headwear. */
export const SETS: Record<SetId, Partial<Record<Slot, string>>> = {
  shaadi: { outfit: 'sherwani', headwear: 'safa', neckwear: 'gold_chain', frame: 'marigold_frame' },
  cricket: {
    outfit: 'cricket_whites',
    headwear: 'cricket_cap',
    neckwear: 'whistle',
    frame: 'stumps_frame',
  },
  monsoon: {
    outfit: 'raincoat',
    headwear: 'umbrella_hat',
    neckwear: 'muffler',
    frame: 'raindrop_frame',
  },
  office: { outfit: 'office_shirt', neckwear: 'id_lanyard', frame: 'grid_frame' },
  sardi: {
    outfit: 'knit_sweater',
    headwear: 'monkey_cap',
    neckwear: 'muffler',
    frame: 'frost_frame',
  },
};

/** The sets a look wears in full (any variant counts). */
export const completeSets = (look: Look | null | undefined): SetId[] =>
  (Object.keys(SETS) as SetId[]).filter((s) =>
    Object.entries(SETS[s]).every(([slot, id]) => look?.[slot as Slot]?.id === id),
  );
