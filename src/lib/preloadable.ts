import { createElement, lazy, type ComponentType } from 'react';

type Load<P> = () => Promise<{ default: ComponentType<P> }>;

export type Preloadable<P> = ComponentType<P> & {
  /** Starts the download (once); resolves when the component can render without suspending. */
  preload: () => Promise<unknown>;
  /** After a failed fetch, for a Retry: the next render fetches again. */
  reset: () => void;
};

/**
 * `lazy()` that can be fetched ahead of time. Once its chunk has arrived it renders the component itself, so a
 * screen warmed in the background never shows a Suspense fallback; React's lazy() would still suspend for a tick.
 * Like lazy(), a failed render stays failed (no refetch loop offline) until `reset()`; a failed `preload()` alone
 * leaves nothing behind.
 */
export function preloadable<P extends object>(load: Load<P>): Preloadable<P> {
  let mod: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  // Made only while the module is missing; once an instance has rendered through it, it keeps doing so, so the
  // element type never changes under a mounted component.
  let viaLazy: ComponentType<P> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (m) => (mod = m.default),
      (e: unknown) => {
        pending = null;
        throw e;
      },
    ));
  function Preloaded(props: P) {
    if (viaLazy) return createElement(viaLazy, props);
    if (mod) return createElement(mod, props);
    viaLazy = lazy(() => preload().then((C) => ({ default: C }))) as unknown as ComponentType<P>;
    return createElement(viaLazy, props);
  }
  const reset = () => {
    if (!mod) viaLazy = null;
  };
  return Object.assign(Preloaded, { preload, reset });
}

/** Warms several at once; a failure is left for the screen that needs it to show (it has a retry). */
export const preloadAll = (...ps: { preload: () => Promise<unknown> }[]) =>
  Promise.all(ps.map((p) => p.preload().catch(() => {})));
