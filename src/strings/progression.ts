/**
 * Strings the shared achievements and awards pages add to the hub's (`t.hub.ach`, `t.hub.awards`,
 * `t.hub.activity`), for the games ranked on win rate. Only those pages import it, so it stays out of first loads.
 */
const games = (n: number) => `${n} ${n === 1 ? 'game' : 'games'}`;

export const progression = {
  /** Read with the 🙃 tag on a "shame" achievement. */
  shame: 'Just for laughs',
  winRate: {
    sub: (wins: number, n: number) => `${wins} of ${games(n)} won`,
    unranked: (n: number) => `Not ranked yet · ${games(n)} needed`,
    progress: (n: number, of: number) => `${n} / ${of} games`,
    nobodyRanked: (n: number) =>
      `Nobody has played ${games(n)} this month yet, so nobody is ranked. Everyone is listed below.`,
  },
};
