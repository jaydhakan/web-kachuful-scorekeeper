import type { AchievementText, ProgressionStrings } from '@/progression/registry';

const counts = (
  prefix: string,
  ns: number[],
  name: (n: number) => string,
  how: (n: number) => string,
) => Object.fromEntries(ns.map((n) => [`${prefix}_${n}`, { name: name(n), how: how(n) }]));

const k = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** Every Ishaara achievement's name and how it is earned, by code (the server uses the same names). */
export const achievements: Record<string, AchievementText> = {
  mind_meld: { name: 'Mind meld', how: 'Your team finds every card of a clue for 3' },
  one_word_four: {
    name: 'One word, four cards',
    how: 'Your team finds every card of a clue for 4 or more',
  },
  overtime: {
    name: 'Overtime',
    how: 'The bonus guess (one more than the clue) finds one of your cards',
  },
  trapped: { name: 'Trapped', how: "Your team's guess hits the trap" },
  own_goal: {
    name: 'Own goal',
    how: "Your team turns over the other team's last card, handing them the win",
  },
  winner: { name: 'Winner', how: 'Your team wins' },
  flawless: {
    name: 'Flawless',
    how: 'Win with no wrong guesses (not by the other team resigning)',
  },
  speedrun: { name: 'Speedrun', how: 'Find all your cards in 4 clues or fewer' },
  comeback: { name: 'Comeback', how: 'Win after being 4 or more cards behind' },
  photo_finish: { name: 'Photo finish', how: 'Win when the other team had one card left' },
  lucky_escape: { name: 'Lucky escape', how: 'Win because the other team hit the trap' },
  mastermind: {
    name: 'Mastermind',
    how: 'As clue-giver, win with 3 or more clues and every clue fully found',
  },
  series: { name: 'Series winner', how: 'Win a best-of-3 match' },
  whitewash: { name: 'Whitewash', how: 'Win a best-of-3 match 2–0' },
  white_flag: { name: 'White flag', how: 'Your team resigns' },
  night_owl: { name: 'Night owl', how: 'Finish a game between 1 and 5 am' },
  first_win: { name: 'First win', how: 'Win your first game' },
  back_to_back: { name: 'Back to back', how: 'Win 2 games in a row' },
  hat_trick: { name: 'Hat-trick', how: 'Win 3 games in a row' },
  dynasty: { name: 'Dynasty', how: 'Win 5 games in a row' },
  ...counts(
    'games',
    [10, 50, 100, 250],
    (n) => `${n} games`,
    (n) => `Finish ${n} games`,
  ),
  ...counts(
    'giver_wins',
    [5, 25, 50],
    () => 'Clue master',
    (n) => `Win ${n} games as clue-giver`,
  ),
  ...counts(
    'clues',
    [25, 100, 250],
    () => 'Wordsmith',
    (n) => `Give ${n} clues`,
  ),
  ...counts(
    'found',
    [50, 250, 1000],
    () => 'Card hunter',
    (n) => `Your teams find ${k(n)} cards`,
  ),
  ...counts(
    'crew',
    [10, 25],
    () => 'Crew',
    (n) => `Share a game with ${n} different people`,
  ),
  day_star: { name: 'Player of the day', how: 'Most wins in a day (2 or more)' },
  day_giver: {
    name: 'Clue-giver of the day',
    how: 'Most cards found per clue that day (4 or more clues)',
  },
  day_speed: { name: 'Fastest win', how: "The day's quickest win, first clue to last card" },
  day_trapped: { name: 'Trap magnet', how: 'Most trap hits as a guesser that day' },
  day_grinder: { name: 'Grinder', how: 'Most games played that day' },
  season_champion: { name: 'Season champion', how: 'Best win rate of the month (8+ games)' },
  season_runner_up: { name: 'Runner-up', how: 'Second for the month' },
  season_third: { name: 'Third place', how: 'Third for the month' },
  season_giver: {
    name: 'Clue-giver of the month',
    how: 'Most cards found per clue in the month (20 or more clues)',
  },
  season_iron: { name: 'Iron player', how: 'Most games in the month' },
  season_climber: { name: 'Climber', how: 'Biggest rise since last month' },
};

/** Each ladder's card title and what its count counts, by ladder id. */
export const ladders: ProgressionStrings['ladders'] = {
  wins: { name: 'Winning run', count: 'Most wins in a row' },
  games: { name: 'Games played', count: 'Games' },
  giver_wins: { name: 'Clue master', count: 'Wins as clue-giver' },
  clues: { name: 'Wordsmith', count: 'Clues given' },
  found: { name: 'Card hunter', count: 'Cards found' },
  crew: { name: 'Crew', count: 'Different people' },
};

/** The words around Ishaara's catalogue on the shared pages. */
export const progressionText: Omit<ProgressionStrings, 'achievements' | 'ladders'> = {
  groups: {
    moment: 'Turn moments',
    game: 'Game finish',
    career: 'Career',
    daily: 'Daily awards',
    season: 'Seasons',
  },
  dayEmpty: 'Awards appear once games are played.',
  seasonEmpty: 'No games this month yet',
};

/** How a clue-giver's award reads: cards found per clue. */
export const perClue = (v: string) => `${v} / clue`;
