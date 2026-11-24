/** Giant Killer (REWARDS-PLAN §6.7, extras): beating the Badshah at the table while holding no medal yourself. */
import { allAchievements } from './achievements';
import { leaderboard } from './leaderboard';
import { medalsOf, type Medals } from './medals';
import { monthOf, monthRange } from './ranges';
import { SEASON_MIN_ROUNDS } from './awards';
import type { Facts, GameFact, RoundFact } from './timeline';
import { earnedKey, type Earned } from '../../../progression/types';
import { prevMonth } from '../../../progression/zone';

/**
 * One ended game's Giant Killers: at a table where three or more played, each player holding no medal who finished
 * strictly above every seated 🥇 (a defending Badshah counts). `held` is the medals as they stood when the game
 * ended, before its own rounds counted. `data.badshah` is the best-placed seated Badshah (the smallest id on a tie).
 */
export function giantKillers(players: readonly GameFact[], held: Medals): Earned[] {
  const placed = players.filter((p) => p.place != null && p.endedAt != null);
  if (placed.length < 3) return [];
  const kings = placed.filter((p) => held.get(p.playerId)?.medal === 1);
  if (!kings.length) return [];
  const top = Math.min(...kings.map((p) => p.place!));
  const badshah = kings
    .filter((p) => p.place === top)
    .map((p) => p.playerId)
    .sort()[0];
  return placed
    .filter((p) => !held.has(p.playerId) && p.place! < top)
    .map((p) => ({
      code: 'giant_killer',
      playerId: p.playerId,
      gameId: p.gameId,
      roundIndex: null,
      period: null,
      earnedAt: p.endedAt!,
      data: { badshah },
    }));
}

/** The medals as a game ended, from this device's other rounds done before then (as the table's board counts them). */
export function medalsBefore(f: Facts, gameId: string, endedAt: number, tz?: string): Medals {
  return medalsIn(byTime(f.rounds), f, gameId, endedAt, tz);
}

const byTime = (rounds: readonly RoundFact[]) => [...rounds].sort((a, b) => a.doneAt - b.doneAt);

/** The first index in `rounds` (sorted by time) done at or after `t`. */
function firstAt(rounds: readonly RoundFact[], t: number) {
  let lo = 0,
    hi = rounds.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (rounds[mid].doneAt < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function medalsIn(
  sorted: readonly RoundFact[],
  f: Facts,
  gameId: string,
  endedAt: number,
  tz?: string,
) {
  const month = monthOf(endedAt, tz);
  const [from] = monthRange(month, tz);
  const [lf, lt] = monthRange(prevMonth(month), tz);
  // Only last month and this one up to the end count, so only those rounds are looked at.
  const rounds = sorted
    .slice(firstAt(sorted, lf), firstAt(sorted, endedAt))
    .filter((r) => r.gameId !== gameId);
  const others: Facts = { ...f, rounds };
  const board = (a: number, b: number) =>
    leaderboard(others, { from: a, to: b, metric: 'accuracy', minRounds: SEASON_MIN_ROUNDS }).rows;
  return medalsOf(board(from, endedAt), board(lf, lt));
}

/** Giant Killers across this device's ended games, each against the medals of its own time. */
export function giantKills(f: Facts, tz?: string): Earned[] {
  const sorted = byTime(f.rounds);
  return f.games.flatMap((g) => {
    if (g.endedAt == null || g.tableSize < 3) return [];
    const ps = f.players.filter((p) => p.gameId === g.gameId);
    return giantKillers(ps, medalsIn(sorted, f, g.gameId, g.endedAt, tz));
  });
}

/** Everything a signed-out device earns: the rules over its games, plus Giant Killer from its own medals. */
export function deviceAchievements(f: Facts, tz?: string): Earned[] {
  return [...allAchievements(f, tz), ...giantKills(f, tz)].sort(
    (a, b) => a.earnedAt - b.earnedAt || (earnedKey(a) < earnedKey(b) ? -1 : 1),
  );
}
