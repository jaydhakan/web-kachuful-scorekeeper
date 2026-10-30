import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept live. Layout is CSS only; this exists to pick the enter and exit
 * motion of dialogs, which CSS cannot do. Pass a string from `MQ` so it can never drift from Tailwind.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
