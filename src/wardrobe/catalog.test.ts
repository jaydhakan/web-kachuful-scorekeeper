import { completeSets, ITEMS, itemOf, LEVEL_GIFTS, priceOf, SETS } from './catalog';
import { SLOTS } from './types';

describe('wardrobe catalogue', () => {
  // backend-requests.md §3 says 44 but its table lists 45; the table is the contract.
  it("has the table's 45 items, unique, in every slot", () => {
    expect(ITEMS).toHaveLength(45);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(45);
    for (const s of SLOTS) expect(ITEMS.some((i) => i.slot === s)).toBe(true);
  });

  it('never sells an honour item, and titles have one variant', () => {
    for (const i of ITEMS) {
      expect(i.sellable).toBe(i.rarity !== 'honour');
      if (i.slot === 'title') expect(i.variants).toBe(1);
    }
    expect(itemOf('champions_shaal')?.rarity).toBe('honour');
    expect(itemOf('pehle_waale')?.rarity).toBe('honour');
  });

  it('prices an item, a further variant, and nothing for honours', () => {
    const kurta = itemOf('kurta')!,
      safa = itemOf('safa')!;
    expect(priceOf(kurta, 0, false)).toBe(100);
    expect(priceOf(safa, 0, false)).toBe(750);
    expect(priceOf(kurta, 3, true)).toBe(50);
    expect(priceOf(itemOf('lungi_banian')!, 0, false)).toBe(1800);
    expect(priceOf(itemOf('champions_shaal')!, 0, false)).toBeNull();
  });

  it('only names real items in sets and level gifts, in the right slots', () => {
    for (const pieces of Object.values(SETS))
      for (const [slot, id] of Object.entries(pieces)) expect(itemOf(id)?.slot).toBe(slot);
    for (const g of Object.values(LEVEL_GIFTS)) expect(itemOf(g.id)).toBeDefined();
    expect(itemOf('muffler')?.sets).toEqual(['monsoon', 'sardi']);
  });

  it('knows a complete set, whatever the variants', () => {
    const sardi = {
      outfit: { id: 'knit_sweater', v: 2 },
      headwear: { id: 'monkey_cap', v: 1 },
      neckwear: { id: 'muffler', v: 3 },
      frame: { id: 'frost_frame', v: 0 },
    };
    expect(completeSets(sardi)).toEqual(['sardi']);
    expect(completeSets({ ...sardi, frame: { id: 'gold_ring', v: 0 } })).toEqual([]);
    expect(completeSets(null)).toEqual([]);
  });
});
