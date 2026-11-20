import { describe, expect, it } from 'vitest';
import { maxFor, newRound, type Game, type MedalRow } from '@/games/kachuful/domain';
import { monthRange } from '@/progression/zone';
import { tableMedals } from './medals';

const MONTH = '2026-11';
const [from] = monthRange(MONTH);

const row = (playerId: string, rank: number | null, value: number, rounds = 60): MedalRow => ({
  playerId,
  rank,
  qualified: rank != null,
  value,
  points: Math.round(value * rounds),
  rounds,
});

/** Riya (gold), Dev (silver), Asha (no medal), seated; the board has Kabir as bronze, not seated. */
function game(rounds: [riya: boolean, dev: boolean, asha: boolean, ashaBid?: number][]): Game {
  const players = [
    { id: 's0', name: 'Riya', emoji: 'x', color: 'c', playerId: 'R' },
    { id: 's1', name: 'Dev', emoji: 'x', color: 'c', playerId: 'D' },
    { id: 's2', name: 'Asha', emoji: 'x', color: 'c', playerId: 'A' },
  ];
  const g: Game = {
    id: 'g',
    syncId: 'g',
    rev: 1,
    createdAt: from,
    updatedAt: from,
    players,
    direction: 'cw',
    firstDealerIndex: 0,
    decks: 1,
    maxCards: maxFor(3, 1),
    order: 'up',
    lengthMode: 'endless',
    rounds: [],
    status: 'active',
    ui: { view: 'round', bidIdx: 0 },
  };
  rounds.forEach(([r0, r1, r2, ashaBid = 1], i) => {
    const r = newRound(g, i);
    r.bids = { s0: 1, s1: 1, s2: ashaBid };
    r.results = {
      s0: r0 ? 'made' : 'missed',
      s1: r1 ? 'made' : 'missed',
      s2: r2 ? 'made' : 'missed',
    };
    r.phase = 'done';
    r.doneAt = from + (i + 1) * 60e3;
    g.rounds.push(r);
  });
  return g;
}

const base = {
  month: MONTH,
  minRounds: 50,
  rows: [row('R', 1, 10), row('D', 2, 9), row('K', 3, 8), row('A', null, 30, 45)],
  last: [],
};

describe('the table medals', () => {
  it('marks the seated medallists by their seat id', () => {
    const t = tableMedals(game([]), base);
    expect([...t.marks]).toEqual([
      ['s0', 'gold'],
      ['s1', 'silver'],
    ]);
    expect(t.held.get('s0')).toEqual({ medal: 1, defending: false });
  });

  it("projects Asha into gold once she qualifies on this game's rounds, and cracks Riya's", () => {
    // Asha: 45 rounds at 30 a round, then 6 made 3-bids (+30 each): 51 rounds, qualified at 30.
    const t = tableMedals(game(Array.from({ length: 6 }, () => [false, true, true, 3])), base);
    expect(t.after.get('s2')?.medal).toBe(1);
    expect(t.chase.onTrack.get('s2')).toBe(1);
    expect(t.chase.slipping.has('s0')).toBe(true);
  });

  it("names the round's line about the Badshah", () => {
    const t = tableMedals(game([[false, true, true, 3]]), base);
    expect(t.banter[0]).toEqual({ kind: 'outbid', who: 's0', mark: 'gold', other: 's2' });
  });
});
