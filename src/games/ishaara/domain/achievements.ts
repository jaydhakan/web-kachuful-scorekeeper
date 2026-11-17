/**
 * Ishaara's achievements (plan §5): turn moments and game-end ones from a finished game's public log, career ones and
 * the ladders from its player rows. Pure; the server mirrors it (app/domain/ishaara/achievements.py) and the golden
 * fixtures prove they agree. Guesses are the team's, never one person's, so a code credits the whole team, its
 * guessers or its clue-giver.
 */
// Relative, because the mock API loads the domain outside Vite.
import {
  atEnd,
  careerCounts,
  countLadder,
  crew,
  CREW_LADDER,
  GAMES_LADDER,
  gamesPlayed,
  nightOwl,
  WIN_STREAK,
  winStreaks,
} from '../../../progression/rules';
import type { AchievementDef, Earned, Ladder, PlayerGameFact } from '../../../progression/types';
import { other } from './rules';
import type { ClueNumber, EndedBy, IshaaraPublic, LogEntry, Role, Team } from './types';

type Def = Omit<AchievementDef, 'group'>;
const group = (g: AchievementDef['group'], defs: Def[]): AchievementDef[] =>
  defs.map((d) => ({ ...d, group: g }));

const steps = (prefix: string, ns: number[], emoji: string): Def[] =>
  ns.map((n) => ({ code: `${prefix}_${n}`, emoji }));

/** Every code, in the order the page shows them. */
export const CATALOGUE: AchievementDef[] = [
  ...group('moment', [
    { code: 'mind_meld', emoji: '🧠' },
    { code: 'one_word_four', emoji: '🤯', big: true },
    { code: 'overtime', emoji: '⏱️' },
    { code: 'trapped', emoji: '💣', shame: true },
    { code: 'own_goal', emoji: '🥅', shame: true },
  ]),
  ...group('game', [
    { code: 'winner', emoji: '🏆' },
    { code: 'flawless', emoji: '✨', big: true },
    { code: 'speedrun', emoji: '⚡', big: true },
    { code: 'comeback', emoji: '🔄', big: true },
    { code: 'photo_finish', emoji: '📸' },
    { code: 'lucky_escape', emoji: '🍀' },
    { code: 'mastermind', emoji: '🎓' },
    { code: 'series', emoji: '🏅' },
    { code: 'whitewash', emoji: '🧹', big: true },
    { code: 'white_flag', emoji: '🏳️', shame: true },
    { code: 'night_owl', emoji: '🦉' },
  ]),
  ...group('career', [
    { code: 'first_win', emoji: '🥇' },
    { code: 'back_to_back', emoji: '✌️' },
    { code: 'hat_trick', emoji: '🎩' },
    { code: 'dynasty', emoji: '👑' },
    ...steps('games', [10, 50, 100, 250], '🃏'),
    ...steps('giver_wins', [5, 25, 50], '🗝️'),
    ...steps('clues', [25, 100, 250], '💬'),
    ...steps('found', [50, 250, 1000], '🔎'),
    ...steps('crew', [10, 25], '👥'),
  ]),
  ...group('daily', [
    { code: 'day_star', emoji: '🌟' },
    { code: 'day_giver', emoji: '🗣️' },
    { code: 'day_speed', emoji: '⚡' },
    { code: 'day_trapped', emoji: '🧲', shame: true },
    { code: 'day_grinder', emoji: '⚙️' },
  ]),
  ...group('season', [
    { code: 'season_champion', emoji: '👑' },
    { code: 'season_runner_up', emoji: '🥈' },
    { code: 'season_third', emoji: '🥉' },
    { code: 'season_giver', emoji: '🗣️' },
    { code: 'season_iron', emoji: '🦾' },
    { code: 'season_climber', emoji: '📈' },
  ]),
];

export const GIVER_WINS_STEPS = [5, 25, 50];
export const CLUES_STEPS = [25, 100, 250];
export const FOUND_STEPS = [50, 250, 1000];

export type IshLadderId = 'wins' | 'games' | 'giver_wins' | 'clues' | 'found' | 'crew';

/** The ladders, in the order the server's ladder counts list them. */
export const LADDERS: Ladder<IshLadderId>[] = [
  WIN_STREAK,
  GAMES_LADDER,
  countLadder('giver_wins', 'giver_wins', GIVER_WINS_STEPS),
  countLadder('clues', 'clues', CLUES_STEPS),
  countLadder('found', 'found', FOUND_STEPS),
  CREW_LADDER,
];

// ——— one game ———

export interface IshSeat {
  playerId: string;
  team: Team;
  role: Role;
}

/** One finished (not abandoned) game, as its turn and game achievements read it. */
export interface IshGameFacts {
  gameId: string;
  players: IshSeat[];
  starting: Team;
  /** The public log: an undone guess has already left it. */
  log: LogEntry[];
  winner: Team;
  endedBy: Exclude<EndedBy, 'abandoned'>;
  finishedAt: number;
  bestOf: 1 | 3;
  /** After this game: its number and both teams' wins, this game's included. */
  match: { game: number; sunWins: number; moonWins: number };
}

/** A finished game's facts; null while it is played, when abandoned, or without a winner (nothing to earn). */
export function gameFacts(g: IshaaraPublic): IshGameFacts | null {
  if (g.status !== 'finished' || !g.winner || !g.endedBy || g.endedBy === 'abandoned') return null;
  return {
    gameId: g.id,
    players: g.players.flatMap((p) =>
      p.playerId ? [{ playerId: p.playerId, team: p.team, role: p.role }] : [],
    ),
    starting: g.starting,
    log: g.log,
    winner: g.winner,
    endedBy: g.endedBy,
    finishedAt: g.finishedAt ?? g.updatedAt,
    bestOf: g.rules.bestOf,
    match: g.match,
  };
}

/** One clue and the guesses after it, until the next clue. */
export interface Turn {
  /** The clue's place among the game's clues, from 0: a moment's `roundIndex`. */
  index: number;
  team: Team;
  number: ClueNumber;
  guesses: LogEntry[];
}

export function turnsOf(log: readonly LogEntry[]): Turn[] {
  const out: Turn[] = [];
  for (const e of log) {
    if (e.type === 'clue')
      out.push({ index: out.length, team: e.team, number: e.number ?? 0, guesses: [] });
    else if (e.type === 'guess' && out.length) out.at(-1)!.guesses.push(e);
  }
  return out;
}

/** Its first N guesses all the team's own cards, for a clue of N (1 to 9); 0 and ∞ never are. */
export function fullyFound(t: Turn): boolean {
  const n = t.number;
  return (
    typeof n === 'number' &&
    n >= 1 &&
    t.guesses.length >= n &&
    t.guesses.slice(0, n).every((g) => g.identity === t.team)
  );
}

/** Whom a code credits: the whole team (clue-giver included), its guessers, or its clue-giver. */
export type Credit = 'team' | 'guessers' | 'giver';

export interface TurnMoment {
  code: string;
  team: Team;
  credit: Credit;
  turn: number;
  at: number;
}

/**
 * The turn moments in a log, turn by turn. `end` is how the game ended, once it has: an own goal needs it. The table
 * shows these live from the public log; the server stores them when the game ends.
 */
export function turnMoments(
  log: readonly LogEntry[],
  end?: { winner: Team | null; endedBy: EndedBy | null },
): TurnMoment[] {
  const out: TurnMoment[] = [];
  const last = log.at(-1);
  for (const t of turnsOf(log)) {
    const n = t.number;
    const m = (code: string, credit: Credit, at: number) =>
      out.push({ code, team: t.team, credit, turn: t.index, at });
    if (fullyFound(t) && typeof n === 'number') {
      if (n === 3) m('mind_meld', 'team', t.guesses[2].at);
      if (n >= 4) m('one_word_four', 'team', t.guesses[n - 1].at);
      const bonus = t.guesses[n];
      if (bonus?.identity === t.team) m('overtime', 'team', bonus.at);
    }
    for (const g of t.guesses) {
      if (g.identity === 'trap') m('trapped', 'guessers', g.at);
      // The guess that ended the game on the other team's last card.
      if (
        g === last &&
        end?.endedBy === 'all-found' &&
        g.identity === other(t.team) &&
        end.winner === g.identity
      )
        m('own_goal', 'guessers', g.at);
    }
  }
  return out;
}

const credited = (f: Pick<IshGameFacts, 'players'>, team: Team, credit: Credit) =>
  f.players.filter(
    (p) =>
      p.team === team &&
      (credit === 'team' ||
        (credit === 'guessers' ? p.role === 'guesser' : p.role === 'clue-giver')),
  );

/** Each team's cards still face down after every reveal (a guess or a penalty), from the start. */
function leftAfterEach(f: Pick<IshGameFacts, 'starting' | 'log'>): Record<Team, number>[] {
  const left: Record<Team, number> = { sun: 0, moon: 0 };
  left[f.starting] = 9;
  left[other(f.starting)] = 8;
  const out = [{ ...left }];
  for (const e of f.log)
    if (
      (e.type === 'guess' || e.type === 'penalty') &&
      (e.identity === 'sun' || e.identity === 'moon')
    ) {
      left[e.identity]--;
      out.push({ ...left });
    }
  return out;
}

/** Oldest first; then by code, player and turn, so the server's list compares one to one. */
export const byEarned = (a: Earned, b: Earned) =>
  a.earnedAt - b.earnedAt ||
  (a.code < b.code ? -1 : a.code > b.code ? 1 : 0) ||
  (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0) ||
  (a.roundIndex ?? -1) - (b.roundIndex ?? -1);

/** Turn moments and game-end achievements of one finished game; "night" is judged in `tz`. */
export function gameAchievements(f: IshGameFacts, tz?: string): Earned[] {
  const out: Earned[] = [];
  for (const mo of turnMoments(f.log, f)) {
    for (const p of credited(f, mo.team, mo.credit))
      out.push({
        code: mo.code,
        playerId: p.playerId,
        gameId: f.gameId,
        roundIndex: mo.turn,
        period: null,
        earnedAt: mo.at,
        data: {},
      });
  }
  const win = f.winner,
    lose = other(win);
  const atEndOf = (code: string, team: Team, credit: Credit = 'team') => {
    for (const p of credited(f, team, credit))
      out.push({
        code,
        playerId: p.playerId,
        gameId: f.gameId,
        roundIndex: null,
        period: null,
        earnedAt: f.finishedAt,
        data: {},
      });
  };
  const turns = turnsOf(f.log).filter((t) => t.team === win);
  const wrong = f.log.some((e) => e.type === 'guess' && e.team === win && e.identity !== win);
  const left = leftAfterEach(f);
  const wins = (t: Team) => (t === 'sun' ? f.match.sunWins : f.match.moonWins);
  const series = f.bestOf === 3 && wins(win) === 2;

  atEndOf('winner', win);
  if (f.endedBy !== 'resign' && !wrong) atEndOf('flawless', win);
  if (f.endedBy === 'all-found' && turns.length <= 4) atEndOf('speedrun', win);
  if (left.some((l) => l[win] - l[lose] >= 4)) atEndOf('comeback', win);
  if (left.at(-1)![lose] === 1) atEndOf('photo_finish', win);
  if (f.endedBy === 'trap') atEndOf('lucky_escape', win);
  if (turns.length >= 3 && turns.every(fullyFound)) atEndOf('mastermind', win, 'giver');
  if (series) atEndOf('series', win);
  if (series && wins(lose) === 0) atEndOf('whitewash', win);
  if (f.endedBy === 'resign') atEndOf('white_flag', lose);
  const facts: PlayerGameFact[] = f.players.map((p) => ({
    gameId: f.gameId,
    playerId: p.playerId,
    endedAt: f.finishedAt,
    place: p.team === win ? 1 : 2,
    won: p.team === win,
  }));
  out.push(...nightOwl(facts, tz));
  return out.sort(byEarned);
}

// ——— careers ———

/** One seat of a finished (not abandoned) game: the server's ishaara_game_players row, as careers read it. */
export interface IshCareerRow {
  gameId: string;
  playerId: string;
  finishedAt: number;
  won: boolean;
  role: Role;
  /** The team's cards found by its guesses in the game (penalty reveals aren't finds). */
  wordsFound: number;
  /** Clues given: the clue-giver's row only. */
  cluesGiven: number;
}

const factOf = (r: IshCareerRow): PlayerGameFact => ({
  gameId: r.gameId,
  playerId: r.playerId,
  endedAt: r.finishedAt,
  place: r.won ? 1 : 2,
  won: r.won,
});

const ended = (rows: readonly IshCareerRow[]) =>
  [...rows].sort((a, b) => a.finishedAt - b.finishedAt || (a.gameId < b.gameId ? -1 : 1));

/** `<prefix>_N` at the game whose running total of `count` reaches N. */
function totals(
  rows: readonly IshCareerRow[],
  prefix: string,
  ns: number[],
  count: (r: IshCareerRow) => number,
): Earned[] {
  const out: Earned[] = [];
  const sorted = ended(rows);
  for (const id of new Set(rows.map((r) => r.playerId))) {
    let sum = 0;
    for (const r of sorted.filter((x) => x.playerId === id)) {
      const before = sum;
      sum += count(r);
      for (const n of ns)
        if (before < n && sum >= n) out.push(atEnd(factOf(r), `${prefix}_${n}`, { n }));
    }
  }
  return out;
}

const giverWin = (r: IshCareerRow) => (r.won && r.role === 'clue-giver' ? 1 : 0);

/** Every career achievement in these rows (every seat of every game the players were in, so crew can count). */
export function careerAchievements(rows: readonly IshCareerRow[]): Earned[] {
  const facts = rows.map(factOf);
  return [
    ...winStreaks(facts),
    ...gamesPlayed(facts),
    ...totals(rows, 'giver_wins', GIVER_WINS_STEPS, giverWin),
    ...totals(rows, 'clues', CLUES_STEPS, (r) => r.cluesGiven),
    ...totals(rows, 'found', FOUND_STEPS, (r) => r.wordsFound),
    ...crew(facts),
  ].sort(byEarned);
}

/** Each ladder's count for one player, counted the way its codes are earned. */
export function ladderCounts(
  rows: readonly IshCareerRow[],
  playerId: string,
): Record<IshLadderId, number> {
  const c = careerCounts(rows.map(factOf), playerId);
  const mine = rows.filter((r) => r.playerId === playerId);
  const sum = (f: (r: IshCareerRow) => number) => mine.reduce((s, r) => s + f(r), 0);
  return {
    wins: c.wins,
    games: c.games,
    giver_wins: sum(giverWin),
    clues: sum((r) => r.cluesGiven),
    found: sum((r) => r.wordsFound),
    crew: c.crew,
  };
}
