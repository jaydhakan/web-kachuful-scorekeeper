import { useSyncExternalStore } from 'react';

const height = () => Math.round(document.documentElement.getBoundingClientRect().height);

/**
 * The page's own height, kept live. Not a media query: an iOS Home Screen app is sized to the screen while iOS
 * reports a shorter viewport to media queries (lib/iosApp.ts).
 */
export function usePageHeight(): number {
  return useSyncExternalStore(
    (notify) => {
      if (typeof ResizeObserver === 'undefined') return () => {};
      const ro = new ResizeObserver(notify);
      ro.observe(document.documentElement);
      return () => ro.disconnect();
    },
    height,
    () => 0,
  );
}
