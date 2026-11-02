import { playerCounts, type Decks, type Direction } from '@/domain';
import type { Preferences, SetupPrefs } from '@/sync/types';
import { archive } from './archive';
import type { LastGroup } from './persistence';

/**
 * The account's preferences as last seen from the server (theme and setup), kept in the
 * archive's cache so signing out forgets them. Reading needs no network; `src/sync/prefs.ts` writes them.
 */
export const PREFS_KEY = 'prefs';

export const cachedPrefs = (): Preferences | null =>
  (archive.get('cache', PREFS_KEY)?.value as Preferences | undefined) ?? null;

export const keepPrefs = (p: Preferences) =>
  archive.put('cache', { key: PREFS_KEY, value: p, etag: null, fetchedAt: Date.now() });

export const fitsDecks = (s: SetupPrefs | null | undefined): s is SetupPrefs =>
  !!s &&
  (s.decks === 1 || s.decks === 2) &&
  (s.direction === 'cw' || s.direction === 'ccw') &&
  playerCounts(s.decks).includes(s.playerCount);

export const setupOf = (lg: LastGroup): SetupPrefs => ({
  playerCount: lg.names.length,
  decks: lg.decks ?? 1,
  direction: lg.direction || 'cw',
});

export const sameSetup = (a: SetupPrefs, b: SetupPrefs) =>
  a.playerCount === b.playerCount && a.decks === b.decks && a.direction === b.direction;

/**
 * What Setup step 1 starts with: the account's setup when it is newer than this device's last group and differs
 * from it. `updatedAt` also moves when only the theme changed, hence the "differs". Otherwise nothing, as before.
 */
export function setupDefaults(
  lg: LastGroup | null,
  p: Preferences | null,
): { n: number; decks: Decks; dir: Direction } | null {
  if (!p || p.updatedAt == null || !fitsDecks(p.setup)) return null;
  if (lg && ((lg.at ?? 0) >= p.updatedAt || sameSetup(setupOf(lg), p.setup))) return null;
  return { n: p.setup.playerCount, decks: p.setup.decks, dir: p.setup.direction };
}
