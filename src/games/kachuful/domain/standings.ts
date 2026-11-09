import { doneRounds } from './rounds';
import { totals } from './scoring';
import type { Game, Round, Standing } from './types';

/** Competition ranking (1, 1, 3); ties keep seat order. */
export function standings(g: Game, rounds?: Round[]): Standing[] {
  const t = totals(g, rounds);
  const a: Standing[] = g.players
    .map((p, i) => ({ p, i, t: t[p.id], rank: 0 }))
    .sort((x, y) => y.t - x.t || x.i - y.i);
  let rk = 0;
  a.forEach((x, k) => {
    if (k === 0 || x.t !== a[k - 1].t) rk = k + 1;
    x.rank = rk;
  });
  return a;
}

export function streaks(g: Game): Record<string, number> {
  const out: Record<string, number> = {};
  g.players.forEach((p) => {
    let s = 0;
    for (const r of doneRounds(g)) {
      if (r.results[p.id] === 'made') s++;
      else s = 0;
    }
    out[p.id] = s;
  });
  return out;
}
