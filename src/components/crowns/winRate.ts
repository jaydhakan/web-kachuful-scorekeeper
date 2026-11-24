/**
 * The table's crowns for a game ranked on win rate (Spades, Kaali Teeri, Ishaara; backend-requests §1): the board
 * before this game, from the server signed in or this device's finished games signed out, and the game as it stands.
 */
import { MARK_OF, type Mark } from '@/progression/banter';
import { tableIntel } from '@/progression/intel';
import {
  chaseOf,
  defended,
  legendOf,
  medalChanges,
  medalsOf,
  plusGame,
  projectWinRate,
  sitaraByWins,
  type Holder,
  type Medals,
  type WinDay,
} from '@/progression/medals';
import type { PlacedGame } from '@/progression/places';
import { winRateStandings } from '@/progression/rules';
import { SIKKE } from '@/progression/sikke';
import type { PlayerGameFact, WinRateRow } from '@/progression/types';
import { dayOf, dayRange, monthOf, monthRange, prevMonth } from '@/progression/zone';
import { crowns } from '@/strings/crowns';
import { medals as ms } from '@/strings/medals';
import type { GameMedalsResp, GameSeasonRow, PlacesResp, PlayerSummary } from '@/sync/types';
import type { TableCrowns } from './table';

/** The month before the game at the table, by board ids (`pidOf`, the server's player ids). */
export interface WinRateBase {
  month: string;
  minGames: number;
  rows: readonly WinRateRow[];
  last: readonly WinRateRow[];
  /** Today before this game, for Aaj ka Sitara. */
  today?: WinDay;
  /** Closed seasons' champions, for the Legend. */
  champions?: readonly (string | null)[];
  /** Ended games' places, for the intel line. */
  places?: readonly PlacedGame[];
}

/** A seat at the table: its id in the game, its board id and the name it shows. */
export interface CrownSeat {
  id: string;
  board: string;
  name: string;
}

/** The game as it stands, by seat id: each seat's place, and who would win if it ended now. */
export interface Standing {
  place: ReadonlyMap<string, number>;
  won: ReadonlySet<string>;
}

const unrow = (r: GameSeasonRow): WinRateRow => ({
  playerId: r.player.id,
  rank: r.rank,
  qualified: r.qualified,
  value: r.value,
  games: r.games,
  wins: r.wins,
});

/** The server's month before this game (`GET /api/medals?game=`), its closed seasons and ended games. */
export function serverBase(
  d: GameMedalsResp,
  seasons?: readonly { season: string; champion: PlayerSummary | null }[] | null,
  places?: PlacesResp | null,
): WinRateBase {
  return {
    month: d.season,
    minGames: d.minGames,
    // An older server answers in Kachuful's shape (no standings): nobody holds anything rather than a broken table.
    rows: (Array.isArray(d.standings) ? d.standings : []).map(unrow),
    last: (Array.isArray(d.lastSeason) ? d.lastSeason : []).map(unrow),
    today: {
      games: d.today?.games ?? 0,
      rows: new Map(
        (Array.isArray(d.today?.rows) ? d.today.rows : []).map((r) => [
          r.player.id,
          { wins: r.wins, games: r.games },
        ]),
      ),
    },
    champions: (Array.isArray(seasons) ? seasons : [])
      .filter((x) => x.season < d.season)
      .map((x) => x.champion?.id ?? null),
    places: Array.isArray(places?.games) ? places.games : undefined,
  };
}

/** This device's month from its finished games (the game at the table left out by the caller). */
export function factsBase(
  facts: readonly PlayerGameFact[],
  minGames: number,
  now = Date.now(),
): WinRateBase {
  const month = monthOf(now);
  const [from, to] = monthRange(month);
  const [pf, pt] = monthRange(prevMonth(month));
  const [df, dt] = dayRange(dayOf(now));
  const day = facts.filter((f) => f.endedAt >= df && f.endedAt < dt);
  const rows = new Map<string, { wins: number; games: number }>();
  for (const f of day) {
    const r = rows.get(f.playerId) ?? { wins: 0, games: 0 };
    r.games++;
    if (f.won) r.wins++;
    rows.set(f.playerId, r);
  }
  const months = [...new Set(facts.map((f) => monthOf(f.endedAt)))].filter((m) => m < month);
  const games = new Map<string, PlacedGame>();
  for (const f of facts) {
    const g = games.get(f.gameId) ?? { gameId: f.gameId, endedAt: f.endedAt, seats: [] };
    g.seats.push({ playerId: f.playerId, place: f.place, seat: g.seats.length });
    games.set(f.gameId, g);
  }
  return {
    month,
    minGames,
    rows: winRateStandings(facts, from, to, minGames),
    last: winRateStandings(facts, pf, pt, minGames),
    today: { games: new Set(day.map((f) => f.gameId)).size, rows },
    champions: months.flatMap((m) => {
      const [a, b] = monthRange(m);
      const top = winRateStandings(facts, a, b, minGames).filter((r) => r.rank === 1);
      return top.length ? top.map((r) => r.playerId) : [null];
    }),
    places: [...games.values()],
  };
}

/** Rebuilds the table's crowns from the board before the game and the game as it stands (null: nothing scored). */
export function winRateCrowns(
  base: WinRateBase,
  seats: readonly CrownSeat[],
  standing: Standing | null,
  nameOf: (boardId: string) => string = () => '',
): TableCrowns {
  const seatOf = new Map(seats.map((s) => [s.board, s]));
  const add = new Map(standing ? seats.map((s) => [s.board, standing.won.has(s.id)]) : []);
  const held = medalsOf(base.rows, base.last);
  const after = standing
    ? medalsOf(projectWinRate(base.rows, add, base.minGames), base.last)
    : held;
  const bySeat = (m: Medals) => {
    const out = new Map<string, Holder>();
    for (const s of seats) {
      const h = m.get(s.board);
      if (h) out.set(s.id, h);
    }
    return out;
  };
  const heldHere = bySeat(held),
    afterHere = bySeat(after);
  const seatIds = (boards: readonly string[]) =>
    new Set(seats.filter((s) => boards.includes(s.board)).map((s) => s.id));
  const before = base.today ? sitaraByWins(base.today) : [];
  const now = base.today ? sitaraByWins(plusGame(base.today, add)) : [];
  const starHeld = seatIds(before),
    starNow = seatIds(now);
  const legend = seatIds(legendOf(base.champions ?? []));
  const marks = new Map<string, Mark>([...heldHere].map(([id, h]) => [id, MARK_OF[h.medal]]));
  for (const id of starHeld) if (!marks.has(id)) marks.set(id, 'sitara');
  for (const id of legend) if (!marks.has(id)) marks.set(id, 'legend');
  const named = (board: string) => seatOf.get(board)?.name ?? nameOf(board);
  const places = new Map(
    standing ? seats.map((s) => [s.board, standing.place.get(s.id) ?? Infinity]) : [],
  );
  const kept = standing ? defended(held, after, places) : null;
  const boards = seats.map((s) => s.board);
  const gold = [...held].filter(([, h]) => h.medal === 1).map(([id]) => id);
  const found = tableIntel(base.places ?? [], boards, gold);
  const bounty =
    found?.kind === 'bounty'
      ? crowns.beat([...new Set(found.holders)].map(named), SIKKE.bounty)
      : null;
  const other = found?.kind === 'bounty' ? tableIntel(base.places ?? [], boards) : found;
  const intel = !other
    ? null
    : other.kind === 'milestone'
      ? ms.milestone(named(other.player), other.nth)
      : other.kind === 'rivalry'
        ? ms.rivalry(named(other.winner), named(other.loser), other.won, other.of)
        : null;
  return {
    held: heldHere,
    after: afterHere,
    chase: chaseOf(
      heldHere,
      afterHere,
      seats.map((s) => s.id),
    ),
    marks,
    changes: medalChanges(held, after).map((c) => ({ ...c, name: named(c.playerId) })),
    defended: kept ? (seatOf.get(kept)?.id ?? null) : null,
    sitara: {
      held: starHeld,
      now: starNow,
      rising: seats.filter((s) => starNow.has(s.id) && !starHeld.has(s.id)).map((s) => s.name),
    },
    legend,
    intel,
    bounty,
  };
}
