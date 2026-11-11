import { KEYS, storage } from '@/state/persistence';
import { ktMessages as m } from '@/games/kaali-teeri/strings/messages';

/** The landing card's resume line for a game in progress. */
export interface KtPeek {
  line: string;
  updatedAt: number;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * "Hand 4 · Riya bid 180", read straight from `kaaliteeri.v1` without the game's chunk: no domain, no migrations,
 * so anything unexpected is simply no line. Finished games have nothing to resume.
 */
export function peek(): KtPeek | null {
  try {
    const g = storage.get<unknown>(KEYS.ktGame, null);
    if (!obj(g) || g.kind !== 'kaali-teeri' || g.status !== 'active') return null;
    const players: unknown = g.players,
      hands: unknown = g.hands;
    if (!Array.isArray(players) || !Array.isArray(hands) || typeof g.updatedAt !== 'number')
      return null;
    const h: unknown = hands.at(-1);
    if (!obj(h) || typeof h.index !== 'number') return null;
    const name = (id: unknown) => {
      const p: unknown = players.find((x: unknown) => obj(x) && x.id === id);
      return obj(p) && typeof p.name === 'string' ? p.name : null;
    };
    const dealer: unknown = players[h.dealerIndex as number];
    const bidder = name(h.bidder);
    const what =
      bidder && typeof h.bid === 'number'
        ? m.peek.bid(bidder, h.bid)
        : obj(dealer) && typeof dealer.name === 'string'
          ? m.peek.deals(dealer.name)
          : null;
    if (!what) return null;
    return { line: `${m.peek.hand(h.index + 1)} · ${what}`, updatedAt: g.updatedAt };
  } catch {
    return null;
  }
}
