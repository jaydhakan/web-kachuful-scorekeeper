import type { Game } from '@/domain';

export const CURRENT_SCHEMA = 1;

type Raw = Record<string, unknown>;
type Migration = (g: Raw) => Raw;

/** `migrations[n]` upgrades a version-n save to n + 1. Version 0 is the prototype's unversioned save. */
const migrations: Record<number, Migration> = {
  0: (g) => ({ ...g, schemaVersion: 1 }),
};

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

const isPlayer = (p: unknown) => isObj(p) && typeof p.id === 'string' && typeof p.name === 'string';
const isRound = (r: unknown) =>
  isObj(r) && isObj(r.bids) && isObj(r.results) && typeof r.index === 'number';

/** Enough structure that the UI can render it without throwing. */
export function isGameShape(g: unknown): g is Raw {
  return (
    isObj(g) &&
    Array.isArray(g.players) &&
    g.players.length >= 3 &&
    g.players.every(isPlayer) &&
    Array.isArray(g.rounds) &&
    g.rounds.length > 0 &&
    g.rounds.every(isRound) &&
    typeof g.maxCards === 'number' &&
    typeof g.firstDealerIndex === 'number' &&
    (g.direction === 'cw' || g.direction === 'ccw') &&
    (g.status === 'active' || g.status === 'finished') &&
    isObj(g.ui)
  );
}

/** Returns the current-version game, or null when the data is unreadable or from a newer app. */
export function migrateGame(raw: unknown): Game | null {
  if (!isGameShape(raw)) return null;
  const v = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (!Number.isInteger(v) || v < 0 || v > CURRENT_SCHEMA) return null;
  let g: Raw = raw;
  for (let n = v; n < CURRENT_SCHEMA; n++) g = migrations[n](g);
  return g as unknown as Game;
}
