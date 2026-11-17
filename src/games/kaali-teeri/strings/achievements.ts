import type { AchievementText, ProgressionStrings } from '@/progression/registry';

const counts = (
  prefix: string,
  ns: number[],
  name: (n: number) => string,
  how: (n: number) => string,
): Record<string, AchievementText> =>
  Object.fromEntries(ns.map((n) => [`${prefix}_${n}`, { name: name(n), how: how(n) }]));

const k = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** Every Kaali Teeri achievement's name and how it is earned, by code (the server uses the same names). */
export const achievements: Record<string, AchievementText> = {
  high_roller: { name: 'High Roller', how: 'As bidder, make a bid of 80% of the deck or more' },
  all_in: { name: 'All In', how: 'As bidder, bid the whole deck and make it' },
  clean_sweep: { name: 'Clean Sweep', how: 'Your bidding side takes every point' },
  brick_wall: { name: 'Brick Wall', how: 'Your defending side takes every point' },
  lone_wolf: { name: 'Lone Wolf', how: 'As bidder, hold every called card yourself and make it' },
  double_agent: {
    name: 'Double Agent',
    how: 'As a partner, play two or more called cards, and the bid is made',
  },
  giant_killer: {
    name: 'Giant Killer',
    how: 'As a defender, beat a bid of 80% of the deck or more',
  },
  stuck_with_it: {
    name: 'Stuck With It',
    how: 'Make a bid you were forced into (hands entered with the full auction)',
  },
  so_close: { name: 'So Close', how: 'As bidder, miss by exactly 5 points' },
  overcooked: { name: 'Overcooked', how: 'As bidder, fail a bid of 80% of the deck or more' },
  winner: { name: 'Winner', how: 'Finish first (a tie for first counts)' },
  comeback: {
    name: 'Comeback',
    how: 'Be last after a hand at or past halfway, then win (6+ hands)',
  },
  wire_to_wire: { name: 'Wire to Wire', how: 'Lead after every hand of a 6+ hand game, and win' },
  thousandaire: { name: 'Thousandaire', how: 'Reach 1,000 points in one game' },
  never_wrong: { name: 'Never Wrong', how: 'Bid 3+ times in a game and make every one' },
  kingmaker: { name: 'Kingmaker', how: 'Win 3+ hands as a called partner in one game' },
  wooden_spoon: { name: 'Wooden Spoon', how: 'Finish last' },
  blanked: { name: 'Blanked', how: 'Finish on 0 after 6+ hands' },
  full_house: { name: 'Full House', how: 'Play a 10-player game' },
  marathon: { name: 'Marathon', how: 'Play a game of 20 hands or more' },
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
    (n) => `Play ${k(n)} hands`,
  ),
  ...counts(
    'made',
    [10, 50, 100],
    (n) => `${n} bids made`,
    (n) => `Make ${n} bids as bidder`,
  ),
  ...counts(
    'partner',
    [10, 50, 100],
    (n) => `Trusted Partner ${n}`,
    (n) => `Win ${n} hands as a called partner`,
  ),
  streak_3: { name: 'On a Roll', how: 'Make 3 bids in a row as bidder' },
  streak_5: { name: 'Unstoppable', how: 'Make 5 bids in a row as bidder' },
  streak_8: { name: 'Auction King', how: 'Make 8 bids in a row as bidder' },
  ...counts(
    'crew',
    [10, 25],
    (n) => `Crew of ${n}`,
    (n) => `Share a table with ${n} different people`,
  ),
  partners_in_crime: {
    name: 'Partners in Crime',
    how: 'Win 10 hands on the same side as one person (once per person)',
  },
  day_star: { name: 'Player of the Day', how: 'Most points that day' },
  day_bid: { name: 'Bid of the Day', how: 'The biggest bid made that day' },
  day_partner: { name: 'Partner of the Day', how: 'Most hands won as a called partner (2+)' },
  day_sharp: { name: 'Sharpest', how: 'Best made rate as bidder (3+ bids)' },
  day_killer: { name: 'Giant Killer', how: 'Most bids beaten as a defender (2+)' },
  day_overcooked: { name: 'Overcooked', how: 'The biggest bid failed that day' },
  day_grinder: { name: 'Grinder', how: 'Most hands played that day' },
  season_champion: { name: 'Season Champion', how: 'Best win rate of the month (8+ games)' },
  season_runner_up: { name: 'Runner-up', how: 'Second in the month’s standings' },
  season_third: { name: 'Third Place', how: 'Third in the month’s standings' },
  season_sharpest: { name: 'Sharpest Bidder', how: 'Best made rate as bidder (15+ bids)' },
  season_kingmaker: { name: 'Kingmaker', how: 'Most hands won as a called partner' },
  season_iron: { name: 'Iron Player', how: 'Most games in the month' },
  season_climber: { name: 'Climber', how: 'Biggest rise in the standings since last month' },
};

/** Each ladder's card title and what its count counts, by ladder id. */
export const ladders: ProgressionStrings['ladders'] = {
  wins: { name: 'Winning run', count: 'Most wins in a row' },
  games: { name: 'Games played', count: 'Games' },
  hands: { name: 'Hands played', count: 'Hands' },
  made: { name: 'Bids made', count: 'Bids made' },
  partner: { name: 'Trusted Partner', count: 'Hands won as a partner' },
  streak: { name: 'Bidding run', count: 'Most bids made in a row' },
  crew: { name: 'Crew', count: 'Different people' },
};

/** The words around Kaali Teeri's catalogue on the shared pages. */
export const progressionText: Omit<ProgressionStrings, 'achievements' | 'ladders'> = {
  groups: {
    moment: 'Hand moments',
    game: 'Game finish',
    career: 'Career',
    daily: 'Daily awards',
    season: 'Seasons',
  },
  dayEmpty: 'Awards appear once hands are played.',
  seasonEmpty: 'No games this month yet',
};
