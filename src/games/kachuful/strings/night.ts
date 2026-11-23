/** Baithak Wrapped for the night (REWARDS-PLAN §7.2): kind copy, never a mocking line about a person. */
const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

export const night = {
  title: 'Tonight’s Wrapped',
  open: 'Tonight’s Wrapped',
  openHint: (games: number) => `${games} games tonight, as a story`,
  soFar: {
    title: 'Tonight so far',
    wins: (n: number) => (n === 1 ? '1 win' : `${n} wins`),
  },
  empty: 'No night to wrap yet',
  emptyBody: 'Finish a game or two tonight and come back.',
  tap: 'Tap for the next card',
  next: 'Next',
  prev: 'Previous',
  games: {
    kicker: 'Tonight',
    big: (n: number) => `${n} ${n === 1 ? 'game' : 'games'}`,
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
  story: {
    kicker: 'The story of the night',
    won: (name: string, wins: number, games: number) =>
      `${name} won ${wins} of ${games} ${games === 1 ? 'game' : 'games'}`,
    none: 'Every game a different winner',
  },
};

/** The server's nights (backend-requests §7): the list on every phone that sat, End the night, and "ready". */
export const nights = {
  title: 'Your nights',
  counting: 'Your night is being counted…',
  countingBody: 'It’s ready three hours after the last game, or as soon as someone ends the night.',
  checkAgain: 'Check again',
  signedOut: 'Sign in to see this night',
  signedOutBody: 'Nights are kept for everyone who sat, on their own phone.',
  signIn: 'Sign in',
  empty: 'No nights yet',
  emptyBody: 'Play a few games signed in. Each night lands here, wrapped.',
  open: 'Tonight',
  openSub: (games: number) => `${games} ${games === 1 ? 'game' : 'games'} so far · being counted…`,
  end: 'End the night',
  endAsk: 'End the night now?',
  endBody: 'Everyone who sat gets the night’s Wrapped, and tonight’s Sitara is paid.',
  ending: 'Ending…',
  noneOpen: 'There’s no open night to end.',
  row: (games: number, winner: string | null) =>
    `${games} ${games === 1 ? 'game' : 'games'}${winner ? ` · ${winner} won` : ''}`,
  rowSaid: (day: string, games: number, winner: string | null, fresh: boolean) =>
    `${day}: ${nights.row(games, winner)}${fresh ? ', new' : ''}. Open the night`,
  fresh: 'New',
  more: 'Show more',
  moreFailed: 'Couldn’t load more. Try again.',
  ready: 'Your night is ready',
  readySub: (games: number | null, winner: string | null) =>
    games == null ? 'Tap to open the story' : nights.row(games, winner),
  readyAria: 'Your night is ready. Open the story',
  sitara: {
    kicker: 'Aaj ka Sitara',
    // The big line is painted in gold, which would blot out an emoji: the star is the card's art.
    big: (names: string[]) => list(names),
    sub: (pay: string) => `Tonight’s star · ${pay} each`,
  },
  achievements: {
    kicker: 'Achievements tonight',
    line: (emoji: string, name: string, who: string) => `${emoji} ${name} · ${who}`,
    more: (n: number) => `and ${n} more`,
  },
  sikke: {
    kicker: 'Sikke tonight',
    total: (n: number) => `+${n.toLocaleString('en-IN')}`,
    line: (who: string, amount: string) => `${who} ${amount}`,
  },
};
