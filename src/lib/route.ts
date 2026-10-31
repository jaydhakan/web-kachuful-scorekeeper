import type { Route } from '@/state/types';

/** A key that changes when a different screen (or the same screen for something else) is on top. */
export const routeKey = (r: Route): string =>
  `page-${r.screen}-${Object.entries(r.params ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join('&')}`;
