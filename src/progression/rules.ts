/**
 * The rules every game shares (plan §2): win streaks, games played, crew, night owl, wooden spoon, the awards helper,
 * and win-rate seasons. Pure, over facts each game builds from its own data. Kachuful keeps its own copies.
 */
import { best } from './awards';
import { monthRange, partsIn, prevMonth } from './zone';
import type { Award, Earned, Ladder, PlayerGameFact, SeasonResult, WinRateRow } from './types';

export { best };

export const WIN_STREAK: Ladder<'wins'> = {
  id: 'wins',
  codes: ['first_win', 'back_to_back', 'hat_trick', 'dynasty'],
  steps: [1, 2, 3, 5],
};

export const GAMES_STEPS = [10, 50, 100, 250];
export const CREW_STEPS = [10, 25];

/** A ladder whose codes are `<prefix>_<step>`, as `games_10` … `games_250`. */
export const countLadder = <Id extends string>(
  id: Id,
  prefix: string,
  steps: number[],
): Ladder<Id> => ({ id, codes: steps.map((n) => `${prefix}_${n}`), steps });

export const GAMES_LADDER = countLadder('games', 'games', GAMES_STEPS);
export const CREW_LADDER = countLadder('crew', 'crew', CREW_STEPS);

/** An achievement for one player's finished game, earned when it ended. */
export const atEnd = (
  p: PlayerGameFact,
  code: string,
  data: Record<string, unknown> = {},
): Earned => ({
  code,
  playerId: p.playerId,
  gameId: p.gameId,
  roundIndex: null,
  period: null,
  earnedAt: p.endedAt,
  data,
});

/** Oldest first; games ending together keep the order of their ids. */
const byEnd = (facts: readonly PlayerGameFact[]) =>
  [...facts].sort((a, b) => a.endedAt - b.endedAt || (a.gameId < b.gameId ? -1 : 1));

const players = (facts: readonly PlayerGameFact[]) => [...new Set(facts.map((p) => p.playerId))];

/**
 * First Win at the first win ever; Back to Back, Hat-trick and Dynasty each time a run of wins reaches 2, 3 and 5
 * (a loss or a draw ends the run), as Kachuful counts them.
 */
export function winStreaks(facts: readonly PlayerGameFact[]): Earned[] {
  const out: Earned[] = [];
  const ended = byEnd(facts);
  for (const id of players(facts)) {
    let wins = 0,
      run = 0;
    for (const p of ended.filter((x) => x.playerId === id)) {
      if (!p.won) {
        run = 0;
        continue;
      }
      wins++;
      run++;
      if (wins === 1) out.push(atEnd(p, 'first_win'));
      if (run === 2) out.push(atEnd(p, 'back_to_back'));
      if (run === 3) out.push(atEnd(p, 'hat_trick'));
      if (run === 5) out.push(atEnd(p, 'dynasty'));
    }
  }
  return out;
}

/** `games_N` at a player's Nth finished game. */
export function gamesPlayed(facts: readonly PlayerGameFact[], steps = GAMES_STEPS): Earned[] {
  const out: Earned[] = [];
  const ended = byEnd(facts);
  for (const id of players(facts))
    ended
      .filter((x) => x.playerId === id)
      .forEach((p, k) => {
        if (steps.includes(k + 1)) out.push(atEnd(p, `games_${k + 1}`, { n: k + 1 }));
      });
  return out;
}

/** Everyone else in each game, from the facts of that game. */
const tablesOf = (facts: readonly PlayerGameFact[]) => {
  const t = new Map<string, string[]>();
  for (const p of facts) t.set(p.gameId, [...(t.get(p.gameId) ?? []), p.playerId]);
  return t;
};

/** `crew_N` at the game that takes the number of different people a player has shared a finished game with to N. */
export function crew(facts: readonly PlayerGameFact[], steps = CREW_STEPS): Earned[] {
  const out: Earned[] = [];
  const tables = tablesOf(facts);
  const ended = byEnd(facts);
  for (const id of players(facts)) {
    const met = new Set<string>();
    for (const p of ended.filter((x) => x.playerId === id)) {
      const before = met.size;
      for (const o of tables.get(p.gameId) ?? []) if (o !== id) met.add(o);
      for (const n of steps)
        if (before < n && met.size >= n) out.push(atEnd(p, `crew_${n}`, { n }));
    }
  }
  return out;
}

/** Finished between 1 and 5 am in `tz` (the device's zone when omitted). */
export const nightOwl = (facts: readonly PlayerGameFact[], tz?: string): Earned[] =>
  facts.flatMap((p) => {
    const h = partsIn(p.endedAt, tz).h;
    return h >= 1 && h < 5 ? [atEnd(p, 'night_owl')] : [];
  });

/** Last place (ties included), when not everyone shares it. */
export function woodenSpoon(facts: readonly PlayerGameFact[]): Earned[] {
  const worst = new Map<string, number>();
  for (const p of facts) worst.set(p.gameId, Math.max(worst.get(p.gameId) ?? 0, p.place));
  return facts.flatMap((p) => {
    const w = worst.get(p.gameId)!;
    return w > 1 && p.place === w ? [atEnd(p, 'wooden_spoon')] : [];
  });
}

/** The counts behind the shared ladders: longest run of wins, finished games, different people met. */
export function careerCounts(
  facts: readonly PlayerGameFact[],
  playerId: string,
): { wins: number; games: number; crew: number } {
  const mine = byEnd(facts).filter((p) => p.playerId === playerId);
  let run = 0,
    wins = 0;
  for (const p of mine) {
    run = p.won ? run + 1 : 0;
    wins = Math.max(wins, run);
  }
  const games = new Set(mine.map((p) => p.gameId));
  const met = new Set(
    facts.filter((p) => games.has(p.gameId) && p.playerId !== playerId).map((p) => p.playerId),
  );
  return { wins, games: mine.length, crew: met.size };
}

/**
 * A window's standings by win rate: ranked once a player has `minGames`, best rate first. Equal rates go to more
 * games; the same rate and games share a rank (the player id only orders the rows). The unranked follow, most games
 * first.
 */
export function winRateStandings(
  facts: readonly PlayerGameFact[],
  from: number,
  to: number,
  minGames: number,
): WinRateRow[] {
  const by = new Map<string, { games: number; wins: number }>();
  for (const p of facts) {
    if (p.endedAt < from || p.endedAt >= to) continue;
    const r = by.get(p.playerId) ?? { games: 0, wins: 0 };
    r.games++;
    if (p.won) r.wins++;
    by.set(p.playerId, r);
  }
  const rows: WinRateRow[] = [...by].map(([playerId, r]) => ({
    playerId,
    rank: null,
    qualified: r.games >= minGames,
    value: r.wins / r.games,
    games: r.games,
    wins: r.wins,
  }));
  const q = rows
    .filter((r) => r.qualified)
    .sort((a, b) => b.value - a.value || b.games - a.games || (a.playerId < b.playerId ? -1 : 1));
  q.forEach((r, k) => {
    const prev = q[k - 1];
    r.rank = prev && prev.value === r.value && prev.games === r.games ? prev.rank : k + 1;
  });
  const rest = rows
    .filter((r) => !r.qualified)
    .sort((a, b) => b.games - a.games || (a.playerId < b.playerId ? -1 : 1));
  return [...q, ...rest];
}

/** Champion, runner-up and third: everyone ranked 1, 2 or 3 (a tie shares the place). */
export function seasonPlaces(standings: readonly WinRateRow[]): Award[] {
  const out: Award[] = [];
  for (const [rank, code] of [
    [1, 'season_champion'],
    [2, 'season_runner_up'],
    [3, 'season_third'],
  ] as const)
    for (const r of standings.filter((x) => x.qualified && x.rank === rank))
      out.push({ code, playerId: r.playerId, value: r.value });
  return out;
}

/** The biggest rise in rank from last month's standings to this month's, among those ranked in both. */
export function climber(
  now: readonly WinRateRow[],
  before: readonly WinRateRow[],
  code = 'season_climber',
): Award[] {
  const was = new Map(before.filter((r) => r.qualified).map((r) => [r.playerId, r.rank!]));
  return best(
    now
      .filter((r) => r.qualified && was.has(r.playerId))
      .map((r) => [r.playerId, was.get(r.playerId)! - r.rank!]),
    code,
    1,
    (v) => v > 0,
  );
}

/** A month by win rate: its standings, the podium and the climber. A game adds its own season awards to these. */
export function winRateSeason(
  facts: readonly PlayerGameFact[],
  month: string,
  minGames: number,
  tz?: string,
): SeasonResult<WinRateRow> {
  const [from, to] = monthRange(month, tz);
  const standings = winRateStandings(facts, from, to, minGames);
  const [pf, pt] = monthRange(prevMonth(month), tz);
  const before = winRateStandings(facts, pf, pt, minGames);
  return {
    season: month,
    standings,
    awards: [...seasonPlaces(standings), ...climber(standings, before)],
  };
}
