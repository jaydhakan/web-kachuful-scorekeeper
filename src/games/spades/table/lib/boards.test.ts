import { kitGame, T0, WHO } from '@/games/spades/domain/__fixtures__/kit';
import type { SpGame } from '@/games/spades/domain/types';
import {
  MIN_RATED_GAMES,
  pairsOf,
  periodDays,
  spFacts,
  spHeadToHead,
  spLeaderboard,
  spPlayerStats,
  allFacts,
} from './boards';

const [RIYA, ARJUN, DEV, MEERA] = WHO.map((w) => w.playerId);
const DAY = 864e5;

/** Two hands: team a makes 6 with a bag while b is set; then Riya's Nil holds and both teams make. */
const HANDS = [
  { bids: [3, 4, 3, 3], teamA: 7 },
  { bids: [0, 4, 4, 3], teamA: 5, nil: [0, null, null, null] },
];

function finished(extra: Partial<SpGame> = {}, n = 1): SpGame {
  return kitGame(HANDS, {
    id: `g${n}`,
    syncId: `s${n}`,
    status: 'finished',
    result: { winner: 'a', endedBy: 'end' },
    finishedAt: T0 + 3 * 600_000,
    ...extra,
  });
}
const row = (rows: ReturnType<typeof spLeaderboard>['rows'], id: string) =>
  rows.find((r) => r.player === id)!;

describe('Spades boards on this device', () => {
  it('a finished game gives each player a row: result, hands, bids made and set, Nils and team bags', () => {
    const { rows } = spLeaderboard([finished()], { period: 'all', sort: 'wins' });
    expect(row(rows, RIYA).totals).toMatchObject({
      games: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      winRate: 1,
      hands: 2,
      bids: 1,
      bidsMade: 1,
      sets: 0,
      nils: 1,
      nilsMade: 1,
      nilRate: 1,
      blindNils: 0,
      blindNilRate: null,
      bags: 2,
      bagsPerHand: 1,
    });
    expect(row(rows, ARJUN).totals).toMatchObject({
      games: 1,
      wins: 0,
      losses: 1,
      winRate: 0,
      bids: 2,
      bidsMade: 1,
      sets: 1,
      madeRate: 0.5,
      bags: 1,
    });
    expect(rows.map((r) => [r.rank, r.value])).toEqual([
      [1, 1],
      [1, 1],
      [3, 0],
      [3, 0],
    ]);
  });

  it('a draw is played, not won; cancelled and unfinished games count nowhere', () => {
    const draw = finished({ result: { winner: 'draw', endedBy: 'draw' } });
    const cancelled = finished({ status: 'cancelled', result: undefined }, 2);
    const active = finished({ status: 'active', result: undefined, finishedAt: undefined }, 3);
    expect(spFacts(cancelled)).toEqual([]);
    expect(spFacts(active)).toEqual([]);
    const { rows } = spLeaderboard([draw, cancelled, active], { period: 'all', sort: 'wins' });
    expect(rows).toHaveLength(4);
    for (const r of rows)
      expect(r.totals).toMatchObject({ games: 1, wins: 0, draws: 1, losses: 0, winRate: 0 });
  });

  it('a Blind Nil counts apart from a Nil, and a broken one is not made', () => {
    const g = kitGame(
      [
        {
          bids: [0, 4, 4, 3],
          blind: [true, false, false, false],
          teamA: 6,
          nil: [1, null, null, null],
        },
      ],
      {
        status: 'finished',
        result: { winner: 'b', endedBy: 'end' },
        rules: { ...finished().rules, blindNil: true },
      },
    );
    const riya = spFacts(g).find((f) => f.player === RIYA)!;
    expect(riya.tally).toMatchObject({ blindNils: 1, blindNilsMade: 0, nils: 0, bids: 0 });
    expect(spPlayerStats([g], RIYA)).toMatchObject({ blindNilRate: 0, losses: 1 });
  });

  it('win rate ranks only from three games; made ranks from one bid; the rest come last unranked', () => {
    const games = [1, 2, 3].map((n) => finished({}, n));
    const two = spLeaderboard(games.slice(0, MIN_RATED_GAMES - 1), { period: 'all', sort: 'rate' });
    expect(two.rows.every((r) => r.rank === null && r.value === 0)).toBe(true);
    const three = spLeaderboard(games, { period: 'all', sort: 'rate' });
    expect(row(three.rows, RIYA)).toMatchObject({ rank: 1, value: 1 });
    expect(row(three.rows, ARJUN)).toMatchObject({ rank: 3, value: 0 });
    const made = spLeaderboard(games, { period: 'all', sort: 'made' });
    expect(row(made.rows, RIYA)).toMatchObject({ rank: 1, value: 1 });
    expect(row(made.rows, MEERA)).toMatchObject({ rank: 3, value: 0.5 });
  });

  it('a game counts on the day it finished: today, the last 7 days, this month or all', () => {
    const day = (t: number) => new Date(t).toISOString().slice(0, 10);
    const now = Date.UTC(2026, 10, 16, 12);
    const at = (t: number, n: number) => finished({ finishedAt: t, updatedAt: t }, n);
    const games = [at(now - 3600e3, 1), at(now - 3 * DAY, 2), at(now - 20 * DAY, 3)];
    const games_ = (period: 'today' | 'week' | 'season' | 'all') =>
      row(spLeaderboard(games, { period, sort: 'wins', now, dayOf: day }).rows, RIYA).totals.games;
    expect([games_('today'), games_('week'), games_('season'), games_('all')]).toEqual([
      1, 2, 2, 3,
    ]);
    expect(periodDays('season', '2026-12-31')).toEqual(['2026-12-01', '2027-01-01']);
    expect(periodDays('week', '2026-03-03')).toEqual(['2026-02-25', '2026-03-04']);
  });

  it('pairs, partners and head-to-head read the same rows', () => {
    const games = [finished({}, 1), finished({ result: { winner: 'b', endedBy: 'end' } }, 2)];
    const pairs = pairsOf(allFacts(games));
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toMatchObject({ games: 2, wins: 1, draws: 0, winRate: 0.5 });
    expect(spPlayerStats(games, RIYA).partners).toEqual([
      { player: DEV, games: 2, wins: 1, winRate: 0.5 },
    ]);
    expect(spHeadToHead(games, RIYA, DEV)).toMatchObject({
      games: 2,
      together: 2,
      togetherWins: 1,
    });
    expect(spHeadToHead(games, RIYA, ARJUN)).toMatchObject({
      games: 2,
      against: 2,
      aWins: 1,
      bWins: 1,
      draws: 0,
    });
  });

  it('a seat with no registry id is keyed by its name', () => {
    const g = finished();
    g.players[0] = { ...g.players[0], playerId: undefined, name: ' Riya ' };
    expect(spFacts(g).map((f) => f.player)).toContain('name:riya');
  });
});
