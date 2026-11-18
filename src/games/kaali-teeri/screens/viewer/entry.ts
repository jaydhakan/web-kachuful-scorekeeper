/** `/kaali-teeri?live=<token>` or `?recap=<token>`: the public viewer this page opens with. */
export interface KtViewerLink {
  kind: 'live' | 'recap';
  token: string;
}

let taken: { href: string; link: KtViewerLink } | null = null;

/**
 * Read once at start and removed from the address bar, as src/lib/entry.ts does for Kachuful, so a reload or a
 * shared screenshot doesn't carry the token.
 */
export function readKtViewerLink(): KtViewerLink | null {
  if (typeof location === 'undefined') return null;
  // Until the page has mounted (settleKtViewerLink), every render sees the link: StrictMode runs initialisers twice,
  // and a render React throws away runs them again.
  if (taken?.href === location.href) return taken.link;
  const q = new URLSearchParams(location.search);
  for (const kind of ['live', 'recap'] as const) {
    const token = q.get(kind);
    if (!token) continue;
    q.delete(kind);
    const rest = q.toString();
    history.replaceState(
      history.state,
      '',
      location.pathname + (rest ? '?' + rest : '') + location.hash,
    );
    taken = { href: location.href, link: { kind, token } };
    return taken.link;
  }
  return null;
}

/** The page that read the link has mounted: a later visit to `/kaali-teeri` opens the app, not the viewer again. */
export function settleKtViewerLink() {
  taken = null;
}
