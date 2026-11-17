import type { AchievementText, ProgressionStrings } from '@/progression/registry';

const counts = (
  prefix: string,
  ns: number[],
  name: (n: number) => string,
  how: (n: number) => string,
) => Object.fromEntries(ns.map((n) => [`${prefix}_${n}`, { name: name(n), how: how(n) }]));

const k = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** Every Spades achievement's name and how it is earned, by code (the server uses the same names). */
export const achievements: Record<string, AchievementText> = {
  boston: { name: 'Boston', how: 'Your team takes all 13 tricks' },
  ice_cold: { name: 'Ice Cold', how: 'Make a Nil' },
  blindside: { name: 'Blindside', how: 'Make a Blind Nil' },
  double_nil: {
    name: 'Double Trouble',
    how: 'You and your partner both bid Nil in the same hand and both make it',
  },
  nil_breaker: { name: 'Nil Breaker', how: 'An opponent’s Nil fails' },
  set_them: { name: 'Set Them', how: 'The other team is set' },
  high_roller: {
    name: 'High Roller',
    how: 'Your team bids 10 or more together (Nils count 0) and makes it',
  },
  bang_on: {
    name: 'Bang On',
    how: 'Your team bids 7 or more and takes exactly that many (no bags)',
  },
  sandbagged: { name: 'Sandbagged', how: 'Your team takes the 10-bag penalty' },
  blind_spot: { name: 'Blind Spot', how: 'Your Blind Nil fails' },
  last_gasp: {
    name: 'Last Gasp',
    how: 'Your team reaches its contract on the 13th trick (online)',
  },
  deuce_ace: {
    name: 'Two Beats Ace',
    how: 'Your 2♠ wins a trick, cutting the led suit’s Ace (online)',
  },
  one_man_band: {
    name: 'One-Man Band',
    how: 'Take 7 or more tricks yourself in one hand (online)',
  },
  winner: { name: 'Winner', how: 'Your team wins (a draw is not a win)' },
  comeback: { name: 'Comeback', how: 'Win after trailing by 150 or more after some hand' },
  exact: { name: 'Exact', how: 'Win with every hand made and no bags, 4+ hands' },
  mercy: { name: 'Mercy', how: 'Win by the mercy rule' },
  shutout: { name: 'Shutout', how: 'Win while the other team never went above 0 (3+ hands)' },
  wire_to_wire: { name: 'Wire to Wire', how: 'Lead after every hand of a 5+ hand game, and win' },
  photo_finish: { name: 'Photo Finish', how: 'Win by 20 points or fewer' },
  runaway: { name: 'Runaway', how: 'Win by 200 points or more' },
  bag_collector: {
    name: 'Bag Collector',
    how: 'Your team takes the 10-bag penalty twice or more in one game',
  },
  marathon: { name: 'Marathon', how: 'Play a game of 15 hands or more' },
  night_owl: { name: 'Night Owl', how: 'Finish a game between 1 and 5 am' },
  first_win: { name: 'First Win', how: 'Win your first game' },
  back_to_back: { name: 'Back to Back', how: 'Win 2 games in a row' },
  hat_trick: { name: 'Hat-trick', how: 'Win 3 games in a row' },
  dynasty: { name: 'Dynasty', how: 'Win 5 games in a row' },
  ...counts(
    'games',
    [10, 50, 100, 250],
    (n) => `${n} games`,
    (n) => `Finish ${n} games`,
  ),
  ...counts(
    'hands',
    [100, 500, 1000],
    (n) => `${k(n)} hands`,
    (n) => `Play ${n} hands`,
  ),
  ...counts(
    'made',
    [50, 250, 500],
    (n) => `${n} contracts`,
    (n) => `Your team makes ${n} of your bids`,
  ),
  ...counts(
    'nils',
    [5, 25, 50],
    () => 'Nil Specialist',
    (n) => `Make ${n} Nils, blind included`,
  ),
  ...counts(
    'crew',
    [10, 25],
    () => 'Crew',
    (n) => `Share a table with ${n} different people`,
  ),
  perfect_pair: { name: 'Perfect Pair', how: '10 wins with the same partner (once per partner)' },
  day_pair: { name: 'Pair of the Day', how: 'The partners with the most wins together (2+)' },
  day_sharp: { name: 'Sharpest', how: 'Best contract rate that day (5+ bids)' },
  day_nil: { name: 'Nil of the Day', how: 'Most Nils made that day' },
  day_setter: { name: 'Setter', how: 'Most sets put on the other team that day (2+)' },
  day_boston: { name: 'Boston of the Day', how: 'Every team that took a Boston that day' },
  day_bags: { name: 'Sandbagger', how: 'Most bags that day (5+)' },
  day_grinder: { name: 'Grinder', how: 'Most hands played that day' },
  season_champion: { name: 'Season Champion', how: 'Best win rate of the month (10+ games)' },
  season_runner_up: { name: 'Runner-up', how: 'Second for the month' },
  season_third: { name: 'Third Place', how: 'Third for the month' },
  season_sharpest: { name: 'Sharpest Bidder', how: 'Best contract rate of the month (40+ bids)' },
  season_nil: { name: 'Nil Specialist', how: 'Most Nils made in the month' },
  season_pair: { name: 'Pair of the Month', how: 'Best pair by win rate (6+ games together)' },
  season_iron: { name: 'Iron Player', how: 'Most games in the month' },
  season_climber: { name: 'Climber', how: 'Biggest rise in rank since last month' },
};

/** Each ladder's card title and what its count counts, by ladder id. */
export const ladders: ProgressionStrings['ladders'] = {
  wins: { name: 'Winning run', count: 'Most wins in a row' },
  games: { name: 'Games played', count: 'Games' },
  hands: { name: 'Hands played', count: 'Hands' },
  made: { name: 'Contracts made', count: 'Bids your team made' },
  nils: { name: 'Nil Specialist', count: 'Nils made' },
  crew: { name: 'Crew', count: 'Different people' },
};

/** The words around Spades' catalogue on the shared pages. */
export const progressionText: Omit<ProgressionStrings, 'achievements' | 'ladders'> = {
  groups: {
    moment: 'Hand moments',
    game: 'Game finish',
    career: 'Career',
    daily: 'Daily awards',
    season: 'Seasons',
  },
  dayEmpty: 'Awards appear once games are finished.',
  seasonEmpty: 'No games this month yet',
};

/** Who a pop card names: partners who earned the same thing in one hand share it. */
/** The player of the game: the reel's first card, and its line. */
export const mvpText = {
  title: 'Player of the game',
  line: (kind: 'nils' | 'bids', n: number) =>
    kind === 'nils'
      ? `Made ${n} ${n === 1 ? 'Nil' : 'Nils'}`
      : `Bid ${n} ${n === 1 ? 'trick' : 'tricks'} and made them`,
};

export const popNames = (names: string[]) => [...new Set(names)].join(' & ');
