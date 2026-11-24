import { describe, expect, it } from 'vitest';
import type { OwnedItem } from '@/sync/types';
import { keepOwned, lockReason, notOwned, ownedKeys, shuffleLook } from './logic';

const own = (id: string, v = 0): OwnedItem => ({ id, v, source: 'bought', at: 1 });
const owned = [own('kurta', 0), own('kurta', 2), own('safa', 1), own('gold_ring')];

describe('wardrobe logic', () => {
  it('keeps only owned pairs of a saved look', () => {
    const look = {
      outfit: { id: 'kurta', v: 2 },
      headwear: { id: 'safa', v: 0 },
      frame: { id: 'gold_ring', v: 0 },
    };
    expect(keepOwned(look, ownedKeys(owned))).toEqual({ outfit: look.outfit, frame: look.frame });
    expect(notOwned(look, ownedKeys(owned))).toEqual(['headwear']);
  });

  it('shuffles only owned pairs', () => {
    let i = 0;
    const seq = [0.9, 0.6, 0.9, 0.1, 0.9, 0.1];
    const look = shuffleLook(owned, () => seq[i++ % seq.length]);
    for (const it of Object.values(look))
      expect(ownedKeys(owned).has(`${it.id}:${it.v}`)).toBe(true);
    expect(look.outfit).toBeDefined();
  });

  it('says how a locked item is got', () => {
    expect(lockReason('bow_tie', 0, [])).toEqual({ kind: 'level', level: 4 });
    expect(lockReason('champions_shaal', 0, [])).toEqual({ kind: 'honour' });
    expect(lockReason('sherwani', 0, [])).toEqual({ kind: 'price', price: 750 });
    expect(lockReason('kurta', 3, owned)).toEqual({ kind: 'price', price: 50 });
  });
});
