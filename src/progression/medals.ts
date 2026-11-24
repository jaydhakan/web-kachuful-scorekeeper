/**
 * The month's top three as medals at the table (REWARDS-PLAN §6.7), Aaj ka Sitara and the Legend (§6.1), for every
 * game. Pure. Kachuful ranks its board on bid accuracy (its own `project`); the others on win rate (`projectWinRate`).
 */
import { rankWinRate } from './rules';
import type { WinRateRow } from './types';

export type Medal = 1 | 2 | 3;

export interface Holder {
  medal: Medal;
  /** Last month's medal, held until three players qualify this month. */
  defending: boolean;
}

/** Medals by player id (the board's ids: `pidOf`). */
export type Medals = ReadonlyMap<string, Holder>;

type Ranked = { playerId: string; rank: number | null; qualified: boolean };

const podium = (rows: readonly Ranked[]) =>
  rows.filter((r) => r.qualified && r.rank != null && r.rank <= 3);

/** This month's top three; until three players qualify, last month's keep theirs as "defending". */
export function medalsOf(now: readonly Ranked[], last: readonly Ranked[]): Medals {
  const enough = now.filter((r) => r.qualified && r.rank != null).length >= 3;
  const src = enough ? now : last;
  return new Map(
    podium(src).map((r) => [r.playerId, { medal: r.rank as Medal, defending: !enough }]),
  );
}

export interface MedalChase {
  /** Seated holders who would drop to a lower medal or none. */
  slipping: Set<string>;
  /** Seated players who would get a better medal than the one they hold. */
  onTrack: Map<string, Medal>;
}

const better = (a: Holder | undefined, b: Holder | undefined) => !!a && (!b || a.medal < b.medal);

/** Who is on track to take a medal, and whose is slipping, among the seated players. */
export function chaseOf(held: Medals, projected: Medals, seated: readonly string[]): MedalChase {
  const slipping = new Set<string>(),
    onTrack = new Map<string, Medal>();
  for (const id of seated) {
    const was = held.get(id),
      will = projected.get(id);
    if (was && !was.defending && better(was, will)) slipping.add(id);
    if (better(will, was) && !will!.defending) onTrack.set(id, will!.medal);
  }
  return { slipping, onTrack };
}

export interface MedalChange {
  playerId: string;
  from: Medal | null;
  to: Medal | null;
}

/** Every medal that moved, gold first. A "defending" medal becoming the same real one is not a change. */
export function medalChanges(before: Medals, after: Medals): MedalChange[] {
  const ids = new Set([...before.keys(), ...after.keys()]);
  const out: MedalChange[] = [];
  for (const playerId of ids) {
    const from = before.get(playerId)?.medal ?? null,
      to = after.get(playerId)?.medal ?? null;
    if (from !== to) out.push({ playerId, from, to });
  }
  const key = (c: MedalChange) => Math.min(c.to ?? 9, c.from ?? 9);
  return out.sort((a, b) => key(a) - key(b) || (a.playerId < b.playerId ? -1 : 1));
}

/** The new Badshah, if gold changed hands (a tie that adds a second Badshah counts). */
export const newBadshah = (changes: readonly MedalChange[]): MedalChange | null =>
  changes.find((c) => c.to === 1) ?? null;

/**
 * "Takht bacha liya": a Badshah who keeps gold and finishes above every other medallist at the table (at least one
 * sat). `place` is each seated player's final rank in the game.
 */
export function defended(
  held: Medals,
  after: Medals,
  place: ReadonlyMap<string, number>,
): string | null {
  for (const [id, h] of held) {
    if (h.medal !== 1 || after.get(id)?.medal !== 1 || !place.has(id)) continue;
    const rivals = [...held].filter(([o, x]) => o !== id && x.medal > 1 && place.has(o));
    if (rivals.length && rivals.every(([o]) => place.get(id)! < place.get(o)!)) return id;
  }
  return null;
}

/** The Legend: whoever holds the most closed seasons' titles, at least two (ties share). */
export function legendOf(champions: readonly (string | null)[]): string[] {
  const n = new Map<string, number>();
  for (const id of champions) if (id) n.set(id, (n.get(id) ?? 0) + 1);
  const best = Math.max(0, ...n.values());
  return best >= 2
    ? [...n]
        .filter(([, v]) => v === best)
        .map(([id]) => id)
        .sort()
    : [];
}

/** The month's win-rate standings if the game at the table ended now: each seated player plays one more game. */
export function projectWinRate(
  base: readonly WinRateRow[],
  add: ReadonlyMap<string, boolean>,
  minGames: number,
): WinRateRow[] {
  const rows = new Map(base.map((r) => [r.playerId, { ...r }]));
  for (const [playerId, won] of add) {
    const r = rows.get(playerId) ?? {
      playerId,
      rank: null,
      qualified: false,
      value: 0,
      games: 0,
      wins: 0,
    };
    r.games++;
    if (won) r.wins++;
    rows.set(playerId, r);
  }
  return rankWinRate([...rows.values()], minGames);
}

/** A win-rate game's day: games finished, and each player's wins and games. */
export interface WinDay {
  games: number;
  rows: ReadonlyMap<string, { wins: number; games: number }>;
}

/** The night needs this many games before it has a Sitara, so the only game of a day crowns nobody. */
export const SITARA_MIN_GAMES = 2;

/**
 * Aaj ka Sitara in a win-rate game (backend-requests §1): the most wins today, then the most games, among players
 * with 2+ games today and at least one win. Ties share it.
 */
export function sitaraByWins(day: WinDay): string[] {
  if (day.games < SITARA_MIN_GAMES) return [];
  const rows = [...day.rows].filter(([, r]) => r.games >= SITARA_MIN_GAMES && r.wins > 0);
  if (!rows.length) return [];
  const top = rows.reduce((a, b) =>
    b[1].wins > a[1].wins || (b[1].wins === a[1].wins && b[1].games > a[1].games) ? b : a,
  )[1];
  return rows
    .filter(([, r]) => r.wins === top.wins && r.games === top.games)
    .map(([id]) => id)
    .sort();
}

/** One more finished game on the day: each seated player's game and whether they won it. */
export function plusGame(day: WinDay, add: ReadonlyMap<string, boolean>): WinDay {
  if (!add.size) return day;
  const rows = new Map([...day.rows].map(([id, r]) => [id, { ...r }]));
  for (const [id, won] of add) {
    const r = rows.get(id) ?? { wins: 0, games: 0 };
    r.games++;
    if (won) r.wins++;
    rows.set(id, r);
  }
  return { games: day.games + 1, rows };
}
