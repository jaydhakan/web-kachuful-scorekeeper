import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { kitGame } from './__fixtures__/kit';
import { NIGHT_FRESH_MS, NIGHT_GAP_MS, nightOf } from './night';
import { buildFacts } from './timeline';

/**
 * The night's golden fixtures for the backend's `close-nights` (backend-requests §7): `EXPORT_FIXTURES=1 npx vitest
 * run src/games/kachuful/domain/night.export.test.ts` rewrites them; otherwise the committed file must still match.
 */
const DIR = path.resolve(import.meta.dirname, '../../../../contract/fixtures');
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

const H = 3600e3;
// 21:00 Kolkata, so the second night crosses midnight.
const T0 = Date.UTC(2026, 10, 20, 15, 30);
const TRIO = ['riya', 'dev', 'asha'];

const game = (id: string, start: number, made: boolean[][], players = TRIO, finished = true) =>
  kitGame({ id, players, rounds: made.map((m) => ({ made: m })), start, finished });

const older = game('n0', T0 - 48 * H, [
  [true, false, false],
  [true, true, false],
]);
const g1 = game('n1', T0, [
  [true, true, false],
  [true, false, true],
  [false, true, true],
]);
const g2 = game('n2', T0 + 1 * H, [
  [false, true, true],
  [false, true, false],
  [true, false, true],
]);
// After midnight Kolkata, still the same night.
const g3 = game('n3', T0 + 3 * H, [
  [false, false, true],
  [false, true, true],
]);
const pair = game(
  'n4',
  T0 + 4 * H,
  [
    [true, false],
    [false, true],
  ],
  ['riya', 'dev'],
);
const unfinished = game('n5', T0 + 2 * H, [[true, false, false]], TRIO, false);
const four = game(
  'n6',
  T0 + 5 * H,
  [
    [false, true, true, false],
    [true, true, false, false],
    [false, false, true, true],
  ],
  ['riya', 'dev', 'asha', 'kabir'],
);
const lone = game('n7', g2.finishedAt! + NIGHT_GAP_MS + 60e3, [[false, true, false]]);

const at = (games: ReturnType<typeof game>[], now: number) => ({
  games,
  now,
  night: nightOf(buildFacts(games, now), now),
});
const end = (g: ReturnType<typeof game>) => g.finishedAt!;

const CASES = {
  // The plain night: two games, and an older night that only seeds the Kursi.
  two: at([older, g1, g2], end(g2) + H),
  // Across midnight, a two-seat game (no brave call from it) and a game still open (left out).
  midnight: at([older, g1, g2, g3, pair, unfinished], end(pair) + H),
  // A fourth player joins late.
  late: at([g1, g2, g3, four], end(four) + 2 * H),
  // A gap past three hours starts a new night.
  gap: at([g1, g2, lone], end(lone) + H),
  // Too old to be tonight.
  stale: at([g1, g2], end(g2) + NIGHT_FRESH_MS + 1),
};

describe('night golden fixtures', () => {
  it(process.env.EXPORT_FIXTURES ? 'writes them' : 'match the rule', () => {
    const p = path.join(DIR, 'night-cases.json');
    const fx = { gapMs: NIGHT_GAP_MS, freshMs: NIGHT_FRESH_MS, cases: CASES };
    if (process.env.EXPORT_FIXTURES) {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(p, json(fx));
    } else {
      expect(existsSync(p)).toBe(true);
      expect(readFileSync(p, 'utf8')).toBe(json(fx));
    }
  });

  it('cover a crossed Kursi, a brave call and an empty night', () => {
    expect(CASES.stale.night).toBeNull();
    expect(CASES.gap.night?.gameIds).toEqual(['n7']);
    expect(CASES.midnight.night?.gameIds).not.toContain('n5');
    expect(CASES.midnight.night?.braveCall).not.toBeNull();
    expect([CASES.two, CASES.midnight, CASES.late].some((c) => c.night!.kursi.length > 0)).toBe(
      true,
    );
  });
});
