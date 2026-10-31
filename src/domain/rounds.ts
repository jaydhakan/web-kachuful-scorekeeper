import { TRUMPS, cardsFor, cycleLen } from './cards';
import type { Game, Round, RoundPlan } from './types';

const derive = (g: Game, i: number): RoundPlan => {
  const n = g.players.length,
    d = (g.firstDealerIndex + i) % n;
  return {
    index: i,
    cards: cardsFor(i, g.maxCards),
    trump: TRUMPS[i % 4],
    dealerIndex: d,
    firstPlayerIndex: (d + 1) % n,
  };
};

export const newRound = (g: Game, i: number): Round => ({
  ...derive(g, i),
  bids: {},
  results: {},
  tricks: null,
  hookHits: 0,
  phase: 'bidding',
});
export const roundAt = (g: Game, i: number): RoundPlan => g.rounds[i] || derive(g, i);
export const curRound = (g: Game): Round => g.rounds[g.rounds.length - 1];
export const bidOrder = (g: Game, r: RoundPlan): number[] =>
  Array.from({ length: g.players.length }, (_, k) => (r.firstPlayerIndex + k) % g.players.length);
export const doneRounds = (g: Game): Round[] => g.rounds.filter((r) => r.phase === 'done');
export const totalRounds = (g: Pick<Game, 'lengthMode' | 'maxCards'>): number =>
  g.lengthMode === 'endless'
    ? Infinity
    : cycleLen(g.maxCards) * (g.lengthMode === '1cycle' ? 1 : 2);
