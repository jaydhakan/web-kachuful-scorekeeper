import type { Award } from './types';

/** Everyone tied on the best value wins together; nothing is awarded when no value passes `ok`. */
export function best(
  vals: [string, number][],
  code: string,
  dir: 1 | -1 = 1,
  ok: (v: number) => boolean = () => true,
): Award[] {
  const good = vals.filter(([, v]) => ok(v));
  if (!good.length) return [];
  const top = dir === 1 ? Math.max(...good.map(([, v]) => v)) : Math.min(...good.map(([, v]) => v));
  return good
    .filter(([, v]) => v === top)
    .map(([playerId]) => ({ code, playerId, value: top }))
    .sort((a, b) => (a.playerId < b.playerId ? -1 : 1));
}
