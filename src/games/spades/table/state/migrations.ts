import type { SpGame } from '@/games/spades/domain/types';

export const CURRENT_SCHEMA = 1;

type Raw = Record<string, unknown>;
export type Migration = (g: Raw) => Raw;

/**
 * `migrations[n]` upgrades a version-n save to n + 1; empty until the saved shape first changes. A new one looks
 * like `1: (g) => ({ ...g, newField: 'default', schemaVersion: 2 })`, with CURRENT_SCHEMA raised to match.
 */
export const migrations: Record<number, Migration> = {};

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPlayer = (p: unknown) => isObj(p) && typeof p.id === 'string' && typeof p.name === 'string';
const four = (a: unknown) => Array.isArray(a) && a.length === 4;
const isHand = (h: unknown) =>
  isObj(h) &&
  typeof h.index === 'number' &&
  typeof h.dealer === 'number' &&
  typeof h.phase === 'string' &&
  four(h.bids) &&
  four(h.blind) &&
  four(h.nilTricks) &&
  (h.teamTricks === null || (Array.isArray(h.teamTricks) && h.teamTricks.length === 2));

/** Enough structure that the screens can render it without throwing. */
export function isSpShape(g: unknown): g is Raw {
  return (
    isObj(g) &&
    g.kind === 'spades' &&
    typeof g.id === 'string' &&
    typeof g.syncId === 'string' &&
    typeof g.rev === 'number' &&
    typeof g.createdAt === 'number' &&
    typeof g.updatedAt === 'number' &&
    four(g.players) &&
    (g.players as unknown[]).every(isPlayer) &&
    isObj(g.rules) &&
    typeof g.rules.nil === 'boolean' &&
    Array.isArray(g.hands) &&
    g.hands.every(isHand) &&
    typeof g.firstDealerIndex === 'number' &&
    (g.direction === 'cw' || g.direction === 'ccw') &&
    (g.status === 'active' || g.status === 'finished' || g.status === 'cancelled')
  );
}

/** Upgrades a save through `table`; exported with the table as a parameter so the chain is testable before v2. */
export function migrateWith(
  raw: unknown,
  table: Record<number, Migration>,
  current: number,
): Raw | null {
  // Every Spades save carries its version: there was never an unversioned one.
  if (!isSpShape(raw) || typeof raw.schemaVersion !== 'number') return null;
  const v = raw.schemaVersion;
  if (!Number.isInteger(v) || v < 1 || v > current) return null;
  let g: Raw = raw;
  for (let n = v; n < current; n++) {
    const step = table[n];
    if (!step) return null;
    g = step(g);
  }
  return isSpShape(g) ? g : null;
}

/** The current-version game, or null when the data is unreadable or from a newer app. */
export const migrateSpGame = (raw: unknown): SpGame | null =>
  migrateWith(raw, migrations, CURRENT_SCHEMA) as SpGame | null;
