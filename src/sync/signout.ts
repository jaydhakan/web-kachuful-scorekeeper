import { archive } from '@/state/archive';
import { ep } from './endpoints';
import { clearSeatInvites } from './seatInvites';
import { getSession } from './session';

/**
 * Games of this account, in every game that syncs, with changes the server hasn't accepted yet: what signing out
 * with "Remove from this device" would put at risk. A refused upload (blocked) waits in the inbox instead.
 */
export function pendingUploads(userId = getSession()?.user.id): number {
  if (!userId) return 0;
  const blocked = new Set(
    archive
      .all('outbox')
      .filter((o) => o.blocked)
      .map((o) => o.key),
  );
  return [...archive.games(), ...archive.ktGames()].filter(
    (r) =>
      r.account === userId &&
      !r.conflictOf &&
      r.game.id !== 'demo' &&
      r.syncedRev !== r.game.rev &&
      !blocked.has(r.syncId),
  ).length;
}

/**
 * Ends the session on the server (best effort when offline) and forgets server data on this device. `remove` also
 * drops the games the server has (pulled ones, and ones scored here that are fully synced); a game the server
 * doesn't have yet always stays.
 */
export async function signOutDevice(remove: boolean) {
  await ep.logout().catch(() => {});
  clearSeatInvites();
  archive.clear('outbox', 'cache', 'inbox');
  const serverPlayers = archive
    .all('players')
    .filter((p) => !p.local)
    .map((p) => p.id);
  if (remove) {
    const remote = archive
      .all('games')
      .filter((g) => g.origin === 'remote' || g.syncedRev === g.game.rev)
      .map((g) => g.syncId);
    archive.del('games', ...remote);
    const ktRemote = archive
      .all('ktGames')
      .filter((g) => g.origin === 'remote' || g.syncedRev === g.game.rev)
      .map((g) => g.syncId);
    archive.del('ktGames', ...ktRemote);
    // Ishaara runs on the server, so every copy here is the server's.
    archive.clear('ishaaraGames');
  }
  // Server players used by games kept here become this device's own again.
  archive.put(
    'players',
    ...archive
      .all('players')
      .filter((p) => serverPlayers.includes(p.id) && !p.mergedInto)
      .map((p) => ({ ...p, local: true })),
  );
}
