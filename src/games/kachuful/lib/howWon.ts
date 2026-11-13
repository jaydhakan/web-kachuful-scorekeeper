import { nameKey } from '@/people';
import { pidOf, type Earned, type Player } from '@/games/kachuful/domain';
import { t } from '@/strings';

const how = t.winner.how;

/** Rarest first; each is an achievement the domain already awarded for this game. */
const FACTS: [code: string, say: (e: Earned) => string | null][] = [
  ['comeback', () => how.comeback],
  ['perfect_game', () => how.perfect],
  ['wire_to_wire', () => how.wire],
  ['photo_finish', (e) => (typeof e.data.by === 'number' ? how.photo(e.data.by) : null)],
  ['first_win', () => how.firstWin],
];

/**
 * The one line under a sole winner's name: the rarest thing this game's achievements say about the win, or null
 * (a shared win, or nothing notable). `earned` is what `useGameAchievements` returns for the game.
 */
export function howWon(
  earned: { e: Earned; who: { name: string } }[],
  winners: Player[],
): string | null {
  if (winners.length !== 1) return null;
  const w = winners[0];
  // The device's facts may know a seat by its registry id, so the name settles it when the ids differ.
  const mine = earned.filter(
    (x) => x.e.playerId === pidOf(w) || nameKey(x.who.name) === nameKey(w.name),
  );
  for (const [code, say] of FACTS) {
    const hit = mine.find((x) => x.e.code === code);
    const line = hit && say(hit.e);
    if (line) return line;
  }
  return null;
}
