/**
 * Strings the shared achievements and awards pages add to the hub's (`t.hub.ach`, `t.hub.awards`,
 * `t.hub.activity`), for the games ranked on win rate. Only those pages import it, so it stays out of first loads.
 */
const games = (n: number) => `${n} ${n === 1 ? 'game' : 'games'}`;

export const progression = {
  /** The Me page: each game's achievements I hold. */
  everyGame: 'Achievements in every game',
  gameAchSaid: (game: string, n: number, of: number) => `${game}: ${n} of ${of} achievements`,
  feed: {
    /** Ishaara: a team, not a person, wins. */
    teamWon: (team: string) => `Team ${team} won a game`,
    ishaaraTeam: { sun: 'Sun', moon: 'Moon' } as Record<'sun' | 'moon', string>,
    drawn: 'A game ended in a draw',
    ended: 'A game ended',
    /** The every-game feed: the game the item is from, for screen readers and the row's tag. */
    from: (game: string) => `in ${game}`,
    seeAll: 'See all activity',
  },
  /** Read with the 🙃 tag on a "shame" achievement. */
  shame: 'Just for laughs',
  /** A hidden achievement nobody has earned yet. */
  secret: { name: '???', how: 'A secret. Keep playing and someone will find it.', emoji: '❔' },
  winRate: {
    sub: (wins: number, n: number) => `${wins} of ${games(n)} won`,
    unranked: (n: number) => `Not ranked yet · ${games(n)} needed`,
    progress: (n: number, of: number) => `${n} / ${of} games`,
    nobodyRanked: (n: number) =>
      `Nobody has played ${games(n)} this month yet, so nobody is ranked. Everyone is listed below.`,
  },
};
