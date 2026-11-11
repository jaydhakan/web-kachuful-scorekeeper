import { BLANKS, GRID } from './rules';
import type { Identity, Team } from './types';

/** mulberry32: a small seeded generator, so tests and the mock API deal the same key every time. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 9 for the starting team, 8 for the other, 7 blanks and 1 trap, shuffled. Production keys are the server's. */
export function dealKey(seed: number): { key: Identity[]; starting: Team } {
  const rnd = seeded(seed);
  const starting: Team = rnd() < 0.5 ? 'sun' : 'moon';
  const second: Team = starting === 'sun' ? 'moon' : 'sun';
  const key: Identity[] = [
    ...Array<Identity>(9).fill(starting),
    ...Array<Identity>(8).fill(second),
    ...Array<Identity>(BLANKS).fill('blank'),
    'trap',
  ];
  for (let i = GRID - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [key[i], key[j]] = [key[j], key[i]];
  }
  return { key, starting };
}

/** Picks `n` distinct words from a list, skipping any in `avoid` (case-insensitive) while enough are left. */
export function pickWords(
  pool: readonly string[],
  n: number,
  rnd: () => number,
  avoid: ReadonlySet<string> = new Set(),
) {
  const seen = new Set<string>();
  const uniq = pool.filter((w) => {
    const k = w.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const fresh = uniq.filter((w) => !avoid.has(w.toLowerCase()));
  const from = fresh.length >= n ? fresh : uniq;
  const a = from.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
