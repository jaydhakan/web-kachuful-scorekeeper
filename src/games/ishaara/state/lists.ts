import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { wordsLeft, type IshaaraPublic, type IshaaraSort } from '@/games/ishaara/domain';
import { ishEp } from '@/games/ishaara/sync/endpoints';
import type {
  IshaaraLeaderboardOut,
  IshaaraPeriod,
  IshaaraPlayerStatsOut,
  IshaaraSummaryOut,
  IshaaraVsOut,
} from '@/games/ishaara/sync/types';
import { archive, archiveIshaaraGame, type IshaaraGameRec } from '@/state/archive';
import { ApiError } from '@/sync/api';
import { signedInAs, useSession } from '@/sync/session';
import { useRemote, type Remote } from '@/sync/useRemote';

const useUserId = () => signedInAs(useSession())?.user.id ?? null;

/** A clue-giver's active games ("Your games"), cache first; refreshed on reload and on coming back online. */
export function useYourGames(): Remote<IshaaraSummaryOut[]> {
  const uid = useUserId();
  return useRemote(uid && `ish:yours:${uid}`, (o) =>
    ishEp.games({ role: 'clue-giver', status: 'active' }, o).then((p) => p.items),
  );
}

/** A finished game kept on this device, shaped like the server's summary so History draws both alike. */
export function summaryOfCached(r: IshaaraGameRec, myPlayerId: string | null): IshaaraSummaryOut {
  const g = r.game;
  const mine = g.players.find((p) => p.playerId === myPlayerId && p.role === 'clue-giver');
  return {
    id: g.id,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    finishedAt: g.finishedAt ?? null,
    status: g.status,
    turn: g.turn,
    starting: g.starting,
    winner: g.winner,
    endedBy: g.endedBy,
    match: g.match,
    wordsLeft: { sun: wordsLeft(g, 'sun'), moon: wordsLeft(g, 'moon') },
    revealed: g.revealed.filter((x) => x !== null).length,
    host: { name: r.hostName ?? '' },
    players: g.players.map((p) => ({
      playerId: p.playerId ?? '',
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      team: p.team,
      role: p.role,
    })),
    myTeam: mine?.team ?? null,
  };
}

export interface IshaaraHistory {
  items: IshaaraSummaryOut[];
  loading: boolean;
  error: ApiError | null;
  /** Showing the finished games kept on this device, because the server couldn't be reached. */
  offline: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  more(): void;
  reload(): void;
}

/**
 * History: the server's list of games this account hosted or sat in (first page cache first, then `more()` pages
 * on); offline, or signed out, the finished games kept on this device.
 */
export function useIshaaraHistory(status?: 'active' | 'finished'): IshaaraHistory {
  const session = signedInAs(useSession());
  const uid = session?.user.id ?? null;
  const first = useRemote(uid && `ish:history:${uid}:${status ?? 'all'}`, (o) =>
    ishEp.games({ status }, o),
  );
  const [extra, setExtra] = useState<{ items: IshaaraSummaryOut[]; cursor: string | null }>({
    items: [],
    cursor: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<ApiError | null>(null);
  useEffect(() => setExtra({ items: [], cursor: null }), [first.data]);
  useSyncExternalStore(archive.subscribe, archive.getVersion);

  const cursor = extra.items.length ? extra.cursor : (first.data?.nextCursor ?? null);
  const more = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    ishEp
      .games({ status, cursor })
      .then((p) => {
        setExtra((x) => ({ items: [...x.items, ...p.items], cursor: p.nextCursor }));
        setMoreError(null);
      })
      .catch((e: unknown) => setMoreError(e instanceof ApiError ? e : new ApiError(0, 'offline')))
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, status]);

  const useCache = !uid || (!first.data && (first.offline || !!first.error));
  // Only finished games are kept, so there is nothing to show offline for active ones.
  const cached =
    useCache && status !== 'active'
      ? archive.ishaaraGames().map((r) => summaryOfCached(r, session?.user.playerId ?? null))
      : [];
  return {
    items: useCache ? cached : [...(first.data?.items ?? []), ...extra.items],
    loading: first.loading && !first.data,
    error: moreError ?? first.error,
    offline: useCache && !!uid,
    hasMore: !useCache && !!cursor,
    loadingMore,
    more,
    reload: first.reload,
  };
}

export interface FinishedGame {
  game: IshaaraPublic | null;
  /** This account hosted the game (the server's `me.host`); null when the device's copy never learnt it. */
  host: boolean | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * One game for History's detail: the copy kept on this device when it has one (finished games never change),
 * otherwise the server's, kept once finished.
 */
export function useIshaaraGame(id: string | null): FinishedGame {
  const kept = id ? archive.get('ishaaraGames', id) : undefined;
  const [s, setS] = useState<FinishedGame>({ game: null, host: null, loading: false, error: null });
  useEffect(() => {
    if (!id || archive.get('ishaaraGames', id)) return;
    let live = true;
    setS({ game: null, host: null, loading: true, error: null });
    ishEp.game(id).then(
      (r) => {
        if (!live) return;
        archiveIshaaraGame(r.game, undefined, r.me.host);
        setS({ game: r.game, host: r.me.host, loading: false, error: null });
      },
      (e: unknown) =>
        live &&
        setS({
          game: null,
          host: null,
          loading: false,
          error: e instanceof ApiError ? e : new ApiError(0, 'offline'),
        }),
    );
    return () => void (live = false);
  }, [id]);
  return kept ? { game: kept.game, host: kept.host ?? null, loading: false, error: null } : s;
}

/** Deletes a game (host or admin) and forgets this device's copy. */
export async function deleteIshaaraGame(id: string) {
  await ishEp.deleteGame(id);
  archive.del('ishaaraGames', id);
}

export const useIshaaraLeaderboard = (period: IshaaraPeriod, sort: IshaaraSort) =>
  useRemote<IshaaraLeaderboardOut>(useUserId() && `ish:lb:${period}:${sort}`, (o) =>
    ishEp.leaderboard(period, sort, o),
  );

export const useIshaaraPlayerStats = (playerId: string | null) =>
  useRemote<IshaaraPlayerStatsOut>(useUserId() && playerId && `ish:stats:${playerId}`, (o) =>
    ishEp.playerStats(playerId!, o),
  );

export const useIshaaraHeadToHead = (a: string | null, b: string | null) =>
  useRemote<IshaaraVsOut>(useUserId() && a && b && a !== b ? `ish:vs:${a}:${b}` : null, (o) =>
    ishEp.vs(a!, b!, o),
  );
