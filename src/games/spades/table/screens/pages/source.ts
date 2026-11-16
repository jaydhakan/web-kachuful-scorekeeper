import { useEffect, useMemo, useState } from 'react';
import { gameTotals, seatsOf, type SpGame, type TeamId } from '@/games/spades/domain';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { hasDone } from '@/games/spades/table/state/select';
import { archive, type SpGameRec } from '@/state/archive';
import { useArchive } from '@/state/useArchive';

const p = spTable.pages;

export interface SpGames {
  /** Error only when the archive can't be read and nothing is in memory to show. */
  status: 'loading' | 'error' | 'ready';
  /** Newest first, conflict copies left out; the game on the table is its live copy. */
  recs: SpGameRec[];
  games: SpGame[];
  current: string | null;
}

/** The table-mode games on this device, read from the archive (the live game wins over its copy). */
export function useSpGames(): SpGames {
  const live = useSp().state.game;
  const [failed, setFailed] = useState(() => archive.lastError === 'unavailable');
  useEffect(() => archive.onError((e) => e === 'unavailable' && setFailed(true)), []);
  const { loaded, stored } = useArchive((a) => ({ loaded: a.loaded, stored: a.spGames() }));
  return useMemo(() => {
    const recs = stored
      .filter((r) => !r.conflictOf && r.game?.kind === 'spades')
      .map((r) =>
        live && r.syncId === live.syncId ? { ...r, game: live, updatedAt: live.updatedAt } : r,
      );
    const status = !loaded ? 'loading' : failed && !recs.length ? 'error' : 'ready';
    return { status, recs, games: recs.map((r) => r.game), current: live?.syncId ?? null };
  }, [stored, loaded, failed, live]);
}

/** One History row, whatever kind of game it was: table mode here, online games later through the same shape. */
export interface SpHistoryItem {
  id: string;
  kind: 'table' | 'online';
  /** When it ended, else when it last changed. */
  at: number;
  status: SpGame['status'];
  line: string;
  /** Seat order: seats 0 and 2 are team a. */
  players: SpGame['players'];
  hands: number;
  winner: TeamId | 'draw' | null;
}

const pair = (g: SpGame, t: TeamId) => {
  const [x, y] = seatsOf(t);
  return spTable.pair(g.players[x].name, g.players[y].name);
};

/** One line on how a game stands: who won, a draw, who leads, cancelled, or nothing scored. */
export function gameLine(g: SpGame): string {
  if (!hasDone(g)) return p.line.noHands;
  const t = gameTotals(g);
  const [a, b] = [t.a.score, t.b.score];
  const hi = Math.max(a, b),
    lo = Math.min(a, b);
  if (g.status === 'cancelled') return p.line.cancelled(a, b);
  if (g.status === 'finished' && g.result)
    return g.result.winner === 'draw'
      ? p.line.draw(a, b)
      : p.line.won(pair(g, g.result.winner), hi, lo);
  return a === b ? p.line.level(a) : p.line.leads(pair(g, a > b ? 'a' : 'b'), hi, lo);
}

export const fromTableGame = (r: SpGameRec): SpHistoryItem => ({
  id: r.syncId,
  kind: 'table',
  at: r.endedAt ?? r.updatedAt,
  status: r.game.status,
  line: gameLine(r.game),
  players: r.game.players,
  hands: r.game.hands.filter((h) => h.phase === 'done').length,
  winner: r.game.status === 'finished' ? (r.game.result?.winner ?? null) : null,
});
