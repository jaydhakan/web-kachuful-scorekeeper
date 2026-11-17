import { byCode } from '@/progression/catalogue';
import { popCard, type PopCard } from '@/components/progression/popCard';
import { handMoments, tableAsGame } from '@/games/spades/domain/achievements';
import type { SpGame, SpPublic } from '@/games/spades/domain/types';
import { progression } from '@/games/spades/progression';
import { popNames } from '@/games/spades/strings/achievements';

const MAX_CARDS = 4;

/**
 * A scored hand's moments as pop cards, big ones first, then in catalogue order; partners who earned the same thing
 * share a card ("Riya & Dev · Boston"). Its own chunk with the catalogue: the hand screens never carry it.
 */
export function handPopCards(
  game: SpGame | SpPublic,
  index: number,
  nameOf: (id: string) => string,
): PopCard[] {
  const g = game.kind === 'spades-online' ? tableAsGame(game) : game;
  const cat = byCode(progression);
  const order = (code: string) =>
    (cat.get(code)?.big ? 0 : 1000) + progression.catalogue.findIndex((x) => x.code === code);
  const who = new Map<string, string[]>();
  for (const e of handMoments(g, index))
    who.set(e.code, [...(who.get(e.code) ?? []), nameOf(e.playerId)]);
  return [...who]
    .sort(([a], [b]) => order(a) - order(b))
    .slice(0, MAX_CARDS)
    .map(([code, names]) => popCard(progression, code, popNames(names)));
}
