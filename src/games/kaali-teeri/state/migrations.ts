import type { KtGame } from '@/games/kaali-teeri/domain';

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
const isCard = (c: unknown) => isObj(c) && typeof c.rank === 'string' && typeof c.suit === 'string';
const isHand = (h: unknown) =>
  isObj(h) &&
  typeof h.index === 'number' &&
  typeof h.dealerIndex === 'number' &&
  typeof h.phase === 'string' &&
  typeof h.mode === 'string' &&
  Array.isArray(h.calls) &&
  Array.isArray(h.called) &&
  h.called.every(isCard) &&
  Array.isArray(h.playedBy) &&
  h.playedBy.length === h.called.length;

/** Enough structure that the screens can render it without throwing. */
export function isKtShape(g: unknown): g is Raw {
  return (
    isObj(g) &&
    g.kind === 'kaali-teeri' &&
    typeof g.id === 'string' &&
    typeof g.syncId === 'string' &&
    Array.isArray(g.players) &&
    g.players.length >= 4 &&
    g.players.every(isPlayer) &&
    isObj(g.rules) &&
    typeof g.rules.minBid === 'number' &&
    (g.rules.decks === 1 || g.rules.decks === 2) &&
    Array.isArray(g.hands) &&
    g.hands.length > 0 &&
    g.hands.every(isHand) &&
    typeof g.firstDealerIndex === 'number' &&
    (g.direction === 'cw' || g.direction === 'ccw') &&
    (g.status === 'active' || g.status === 'finished') &&
    isObj(g.ui)
  );
}

/** Upgrades a save through `table`; exported with the table as a parameter so the chain is testable before v2. */
export function migrateWith(
  raw: unknown,
  table: Record<number, Migration>,
  current: number,
): Raw | null {
  // Every Kaali Teeri save carries its version: there was never an unversioned one.
  if (!isKtShape(raw) || typeof raw.schemaVersion !== 'number') return null;
  const v = raw.schemaVersion;
  if (!Number.isInteger(v) || v < 1 || v > current) return null;
  let g: Raw = raw;
  for (let n = v; n < current; n++) {
    const step = table[n];
    if (!step) return null;
    g = step(g);
  }
  return isKtShape(g) ? g : null;
}

/** The current-version game, or null when the data is unreadable or from a newer app. */
export const migrateKtGame = (raw: unknown): KtGame | null =>
  migrateWith(raw, migrations, CURRENT_SCHEMA) as KtGame | null;
