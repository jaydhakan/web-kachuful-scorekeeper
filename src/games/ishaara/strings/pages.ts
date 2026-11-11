import type { ClueNumber, EndedBy, Identity, IshaaraSort, Team } from '@/games/ishaara/domain';
import type { IshaaraPeriod } from '@/games/ishaara/sync/types';

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const TEAM: Record<Team, string> = { sun: 'Sun', moon: 'Moon' };
const num = (n: ClueNumber) => (n === 'inf' ? '∞' : String(n));

/** Ishaara's hub pages: History, a game with its clue log, Leaderboard, a player and head-to-head. */
export const ipg = {
  pct: (x: number | null) => (x == null ? '–' : `${Math.round(x * 100)}%`),
  team: TEAM,
  identity: {
    sun: 'Sun’s word',
    moon: 'Moon’s word',
    blank: 'Blank',
    trap: 'Trap',
  } satisfies Record<Identity, string>,
  how: {
    'all-found': 'found all their words',
    trap: 'the other team hit the trap',
    resign: 'the other team resigned',
    abandoned: 'abandoned',
  } satisfies Record<EndedBy, string>,
  /** "Sun won · found all their words", or how an unfinished or abandoned game stands. */
  outcome: (winner: Team | null, endedBy: EndedBy | null) =>
    endedBy === 'abandoned' || !winner
      ? endedBy === 'abandoned'
        ? 'Abandoned'
        : 'No winner'
      : `${TEAM[winner]} won · ${ipg.how[endedBy ?? 'all-found']}`,
  match: (game: number, sun: number, moon: number) => `Game ${game} · Sun ${sun}–${moon} Moon`,
  common: {
    games: (n: number) => plural(n, 'game'),
    clueGiver: 'Clue-giver',
    delete: 'Delete',
    retry: 'Try again',
  },
  history: {
    title: 'History',
    emptyTitle: 'No games yet',
    emptyBody: 'Finished games show up here, with every clue and pick.',
    offlineTitle: 'Nothing kept on this device',
    offlineBody: 'Games you finish here are kept for reading offline. Connect to see the rest.',
    offline: 'Offline · showing the games kept on this device',
    noResults: 'No games with this player',
    clear: 'Show everyone',
    filterPlayer: 'Filter by player',
    allPlayers: 'Everyone',
    more: 'Show more games',
    loadingMore: 'Loading more…',
    moreFailed: 'More games didn’t load.',
    left: (sun: number, moon: number) => `Words left · Sun ${sun} · Moon ${moon}`,
  },
  game: {
    title: 'Game',
    notFound: 'Game not found',
    notFoundBody: 'It may have been deleted.',
    unfinished: 'Still being played',
    unfinishedBody: 'The key and clue log show here once the game is over.',
    finishedOn: (day: string) => `Finished ${day}`,
    teams: 'Teams',
    key: 'The key',
    keyNote: 'Faded cards were never picked.',
    cardLabel: (word: string, identity: string, picked: boolean) =>
      `${word}, ${identity}${picked ? '' : ', never picked'}`,
    log: 'Clue log',
    delete: 'Delete game',
    confirm: 'Delete this game?',
    confirmBody: 'It goes from History and the boards for everyone who played.',
    deleteFailed: 'The game wasn’t deleted. Check the connection and try again.',
    deleteForbidden: 'Only the host or an admin can delete this game.',
    openPlayer: (name: string) => `${name}’s stats`,
  },
  log: {
    empty: 'No clues were given.',
    label: 'Every clue and pick, in order',
    turn: (team: Team) => `${TEAM[team]}’s turn`,
    clue: (word: string | null, n: ClueNumber) =>
      word ? `${word.toUpperCase()} · ${num(n)}` : `Clue said aloud · ${num(n)}`,
    clueBy: (name: string) => `${name} gave`,
    guess: (word: string) => `Picked ${word.toUpperCase()}`,
    end: 'Ended the turn',
    timeout: 'Time ran out',
    undo: (word: string) => `Took back ${word.toUpperCase()}`,
    notAllowed: (team: Team) => `${TEAM[team]} called the clue not allowed`,
    penalty: (team: Team, word: string) =>
      `${TEAM[team]} revealed ${word.toUpperCase()} as the penalty`,
    skip: (team: Team) => `${TEAM[team]} didn’t pick a word in time · skipped`,
  },
  board: {
    title: 'Leaderboard',
    period: 'Period',
    periods: {
      today: 'Today',
      week: 'This week',
      season: 'This season',
      all: 'All time',
    } satisfies Record<IshaaraPeriod, string>,
    sort: 'Rank by',
    sorts: { wins: 'Wins', rate: 'Win %', found: 'Words found' } satisfies Record<
      IshaaraSort,
      string
    >,
    emptyTitle: 'Nothing in this period',
    emptyBody: 'No game finished in it yet.',
    showAll: 'Show all time',
    nobodyRanked: (min: number) =>
      `Win % ranks players with at least ${min} games. Nobody has played that many yet.`,
    unranked: (min: number) => `Plays ${min} games to rank`,
    progress: (n: number, of: number) => `${n} of ${of} games`,
    sub: (games: number, wins: number) => `${plural(games, 'game')} · ${plural(wins, 'win')}`,
    row: (rank: string, name: string, value: string) => `${rank}, ${name}, ${value}`,
    unrankedShort: 'Unranked',
  },
  player: {
    eyebrow: 'Player stats',
    emptyTitle: 'No finished games yet',
    emptyBody: 'Stats appear once they finish a game of Ishaara.',
    games: 'Games',
    guessing: 'Guessing',
    giving: 'As clue-giver',
    givingNone: 'Hasn’t given clues yet.',
    tiles: {
      games: 'Games',
      wins: 'Wins',
      winRate: 'Win %',
      found: 'Words found',
      wrong: 'Wrong picks',
      trap: 'Trap hits',
      clueGames: 'Games',
      clueWins: 'Wins',
      clues: 'Clues given',
      avg: 'Average number',
      penalties: 'Penalties',
    },
    vs: 'Head to head',
    vsNone: 'Nobody else on the board yet.',
    vsLabel: (a: string, b: string) => `${a} and ${b}, head to head`,
  },
  h2h: {
    title: 'Head to head',
    none: 'Not in the same game yet',
    noneBody: 'Once these two finish a game together, it shows here.',
    games: 'Games together',
    together: 'Same team',
    togetherSub: (wins: number) => `won ${wins}`,
    against: 'Opposite teams',
    wins: (name: string) => `${name} won`,
  },
} as const;
