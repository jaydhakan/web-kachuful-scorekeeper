/** Every achievement's name and how it is earned, by code (the server uses the same names). */
type Entry = { name: string; how: string };

const runs = (kind: 'hot' | 'cold') =>
  Object.fromEntries(
    (
      [
        [3, 'On fire', 'Ice cold'],
        [5, 'Unstoppable', 'Cursed'],
        [8, 'G.O.A.T.', 'Rest in peace'],
        [12, 'Untouchable', 'Zombie'],
      ] as const
    ).map(([n, hot, cold]) => [
      `${kind}_${n}`,
      {
        name: kind === 'hot' ? hot : cold,
        how: kind === 'hot' ? `Make ${n} bids in a row` : `Miss ${n} bids in a row`,
      },
    ]),
  );

const counts = (
  prefix: string,
  ns: number[],
  name: (n: number) => string,
  how: (n: number) => string,
) => Object.fromEntries(ns.map((n) => [`${prefix}_${n}`, { name: name(n), how: how(n) }]));

const k = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

export const achievements: Record<string, Entry> = {
  ...runs('hot'),
  ...runs('cold'),
  grand_slam: { name: 'Grand slam', how: 'Bid every card (5 or more) and make it' },
  ninja: { name: 'Ninja', how: 'Bid 0 in a round of 7 or more cards and make it' },
  high_roller: { name: 'High roller', how: 'Make a bid of 5 or more' },
  peak_performer: { name: 'Peak performer', how: 'Make a bid of 3 or more in a peak round' },
  lone_wolf: { name: 'Lone wolf', how: 'Be the only one to make it (4 or more players)' },
  odd_one_out: { name: 'Odd one out', how: 'Be the only one to miss (4 or more players)' },
  hooked: { name: 'Hooked', how: "As dealer, try the number you can't bid" },
  dealers_revenge: {
    name: "Dealer's revenge",
    how: 'Get hooked as dealer, then make your bid anyway',
  },
  winner: { name: 'Winner', how: 'Finish first' },
  wire_to_wire: { name: 'Wire to wire', how: 'Lead after every round of a 6+ round game, and win' },
  comeback: { name: 'Comeback king', how: 'Be last after halfway, then win' },
  photo_finish: { name: 'Photo finish', how: 'Win by 10 points or fewer' },
  runaway: { name: 'Runaway', how: 'Win by 100 points or more' },
  sharpshooter: { name: 'Sharpshooter', how: 'Make 80% of your bids over 10+ rounds' },
  perfect_game: { name: 'Perfect game', how: 'Make every bid in a game of 6+ rounds' },
  wooden_spoon: { name: 'Wooden spoon', how: 'Finish last' },
  zero_hero: { name: 'Zero hero', how: 'Finish on exactly 0 after 6+ rounds' },
  marathon: { name: 'Marathon', how: 'Play a game of 30 rounds or more' },
  full_house: { name: 'Full house', how: 'Play a 10-player game' },
  night_owl: { name: 'Night owl', how: 'Finish a game between 1 and 5 am' },
  first_win: { name: 'First win', how: 'Win your first game' },
  back_to_back: { name: 'Back to back', how: 'Win 2 games in a row' },
  hat_trick: { name: 'Hat-trick', how: 'Win 3 games in a row' },
  dynasty: { name: 'Dynasty', how: 'Win 5 games in a row' },
  spoon_collector: { name: 'Spoon collector', how: 'Finish last 3 games in a row' },
  podium_regular: { name: 'Podium regular', how: 'Finish top 3 in 5 games in a row' },
  personal_best: { name: 'Personal best', how: 'Beat your highest game total (after 3 games)' },
  ...counts(
    'games',
    [10, 50, 100, 250, 500],
    (n) => `${n} games`,
    (n) => `Finish ${n} games`,
  ),
  ...counts(
    'rounds',
    [100, 500, 1000, 5000],
    (n) => `${k(n)} rounds`,
    (n) => `Play ${n} rounds`,
  ),
  ...counts(
    'made',
    [100, 500, 1000],
    (n) => `${k(n)} bids made`,
    (n) => `Make ${n} bids`,
  ),
  ...counts(
    'points',
    [1000, 5000, 10000],
    (n) => `${k(n)} points`,
    (n) => `Earn ${n} points from winning rounds`,
  ),
  ...counts(
    'crew',
    [10, 25],
    () => 'Crew',
    (n) => `Share a table with ${n} different people`,
  ),
  rivalry_20: { name: 'Rivalry', how: 'Play 20 games with the same person' },
  day_star: { name: 'Player of the day', how: 'Most points in a day' },
  day_bang: { name: 'Round of the day', how: 'The best single round of the day' },
  day_ouch: { name: 'Ouch of the day', how: 'The worst single round of the day' },
  day_hot: { name: 'Hot hand', how: 'The longest run of made bids that day' },
  day_ice: { name: 'Ice bucket', how: 'The longest run of misses that day' },
  day_sharp: { name: 'Sharpest', how: 'Best accuracy that day (10+ rounds)' },
  day_grinder: { name: 'Grinder', how: 'Most rounds played that day' },
  day_hooked: { name: 'Most hooked', how: 'Most hook attempts as dealer that day' },
  season_champion: { name: 'Season champion', how: 'Top of the month (more than 50 rounds)' },
  season_runner_up: { name: 'Runner-up', how: 'Second for the month' },
  season_third: { name: 'Third place', how: 'Third for the month' },
  season_sharpest: { name: 'Sharpest of the season', how: 'Best accuracy of the month' },
  season_iron: { name: 'Iron player', how: 'Most games in the month' },
  season_climber: { name: 'Climber', how: 'Biggest rise since last month' },
};

export const achName = (code: string) => achievements[code]?.name ?? code;
