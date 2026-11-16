import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpRules } from '../../domain';
import { saveLastRules } from '../state/lastSetup';
import { spEp } from '../sync/endpoints';
import type { SpViewOut } from '../sync/types';

interface Draft {
  rules: SpRules;
  name: string;
}

/**
 * The host's rules edits: shown at once, sent one PATCH at a time (the latest wins while one is in flight), and
 * remembered in `spades.lastSetup`. Everyone else sees the server's rules; so does the host once nothing is pending.
 */
export function useLobbyRules(
  tableId: string,
  server: Draft,
  adopt: (v: SpViewOut) => void,
): { rules: SpRules; name: string; change: (rules: SpRules, name?: string) => void } {
  const [draft, setDraft] = useState<Draft | null>(null);
  const flight = useRef(false);
  const next = useRef<Draft | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const pump = useCallback(async () => {
    if (flight.current) return;
    while (next.current && alive.current) {
      const d = next.current;
      next.current = null;
      flight.current = true;
      try {
        adopt(await spEp.rules(tableId, d.rules, d.name));
      } catch {
        // Refused or lost: the server's rules stand, and the line shows them again.
      }
      flight.current = false;
    }
    if (alive.current) setDraft(null);
  }, [tableId, adopt]);

  const change = useCallback(
    (rules: SpRules, name?: string) => {
      const d = { rules, name: name ?? next.current?.name ?? draft?.name ?? server.name };
      saveLastRules(rules);
      setDraft(d);
      next.current = d;
      void pump();
    },
    [pump, draft, server.name],
  );

  const shown = draft ?? server;
  return { rules: shown.rules, name: shown.name, change };
}
