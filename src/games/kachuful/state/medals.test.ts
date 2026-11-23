import { describe, expect, it } from 'vitest';
import { maxFor, newRound, type Game, type MedalRow } from '@/games/kachuful/domain';
import { dayOf, monthRange } from '@/progression/zone';
import { tableMedals } from './medals';

const MONTH = '2026-11';
const [from] = monthRange(MONTH);

/** A board row ranked on bid accuracy (`value`, 0–1), at 10 points a round. */
const row = (playerId: string, rank: number | null, value: number, rounds = 60): MedalRow => ({
  playerId,
  rank,
  qualified: rank != null,
  value,
  accuracy: value,
  points: 10 * rounds,
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
  rows: [row('R', 1, 0.9), row('D', 2, 0.85), row('K', 3, 0.8), row('A', null, 1, 45)],
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
    // Asha: 45 rounds, every bid made, then 6 more made: 51 rounds, qualified with every bid made.
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

describe('Aaj ka Sitara and the Legend at the table', () => {
  const day = dayOf(from + 60e3);

  it("is tonight's leader before this game, and moves with this game's points", () => {
    // Earlier tonight: one game, Dev leading on 30. This game is the night's second; Asha's 3-bid takes her to 30
    // plus nothing before, Riya misses: Dev 30 + 10 = 40 still leads.
    const t = tableMedals(game([[false, true, true, 3]]), {
      ...base,
      today: { day, games: 1, points: new Map([['D', 30]]) },
    });
    // One game before this one: no Sitara yet; with this one it is the second game, so Dev is.
    expect([...t.sitara.held]).toEqual([]);
    expect([...t.sitara.now]).toEqual(['s1']);
    expect(t.sitara.rising).toEqual(['Dev']);
  });

  it('marks the Legend, and gives the Sitara a mark for the banter when they hold nothing else', () => {
    const t = tableMedals(game([]), {
      ...base,
      rows: [row('R', 1, 0.9), row('K', 2, 0.85), row('Z', 3, 0.8)],
      today: { day, games: 2, points: new Map([['A', 50]]) },
      champions: ['R', 'A', 'R'],
    });
    expect([...t.legend]).toEqual(['s0']);
    // Riya is the Badshah: her medal is her mark. Asha leads tonight.
    expect(t.marks.get('s0')).toBe('gold');
    expect(t.marks.get('s2')).toBe('sitara');
  });
});

describe('the table intel line', () => {
  it('names the rivalry among the seated, by name', () => {
    const places = Array.from({ length: 6 }, (_, k) => ({
      gameId: 'old' + k,
      endedAt: k,
      seats: [
        { playerId: 'A', place: 1, seat: 0 },
        { playerId: 'R', place: 2, seat: 1 },
        { playerId: 'Z', place: 3, seat: 2 },
      ],
    }));
    const t = tableMedals(game([]), { ...base, places });
    expect(t.intel).toBe('Asha has beaten Riya 6 of their last 6');
  });
});

describe('the bounty line at round 1 (§6.4)', () => {
  it('offers a bounty on the seated Badshah only at a table of three', () => {
    expect(tableMedals(game([]), base).bounty).toBe('Beat Riya: +40 🪙');
  });

  it('says nothing when no holder sits, or at a table of two', () => {
    const none = tableMedals(game([]), { ...base, rows: [row('K', 1, 0.9)] });
    expect(none.bounty).toBeNull();
    const two = game([]);
    two.players = two.players.slice(0, 2);
    expect(tableMedals(two, base).bounty).toBeNull();
  });
});
