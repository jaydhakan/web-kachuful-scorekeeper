import { doneRounds } from './rounds';
import { pts } from './scoring';
import type { Game, Player } from './types';

export interface PlayerStats {
  p: Player;
  exact: number;
  best: number;
  worst: number;
  run: number;
  maxRun: number;
  hook: number;
}

export interface GameStats {
  sharp: PlayerStats;
  big: PlayerStats;
  streak: PlayerStats;
  hook: PlayerStats;
  ouch: PlayerStats;
}

export function gameStats(g: Game): GameStats {
  const S: Record<string, PlayerStats> = {};
  g.players.forEach(
    (p) => (S[p.id] = { p, exact: 0, best: -1e9, worst: 1e9, run: 0, maxRun: 0, hook: 0 }),
  );
  doneRounds(g).forEach((r) => {
    g.players.forEach((p) => {
      const s = S[p.id],
        v = pts(r, p.id);
      if (r.results[p.id] === 'made') {
        s.exact++;
        s.run++;
        s.maxRun = Math.max(s.maxRun, s.run);
      } else s.run = 0;
      if (v != null) {
        s.best = Math.max(s.best, v);
        s.worst = Math.min(s.worst, v);
      }
    });
    S[g.players[r.dealerIndex].id].hook += r.hookHits || 0;
  });
  const A = Object.values(S),
    top = (f: (s: PlayerStats) => number) => A.reduce((a, b) => (f(b) > f(a) ? b : a), A[0]);
  return {
    sharp: top((s) => s.exact),
    big: top((s) => s.best),
    streak: top((s) => s.maxRun),
    hook: top((s) => s.hook),
    ouch: top((s) => -s.worst),
  };
}
