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
  kursiGames,
  standings,
} from '@/games/kachuful/domain';
import { kursiFrom, stepKursi, type Kursi } from '@/progression/kursi';
import { monthOf, monthRange, prevMonth } from '@/progression/zone';
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
  /** The Kursi as it stood before this game (§6.3), if any of its holders is seated: their seat ids. */
  kursi: { seats: string[]; defences: number } | null;
  /** Seats ahead of every seated Kursi holder in this game's score, so far. */
  kursiChasers: ReadonlySet<string>;
  /** What this game did to the Kursi, once it ended. */
  kursiEvent: KursiMove | null;
}

export type KursiMove =
  | { kind: 'taken'; first: boolean; to: string[]; toSeats: string[]; from: string[] }
  | { kind: 'defended'; defences: number; holders: string[] };

/** Nothing to show: no game at the table, or no board yet. */
export const NO_MEDALS: TableMedals = {
  held: new Map(),
  after: new Map(),
  chase: { slipping: new Set(), onTrack: new Map() },
  marks: new Map(),
  banter: [],
  changes: [],
  defended: null,
  kursi: null,
  kursiChasers: new Set(),
  kursiEvent: null,
};

interface Base {
  month: string;
  minRounds: number;
  rows: MedalRow[];
  last: MedalRow[];
  /** The chair before this game; null when nobody has it yet. */
  kursi?: Kursi | null;
}

const unrow = (r: LeaderboardRow): MedalRow => ({
  playerId: r.player.id,
  rank: r.rank,
  qualified: r.qualified,
  value: r.value,
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
    kursi: kursiFrom(kursiGames(f)).kursi,
  };
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
  // The Kursi: its seated holders, who is ahead of them now, and what the ended game did to it.
  const kHeld = base.kursi ?? null;
  const kSeats = kHeld
    ? g.players.filter((p) => kHeld.holders.includes(key(p))).map((p) => p.id)
    : [];
  for (const id of kSeats) if (!marks.has(id)) marks.set(id, 'kursi');
  const st = standings(g);
  const holderRank = Math.min(...st.filter((x) => kSeats.includes(x.p.id)).map((x) => x.rank));
  const kursiChasers = new Set(
    g.rounds.some((r) => r.phase === 'done')
      ? st.filter((x) => !kSeats.includes(x.p.id) && x.rank < holderRank).map((x) => x.p.id)
      : [],
  );
  let kursiEvent: KursiMove | null = null;
  if (g.status === 'finished') {
    const { event } = stepKursi(kHeld, {
      gameId: g.syncId,
      endedAt: g.finishedAt ?? g.updatedAt,
      seats: g.players.map((p, seat) => ({ playerId: key(p), place: places.get(key(p))!, seat })),
    });
    if (event.kind === 'first' || event.kind === 'taken')
      kursiEvent = {
        kind: 'taken',
        first: event.kind === 'first',
        to: event.to.map(named),
        toSeats: event.to.map((id) => seatOf.get(id)!.id),
        from: event.kind === 'taken' ? event.from.map(named) : [],
      };
    else if (event.kind === 'defended')
      kursiEvent = {
        kind: 'defended',
        defences: event.defences,
        holders: kHeld!.holders.map(named),
      };
  }
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
    kursi: kSeats.length ? { seats: kSeats, defences: kHeld!.defences } : null,
    kursiChasers,
    kursiEvent,
  };
}

/** A board id's name from the registry (it mirrors the server's players signed in). */
const boardName = (id: string) => whoIs(null, id).name;

const Ctx = createContext<TableMedals>(NO_MEDALS);

/** Medals for the game at the table: the server's board signed in, this device's signed out. */
export function MedalsProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const g = state.game;
  const atTable = state.screen === 'round' || state.screen === 'winner';
  const signedIn = !!state.session;
  const online = signedIn && atTable;
  const v = useArchiveVersion();
  const remote = useRemote(online ? `medals:${g.syncId}` : null, (o) => ep.medals(g.syncId, o));
  const chair = useRemote(online ? `kursi:${g.syncId}` : null, (o) => ep.kursi(g.syncId, o));
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
            kursi: chair.data?.kursi
              ? { ...chair.data.kursi, holders: chair.data.kursi.holders.map((h) => h.id) }
              : null,
          }
        : null;
    }
    return deviceBase(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the base is the board before this game
  }, [atTable, g.syncId, signedIn, remote.data, chair.data, v]);
  const value = useMemo(() => (base ? tableMedals(g, base) : NO_MEDALS), [g, base]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
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
