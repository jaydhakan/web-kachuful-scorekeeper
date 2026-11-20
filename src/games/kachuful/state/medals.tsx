import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  banterLog,
  buildFacts,
  chaseOf,
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
  type MedalRow,
  type Medals,
  type Player,
} from '@/games/kachuful/domain';
import { monthOf, monthRange, prevMonth } from '@/progression/zone';
import { archive } from '@/state/archive';
import { identify, idOf } from '@/state/registry';
import { useArchiveVersion } from '@/state/useArchive';
import { ep } from '@/sync/endpoints';
import type { LeaderboardRow } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { useApp } from './store';

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
}

const EMPTY: TableMedals = {
  held: new Map(),
  after: new Map(),
  chase: { slipping: new Set(), onTrack: new Map() },
  marks: new Map(),
  banter: [],
};

interface Base {
  month: string;
  minRounds: number;
  rows: MedalRow[];
  last: MedalRow[];
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
  return { month, minRounds: SEASON_MIN_ROUNDS, rows: now.standings, last: last.standings };
}

/** Rebuilds the table's medals from the board before the game and the game as it is now. */
export function tableMedals(g: Game, base: Base): TableMedals {
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
  return {
    held: heldHere,
    after: afterHere,
    chase: chaseOf(heldHere, afterHere, ids),
    marks,
    banter: banterLog(g, marks),
  };
}

const Ctx = createContext<TableMedals>(EMPTY);

/** Medals for the game at the table: the server's board signed in, this device's signed out. */
export function MedalsProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const g = state.game;
  const atTable = state.screen === 'round' || state.screen === 'winner';
  const signedIn = !!state.session;
  const online = signedIn && atTable;
  const v = useArchiveVersion();
  const remote = useRemote(online ? `medals:${g.syncId}` : null, (o) => ep.medals(g.syncId, o));
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
          }
        : null;
    }
    return deviceBase(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the base is the board before this game
  }, [atTable, g.syncId, signedIn, remote.data, v]);
  const value = useMemo(() => (base ? tableMedals(g, base) : EMPTY), [g, base]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMedals = (): TableMedals => useContext(Ctx);
