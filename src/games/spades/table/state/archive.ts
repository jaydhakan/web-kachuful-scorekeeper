import type { SpGame } from '@/games/spades/domain/types';
import { archive, type SpGameRec } from '@/state/archive';

/** Outbox ids: Spades' own, so no other game's engine ever sends them. */
export const spPutId = (syncId: string) => 'spput:' + syncId;
export const spDelId = (syncId: string) => 'spdel:' + syncId;

const hasDone = (g: SpGame) => g.hands.some((h) => h.phase === 'done');

/** When a table-mode game ended (finished or cancelled); null while it can still be played. */
export const spEndedAt = (g: SpGame): number | null =>
  g.status === 'active' ? null : (g.finishedAt ?? g.updatedAt);

/** The scorekeeper's archive copy, by Kaali Teeri's rule: a game with no hand scored is not kept. */
export function archiveSpGame(g: SpGame, rec: Partial<SpGameRec> = {}) {
  if (!hasDone(g)) return;
  const prev = archive.get('spGames', g.syncId);
  if (prev && prev.game.rev === g.rev && prev.game.updatedAt === g.updatedAt && !rec.deleted)
    return;
  archive.put('spGames', {
    ...prev,
    origin: prev?.origin ?? 'local',
    ...rec,
    syncId: g.syncId,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: spEndedAt(g),
  });
}

/**
 * A game undone back to no hand scored leaves no trace: a copy the server has is deleted there through the outbox.
 * True when the server had it, so its id can't be used again.
 */
export function forgetEmptySp(syncId: string): boolean {
  const r = archive.get('spGames', syncId);
  if (!r || r.deleted) return false;
  const onServer = !!r.account && r.syncedRev !== undefined;
  archive.del('outbox', spPutId(syncId));
  if (!onServer) {
    archive.del('spGames', syncId);
    return false;
  }
  archive.put('spGames', { ...r, deleted: true, updatedAt: Date.now() });
  archive.put('outbox', {
    id: spDelId(syncId),
    kind: 'deleteSpGame',
    key: syncId,
    attempts: 0,
    nextAt: 0,
    createdAt: Date.now(),
  });
  return true;
}
