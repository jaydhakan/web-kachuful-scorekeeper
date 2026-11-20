import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { kursiFrom, type KursiGame } from './kursi';

/**
 * The Kursi's golden fixtures for the backend (contract/README.md): `EXPORT_FIXTURES=1 npx vitest run
 * src/progression/kursi.export.test.ts` rewrites them; otherwise the committed files must still match the rule.
 */
const DIR = path.resolve(import.meta.dirname, '../../contract/fixtures');
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

const g = (id: string, at: number, places: [string, number][], teams = false): KursiGame => ({
  gameId: id,
  endedAt: at,
  seats: places.map(([playerId, place], seat) => ({ playerId, place, seat })),
  ...(teams && { teams: true }),
});

const CASES: KursiGame[] = [
  // Two at the table: never counts.
  g('k01', 1000, [
    ['ana', 1],
    ['ben', 2],
  ]),
  g('k02', 2000, [
    ['ana', 1],
    ['ben', 2],
    ['cy', 3],
  ]),
  // Ana defends, then sits out, then a tie at the top above her goes to the earlier seat.
  g('k03', 3000, [
    ['ben', 2],
    ['ana', 1],
    ['cy', 3],
  ]),
  g('k04', 4000, [
    ['ben', 1],
    ['cy', 2],
    ['dee', 3],
  ]),
  g('k05', 5000, [
    ['dee', 1],
    ['cy', 1],
    ['ana', 3],
  ]),
  // A tie with the holder is a defence.
  g('k06', 6000, [
    ['dee', 1],
    ['ben', 1],
    ['cy', 3],
  ]),
  // Games may arrive in any order; equal times sort by id.
  g('k08', 7000, [
    ['eli', 1],
    ['dee', 2],
    ['ana', 3],
  ]),
  g('k07', 7000, [
    ['dee', 1],
    ['eli', 2],
    ['ana', 3],
  ]),
  // A team game: the winning side takes it together; it stays while one of them at the table is unbeaten.
  g(
    'k09',
    9000,
    [
      ['ana', 1],
      ['ben', 1],
      ['eli', 3],
      ['cy', 3],
    ],
    true,
  ),
  g(
    'k10',
    10000,
    [
      ['ana', 1],
      ['cy', 1],
      ['ben', 3],
      ['dee', 3],
    ],
    true,
  ),
  g(
    'k11',
    11000,
    [
      ['dee', 1],
      ['eli', 1],
      ['ana', 3],
      ['ben', 3],
    ],
    true,
  ),
];

const fixtures = { 'kursi-cases': { games: CASES, expect: kursiFrom(CASES) } };

describe('Kursi golden fixtures', () => {
  it(process.env.EXPORT_FIXTURES ? 'writes them' : 'match the rule', () => {
    for (const [file, fx] of Object.entries(fixtures)) {
      const p = path.join(DIR, file + '.json');
      if (process.env.EXPORT_FIXTURES) {
        mkdirSync(DIR, { recursive: true });
        writeFileSync(p, json(fx));
      } else {
        expect(existsSync(p), file).toBe(true);
        expect(readFileSync(p, 'utf8'), file).toBe(json(fx));
      }
    }
  });
});
