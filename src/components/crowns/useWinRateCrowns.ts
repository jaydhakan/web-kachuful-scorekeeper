import { useMemo } from 'react';
import type { PlayerGameFact } from '@/progression/types';
import { archive } from '@/state/archive';
import { useArchiveVersion } from '@/state/useArchive';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import type { GameId } from '@/platform/route';
import { NO_CROWNS, type TableCrowns } from './table';
import {
  factsBase,
  serverBase,
  winRateCrowns,
  type CrownSeat,
  type Standing,
  type WinRateBase,
} from './winRate';

export interface WinRateCrownsOpts {
  game: Exclude<GameId, 'kachuful'>;
  /** The game at the table (its sync or server id), left out of the board; null: no game, nothing to show. */
  gameId: string | null;
  signedIn: boolean;
  /** Signed out, this device's finished games of this kind without the one at the table; null: none (online only). */
  device: (() => readonly PlayerGameFact[]) | null;
  minGames: number;
  /** Memoise both: a new array or standing each render rebuilds the crowns. */
  seats: readonly CrownSeat[];
  standing: Standing | null;
}

const byName = (id: string) => archive.get('players', id)?.displayName ?? '';

/**
 * The table's medals, Sitara and Legend for a win-rate game: the server's board signed in, this device's signed out.
 * The board before this game changes only with the archive or the server's answer, never with this game's hands.
 */
export function useWinRateCrowns(o: WinRateCrownsOpts): TableCrowns {
  const { game, gameId, signedIn, device, minGames, seats, standing } = o;
  const online = signedIn && !!gameId;
  const v = useArchiveVersion();
  const medals = useRemote(online ? `${game}:medals:${gameId}` : null, (c) =>
    ep.gameMedals(game, gameId!, c),
  );
  // The same cache key as the Awards page, so a season list it already fetched counts here.
  const titles = useRemote(online ? `${game}:seasons` : null, (c) => ep.seasons(c, game));
  const placed = useRemote(online ? `${game}:places:${gameId}` : null, (c) =>
    ep.places(gameId!, c, game),
  );
  const base = useMemo<WinRateBase | null>(() => {
    if (!gameId) return null;
    if (signedIn) return medals.data ? serverBase(medals.data, titles.data, placed.data) : null;
    return device ? factsBase(device(), minGames) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the base is the board before this game
  }, [gameId, signedIn, medals.data, titles.data, placed.data, v, minGames]);
  const names = useMemo(() => {
    const d = medals.data;
    const m = new Map<string, string>();
    for (const r of d ? [...d.standings, ...d.lastSeason] : [])
      m.set(r.player.id, r.player.displayName);
    return m;
  }, [medals.data]);
  return useMemo(
    () =>
      base ? winRateCrowns(base, seats, standing, (id) => names.get(id) ?? byName(id)) : NO_CROWNS,
    [base, seats, standing, names],
  );
}
