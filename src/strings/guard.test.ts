import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(root).filter(
  (f) =>
    f.endsWith('.tsx') &&
    !f.endsWith('.test.tsx') &&
    !f.includes(`${path.sep}strings${path.sep}`) &&
    !f.includes(`${path.sep}test${path.sep}`),
);
const TEXT_ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label']);

function literals(file: string): string[] {
  const src = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n) && /[A-Za-z]{2,}/.test(n.text)) found.push(n.text.trim());
    if (
      ts.isJsxAttribute(n) &&
      TEXT_ATTRS.has(n.name.getText()) &&
      n.initializer &&
      ts.isStringLiteral(n.initializer)
    )
      found.push(n.initializer.text);
    ts.forEachChild(n, visit);
  };
  visit(src);
  return found;
}

describe('i18n readiness', () => {
  it('keeps user-visible English out of components (it belongs in src/strings)', () => {
    const offenders = files.flatMap((f) =>
      literals(f).map((l) => `${path.relative(root, f)}: "${l}"`),
    );
    expect(offenders).toEqual([]);
  });
});
