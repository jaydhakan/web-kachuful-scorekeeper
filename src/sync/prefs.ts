import { KEYS, storage, type LastGroup } from '@/state/persistence';
import { cachedPrefs, fitsDecks, keepPrefs, sameSetup, setupOf } from '@/state/prefs';
import { syncUserTheme } from '@/state/theme';
import { ep } from './endpoints';
import type { Preferences } from './types';

const isPrefs = (p: unknown): p is Preferences =>
  !!p && typeof p === 'object' && 'updatedAt' in p && 'theme' in p && 'setup' in p;

/**
 * The account's preferences from an auth answer: cached, the player's theme reconciled, and this device's last group
 * sent when it is the newer setup. Missing (a backend without requests 2 and 3) changes nothing.
 */
export function takePrefs(p: unknown): void {
  if (!isPrefs(p)) return;
  keepPrefs(p);
  void syncUserTheme(p.theme);
  const lg = storage.get<LastGroup | null>(KEYS.lastGroup, null);
  if (lg && (p.updatedAt == null || (lg.at ?? 0) > p.updatedAt)) void sendSetup(lg);
}

/** Signed in, at idle and on return to the app: `/auth/me` is the only answer carrying preferences. Never throws. */
export async function refreshPrefs(): Promise<void> {
  try {
    takePrefs((await ep.me()).preferences);
  } catch {
    /* offline or signed out: the cached copy stands */
  }
}

/**
 * This device's last group as the account's setup. Not sent when the server already
 * has it, since every PATCH moves `updatedAt`. A failure is retried by `takePrefs`, as the group is then newer.
 */
export async function sendSetup(lg: LastGroup): Promise<void> {
  const setup = setupOf(lg);
  const known = cachedPrefs()?.setup;
  if (!fitsDecks(setup) || (known && sameSetup(known, setup))) return;
  try {
    keepPrefs(await ep.setPrefs({ setup }));
  } catch {
    /* kept on this device */
  }
}
