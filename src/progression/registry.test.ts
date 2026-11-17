import { GAME_IDS } from '@/platform/route';
import { GROUPS } from './types';
import { loadProgression, peekProgression } from './registry';

describe.each(GAME_IDS)('%s progression', (id) => {
  it('names and explains every code in its catalogue, and nothing else', async () => {
    const p = await loadProgression(id);
    expect(p.id).toBe(id);
    expect(Object.keys(p.strings.achievements).sort()).toEqual(
      p.catalogue.map((x) => x.code).sort(),
    );
    for (const e of Object.values(p.strings.achievements)) expect(e.name && e.how).toBeTruthy();
    for (const g of GROUPS) expect(p.strings.groups[g]).toBeTruthy();
  });

  it('keeps each code once, and every ladder made of its codes, with words for it', async () => {
    const p = await loadProgression(id);
    const codes = p.catalogue.map((x) => x.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const l of p.ladders) {
      expect(l.codes.every((c) => codes.includes(c))).toBe(true);
      expect(l.steps).toHaveLength(l.codes.length);
      expect(p.strings.ladders[l.id]?.name).toBeTruthy();
    }
    expect(peekProgression(id)).toBe(p);
  });
});
