import { archive } from '@/state/archive';
import { KEYS, storage } from '@/state/persistence';
import { ep } from './endpoints';

/** What a game in progress, setup defaults and undo keep in this browser; the device id and theme stay. */
const FRESH_KEYS = [
  KEYS.game,
  KEYS.lastGroup,
  KEYS.recentNames,
  KEYS.undo,
  KEYS.screen,
  KEYS.backup,
] as const;

/**
 * Deletes the games and saved players on this device, and when signed in the account's games on the server first,
 * so a failed call leaves everything as it was. Signed in, the registry is the server's and comes back on the next sync.
 */
export async function startFresh(signedIn: boolean) {
  if (signedIn) await ep.deleteMyGames();
  archive.clear('games', 'outbox', 'cache', 'inbox', ...(signedIn ? [] : (['players'] as const)));
  FRESH_KEYS.forEach((k) => storage.remove(k));
  await archive.flush();
}
