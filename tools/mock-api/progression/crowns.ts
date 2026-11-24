import type { GameId } from '../../../src/progression/types';
import type { PlayerGameFact, WinRateRow } from '../../../src/progression/types';
import type { PlacedGame } from '../../../src/progression/places';
import { legendOf, medalsOf, sitaraByWins } from '../../../src/progression/medals';
import { winRateStandings } from '../../../src/progression/rules';
import { dayOf, dayRange, monthOf, monthRange, prevMonth } from '../../../src/progression/zone';
import type { PlayerSummary } from '../../../src/sync/types';
import type { GameMock, MockCtx } from './kit';

type Other = Exclude<GameId, 'kachuful'>;
type Summary = (id: string) => PlayerSummary;

/**
 * Medals, Aaj ka Sitara, the Legend and places for every game but Kachuful (backend-requests §1), from each game's
 * finished seats: the month by win rate with its `seasonMin`, today's wins, and closed seasons' champions.
 */
const factsOf = (m: GameMock, ctx: MockCtx, exclude: string | null): PlayerGameFact[] =>
  (m.facts?.(ctx) ?? []).filter((f) => f.gameId !== exclude);

function standing(facts: PlayerGameFact[], month: string, m: GameMock, tz: string) {
  const [from, to] = monthRange(month, tz);
  return winRateStandings(facts, from, to, m.minGames);
}

function todayOf(facts: PlayerGameFact[], tz: string) {
  const day = dayOf(Date.now(), tz);
  const [from, to] = dayRange(day, tz);
  const mine = facts.filter((f) => f.endedAt >= from && f.endedAt < to);
  const rows = new Map<string, { wins: number; games: number }>();
  for (const f of mine) {
    const r = rows.get(f.playerId) ?? { wins: 0, games: 0 };
    r.games++;
    if (f.won) r.wins++;
    rows.set(f.playerId, r);
  }
  return { day, games: new Set(mine.map((f) => f.gameId)).size, rows };
}

/** `GET /api/medals?game=`: the month without `excludeGame`, last month's top three and today. */
export function gameMedals(
  game: Other,
  m: GameMock,
  ctx: MockCtx,
  exclude: string | null,
  summaryOf: Summary,
) {
  const facts = factsOf(m, ctx, exclude);
  const month = monthOf(Date.now(), ctx.tz);
  const row = ({ playerId, ...r }: WinRateRow) => ({
    ...r,
    player: summaryOf(playerId),
  });
  const t = todayOf(facts, ctx.tz);
  return {
    game,
    season: month,
    minGames: m.minGames,
    standings: standing(facts, month, m, ctx.tz).map(row),
    lastSeason: standing(facts, prevMonth(month), m, ctx.tz)
      .filter((r) => r.qualified && r.rank != null && r.rank <= 3)
      .map(row),
    today: {
      day: t.day,
      games: t.games,
      rows: [...t.rows].map(([id, r]) => ({ player: summaryOf(id), ...r })),
    },
  };
}

/** `GET /api/places?game=`: ended games' places, newest first. */
export function gamePlaces(m: GameMock, ctx: MockCtx, exclude: string | null): PlacedGame[] {
  const by = new Map<string, PlacedGame>();
  for (const f of factsOf(m, ctx, exclude)) {
    const g = by.get(f.gameId) ?? { gameId: f.gameId, endedAt: f.endedAt, seats: [] };
    g.seats.push({ playerId: f.playerId, place: f.place, seat: g.seats.length });
    by.set(f.gameId, g);
  }
  return [...by.values()].sort((a, b) => b.endedAt - a.endedAt);
}

/** `GET /api/crowns?game=`: who holds each medal, the Sitara and the Legend now. */
export function gameCrowns(m: GameMock, ctx: MockCtx, summaryOf: Summary) {
  const facts = factsOf(m, ctx, null);
  const month = monthOf(Date.now(), ctx.tz);
  const held = medalsOf(
    standing(facts, month, m, ctx.tz),
    standing(facts, prevMonth(month), m, ctx.tz),
  );
  const medal = (n: 1 | 2 | 3) => [...held].filter(([, h]) => h.medal === n).map(([id]) => id);
  const champions = m
    .months(ctx)
    .filter((mo) => mo < month)
    .map(
      (mo) => m.season(ctx, mo).awards.find((a) => a.code === 'season_champion')?.playerId ?? null,
    );
  const item = (kind: string, ids: string[]) => ({
    kind,
    holders: ids.map(summaryOf),
    since: null,
    sinceGame: null,
    defences: 0,
  });
  return {
    items: [
      item('medal1', medal(1)),
      item('medal2', medal(2)),
      item('medal3', medal(3)),
      item('sitara', sitaraByWins(todayOf(facts, ctx.tz))),
      item('legend', legendOf(champions)),
    ],
  };
}
