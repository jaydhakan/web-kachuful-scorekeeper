import { clueGiverOf, type IshaaraPublic, type Seated, type Team } from '@/games/ishaara/domain';
import { loadIshLastSetup, saveIshLastSetup } from './persistence';

/** The team an Ishaara seat invite is for (`"clue:sun"` → sun), or null. */
export function ishaaraSeatTeam(seat: string): Team | null {
  const t = seat.startsWith('clue:') ? seat.slice(5) : '';
  return t === 'sun' || t === 'moon' ? t : null;
}

/** The clue-giver a seat invite went to, by the game's own seats. */
export const invitedGiver = (game: Pick<IshaaraPublic, 'players'>, seat: string): Seated | null => {
  const t = ishaaraSeatTeam(seat);
  return (t && clueGiverOf(game, t)) || null;
};

/**
 * "Set up again" after a clue-giver declined (D15): the same seats, packs and rules, without the person who can't
 * make it, saved as the last setup so Setup opens with it. Their team then needs a new clue-giver; nothing else changes.
 */
export function setUpAgain(game: IshaaraPublic, without: Seated) {
  const last = loadIshLastSetup();
  saveIshLastSetup({
    players: game.players.filter((p) => p.id !== without.id),
    packs: game.rules.packs,
    // Custom words are only known when this device set the game up; the dealt words mix them with the packs'.
    customWords: last && sameSeats(last.players, game.players) ? last.customWords : [],
    rules: game.rules,
    at: Date.now(),
  });
}

const sameSeats = (a: Seated[], b: Seated[]) =>
  a.length === b.length && a.every((p) => b.some((q) => q.playerId === p.playerId));
