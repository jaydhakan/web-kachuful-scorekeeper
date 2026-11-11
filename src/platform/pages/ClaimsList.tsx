import { useState } from 'react';
import { ep } from '@/sync/endpoints';
import type { Claim } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { useApp } from '@/games/kachuful/state/store';
import { authError } from './AuthPages';
import { t } from '@/strings';

const c = t.hub.claims;

/** "That seat is me" requests on games this person scored; approving brings the seat's games to the claimant. */
export function useClaims(signedIn: boolean) {
  return useRemote(signedIn ? 'claims' : null, () => ep.claims());
}

export function ClaimsList({ items, onDone }: { items: Claim[]; onDone: () => void }) {
  const { actions } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const decide = async (cl: Claim, yes: boolean) => {
    setBusy(cl.id);
    try {
      await (yes ? ep.approveClaim(cl.id) : ep.rejectClaim(cl.id));
      actions.say(yes ? c.approved(cl.claimant.displayName) : c.rejected);
      onDone();
    } catch (e) {
      actions.say(authError(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <ul className="flex flex-col gap-2">
      {items.map((cl) => (
        <li key={cl.id} className="glass flex flex-wrap items-center gap-3 p-4">
          <span className="min-w-0 flex-1 basis-60 text-15">
            {c.ask(cl.claimant.displayName, cl.player.displayName)}
          </span>
          <button
            type="button"
            disabled={busy === cl.id}
            onClick={() => void decide(cl, true)}
            className="press min-h-11 rounded-xl bg-[var(--accent)] px-3 text-14 font-bold text-ink-on-accent disabled:opacity-50"
          >
            {c.approve}
          </button>
          <button
            type="button"
            disabled={busy === cl.id}
            onClick={() => void decide(cl, false)}
            className="press glass min-h-11 rounded-xl px-3 text-14 font-bold disabled:opacity-50"
          >
            {c.reject}
          </button>
        </li>
      ))}
    </ul>
  );
}
