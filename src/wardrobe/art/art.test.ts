import { describe, expect, it } from 'vitest';
import { ITEMS } from '../catalog';
import { artOf } from '.';

describe('art registry', () => {
  it('draws every catalogue item but titles, with a tone per variant', () => {
    for (const item of ITEMS) {
      if (item.slot === 'title') continue;
      const art = artOf(item.slot, item.id);
      expect(art, item.id).toBeDefined();
      if (art?.tones) expect(art.tones.length, item.id).toBe(item.variants);
      else expect(item.variants, item.id).toBe(1);
    }
  });
});
