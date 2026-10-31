import { COLORS } from './avatars';
import { newRound } from './rounds';
import type { Game, Player } from './types';

export function demoGame(): Game {
  const now = Date.now();
  const P: Player[] = (
    [
      ['Aarav', '🦁'],
      ['Riya', '🐯'],
      ['Kabir', '🦊'],
      ['Meera', '🐼'],
      ['Dev', '🐸'],
    ] as const
  ).map(([n, e], i) => ({ id: 'p' + i, name: n, emoji: e, color: COLORS[i] }));
  const g: Game = {
    id: 'demo',
    createdAt: now - 3600e3,
    updatedAt: now - 12 * 60e3,
    players: P,
    direction: 'cw',
    firstDealerIndex: 0,
    decks: 1,
    maxCards: 10,
    lengthMode: 'endless',
    rounds: [],
    status: 'active',
    ui: { view: 'round', bidIdx: 2 },
  };
  const D: [number[], number[], number][] = [
    [[1, 1, 0, 0, 0], [1, 1, 1, 0, 1], 0],
    [[1, 1, 2, 1, 0], [0, 0, 1, 0, 1], 0],
    [[1, 1, 1, 2, 1], [1, 1, 0, 1, 1], 1],
    [[1, 2, 0, 1, 3], [1, 1, 1, 0, 0], 2],
    [[2, 2, 1, 1, 2], [1, 0, 1, 0, 1], 0],
    [[3, 3, 2, 1, 1], [0, 0, 1, 0, 1], 0],
  ];
  D.forEach(([b, m, h], i) => {
    const r = { ...newRound(g, i), hookHits: h, phase: 'done' as const };
    P.forEach((p, k) => {
      r.bids[p.id] = b[k];
      r.results[p.id] = m[k] ? 'made' : 'missed';
    });
    g.rounds.push(r);
  });
  g.rounds.push({ ...newRound(g, 6), bids: { p2: 2, p3: 3 } });
  return g;
}
