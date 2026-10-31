import { archive } from '@/state/archive';
import { ep } from './endpoints';

/** Uploads not yet accepted by the server. */
export const pendingUploads = () =>
  archive.all('outbox').filter((o) => o.kind === 'putGame').length;

/**
 * Ends the session on the server (best effort when offline) and forgets server data on this device. `remove` also
 * drops the games the server has (pulled ones, and ones scored here that are fully synced); a game the server
 * doesn't have yet always stays.
 */
export async function signOutDevice(remove: boolean) {
  await ep.logout().catch(() => {});
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
