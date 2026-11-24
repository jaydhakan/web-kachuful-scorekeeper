import { describe, expect, it } from 'vitest';
import type { PlayerGameFact } from '@/progression/types';
import { factsBase, serverBase, winRateCrowns, type CrownSeat } from './winRate';
import type { GameMedalsResp } from '@/sync/types';

const NOW = new Date(2026, 10, 20, 21, 0).getTime();
const DAY = 864e5;

/** `n` finished two-seat games between `a` and `b`, `a` winning the first `aWins`, ending `ago` ms before NOW. */
function games(
  a: string,
  b: string,
  n: number,
  aWins: number,
  ago: number,
  tag = '',
): PlayerGameFact[] {
  const out: PlayerGameFact[] = [];
  for (let i = 0; i < n; i++) {
    const gameId = `${tag}${a}${b}${i}`,
      endedAt = NOW - ago - i * 1000,
      aw = i < aWins;
    out.push({ gameId, playerId: a, endedAt, place: aw ? 1 : 2, won: aw });
    out.push({ gameId, playerId: b, endedAt, place: aw ? 2 : 1, won: !aw });
  }
  return out;
}

const seats: CrownSeat[] = [
  { id: 's1', board: 'riya', name: 'Riya' },
  { id: 's2', board: 'dev', name: 'Dev' },
  { id: 's3', board: 'kabir', name: 'Kabir' },
];

// This month: Riya 9/10, Dev 6/10 and Kabir 4/8 against Zoya; Kabir has only 8 games.
const month = [
  ...games('riya', 'zoya', 10, 9, 3 * DAY),
  ...games('dev', 'zoya', 10, 6, 3 * DAY, 'd'),
  ...games('kabir', 'zoya', 8, 4, 3 * DAY, 'k'),
];

describe('factsBase and winRateCrowns', () => {
  it('ranks the month on win rate and gives medals by seat', () => {
    const base = factsBase(month, 8, NOW);
    const t = winRateCrowns(base, seats, null);
    expect([...t.held]).toEqual([
      ['s1', { medal: 1, defending: false }],
      ['s2', { medal: 2, defending: false }],
      ['s3', { medal: 3, defending: false }],
    ]);
    expect(t.marks.get('s1')).toBe('gold');
    expect(t.after).toEqual(t.held);
    expect(t.chase.onTrack.size).toBe(0);
  });

  it('projects the game as it stands: a win can move a medal, and the chase shows it', () => {
    // Zoya qualifies with 28 games but a low rate; Kabir's win would put him at 5/9 against Dev's 6/11.
    const base = factsBase(month, 8, NOW);
    const t = winRateCrowns(base, seats, {
      place: new Map([
        ['s3', 1],
        ['s2', 2],
        ['s1', 2],
      ]),
      won: new Set(['s3']),
    });
    expect(t.after.get('s3')?.medal).toBe(2);
    expect(t.after.get('s2')?.medal).toBe(3);
    expect(t.chase.onTrack.get('s3')).toBe(2);
    expect(t.chase.slipping.has('s2')).toBe(true);
    expect(t.changes.map((c) => [c.name, c.from, c.to])).toEqual([
      ['Dev', 2, 3],
      ['Kabir', 3, 2],
    ]);
  });

  it('a Badshah who wins above the other medallists has defended', () => {
    const base = factsBase(month, 8, NOW);
    const t = winRateCrowns(base, seats, {
      place: new Map([
        ['s1', 1],
        ['s2', 2],
        ['s3', 2],
      ]),
      won: new Set(['s1']),
    });
    expect(t.defended).toBe('s1');
  });

  it('a bounty on the seated Badshah at a table of three', () => {
    const t = winRateCrowns(factsBase(month, 8, NOW), seats, null);
    expect(t.bounty).toMatch(/^Beat Riya/);
  });

  it("Aaj ka Sitara: today's most wins; the game as it stands can make a new one", () => {
    const today = games('dev', 'kabir', 2, 1, 3600e3, 't');
    const base = factsBase([...month, ...today], 8, NOW);
    const before = winRateCrowns(base, seats, null);
    expect([...before.sitara.held].sort()).toEqual(['s2', 's3']);
    const t = winRateCrowns(base, seats, {
      place: new Map([
        ['s2', 1],
        ['s3', 2],
      ]),
      won: new Set(['s2']),
    });
    expect([...t.sitara.now]).toEqual(['s2']);
    expect(t.sitara.rising).toEqual([]);
  });

  it('the Legend holds two closed seasons', () => {
    const old = [
      ...games('kabir', 'zoya', 8, 8, 40 * DAY, 'o1'),
      ...games('kabir', 'zoya', 8, 8, 75 * DAY, 'o2'),
    ];
    const t = winRateCrowns(factsBase(old, 8, NOW), seats, null);
    expect([...t.legend]).toEqual(['s3']);
    // Last month's champion defends gold while this month has nobody ranked; the medal is the mark.
    expect(t.held.get('s3')).toEqual({ medal: 1, defending: true });
    expect(t.marks.get('s3')).toBe('gold');
  });
});

describe('serverBase', () => {
  const p = (id: string) => ({ id, displayName: id.toUpperCase(), emoji: '🙂', color: '#888' });
  const row = (id: string, rank: number | null, wins: number, gamesN: number) => ({
    rank,
    qualified: rank != null,
    player: p(id),
    value: wins / gamesN,
    games: gamesN,
    wins,
  });
  it('reads the server month, last month and today', () => {
    const d = {
      game: 'spades',
      season: '2026-11',
      minGames: 10,
      standings: [row('riya', 1, 9, 10), row('dev', 2, 6, 10), row('kabir', 3, 5, 10)],
      lastSeason: [],
      today: { day: '2026-11-20', games: 2, rows: [{ player: p('dev'), wins: 2, games: 2 }] },
    } as unknown as GameMedalsResp;
    const base = serverBase(d, [
      { season: '2026-10', champion: p('kabir') as never },
      { season: '2026-09', champion: p('kabir') as never },
      { season: '2026-11', champion: p('riya') as never },
    ]);
    const t = winRateCrowns(base, seats, null);
    expect(t.held.get('s1')?.medal).toBe(1);
    expect([...t.sitara.held]).toEqual(['s2']);
    expect([...t.legend]).toEqual(['s3']);
  });
});
