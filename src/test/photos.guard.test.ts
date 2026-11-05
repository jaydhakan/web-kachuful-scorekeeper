import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// "🦊 Jay" written as text hides the player's photo; PlayerTag (or Avatar/Dot) draws the face instead.
const EMOJI_THEN_NAME = [
  /\{[^{}]*\.emoji\}\s*\{[^{}]*\.(?:display)?[nN]ame\}/,
  /\$\{[^{}]*\.emoji\}\s*\$\{[^{}]*\.(?:display)?[nN]ame\}/,
];

describe('players are drawn with their photo', () => {
  it('never writes a player as emoji then name in a component', () => {
    const hits = walk(root)
      .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
      .filter((f) => EMOJI_THEN_NAME.some((re) => re.test(readFileSync(f, 'utf8'))))
      .map((f) => path.relative(root, f));
    expect(hits).toEqual([]);
  });
});
