/** The board's top three as medals at the table: Badshah, Wazir, Senapati (REWARDS-PLAN §6.7). */
import { avgOf, rankRows } from './leaderboard';
import { roundFacts } from './timeline';
import type { Game } from './types';

export type Medal = 1 | 2 | 3;

export interface Holder {
  medal: Medal;
  /** Last month's medal, held until three players qualify this month. */
  defending: boolean;
}

/** Medals by player id (the board's ids: `pidOf`). */
export type Medals = ReadonlyMap<string, Holder>;

export interface MedalRow {
  playerId: string;
  rank: number | null;
  qualified: boolean;
  value: number;
  points: number;
  rounds: number;
}

type Ranked = Pick<MedalRow, 'playerId' | 'rank' | 'qualified'>;

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

export type Tallies = ReadonlyMap<string, { points: number; rounds: number }>;

/** Each player's points and rounds from one game's rounds done in [from, to). */
export function gameTallies(g: Game, from: number, to: number): Tallies {
  const out = new Map<string, { points: number; rounds: number }>();
  for (const r of roundFacts(g)) {
    if (r.doneAt < from || r.doneAt >= to) continue;
    const t = out.get(r.playerId) ?? { points: 0, rounds: 0 };
    t.points += r.points;
    t.rounds++;
    out.set(r.playerId, t);
  }
  return out;
}

/** The standings if the game ended now: the board before it plus its rounds, ranked as the board ranks. */
export function project(base: readonly MedalRow[], add: Tallies, minRounds: number): MedalRow[] {
  const rows = new Map(base.map((r) => [r.playerId, { ...r }]));
  for (const [playerId, t] of add) {
    const r = rows.get(playerId) ?? {
      playerId,
      rank: null,
      qualified: false,
      value: 0,
      points: 0,
      rounds: 0,
    };
    r.points += t.points;
    r.rounds += t.rounds;
    rows.set(playerId, r);
  }
  for (const r of rows.values()) {
    if (!add.has(r.playerId)) continue;
    r.value = avgOf(r);
    r.qualified = r.rounds > minRounds;
  }
  return rankRows([...rows.values()]);
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
