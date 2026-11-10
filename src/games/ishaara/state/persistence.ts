import type { IshaaraPublic, IshaaraRules, Seated } from '@/games/ishaara/domain/types';
import { archive } from '@/state/archive';
import { KEYS, storage } from '@/state/persistence';

/** Ishaara's saved data, through persistence.ts's `storage` and the shared archive (no game of record: the server runs it). */

/** The last Ishaara setup on this device: seats with teams and clue-givers, packs, custom words and rules. */
export interface IshaaraLastSetup {
  players: Seated[];
  packs: string[];
  customWords: string[];
  rules: IshaaraRules;
  at: number;
}

const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

export function loadIshLastSetup(): IshaaraLastSetup | null {
  const v = storage.get<Partial<IshaaraLastSetup> | null>(KEYS.ishLastSetup, null);
  if (!v || typeof v !== 'object' || !Array.isArray(v.players) || !v.rules) return null;
  const players = v.players.filter(
    (p): p is Seated =>
      !!p &&
      typeof p.name === 'string' &&
      (p.team === 'sun' || p.team === 'moon') &&
      (p.role === 'clue-giver' || p.role === 'guesser'),
  );
  return {
    players,
    packs: isStrings(v.packs) ? v.packs : [],
    customWords: isStrings(v.customWords) ? v.customWords : [],
    rules: v.rules,
    at: typeof v.at === 'number' ? v.at : 0,
  };
}

export const saveIshLastSetup = (s: IshaaraLastSetup) => storage.set(KEYS.ishLastSetup, s);

/** How many recently dealt words are remembered, so the next deal can avoid them. */
export const RECENT_WORDS_MAX = 200;

/** Words dealt lately, newest first. */
export function loadRecentWords(): string[] {
  const v = storage.get<unknown>(KEYS.ishRecentWords, []);
  return isStrings(v) ? v : [];
}

export function pushRecentWords(words: readonly string[]) {
  const keys = new Set(words.map((w) => w.toLowerCase()));
  const kept = loadRecentWords().filter((w) => !keys.has(w.toLowerCase()));
  return storage.set(KEYS.ishRecentWords, [...words, ...kept].slice(0, RECENT_WORDS_MAX));
}

/** Keeps a finished Ishaara game for History offline; an unfinished one is never stored (its state is live). */
export function archiveIshaaraGame(g: IshaaraPublic, hostName?: string | null, host?: boolean) {
  if (g.status !== 'finished' || !g.solution) return;
  const prev = archive.get('ishaaraGames', g.id);
  if (
    prev &&
    prev.game.rev === g.rev &&
    (hostName === undefined || prev.hostName === hostName) &&
    (host === undefined || prev.host === host)
  )
    return;
  archive.put('ishaaraGames', {
    syncId: g.id,
    game: g,
    updatedAt: g.updatedAt,
    endedAt: g.finishedAt ?? g.updatedAt,
    hostName: hostName ?? prev?.hostName ?? null,
    host: host ?? prev?.host,
  });
}
