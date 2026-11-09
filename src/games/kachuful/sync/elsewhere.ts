import { curRound, type Game } from '@/games/kachuful/domain';
import { archive, type GameRec } from '@/state/archive';
import type { GameSummary } from '@/sync/types';

/**
 * An unfinished game of this account last touched on another device, newer than the one here. Kept out of the
 * engine so Home can ask without downloading it.
 */
export function continueElsewhere(current: Game, me: string | undefined): GameRec | null {
  if (!me) return null;
  return (
    archive
      .games()
      .filter(
        (r) =>
          r.origin === 'remote' &&
          r.account === me &&
          r.endedAt == null &&
          r.game.status === 'active' &&
          r.syncId !== current.syncId &&
          r.updatedAt > (current.id === 'demo' ? 0 : current.updatedAt),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
  );
}

/** The server's newest unfinished game of this account (`null`: none); `unknown` until it answers or if it can't. */
export type ServerActive = GameSummary | null | 'unknown' | 'offline';

export interface Elsewhere {
  round: number;
  rec: GameRec | null;
  /** Set when the server named the game; this device's copy may be missing or behind. */
  sum: GameSummary | null;
}

/**
 * What Home's Continue card offers: nothing offline; the server's game when it is
 * newer than the one here; this device's synced copies when the server can't say. The game here always stays first.
 */
export function resumeElsewhere(
  current: Game,
  me: string | undefined,
  server: ServerActive,
): Elsewhere | null {
  if (!me || server === 'offline') return null;
  if (server === 'unknown') {
    const rec = continueElsewhere(current, me);
    return rec && { round: curRound(rec.game).index + 1, rec, sum: null };
  }
  if (!server || server.id === current.syncId) return null;
  if (server.updatedAt <= (current.id === 'demo' ? 0 : current.updatedAt)) return null;
  const rec = archive.get('games', server.id);
  return { round: server.rounds + 1, rec: rec && !rec.deleted ? rec : null, sum: server };
}
