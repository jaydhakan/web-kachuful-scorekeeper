import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { progression as ishaara } from '../games/ishaara/progression';
import { progression as kaaliTeeri } from '../games/kaali-teeri/progression';
import { progression as kachuful } from '../games/kachuful/progression';
import { progression as spades } from '../games/spades/progression';
import { LEVELS, SIKKE, achievementSikke } from './sikke';

/**
 * Sikke's rules for the backend (contract/README.md): `EXPORT_FIXTURES=1 npx vitest run
 * src/progression/sikke.export.test.ts` rewrites the file; otherwise the committed file must still match.
 */
const DIR = path.resolve(import.meta.dirname, '../../contract/fixtures');
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

const games = [kachuful, kaaliTeeri, spades, ishaara].map((p) => [
  p.id,
  Object.fromEntries(p.catalogue.map((d) => [d.code, achievementSikke(d, p.ladders)])),
]);

const fixture = { rates: SIKKE, levels: LEVELS, achievements: Object.fromEntries(games) };

describe('Sikke golden fixture', () => {
  it(process.env.EXPORT_FIXTURES ? 'writes it' : 'matches the rules', () => {
    const p = path.join(DIR, 'sikke-rules.json');
    if (process.env.EXPORT_FIXTURES) {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(p, json(fixture));
    } else {
      expect(existsSync(p)).toBe(true);
      expect(readFileSync(p, 'utf8')).toBe(json(fixture));
    }
  });
});
