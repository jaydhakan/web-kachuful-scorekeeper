import { useEffect, useMemo, useState } from 'react';
import type { KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { archive, type KtGameRec } from '@/state/archive';
import { useArchive } from '@/state/useArchive';

export interface KtGames {
  /** Error only when the archive can't be read and nothing is in memory to show. */
  status: 'loading' | 'error' | 'ready';
  /** Newest first; the game on the table is its live copy. */
  recs: KtGameRec[];
  games: KtGame[];
  /** The sync id of the game on the table, if any. */
  current: string | null;
}

/**
 * The games every hub page reads: this device's archive. Signed-in boards (phase K8) return the same shape from the
 * server, so the pages don't change.
 */
export function useKtGames(): KtGames {
  const live = useKt().state.game;
  const [failed, setFailed] = useState(() => archive.lastError === 'unavailable');
  useEffect(() => archive.onError((e) => e === 'unavailable' && setFailed(true)), []);
  const { loaded, stored } = useArchive((a) => ({ loaded: a.loaded, stored: a.ktGames() }));
  return useMemo(() => {
    // The archive copy trails the table by one save; the live game is the truth.
    const recs = stored.map((r) =>
      live && r.syncId === live.syncId ? { ...r, game: live, updatedAt: live.updatedAt } : r,
    );
    const status = !loaded ? 'loading' : failed && !recs.length ? 'error' : 'ready';
    return { status, recs, games: recs.map((r) => r.game), current: live?.syncId ?? null };
  }, [stored, loaded, failed, live]);
}
