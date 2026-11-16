import { useEffect, useMemo, useState } from 'react';
import { gameTotals, seatsOf, type SpGame, type TeamId } from '@/games/spades/domain';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { hasDone } from '@/games/spades/table/state/select';
import { archive, type SpGameRec } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { signedInAs, useSession } from '@/sync/session';
import { spEp } from '@/games/spades/online/sync/endpoints';
import type { SpTableSummary } from '@/games/spades/online/sync/types';

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

const seatName = (t: SpTableSummary, x: number) => t.seats[x]?.name ?? '';
const onlinePair = (t: SpTableSummary, team: TeamId) => {
  const [x, y] = seatsOf(team);
  return spTable.pair(seatName(t, x), seatName(t, y));
};

/** A finished or cancelled online table as a History row, read from the server's summary. */
export function fromOnlineTable(t: SpTableSummary): SpHistoryItem {
  const { a, b } = t.scores;
  const hi = Math.max(a, b),
    lo = Math.min(a, b);
  const status: SpGame['status'] = t.status === 'cancelled' ? 'cancelled' : 'finished';
  const line = !t.hands
    ? p.line.noHands
    : status === 'cancelled'
      ? p.line.cancelled(a, b)
      : !t.result || t.result.winner === 'draw'
        ? p.line.draw(a, b)
        : p.line.won(onlinePair(t, t.result.winner), hi, lo);
  return {
    id: t.id,
    kind: 'online',
    at: t.finishedAt ?? t.updatedAt,
    status,
    line,
    players: t.seats.map((x, i) =>
      x
        ? { id: x.playerId, playerId: x.playerId, name: x.name, emoji: x.emoji, color: x.color }
        : { id: `empty-${i}`, name: '', emoji: '', color: '' },
    ),
    hands: t.hands,
    winner: status === 'finished' ? (t.result?.winner ?? null) : null,
  };
}

export interface SpOnlineHistory {
  status: 'off' | 'loading' | 'error' | 'ready';
  items: SpHistoryItem[];
  retry: () => void;
}

/** Signed in, this account's finished online tables (the newest page); signed out, none. */
export function useOnlineHistory(): SpOnlineHistory {
  const signedIn = !!signedInAs(useSession());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<SpOnlineHistory, 'retry'>>({
    status: signedIn ? 'loading' : 'off',
    items: [],
  });
  useEffect(() => {
    if (!signedIn) return setState({ status: 'off', items: [] });
    let on = true;
    setState((s) => ({ ...s, status: 'loading' }));
    spEp.tables('finished').then(
      (r) => on && setState({ status: 'ready', items: r.items.map(fromOnlineTable) }),
      () => on && setState((s) => ({ ...s, status: 'error' })),
    );
    return () => {
      on = false;
    };
  }, [signedIn, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
