/** The board's top three as medals at the table: Badshah, Wazir, Senapati (REWARDS-PLAN §6.7). */
import { accuracyOf, rankRows } from './leaderboard';
import { roundFacts } from './timeline';
import { standings } from './standings';
import type { Game } from './types';

export {
  chaseOf,
  defended,
  medalChanges,
  medalsOf,
  newBadshah,
  type Holder,
  type Medal,
  type MedalChange,
  type MedalChase,
  type Medals,
} from '../../../progression/medals';

/** A row of the month's board, ranked on bid accuracy (`value`). */
export interface MedalRow {
  playerId: string;
  rank: number | null;
  qualified: boolean;
  value: number;
  accuracy: number;
  points: number;
  rounds: number;
}

export type Tallies = ReadonlyMap<string, { points: number; rounds: number; made: number }>;

/** Each player's points, rounds and bids made from one game's rounds done in [from, to). */
export function gameTallies(g: Game, from: number, to: number): Tallies {
  const out = new Map<string, { points: number; rounds: number; made: number }>();
  for (const r of roundFacts(g)) {
    if (r.doneAt < from || r.doneAt >= to) continue;
    const t = out.get(r.playerId) ?? { points: 0, rounds: 0, made: 0 };
    t.points += r.points;
    t.rounds++;
    if (r.outcome === 'made') t.made++;
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
      accuracy: 0,
      points: 0,
      rounds: 0,
    };
    // The board sends a share, not a count; made bids are a whole number, so rounding recovers it exactly.
    const made = Math.round(r.accuracy * r.rounds) + t.made;
    r.points += t.points;
    r.rounds += t.rounds;
    r.accuracy = accuracyOf({ made, rounds: r.rounds });
    rows.set(playerId, r);
  }
  for (const r of rows.values()) {
    if (!add.has(r.playerId)) continue;
    r.value = r.accuracy;
    r.qualified = r.rounds > minRounds;
  }
  return rankRows([...rows.values()], 'accuracy');
}

/** Each seat's rank in the game as it stands (`Player.id` → rank; ties share). */
export const finalPlaces = (g: Game): Map<string, number> =>
  new Map(standings(g).map((x) => [x.p.id, x.rank]));
