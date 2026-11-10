import postcss, { type ChildNode, type Container } from 'postcss';
import type { Plugin, Rollup } from 'vite';

/** A rule with the at-rules around it, so `.p-4` and `@media … { .p-4 }` stay different rules. */
function signature(node: ChildNode): string {
  const at: string[] = [];
  let p: postcss.Node | postcss.Document | undefined = node.parent;
  while (p?.type === 'atrule') {
    const a = p as postcss.AtRule;
    at.unshift(`@${a.name} ${a.params}`);
    p = a.parent;
  }
  return `${at.join('|')}|${node.toString()}`;
}

function rulesOf(root: Container, out = new Set<string>()) {
  root.walkRules((r) => void out.add(signature(r)));
  return out;
}

/** Removes the rules `shared` already has, then any at-rule left empty. */
export function withoutShared(css: string, shared: string): string {
  const have = rulesOf(postcss.parse(shared));
  const own = postcss.parse(css);
  own.walkRules((r) => {
    if (have.has(signature(r))) r.remove();
  });
  own.walkAtRules((a) => {
    if (a.nodes && a.nodes.length === 0) a.remove();
  });
  return own.toString();
}

const fromSource = (a: Rollup.OutputAsset, src: string) =>
  (a.originalFileNames ?? []).some((f) => f.endsWith(src));

/**
 * `chunk` is the module whose CSS is the game's sheet (its lazy root); the site's sheet is the one index.html loads.
 * A game's own Tailwind sheet (built from its own content, so its utilities stay out of the first load) keeps only
 * rules the site's sheet lacks. Those are class names no other page uses, so the sheet can't change another page's
 * look even after it has loaded once.
 */
export function ownCss(src: string): Plugin {
  return {
    name: 'own-css',
    apply: 'build',
    generateBundle(_, bundle) {
      const css = Object.values(bundle).filter(
        (a): a is Rollup.OutputAsset => a.type === 'asset' && a.fileName.endsWith('.css'),
      );
      const own = css.find((a) => fromSource(a, src));
      const site = css.find((a) => fromSource(a, 'index.html'));
      if (!own || !site) this.error(`own-css: no sheet for ${src} or for the site`);
      own.source = withoutShared(String(own.source), String(site.source));
    },
  };
}
