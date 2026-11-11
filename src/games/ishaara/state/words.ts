import { boardWordOk, GRID, norm, pickWords } from '@/games/ishaara/domain';
import { loadRecentWords, pushRecentWords } from '@/games/ishaara/state/persistence';

export const PACK_IDS = ['everyday', 'desi', 'family', 'hinglish'] as const;
export type PackId = (typeof PACK_IDS)[number];

// Each pack is its own chunk, fetched only when a deal needs it, so no word list is in the first load.
const LOADERS: Record<PackId, () => Promise<{ default: { id: string; words: string[] } }>> = {
  everyday: () => import('@/games/ishaara/domain/packs/everyday.json'),
  desi: () => import('@/games/ishaara/domain/packs/desi.json'),
  family: () => import('@/games/ishaara/domain/packs/family.json'),
  hinglish: () => import('@/games/ishaara/domain/packs/hinglish.json'),
};

export const isPackId = (s: string): s is PackId => (PACK_IDS as readonly string[]).includes(s);

export async function loadPack(id: PackId): Promise<string[]> {
  return (await LOADERS[id]()).default.words;
}

/** Custom words as typed: trimmed, valid for the board, without repeats (case-insensitive). */
export function cleanCustom(words: readonly string[]): string[] {
  const seen = new Set<string>();
  return words
    .map((w) => w.normalize('NFC').trim().replace(/\s+/g, ' '))
    .filter((w) => {
      const k = norm(w);
      if (!boardWordOk(w) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/**
 * 25 words for a new board from the chosen packs and custom words, avoiding the words dealt lately on this device
 * while enough fresh ones are left. Throws `RangeError` when the pool holds fewer than 25 distinct words.
 */
export async function dealWords(
  packs: readonly string[],
  custom: readonly string[] = [],
  rnd: () => number = Math.random,
): Promise<string[]> {
  const lists = await Promise.all(packs.filter(isPackId).map(loadPack));
  const pool = [...cleanCustom(custom), ...lists.flat().filter(boardWordOk)];
  const avoid = new Set(loadRecentWords().map((w) => w.toLowerCase()));
  const words = pickWords(pool, GRID, rnd, avoid);
  if (words.length < GRID) throw new RangeError('not-enough-words');
  return words;
}

/** Remembers a board's words so the next deals avoid them. */
export const rememberWords = (words: readonly string[]) => void pushRecentWords(words);
