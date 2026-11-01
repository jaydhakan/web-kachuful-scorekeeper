import type { Game } from '@/domain';
import { archive, type GameRec } from '@/state/archive';

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
