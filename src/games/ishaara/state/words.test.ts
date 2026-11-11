import { seeded } from '@/games/ishaara/domain';
import { loadRecentWords, pushRecentWords } from '@/games/ishaara/state/persistence';
import { cleanCustom, dealWords, loadPack, PACK_IDS, rememberWords } from './words';

describe('word dealing', () => {
  it('loads every pack, each with enough words for a board', async () => {
    for (const id of PACK_IDS) expect((await loadPack(id)).length).toBeGreaterThan(100);
  });

  it('deals 25 distinct words from the packs and custom words, avoiding recent ones', async () => {
    const everyday = await loadPack('everyday');
    pushRecentWords(everyday.slice(0, 300));
    const words = await dealWords(['everyday', 'nope'], [], seeded(1));
    expect(words).toHaveLength(25);
    expect(new Set(words.map((w) => w.toLowerCase())).size).toBe(25);
    const recent = new Set(loadRecentWords().map((w) => w.toLowerCase()));
    expect(words.filter((w) => recent.has(w.toLowerCase()))).toEqual([]);
    rememberWords(words);
    expect(loadRecentWords().slice(0, 25)).toEqual(words);
  });

  it('uses custom words alone, and says when there are too few', async () => {
    const custom = Array.from({ length: 25 }, (_, i) => `word${String.fromCharCode(97 + i)}`);
    expect((await dealWords([], custom, seeded(2))).sort()).toEqual([...custom].sort());
    await expect(dealWords([], custom.slice(1))).rejects.toThrow(RangeError);
  });

  it('cleans custom words: trimmed, valid, no repeats', () => {
    expect(cleanCustom(['  Ice  cream ', 'ice cream', 'r2d2', '', 'Chai'])).toEqual([
      'Ice cream',
      'Chai',
    ]);
  });
});
