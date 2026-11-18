import { clueGiverOf, type IshaaraPublic, type Team } from '@/games/ishaara/domain';

/** The player of the game (WOW-MOMENTS-PLAN A4): the clue-giver whose clues found the most of their team's words. */
export interface IshMvp {
  playerId: string;
  found: number;
  clues: number;
}

/** From the log: each team's clues and the own words found on them; the winner breaks a tie. Null with no giver. */
export function mvpOf(g: Pick<IshaaraPublic, 'log' | 'players' | 'winner'>): IshMvp | null {
  const of = (t: Team) => ({
    t,
    clues: g.log.filter((e) => e.type === 'clue' && e.team === t).length,
    found: g.log.filter((e) => e.type === 'guess' && e.team === t && e.identity === t).length,
  });
  const [a] = [of('sun'), of('moon')].sort(
    (x, y) => y.found - x.found || Number(y.t === g.winner) - Number(x.t === g.winner),
  );
  const giver = clueGiverOf(g, a.t);
  return giver?.playerId && a.found > 0
    ? { playerId: giver.playerId, found: a.found, clues: a.clues }
    : null;
}
