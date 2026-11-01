import { ApiError } from './api';
import { ep } from './endpoints';
import type { ServerActive } from './elsewhere';
import { isTombstone } from './types';

export { pullSummary } from './engine';

/** Asks the server for this account's newest unfinished game (backend-requests.md, request 4). Never throws. */
export async function askActive(): Promise<ServerActive> {
  try {
    const g = (await ep.activeGame()).items[0];
    if (!g) return null;
    // A backend without the filter ignores `status` and may answer with a finished game, which says nothing.
    if (isTombstone(g) || g.status !== 'active' || g.endedAt != null) return 'unknown';
    return g;
  } catch (e) {
    return e instanceof ApiError && e.offline ? 'offline' : 'unknown';
  }
}
