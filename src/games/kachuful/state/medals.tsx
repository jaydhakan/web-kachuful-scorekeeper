import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { MedalMark } from '@/components/ui/MedalName';
import {
  banterLog,
  buildFacts,
  chaseOf,
  defended,
  finalPlaces,
  medalChanges,
  gameTallies,
  medalsOf,
  project,
  season,
  SEASON_MIN_ROUNDS,
  type Banter,
  type Game,
  type Holder,
  type Mark,
  type MedalChase,
  type MedalChange,
  type MedalRow,
  type Medals,
  type Player,
  placedGames,
  legendOf,
  playedMonths,
  plusPoints,
  sitaraOf,
  tallies,
} from '@/games/kachuful/domain';
import { tableIntel } from '@/progression/intel';
import { SIKKE } from '@/progression/sikke';
import { crowns } from '@/strings/crowns';
import type { PlacedGame } from '@/progression/places';
import { medals as ms } from '@/strings/medals';
import { dayOf, dayRange, monthOf, monthRange, prevMonth } from '@/progression/zone';
import { archive } from '@/state/archive';
import { identify, idOf } from '@/state/registry';
import { useArchiveVersion } from '@/state/useArchive';
import { ep } from '@/sync/endpoints';
import type { LeaderboardRow } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { useApp } from './store';
import { whoIs } from './useFacts';

const MARK: Record<1 | 2 | 3, Mark> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/** What the table knows about medals (REWARDS-PLAN §6.7); every map is keyed by the game's `Player.id`. */
export interface TableMedals {
  /** Medals as they stood before this game. */
  held: ReadonlyMap<string, Holder>;
  /** Medals if the game ended now. */
  after: ReadonlyMap<string, Holder>;
  chase: MedalChase;
  marks: ReadonlyMap<string, Mark>;
  /** One line per round done (null where nothing fits). */
  banter: (Banter | null)[];
  /** Every medal that would move if the game ended now, gold first, with names (a holder may not be seated). */
  changes: (MedalChange & { name: string })[];
  /** The seat id of a Badshah who kept gold and finished above every other medallist at the table. */
  defended: string | null;
  /** Aaj ka Sitara's seats: before this game, and with it as it stands. */
  sitara: { held: ReadonlySet<string>; now: ReadonlySet<string>; rising: string[] };
  /** The Legend's seats (the most season titles, all-time). */
  legend: ReadonlySet<string>;
  /** Round 1's other line: a rivalry or a milestone among the seated, worded (§6.5). */
  intel: string | null;
  /** Round 1's line under a seated Badshah at a table of 3+: "Beat Riya: +40 🪙" (§6.4). */
  bounty: string | null;
}

/** Nothing to show: no game at the table, or no board yet. */
export const NO_MEDALS: TableMedals = {
  held: new Map(),
  after: new Map(),
  chase: { slipping: new Set(), onTrack: new Map() },
  marks: new Map(),
  banter: [],
  changes: [],
  defended: null,
  sitara: { held: new Set(), now: new Set(), rising: [] },
  legend: new Set(),
  intel: null,
  bounty: null,
};

interface Base {
  month: string;
  minRounds: number;
  rows: MedalRow[];
  last: MedalRow[];
  /** Tonight before this game: games played and each board id's points. */
  today?: { day: string; games: number; points: ReadonlyMap<string, number> };
  /** Closed seasons' champions (board ids), for the Legend. */
  champions?: readonly (string | null)[];
  /** Ended games' places, for the intel line. */
  places?: readonly PlacedGame[];
}

const unrow = (r: LeaderboardRow): MedalRow => ({
  playerId: r.player.id,
  rank: r.rank,
  qualified: r.qualified,
  value: r.accuracy,
  accuracy: r.accuracy,
  points: r.points,
  rounds: r.rounds,
});

/** This device's month before the game at the table, from its other games. */
function deviceBase(current: Game): Base {
  const games = archive
    .games()
    .filter((r) => r.origin === 'local' && !r.conflictOf && r.syncId !== current.syncId)
    .map((r) => r.game);
  const f = buildFacts(identify(games), Date.now());
  const month = monthOf(Date.now());
  const now = season(f, month),
    last = season(f, prevMonth(month));
  return {
    month,
    minRounds: SEASON_MIN_ROUNDS,
    rows: now.standings,
    last: last.standings,
    places: placedGames(f),
    today: deviceToday(f),
    champions: playedMonths(f)
      .filter((m) => m < month)
      .map((m) => season(f, m).standings.find((r) => r.rank === 1)?.playerId ?? null),
  };
}

function deviceToday(f: ReturnType<typeof buildFacts>): NonNullable<Base['today']> {
  const day = dayOf(Date.now());
  const [from, to] = dayRange(day);
  const games = new Set(
    f.rounds.filter((r) => r.doneAt >= from && r.doneAt < to).map((r) => r.gameId),
  );
  const points = new Map([...tallies(f, from, to)].map(([id, t]) => [id, t.points]));
  return { day, games: games.size, points };
}

/** Rebuilds the table's medals from the board before the game and the game as it is now. */
export function tableMedals(
  g: Game,
  base: Base,
  nameOf: (id: string) => string = boardName,
): TableMedals {
  const key = (p: Player) => idOf(p);
  const held = medalsOf(base.rows, base.last);
  const [from, to] = monthRange(base.month);
  const projected = project(base.rows, gameTallies(identify([g])[0], from, to), base.minRounds);
  const after = medalsOf(projected, base.last);
  const byGame = (m: Medals) => {
    const out = new Map<string, Holder>();
    for (const p of g.players) {
      const h = m.get(key(p));
      if (h) out.set(p.id, h);
    }
    return out;
  };
  const heldHere = byGame(held),
    afterHere = byGame(after);
  const ids = g.players.map((p) => p.id);
  const marks = new Map<string, Mark>([...heldHere].map(([id, h]) => [id, MARK[h.medal]]));
  const seatOf = new Map(g.players.map((p) => [key(p), p]));
  const places = new Map(
    [...finalPlaces(g)].map(([id, n]) => [key(g.players.find((p) => p.id === id)!), n]),
  );
  const kept = defended(held, after, places);
  const named = (id: string) => seatOf.get(id)?.name ?? nameOf(id);
  // Aaj ka Sitara before this game and with it; the Legend. Each is a mark for the banter after the medals.
  const seatsOf = (ids: readonly string[]) =>
    new Set(g.players.filter((p) => ids.includes(key(p))).map((p) => p.id));
  const tonight = base.today;
  let starBefore = new Set<string>(),
    starNow = new Set<string>();
  if (tonight) {
    const [dFrom, dTo] = dayRange(tonight.day);
    const mine = gameTallies(identify([g])[0], dFrom, dTo);
    starBefore = seatsOf(sitaraOf(tonight.points, tonight.games));
    starNow = seatsOf(
      sitaraOf(plusPoints(tonight.points, mine), tonight.games + (mine.size ? 1 : 0)),
    );
  }
  const sitara = {
    held: starBefore,
    now: starNow,
    rising: g.players.filter((p) => starNow.has(p.id) && !starBefore.has(p.id)).map((p) => p.name),
  };
  const legend = seatsOf(legendOf(base.champions ?? []));
  for (const id of sitara.held) if (!marks.has(id)) marks.set(id, 'sitara');
  for (const id of legend) if (!marks.has(id)) marks.set(id, 'legend');
  const holders = [...held].filter(([, h]) => h.medal === 1).map(([id]) => id);
  const seatedIds = g.players.map(key);
  const found = tableIntel(base.places ?? [], seatedIds, holders);
  const bounty =
    found?.kind === 'bounty'
      ? crowns.beat([...new Set(found.holders)].map(named), SIKKE.bounty)
      : null;
  // The milestone or rivalry still counts for a table where no crown line shows.
  const other = found?.kind === 'bounty' ? tableIntel(base.places ?? [], seatedIds) : found;
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
    chase: chaseOf(heldHere, afterHere, ids),
    marks,
    banter: banterLog(g, marks),
    changes: medalChanges(held, after).map((c) => ({
      ...c,
      name: seatOf.get(c.playerId)?.name ?? nameOf(c.playerId),
    })),
    defended: kept ? (seatOf.get(kept)?.id ?? null) : null,
    sitara,
    legend,
    intel,
    bounty,
  };
}

/** A board id's name from the registry (it mirrors the server's players signed in). */
const boardName = (id: string) => whoIs(null, id).name;

const Ctx = createContext<TableMedals>(NO_MEDALS);

/** Medals for the game at the table: the server's board signed in, this device's signed out. */
export function MedalsProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const atTable = state.screen === 'round' || state.screen === 'winner';
  const value = useMedalsFor(state.game, atTable, !!state.session, true);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Medals for game `g`: the server's board when signed in; signed out, this device's only when it is the table
 * (`device`), since a spectator's own archive says nothing about this table.
 */
export function useMedalsFor(g: Game, atTable: boolean, signedIn: boolean, device: boolean) {
  const online = signedIn && atTable;
  const v = useArchiveVersion();
  const remote = useRemote(online ? `medals:${g.syncId}` : null, (o) => ep.medals(g.syncId, o));
  // The same cache key as the Awards page, so a season list it already fetched counts here.
  const titles = useRemote(online ? 'seasons' : null, (o) => ep.seasons(o));
  const placed = useRemote(online ? `places:${g.syncId}` : null, (o) => ep.places(g.syncId, o));
  // The board before this game changes only with the archive or another game, never with this game's rounds.
  const base = useMemo<Base | null>(() => {
    if (!atTable || g.id === 'demo') return null;
    if (signedIn) {
      const d = remote.data;
      return d
        ? {
            month: d.season,
            minRounds: d.minRounds,
            rows: d.standings.map(unrow),
            last: d.lastSeason.map(unrow),
            today: {
              day: d.today.day,
              games: d.today.games,
              points: new Map(d.today.rows.map((r) => [r.player.id, r.points])),
            },
            places: placed.data?.games,
            champions: (titles.data ?? [])
              .filter((x) => x.season < d.season)
              .map((x) => x.champion?.id ?? null),
          }
        : null;
    }
    return device ? deviceBase(g) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the base is the board before this game
  }, [atTable, g.syncId, signedIn, device, remote.data, titles.data, placed.data, v]);
  return useMemo(() => (base ? tableMedals(g, base) : NO_MEDALS), [g, base]);
}

export const useMedals = (): TableMedals => useContext(Ctx);

/** A seat's medal and whether it is slipping, by the game's `Player.id`, for `MedalName`. */
export function useMedalOf(after = false) {
  const t = useMedals();
  return useCallback(
    (id: string): { mark: MedalMark | null; slipping: boolean } =>
      after
        ? { mark: t.after.get(id) ?? null, slipping: false }
        : { mark: t.held.get(id) ?? null, slipping: t.chase.slipping.has(id) },
    [t, after],
  );
}

/** The seated medallists for `Table`'s ring. */
export function useSeatMedals(): Record<string, 1 | 2 | 3> {
  const t = useMedals();
  return useMemo(() => Object.fromEntries([...t.held].map(([id, h]) => [id, h.medal])), [t]);
}

/** A fixed medals value, for tests and the moments lab. */
export function MedalsValue({ value, children }: { value: TableMedals; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
