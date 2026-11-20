/** Baithak Wrapped for the night (REWARDS-PLAN §7.2): kind copy, never a mocking line about a person. */
const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

export const night = {
  title: 'Tonight’s Wrapped',
  open: 'Tonight’s Wrapped',
  openHint: (games: number) => `${games} games tonight, as a story`,
  empty: 'No night to wrap yet',
  emptyBody: 'Finish a game or two tonight and come back.',
  tap: 'Tap for the next card',
  next: 'Next',
  prev: 'Previous',
  games: {
    kicker: 'Tonight',
    big: (n: number) => `${n} games`,
    sub: (players: number) => `${players} at the table`,
  },
  winner: {
    kicker: 'The night’s winner',
    sub: (wins: number, games: number) => `${wins} of ${games} games won`,
  },
  swing: {
    kicker: 'The biggest swing',
    sub: (name: string) => `${name}, in one round`,
  },
  bid: {
    kicker: 'Bid of the night',
    sub: (name: string, cards: number) => `${name} made it, on ${cards} cards`,
  },
  brave: {
    kicker: 'Brave call',
    sub: (name: string, cards: number) => `${name} went for it, on ${cards} cards`,
  },
  kursi: {
    kicker: 'The Kursi tonight',
    line: (to: string[], from: string[]) => `🪑 ${list(to)} took it from ${list(from)}`,
  },
  story: {
    kicker: 'The story of the night',
    won: (name: string, wins: number, games: number) =>
      `${name} won ${wins} of ${games} ${games === 1 ? 'game' : 'games'}`,
    chair: (to: string[]) => `${list(to)} ended the night on the Kursi`,
    none: 'Every game a different winner',
  },
};
