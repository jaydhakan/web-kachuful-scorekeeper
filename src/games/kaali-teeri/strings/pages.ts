import type { KtPeriod, KtSort } from '@/games/kaali-teeri/domain';

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
/** "Riya", "Riya & Meera", "Riya, Meera & Dev"; past three, the count. */
const names = (xs: string[]) =>
  xs.length === 1
    ? xs[0]
    : xs.length === 2
      ? xs.join(' & ')
      : xs.length === 3
        ? `${xs[0]}, ${xs[1]} & ${xs[2]}`
        : `${xs.length} players`;

/** Kaali Teeri's hub pages: History, a game, Leaderboard, Players, a player and head-to-head. */
export const kpg = {
  pct: (x: number | null) => (x == null ? '–' : `${Math.round(x * 100)}%`),
  common: {
    newGame: 'New Game',
    unavailableTitle: "Past games can't be read",
    unavailableBody:
      "This browser isn't letting the app read its saved games (private mode or storage turned off).",
    hands: (n: number) => plural(n, 'hand'),
    games: (n: number) => plural(n, 'game'),
    players: (n: number) => plural(n, 'player'),
    bids: (n: number) => plural(n, 'bid'),
  },
  line: {
    noHands: 'No hands yet',
    leads: (who: string, pts: number) => `${who} leads · ${pts}`,
    won: (who: string, pts: number) => `${who} won · ${pts}`,
    tied: (who: string[], pts: number) => `${names(who)} tied · ${pts}`,
  },
  history: {
    title: 'History',
    emptyTitle: 'No games yet',
    emptyBody: 'Games show up here once a hand is scored.',
    noResults: 'No games match',
    clear: 'Clear filters',
    status: { label: 'Show', all: 'All', finished: 'Finished', active: 'In progress' },
    filterPlayer: 'Filter by player',
    allPlayers: 'Everyone',
    onTable: 'On the table',
    inProgress: 'In progress',
    meta: (time: string, hands: number, players: number) =>
      `${time} · ${plural(hands, 'hand')} · ${plural(players, 'player')}`,
    rowLabel: (when: string, line: string) => `${when}: ${line}`,
  },
  game: {
    title: 'Game',
    notFound: 'Game not found',
    notFoundBody: 'It may have been removed from this device.',
    finishedOn: (day: string) => `Finished ${day}`,
    startedOn: (day: string) => `Started ${day}`,
    resume: 'Resume game',
    continue: 'Continue this game',
    standings: 'Standings',
    hands: 'Hand by hand',
    rules: (decks: number, minBid: number, partners: number, to1000: boolean) =>
      `${plural(decks, 'deck')} · min bid ${minBid} · ${plural(partners, 'partner')}${to1000 ? ' · first to 1000' : ''}`,
    points: (n: string) => `${n} pts`,
    openPlayer: (name: string) => `${name}'s stats`,
  },
  board: {
    title: 'Leaderboard',
    period: 'Period',
    periods: {
      today: 'Today',
      week: 'This week',
      season: 'This season',
      all: 'All time',
    } satisfies Record<KtPeriod, string>,
    sort: 'Rank by',
    sorts: { points: 'Points', wins: 'Wins', made: 'Made %' } satisfies Record<KtSort, string>,
    emptyTitle: 'No games yet',
    emptyBody: 'Score a game and the table ranks itself here.',
    noResults: 'Nothing in this period',
    noResultsBody: 'No hand was scored in it on this device.',
    showAll: 'Show all time',
    nobodyRanked: (min: number) =>
      `Made % ranks players who have bid at least ${min} times. Nobody has yet.`,
    unranked: (min: number) => `Fewer than ${min} bids`,
    progress: (n: number, of: number) => `${n} of ${of} bids`,
    sub: (games: number, bids: number) => `${plural(games, 'game')} · ${plural(bids, 'bid')}`,
    row: (rank: string, name: string, value: string) => `${rank}, ${name}, ${value}`,
    unrankedShort: 'Unranked',
    local: 'Games scored on this device.',
  },
  players: {
    title: 'Player stats',
    search: 'Find a player',
    emptyTitle: 'No players yet',
    emptyBody: 'Everyone who plays a hand shows up here.',
    noResults: (q: string) => `Nobody called “${q}”`,
    clear: 'Clear search',
    sub: (games: number) => plural(games, 'game'),
  },
  player: {
    eyebrow: 'Player stats',
    notFound: 'No games for this player',
    notFoundBody: 'Their stats appear once they play a hand on this device.',
    games: 'Games',
    bidding: 'Bidding',
    partner: 'As a partner',
    recent: 'Recent games',
    opponents: 'Played with',
    tiles: {
      games: 'Games',
      wins: 'Wins',
      winRate: 'Win %',
      avgPlace: 'Average place',
      points: 'Points',
      best: 'Best game',
      handsBid: 'Hands bid',
      made: 'Made %',
      avgBid: 'Average bid',
      highest: 'Highest made',
      lost: 'Lost as bidder',
      sweeps: 'Sweeps',
      streak: 'Made in a row',
      called: 'Called as partner',
      partnerRate: 'Partner win %',
      double: 'Double slots',
    },
    madeOf: (made: number, bid: number) => `${made} of ${bid}`,
    bestStreak: (n: number) => `Best ${n}`,
    place: (n: number | null) => (n == null ? '…' : `#${n}`),
    unfinished: 'In progress',
    mostWith: 'Most often with',
    together: (hands: number, made: number) => `${plural(hands, 'hand')} together · made ${made}`,
    vs: (a: string, b: string) => `${a} and ${b}, head to head`,
    shared: (n: number) => plural(n, 'game'),
  },
  h2h: {
    title: 'Head to head',
    none: 'Not at the same table yet',
    noneBody: 'Once these two play a hand together, it shows here.',
    games: 'Games together',
    ahead: (name: string) => `${name} finished ahead`,
    level: 'Level',
    together: 'Same team',
    against: (bidder: string) => `${bidder} bid, the other defended`,
    madeOf: (made: number, of: number) => `made ${made} of ${of}`,
  },
} as const;
