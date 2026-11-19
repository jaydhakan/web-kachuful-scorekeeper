/** FNV-1a: a small, stable string hash, the same on every phone. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One line out of a pool, chosen by the seed alone (a table id plus a hand number): it varies from game to game
 * yet every phone at the table, and anyone watching, reads the same one.
 */
export function pickLine<T>(pool: readonly T[], seed: string): T {
  return pool[hash(seed) % pool.length];
}

/** Fills `{key}` marks in a line, e.g. the winning pair's label for `{w}`. */
export const fillLine = (line: string, values: Record<string, string>): string =>
  line.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
