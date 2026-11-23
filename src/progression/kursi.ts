/**
 * The Kursi (REWARDS-PLAN §6.3): one chair per game. Finish above whoever holds it in a game you both played and it
 * is yours; every game the holder survives is a defence. Pure and game-agnostic: the server runs the same steps.
 */
import type { PlacedGame } from './places';

/** One finished game as the Kursi sees it. */
export interface KursiGame extends PlacedGame {
  /** A team game: the winning side takes the chair together. */
  teams?: boolean;
}

export interface Kursi {
  /** One holder, or a side that took it together: they keep it while their best-placed holder at the table is unbeaten. */
  holders: string[];
  since: number;
  sinceGame: string;
  defences: number;
}

export interface Reign extends Kursi {
  /** When it was taken from them; null while it is theirs. */
  until: number | null;
}

export type KursiEvent =
  | { kind: 'first'; to: string[] }
  | { kind: 'taken'; from: string[]; to: string[] }
  | { kind: 'defended'; defences: number }
  | { kind: 'kept' };

/** A game counts with three or more at the table: two friends can't trade it between them. */
export const KURSI_MIN_TABLE = 3;

/** Who takes the chair from a set of placed seats: the best place; one seat (the earliest) unless it's a team game. */
function takers(seats: KursiGame['seats'], teams: boolean): string[] {
  if (!seats.length) return [];
  const best = Math.min(...seats.map((s) => s.place));
  const top = seats.filter((s) => s.place === best).sort((a, b) => a.seat - b.seat);
  return (teams ? top : top.slice(0, 1)).map((s) => s.playerId);
}

/** The chair after one finished game, and what happened to it. */
export function stepKursi(
  k: Kursi | null,
  g: KursiGame,
): { kursi: Kursi | null; event: KursiEvent } {
  if (g.seats.length < KURSI_MIN_TABLE) return { kursi: k, event: { kind: 'kept' } };
  const teams = !!g.teams;
  if (!k) {
    const to = takers(g.seats, teams);
    return {
      kursi: { holders: to, since: g.endedAt, sinceGame: g.gameId, defences: 0 },
      event: { kind: 'first', to },
    };
  }
  const seated = g.seats.filter((s) => k.holders.includes(s.playerId));
  if (!seated.length) return { kursi: k, event: { kind: 'kept' } };
  const holderPlace = Math.min(...seated.map((s) => s.place));
  const above = g.seats.filter((s) => !k.holders.includes(s.playerId) && s.place < holderPlace);
  if (!above.length) {
    const defences = k.defences + 1;
    return { kursi: { ...k, defences }, event: { kind: 'defended', defences } };
  }
  const to = takers(above, teams);
  return {
    kursi: { holders: to, since: g.endedAt, sinceGame: g.gameId, defences: 0 },
    event: { kind: 'taken', from: k.holders, to },
  };
}

/** The chair now and every reign, from finished games in any order (they are played oldest first). */
export function kursiFrom(games: readonly KursiGame[]): { kursi: Kursi | null; reigns: Reign[] } {
  const sorted = [...games].sort(
    (a, b) => a.endedAt - b.endedAt || (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0),
  );
  let kursi: Kursi | null = null;
  const reigns: Reign[] = [];
  for (const g of sorted) {
    const next = stepKursi(kursi, g);
    if (next.event.kind === 'first' || next.event.kind === 'taken') {
      if (reigns.length) reigns[reigns.length - 1].until = g.endedAt;
      reigns.push({ ...next.kursi!, until: null });
    } else if (next.event.kind === 'defended') reigns[reigns.length - 1].defences++;
    kursi = next.kursi;
  }
  return { kursi, reigns };
}

/** The longest reign by games defended, then by time held (`now` ends the current one). */
export function longestReign(reigns: readonly Reign[], now: number): Reign | null {
  const held = (r: Reign) => (r.until ?? now) - r.since;
  return reigns.reduce<Reign | null>(
    (best, r) =>
      !best || r.defences > best.defences || (r.defences === best.defences && held(r) > held(best))
        ? r
        : best,
    null,
  );
}
