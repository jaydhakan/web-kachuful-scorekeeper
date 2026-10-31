import { partsIn } from './ranges';
import { doneRounds } from './rounds';
import { pidOf, roundFacts, type Facts, type GameFact, type RoundFact } from './timeline';
import type { Game, Player } from './types';

export type AchievementGroup = 'round' | 'game' | 'career' | 'daily' | 'season';

export interface AchievementDef {
  code: string;
  emoji: string;
  group: AchievementGroup;
  /** Worth the full-screen burst when earned live. */
  big?: boolean;
}

const d = (
  code: string,
  emoji: string,
  group: AchievementGroup,
  big?: boolean,
): AchievementDef => ({
  code,
  emoji,
  group,
  ...(big && { big }),
});

/** The catalogue (plan-backend §8). Names and descriptions are strings, by code. */
export const ACHIEVEMENTS: AchievementDef[] = [
  d('hot_3', '🔥', 'round', true),
  d('hot_5', '🚀', 'round', true),
  d('hot_8', '🐐', 'round', true),
  d('hot_12', '💎', 'round', true),
  d('cold_3', '🥶', 'round', true),
  d('cold_5', '💀', 'round', true),
  d('cold_8', '🪦', 'round', true),
  d('cold_12', '🧟', 'round', true),
  d('grand_slam', '💯', 'round', true),
  d('ninja', '🥷', 'round'),
  d('high_roller', '🎰', 'round'),
  d('peak_performer', '🏔️', 'round'),
  d('lone_wolf', '🐺', 'round'),
  d('odd_one_out', '🫠', 'round'),
  d('hooked', '🪝', 'round'),
  d('dealers_revenge', '😈', 'round'),
  d('winner', '🏆', 'game'),
  d('wire_to_wire', '🏁', 'game'),
  d('comeback', '🔄', 'game', true),
  d('photo_finish', '📸', 'game'),
  d('runaway', '🏃', 'game'),
  d('sharpshooter', '🎯', 'game'),
  d('perfect_game', '🌟', 'game', true),
  d('wooden_spoon', '🥄', 'game'),
  d('zero_hero', '0️⃣', 'game'),
  d('marathon', '🏃‍♂️', 'game'),
  d('full_house', '🏠', 'game'),
  d('night_owl', '🦉', 'game'),
  d('first_win', '🥇', 'career'),
  d('back_to_back', '✌️', 'career'),
  d('hat_trick', '🎩', 'career', true),
  d('dynasty', '🦸', 'career', true),
  d('spoon_collector', '🥄', 'career'),
  d('podium_regular', '🥉', 'career'),
  d('personal_best', '📈', 'career'),
  ...[10, 50, 100, 250, 500].map((n) => d(`games_${n}`, '🎲', 'career')),
  ...[100, 500, 1000, 5000].map((n) => d(`rounds_${n}`, '🔁', 'career')),
  ...[100, 500, 1000].map((n) => d(`made_${n}`, '✅', 'career')),
  ...[1000, 5000, 10000].map((n) => d(`points_${n}`, '💰', 'career')),
  d('crew_10', '👥', 'career'),
  d('crew_25', '👥', 'career'),
  d('rivalry_20', '⚔️', 'career'),
  d('day_star', '⭐', 'daily'),
  d('day_bang', '💥', 'daily'),
  d('day_ouch', '🤕', 'daily'),
  d('day_hot', '🔥', 'daily'),
  d('day_ice', '🧊', 'daily'),
  d('day_sharp', '🎯', 'daily'),
  d('day_grinder', '⏱️', 'daily'),
  d('day_hooked', '🪝', 'daily'),
  d('season_champion', '👑', 'season', true),
  d('season_runner_up', '🥈', 'season'),
  d('season_third', '🥉', 'season'),
  d('season_sharpest', '🎯', 'season'),
  d('season_iron', '🦾', 'season'),
  d('season_climber', '📈', 'season'),
];

export const ACH = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));

/** One earned achievement (the contract's Achievement, without the server's row id). */
export interface Earned {
  code: string;
  playerId: string;
  gameId: string | null;
  roundIndex: number | null;
  period: string | null;
  earnedAt: number;
  data: Record<string, unknown>;
}

/** Earned at most once per player, code, game, round and period. */
export const earnedKey = (e: Earned) =>
  [e.playerId, e.code, e.gameId ?? '', e.roundIndex ?? '', e.period ?? ''].join('|');

const STEPS = [3, 5, 8, 12];

const at = (r: RoundFact, code: string, data: Record<string, unknown> = {}): Earned => ({
  code,
  playerId: r.playerId,
  gameId: r.gameId,
  roundIndex: r.roundIndex,
  period: null,
  earnedAt: r.doneAt,
  data,
});

/** Round moments (§8.1) for the given round facts, earned at each round's doneAt. */
export function roundMoments(rounds: RoundFact[]): Earned[] {
  const out: Earned[] = [];
  const byRound = new Map<string, RoundFact[]>();
  for (const r of rounds) {
    const k = r.gameId + '|' + r.roundIndex;
    const list = byRound.get(k) ?? [];
    list.push(r);
    byRound.set(k, list);
  }
  for (const table of byRound.values()) {
    const missed = table.filter((r) => r.outcome === 'missed');
    const madeRows = table.filter((r) => r.outcome === 'made');
    for (const r of table) {
      const made = r.outcome === 'made';
      if (made && STEPS.includes(r.runHot)) out.push(at(r, `hot_${r.runHot}`, { n: r.runHot }));
      if (!made && STEPS.includes(r.runCold))
        out.push(at(r, `cold_${r.runCold}`, { n: r.runCold }));
      if (made && r.bid === r.cards && r.cards >= 5)
        out.push(at(r, 'grand_slam', { cards: r.cards }));
      if (made && r.bid === 0 && r.cards >= 7) out.push(at(r, 'ninja', { cards: r.cards }));
      if (made && r.bid >= 5) out.push(at(r, 'high_roller', { bid: r.bid }));
      if (made && r.bid >= 3 && r.cards === r.maxCards)
        out.push(at(r, 'peak_performer', { bid: r.bid }));
      if (r.tableSize >= 4 && made && madeRows.length === 1) out.push(at(r, 'lone_wolf'));
      if (r.tableSize >= 4 && !made && missed.length === 1) out.push(at(r, 'odd_one_out'));
      if (r.isDealer && r.hookHits >= 1) {
        out.push(at(r, 'hooked', { n: r.hookHits }));
        if (made) out.push(at(r, 'dealers_revenge'));
      }
    }
  }
  return out;
}

const fin = (p: GameFact, code: string, data: Record<string, unknown> = {}): Earned => ({
  code,
  playerId: p.playerId,
  gameId: p.gameId,
  roundIndex: null,
  period: null,
  earnedAt: p.endedAt!,
  data,
});

/** Standings (competition ranks) after each done round of one game. */
function placesAfterEachRound(rounds: RoundFact[]): Map<string, number>[] {
  const idx = [...new Set(rounds.map((r) => r.roundIndex))].sort((a, b) => a - b);
  const tot = new Map<string, number>();
  return idx.map((i) => {
    for (const r of rounds)
      if (r.roundIndex === i) tot.set(r.playerId, (tot.get(r.playerId) ?? 0) + r.points);
    const vals = [...tot.values()];
    return new Map([...tot.entries()].map(([id, v]) => [id, 1 + vals.filter((x) => x > v).length]));
  });
}

/** Game finish (§8.2) for every ended game, earned at its end. `tz` decides "night" (device zone when omitted). */
export function gameFinishes(f: Facts, tz?: string): Earned[] {
  const out: Earned[] = [];
  const roundsBy = new Map<string, RoundFact[]>();
  for (const r of f.rounds) {
    const l = roundsBy.get(r.gameId) ?? [];
    l.push(r);
    roundsBy.set(r.gameId, l);
  }
  for (const info of f.games) {
    if (info.endedAt == null || !info.rounds) continue;
    const ps = f.players.filter((p) => p.gameId === info.gameId && p.place != null);
    if (!ps.length) continue;
    const rounds = roundsBy.get(info.gameId) ?? [];
    const steps = placesAfterEachRound(rounds);
    const n = info.rounds;
    const worst = Math.max(...ps.map((p) => p.place!));
    const sorted = [...ps].sort((a, b) => b.points - a.points);
    const hour = partsIn(info.endedAt, tz).h;
    for (const p of ps) {
      const won = p.place === 1;
      const soleWin = won && ps.filter((x) => x.place === 1).length === 1;
      const margin = soleWin ? p.points - sorted[1].points : 0;
      if (won) out.push(fin(p, 'winner', { points: p.points }));
      if (won && n >= 6 && steps.every((s) => s.get(p.playerId) === 1))
        out.push(fin(p, 'wire_to_wire'));
      if (won) {
        // Last (ties included) after some round at or past the halfway point, before the final one.
        const low = steps.some(
          (s, k) =>
            (k + 1) * 2 >= n &&
            k < steps.length - 1 &&
            s.get(p.playerId) === Math.max(...s.values()),
        );
        if (low && ps.length > 1) out.push(fin(p, 'comeback'));
      }
      if (soleWin && margin <= 10) out.push(fin(p, 'photo_finish', { by: margin }));
      if (soleWin && margin >= 100) out.push(fin(p, 'runaway', { by: margin }));
      if (p.rounds >= 10 && p.made / p.rounds >= 0.8)
        out.push(fin(p, 'sharpshooter', { made: p.made, rounds: p.rounds }));
      if (p.rounds >= 6 && p.made === p.rounds) out.push(fin(p, 'perfect_game'));
      if (worst > 1 && p.place === worst) out.push(fin(p, 'wooden_spoon'));
      if (p.rounds >= 6 && p.points === 0) out.push(fin(p, 'zero_hero'));
      if (n >= 30) out.push(fin(p, 'marathon', { rounds: n }));
      if (info.tableSize === 10) out.push(fin(p, 'full_house'));
      if (hour >= 1 && hour < 5) out.push(fin(p, 'night_owl'));
    }
  }
  return out;
}

const CAREER_GAMES = [10, 50, 100, 250, 500];
const CAREER_ROUNDS = [100, 500, 1000, 5000];
const CAREER_MADE = [100, 500, 1000];
const CAREER_POINTS = [1000, 5000, 10000];

/** Career achievements (§8.3) over every player's ended games (by end time) and done rounds (by time). */
export function careerAchievements(f: Facts): Earned[] {
  const out: Earned[] = [];
  const ended = f.players
    .filter((p) => p.endedAt != null && p.place != null)
    .sort((a, b) => a.endedAt! - b.endedAt! || (a.gameId < b.gameId ? -1 : 1));
  const tables = new Map<string, string[]>();
  for (const p of ended) tables.set(p.gameId, [...(tables.get(p.gameId) ?? []), p.playerId]);
  const ids = [...new Set(f.players.map((p) => p.playerId))];
  for (const id of ids) {
    const games = ended.filter((p) => p.playerId === id);
    let wins = 0,
      winRun = 0,
      spoonRun = 0,
      podiumRun = 0,
      best = -Infinity;
    const crew = new Set<string>();
    const rivals = new Map<string, number>();
    games.forEach((p, k) => {
      const worst = Math.max(...ended.filter((x) => x.gameId === p.gameId).map((x) => x.place!));
      if (p.won) {
        wins++;
        winRun++;
        if (wins === 1) out.push(fin(p, 'first_win'));
        if (winRun === 2) out.push(fin(p, 'back_to_back'));
        if (winRun === 3) out.push(fin(p, 'hat_trick'));
        if (winRun === 5) out.push(fin(p, 'dynasty'));
      } else winRun = 0;
      spoonRun = worst > 1 && p.place === worst ? spoonRun + 1 : 0;
      if (spoonRun === 3) out.push(fin(p, 'spoon_collector'));
      podiumRun = p.place! <= 3 ? podiumRun + 1 : 0;
      if (podiumRun === 5) out.push(fin(p, 'podium_regular'));
      if (k >= 3 && p.points > best) out.push(fin(p, 'personal_best', { points: p.points }));
      best = Math.max(best, p.points);
      if (CAREER_GAMES.includes(k + 1)) out.push(fin(p, `games_${k + 1}`, { n: k + 1 }));
      const before = crew.size;
      let rival: string | null = null;
      for (const o of [...(tables.get(p.gameId) ?? [])].sort()) {
        if (o === id) continue;
        crew.add(o);
        const c = (rivals.get(o) ?? 0) + 1;
        rivals.set(o, c);
        if (c === 20 && !rival) rival = o;
      }
      for (const n of [10, 25])
        if (before < n && crew.size >= n) out.push(fin(p, `crew_${n}`, { n }));
      if (rival) out.push(fin(p, 'rivalry_20', { with: rival }));
    });
    const rounds = f.rounds
      .filter((r) => r.playerId === id)
      .sort(
        (a, b) =>
          a.doneAt - b.doneAt ||
          (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0) ||
          a.roundIndex - b.roundIndex,
      );
    let made = 0,
      pos = 0;
    rounds.forEach((r, k) => {
      if (CAREER_ROUNDS.includes(k + 1)) out.push(at(r, `rounds_${k + 1}`, { n: k + 1 }));
      if (r.outcome === 'made') {
        made++;
        if (CAREER_MADE.includes(made)) out.push(at(r, `made_${made}`, { n: made }));
      }
      if (r.points > 0) {
        const was = pos;
        pos += r.points;
        for (const n of CAREER_POINTS)
          if (was < n && pos >= n) out.push(at(r, `points_${n}`, { n }));
      }
    });
  }
  return out;
}

/** Everything earned from a set of games (round, game and career), oldest first. */
export function allAchievements(f: Facts, tz?: string): Earned[] {
  return [...roundMoments(f.rounds), ...gameFinishes(f, tz), ...careerAchievements(f)].sort(
    (a, b) => a.earnedAt - b.earnedAt || (earnedKey(a) < earnedKey(b) ? -1 : 1),
  );
}

/** The round moments earned in a game's last done round, with the seat that earned each (for live pop-ups). */
export function lastRoundMoments(g: Game): { e: Earned; p: Player }[] {
  const last = doneRounds(g).at(-1);
  if (!last) return [];
  const rf = roundFacts(g).filter((r) => r.roundIndex === last.index);
  return roundMoments(rf).flatMap((e) => {
    const p = g.players.find((x) => pidOf(x) === e.playerId);
    return p ? [{ e, p }] : [];
  });
}
