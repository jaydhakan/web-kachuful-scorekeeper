/**
 * Spades' achievements (plan §9), earned by a player from the games this device holds. Hand ones count every scored
 * hand of a game not cancelled; game ones count finished games. Pure, with relative imports like boards.ts.
 */
import { allFacts } from './boards';
import { teamOf } from './seats';
import { handLines } from './standings';
import type { Seat, SpGame, TeamId } from './types';
import { pidOf } from '../../../people/pid';

export const SP_ACHIEVEMENTS = [
  'boston',
  'iceCold',
  'blindside',
  'nilBreaker',
  'setThem',
  'comeback',
  'exact',
  'mercy',
  'perfectPair',
  'sandbagged',
] as const;
export type SpAchievement = (typeof SP_ACHIEVEMENTS)[number];

/** Points behind that a win must come back from. */
export const COMEBACK_GAP = 150;
/** Wins with one partner for Perfect Pair. */
export const PAIR_WINS = 10;

export interface SpEarned {
  id: SpAchievement;
  /** How many times; Perfect Pair counts each partner reached. */
  count: number;
  /** When it was last earned. */
  at: number;
}

const SEATS: Seat[] = [0, 1, 2, 3];
const other = (t: TeamId): TeamId => (t === 'a' ? 'b' : 'a');

/** Every achievement `player` (a pidOf key) has earned, in SP_ACHIEVEMENTS order; unearned ones are left out. */
export function spAchievements(games: readonly SpGame[], player: string): SpEarned[] {
  const got = new Map<SpAchievement, SpEarned>();
  const earn = (id: SpAchievement, at: number, n = 1) => {
    const e = got.get(id) ?? { id, count: 0, at: 0 };
    e.count += n;
    e.at = Math.max(e.at, at);
    got.set(id, e);
  };

  for (const g of games) {
    if (g.status === 'cancelled') continue;
    const seats = g.players.map((p) => pidOf(p));
    const lines = new Map(handLines(g.hands).map((l) => [l.index, l]));
    const at = g.finishedAt ?? g.updatedAt;
    let behind = 0;
    let team: TeamId | null = null;
    let every = true;
    let any = false;
    for (const h of g.hands) {
      const line = lines.get(h.index);
      if (!line) continue;
      const players =
        Array.isArray(h.players) && h.players.length === 4 ? h.players : (seats as string[]);
      const seat = SEATS.find((x) => players[x] === player);
      if (seat === undefined) continue;
      const t = teamOf(seat);
      const [mine, theirs] = [line[t], line[other(t)]];
      const when = h.doneAt ?? at;
      team = t;
      any = true;
      if (h.teamTricks?.[t === 'a' ? 0 : 1] === 13) earn('boston', when);
      const nil = mine.nils.find((n) => n.seat === seat && n.made);
      if (nil) earn(nil.blind ? 'blindside' : 'iceCold', when);
      if (h.tricks?.length && theirs.nils.some((n) => !n.made)) earn('nilBreaker', when);
      if (theirs.made === false) earn('setThem', when);
      if (mine.penalty > 0) earn('sandbagged', when, mine.penalty);
      behind = Math.max(behind, line.after[other(t)] - line.after[t]);
      every &&= mine.made !== false && mine.bags === 0;
    }
    if (g.status !== 'finished' || !g.result || !team || g.result.winner !== team) continue;
    if (behind >= COMEBACK_GAP) earn('comeback', at);
    if (any && every) earn('exact', at);
    if (g.result.endedBy === 'mercy') earn('mercy', at);
  }

  // Perfect Pair: once per partner reached, dated by the tenth win together.
  const wins = new Map<string, number[]>();
  for (const f of allFacts(games))
    if (f.player === player && f.partner && f.result === 'win')
      wins.set(f.partner, [...(wins.get(f.partner) ?? []), f.endedAt]);
  for (const ats of wins.values())
    if (ats.length >= PAIR_WINS) earn('perfectPair', ats.sort((x, y) => x - y)[PAIR_WINS - 1]);

  return SP_ACHIEVEMENTS.flatMap((id) => {
    const e = got.get(id);
    return e ? [e] : [];
  });
}
