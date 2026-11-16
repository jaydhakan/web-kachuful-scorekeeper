import { storage } from '@/state/persistence';
import { spPlatform as s } from '@/games/spades/strings/platform';
import { SP_KEYS } from './keys';

/** The table-mode game in progress, as far as the landing page and Home need it. */
export interface SpPeek {
  line: string;
  updatedAt: number;
  /** 1-based, the hand being played. */
  hand: number;
  /** "Riya & Dev", "Arjun & Meera": seats 0 and 2, then 1 and 3. */
  teams: [string, string];
  /** The saved hands as they are; Home scores them with the domain, which the landing page never loads. */
  hands: unknown[];
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const nameOf = (p: unknown) => (obj(p) && typeof p.name === 'string' ? p.name : null);

/**
 * "Hand 4 · Riya deals", read straight from `spades.v1` without the game's chunk: no domain, no migrations, so
 * anything unexpected is simply no line. Finished and cancelled games have nothing to resume.
 */
export function peek(): SpPeek | null {
  try {
    const g = storage.get<unknown>(SP_KEYS.game, null);
    if (!obj(g) || g.kind !== 'spades' || g.status !== 'active') return null;
    const players: unknown = g.players,
      hands: unknown = g.hands;
    if (!Array.isArray(players) || players.length !== 4 || !Array.isArray(hands)) return null;
    if (typeof g.updatedAt !== 'number' || typeof g.firstDealerIndex !== 'number') return null;
    const names = players.map(nameOf);
    if (names.some((n) => n === null)) return null;
    const [a, b, c, d] = names as string[];
    // The dealer moves one seat clockwise each hand, whatever `direction` says (domain/table.ts, dealerFor).
    const index = Math.max(hands.length - 1, 0);
    const dealer = names[(((g.firstDealerIndex + index) % 4) + 4) % 4] as string;
    return {
      line: `${s.peek.hand(index + 1)} · ${s.peek.deals(dealer)}`,
      updatedAt: g.updatedAt,
      hand: index + 1,
      teams: [s.peek.team(a, c), s.peek.team(b, d)],
      hands,
    };
  } catch {
    return null;
  }
}
