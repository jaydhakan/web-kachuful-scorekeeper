import { createContext, useContext } from 'react';
import type { Action, Seat, SpView } from '../../domain';

/** A seat's pending seat invite as the server's view carries it, for the lobby's invited chair. */
export interface SeatInviteMark {
  inviteId: string;
  userId: string;
  name: string;
  emoji: string;
  color: string;
}

export type LinkStatus = 'loading' | 'live' | 'reconnecting' | 'error' | 'gone';

export type ActResult = 'ok' | 'refused' | 'offline';

/**
 * What the online screens read and do. The link (state/link.ts) provides it; tests and previews provide a fake, so
 * the lobby and the table can be built without a server.
 */
export interface TableCtx {
  view: SpView | null;
  /** One entry per seat: its pending seat invite, if any. */
  invites: readonly (SeatInviteMark | null)[];
  /** One entry per seat: is that seat's phone connected right now. */
  presence: readonly boolean[];
  status: LinkStatus;
  /** serverNow − Date.now(), for deadlines. */
  clockOffset: number;
  /** An action is in flight; the screens disable input instead of queueing. */
  busy: boolean;
  act: (action: Action) => Promise<ActResult>;
  /** Reactions are events, not state: subscribe for the floating emoji. Returns the unsubscribe. */
  onReaction: (fn: (r: { seat: Seat; emoji: string }) => void) => () => void;
  /** The last refusal's reason, for a toast; cleared on the next success. */
  lastError: string | null;
  /** The link is checking whether it missed an update (see `STALE_MS` in link.ts); undefined where there is no link. */
  stale?: boolean;
  /** The table's join code QR (an SVG URL), or null before it loads. */
  qrUrl: string | null;
}

export const TableContext = createContext<TableCtx | null>(null);

export function useTable(): TableCtx {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used inside <TableContext.Provider>');
  return ctx;
}
