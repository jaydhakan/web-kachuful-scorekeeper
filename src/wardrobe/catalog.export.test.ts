import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ITEMS, LEVEL_GIFTS, PRICES, VARIANT_PRICE } from './catalog';

/**
 * The Wardrobe catalogue for the backend (backend-requests.md §3): `EXPORT_FIXTURES=1 npx vitest run
 * src/wardrobe/catalog.export.test.ts` rewrites the file; otherwise the committed file must still match.
 */
const DIR = path.resolve(import.meta.dirname, '../../contract/fixtures');
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

// The muffler is in two sets; one string keeps the fixture's `set` a plain value.
const fixture = {
  version: 1,
  prices: PRICES,
  variantPrice: VARIANT_PRICE,
  levelGifts: LEVEL_GIFTS,
  items: ITEMS.map((i) => ({
    id: i.id,
    slot: i.slot,
    rarity: i.rarity,
    variants: i.variants,
    set: i.sets.length ? i.sets.join('+') : null,
    sellable: i.sellable,
  })),
};

describe('Wardrobe catalogue fixture', () => {
  it(process.env.EXPORT_FIXTURES ? 'writes it' : 'matches the catalogue', () => {
    const p = path.join(DIR, 'wardrobe-catalog.json');
    if (process.env.EXPORT_FIXTURES) {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(p, json(fixture));
    } else {
      expect(existsSync(p)).toBe(true);
      expect(readFileSync(p, 'utf8')).toBe(json(fixture));
    }
  });
});
