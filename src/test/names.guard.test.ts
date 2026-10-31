import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const sources = walk(root)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => ({
    file: path.relative(root, f).split(path.sep).join('/'),
    text: readFileSync(f, 'utf8'),
  }));

/** Files that may hold a pattern, and why: a name is shortened only where the plan allows it. */
const ALLOWED: Record<string, string[]> = {
  // Seat labels ellipsize by width; the podium and the Scoreboard headers show a short name.
  'text-ellipsis': ['components/ui/Table.tsx'],
  'trunc(': ['screens/Winner.tsx', 'sheets/BoardBody.tsx'],
};

describe('names are never cut where the player is the focus', () => {
  it('uses no truncate or line-clamp class anywhere', () => {
    const hits = sources
      .filter((s) => /\b(truncate|line-clamp-\d)\b/.test(s.text))
      .map((s) => s.file);
    expect(hits).toEqual([]);
  });

  it.each(Object.entries(ALLOWED))(
    '%s appears only in the places that may shorten a name',
    (needle, files) => {
      const hits = sources
        .filter((s) => s.file !== 'lib/format.ts' && s.text.includes(needle))
        .map((s) => s.file)
        .sort();
      expect(hits).toEqual([...files].sort());
    },
  );

  it('gives every shortened name its full text as a tooltip or accessible name', () => {
    const table = sources.find((s) => s.file === 'components/ui/Table.tsx')!.text;
    expect(table).toMatch(/data-seat-name[\s\S]{0,400}title=\{p\.name\}/);
    const board = sources.find((s) => s.file === 'sheets/BoardBody.tsx')!.text;
    expect(board).toMatch(/title=\{p\.name\}/);
    const winner = sources.find((s) => s.file === 'screens/Winner.tsx')!.text;
    expect(winner).toMatch(/aria-hidden>\{trunc\(/);
  });
});
