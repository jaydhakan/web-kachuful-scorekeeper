import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';
import { isOver } from '../../domain';
import { TableLink, type LinkDeps } from './link';
import type { TableCtx } from './tableContext';

export interface TableLinkCtx extends TableCtx {
  /** Asks the server again (the error state's Try again). */
  reload: () => void;
}

/**
 * Follows one table for as long as the component is mounted (a new id starts a new link) and gives what
 * `TableContext` provides. Keeps the screen awake while this account holds a seat at a table still in play.
 */
export function useTableLink(id: string, deps?: LinkDeps): TableLinkCtx {
  const link = useMemo(() => new TableLink(id, deps), [id, deps]);
  useEffect(() => {
    link.start();
    return () => link.stop();
  }, [link]);
  const s = useSyncExternalStore(link.subscribe, link.get);
  const seated = s.view !== null && s.view.me.seat !== null && !isOver(s.view.table);
  useWakeLock(seated);
  return useMemo(
    () => ({
      view: s.view,
      invites: s.invites,
      presence: s.presence,
      status: s.status,
      clockOffset: s.clockOffset,
      busy: s.busy,
      lastError: s.lastError,
      qrUrl: s.view ? link.qrUrl : null,
      act: link.act,
      onReaction: link.onReaction,
      reload: link.reload,
    }),
    [s, link],
  );
}
