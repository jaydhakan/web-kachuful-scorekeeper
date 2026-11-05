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
  KEYS.achSeen,
] as const;

/**
 * Deletes everything saved on this device (games, players, setup defaults), and when signed in the account's games
 * and the players it added on the server first, so a failed call leaves everything as it was. Players that other
 * people's games still use stay on the server and come back on the next sync.
 */
export async function startFresh(signedIn: boolean) {
  if (signedIn) await ep.deleteMyData();
  archive.clear('games', 'players', 'outbox', 'cache', 'inbox');
  FRESH_KEYS.forEach((k) => storage.remove(k));
  await archive.flush();
}
