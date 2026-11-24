import { useEffect } from 'react';
import { ep } from '@/sync/endpoints';
import { putGift } from '@/sync/rewardNews';
import { signedInAs, useSession } from '@/sync/session';

/**
 * A table's unopened gifts (backend-requests §5), asked once per set of seated players when a game starts: each
 * joins the reward news and opens on this screen at the next pause. Signed in only; a failure just waits.
 */
export function usePendingGifts(playerIds: readonly (string | null | undefined)[], on = true) {
  const signed = !!signedInAs(useSession());
  const ids = [...new Set(playerIds.filter((x): x is string => !!x))].sort().slice(0, 12).join(',');
  useEffect(() => {
    if (!on || !signed || !ids) return;
    let live = true;
    ep.pendingGifts(ids.split(','))
      .then((r) => live && r.items.forEach(putGift))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [on, signed, ids]);
}
