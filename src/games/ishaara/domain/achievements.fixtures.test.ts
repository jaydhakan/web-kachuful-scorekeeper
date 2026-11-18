import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { winRateStandings } from '../../../progression/rules';
import type { PlayerGameFact } from '../../../progression/types';
import { dayRange, monthRange, prevMonth } from '../../../progression/zone';
import {
  careerAchievements,
  gameAchievements,
  gameFacts,
  ladderCounts,
  type IshCareerRow,
} from './achievements';
import {
  dailyAwards,
  SEASON_MIN_GAMES,
  seasonAwards,
  type IshDayGame,
  type IshPlayRow,
} from './awards';
import { seeded } from './deal';
import * as played from './__fixtures__/played';
import type { Role, Team } from './types';

/**
 * Ishaara's achievement and award fixtures for the backend's rules mirror: `EXPORT_FIXTURES=1 npx vitest run
 * src/games/ishaara/domain/achievements.fixtures.test.ts` rewrites contract/fixtures/ishaara-achievements-*.json and
 * ishaara-awards-*.json; otherwise this fails when they no longer match the rules. Days and months are Kolkata's.
 */
const DIR = path.resolve(import.meta.dirname, '../../../../contract/fixtures');
const TZ = 'Asia/Kolkata';

function check(name: string, out: unknown) {
  const file = path.join(DIR, `${name}.json`);
  const text = JSON.stringify(out, null, 1) + '\n';
  if (process.env.EXPORT_FIXTURES) writeFileSync(file, text);
  expect(existsSync(file), `${file} is missing: run with EXPORT_FIXTURES=1`).toBe(true);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(JSON.parse(text));
}

const GAMES = {
  'meld-and-overtime': played.meldAndOvertime(),
  masterclass: played.masterclass(),
  'big-clues': played.bigClues(),
  undone: played.undone(),
  'trap-at-the-end': played.trapAtTheEnd(),
  'own-goal': played.ownGoal(),
  penalty: played.penalty(),
  'series-2-0': played.bestOfThree(2, { sunWins: 1, moonWins: 0 }),
  'series-2-1': played.bestOfThree(3, { sunWins: 1, moonWins: 1 }),
  'late-night': played.lateNight(),
};

const PEOPLE = Array.from(
  { length: 14 },
  (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
);
const START = Date.UTC(2026, 8, 20, 12);

interface SetGame {
  game: IshDayGame;
  rows: IshPlayRow[];
}

/**
 * A made-up set of finished games over two months: 4 to 6 seats from 14 people (the first in every game, to reach
 * the ladders' steps), random roles, finds, clues, traps and ends. Only the numbers the rules read.
 */
function gameSet(n: number): SetGame[] {
  const rnd = seeded(2026);
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const ends: IshDayGame['endedBy'][] = ['all-found', 'all-found', 'all-found', 'trap', 'resign'];
  const out: SetGame[] = [];
  let t = START;
  for (let g = 0; g < n; g++) {
    t += int(20, 12 * 60) * 60e3;
    const seats = int(4, 6);
    const pool = PEOPLE.slice(1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = int(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const ids = [PEOPLE[0], ...pool.slice(0, seats - 1)];
    const winner: Team = rnd() < 0.5 ? 'sun' : 'moon';
    const endedBy = ends[int(0, ends.length - 1)];
    const gameId = `70000000-0000-4000-8000-${String(g + 1).padStart(12, '0')}`;
    const team = (i: number): Team => (i % 2 ? 'moon' : 'sun');
    const per: Record<Team, { found: number; clues: number; trap: boolean }> = {
      sun: { found: int(2, 9), clues: int(2, 7), trap: false },
      moon: { found: int(2, 8), clues: int(2, 7), trap: false },
    };
    if (endedBy === 'trap') per[winner === 'sun' ? 'moon' : 'sun'].trap = true;
    const giverAt = { sun: int(0, 1) * 2, moon: int(0, 1) * 2 + 1 };
    const rows = ids.map((playerId, i): IshPlayRow => {
      const tm = team(i);
      const role: Role = i === giverAt[tm] ? 'clue-giver' : 'guesser';
      return {
        gameId,
        playerId,
        team: tm,
        role,
        won: tm === winner,
        wordsFound: per[tm].found,
        cluesGiven: role === 'clue-giver' ? per[tm].clues : 0,
        trapHit: per[tm].trap,
        finishedAt: t,
      };
    });
    out.push({
      game: {
        gameId,
        endedBy,
        startedAt: rnd() < 0.1 ? null : t - int(3, 25) * 60e3,
        finishedAt: t,
      },
      rows,
    });
  }
  return out;
}

const SET = gameSet(170);
const rowsOf = (games: SetGame[]) => games.flatMap((g) => g.rows);
const careerRow = (r: IshPlayRow): IshCareerRow => ({
  gameId: r.gameId,
  playerId: r.playerId,
  finishedAt: r.finishedAt,
  won: r.won,
  role: r.role,
  wordsFound: r.wordsFound,
  cluesGiven: r.cluesGiven,
});

describe('Ishaara achievement fixtures', () => {
  it('ishaara-achievements-games', () => {
    check('ishaara-achievements-games', {
      kind: 'ishaara-achievements-games',
      tz: TZ,
      cases: Object.entries(GAMES).map(([name, k]) => {
        const facts = gameFacts(k.state)!;
        return { name, facts, expect: gameAchievements(facts, TZ) };
      }),
    });
  });

  it('ishaara-achievements-career', () => {
    const rows = rowsOf(SET).map(careerRow);
    check('ishaara-achievements-career', {
      kind: 'ishaara-achievements-career',
      rows,
      expect: {
        earned: careerAchievements(rows),
        ladders: Object.fromEntries(PEOPLE.map((id) => [id, ladderCounts(rows, id)])),
      },
    });
  });
});

const DAYS = ['2026-09-21', '2026-10-01', '2026-10-10', '2026-10-24', '2026-11-02', '2026-11-12'];
const MONTHS = ['2026-09', '2026-10', '2026-11'];

const factOf = (r: IshPlayRow): PlayerGameFact => ({
  gameId: r.gameId,
  playerId: r.playerId,
  endedAt: r.finishedAt,
  place: r.won ? 1 : 2,
  won: r.won,
});

describe('Ishaara award fixtures', () => {
  it('ishaara-awards-daily', () => {
    check('ishaara-awards-daily', {
      kind: 'ishaara-awards-daily',
      tz: TZ,
      days: DAYS.map((date) => {
        const [from, to] = dayRange(date, TZ);
        const games = SET.filter((g) => g.game.finishedAt >= from && g.game.finishedAt < to);
        return {
          date,
          rows: rowsOf(games),
          games: games.map((g) => g.game),
          expect: dailyAwards(
            rowsOf(games),
            games.map((g) => g.game),
          ),
        };
      }),
    });
  });

  it('ishaara-awards-season', () => {
    const facts = rowsOf(SET).map(factOf);
    const standingsOf = (month: string) => {
      const [from, to] = monthRange(month, TZ);
      return winRateStandings(facts, from, to, SEASON_MIN_GAMES);
    };
    check('ishaara-awards-season', {
      kind: 'ishaara-awards-season',
      tz: TZ,
      minGames: SEASON_MIN_GAMES,
      seasons: MONTHS.map((season) => {
        const [from, to] = monthRange(season, TZ);
        const rows = rowsOf(SET).filter((r) => r.finishedAt >= from && r.finishedAt < to);
        const standings = standingsOf(season);
        const last = standingsOf(prevMonth(season));
        return { season, standings, last, rows, expect: seasonAwards(standings, last, rows) };
      }),
    });
    // The set has to exercise the rules: someone qualifies, and a clue-giver passes 20 clues.
    expect(standingsOf('2026-10').some((r) => r.qualified)).toBe(true);
  });
});
