import { followStream, type Frame } from '@/sync/sse';
import { isSeat, type Seat, type SpPublic } from '../../domain';
import { eventsUrl, liveEventsUrl } from './endpoints';
import type { SpLiveOut, SpViewOut } from './types';

export type TableEvent =
  | { type: 'state'; view: SpViewOut }
  | { type: 'presence'; seats: boolean[] }
  | { type: 'reaction'; seat: Seat; emoji: string }
  | { type: 'ended' };

export interface FollowHandlers {
  onEvent(e: TableEvent): void;
  /** Open (true) or dropped and retrying (false). */
  onConn(live: boolean): void;
  /** Refused for good (401, 403, 404, 410). */
  onGone(status: number): void;
  /** The stream's ping, with the table's rev when the server sends it (older servers send `{}`: null). */
  onPing?(rev: number | null): void;
}

const json = (f: Frame): Record<string, unknown> | null => {
  try {
    const d = JSON.parse(f.data || '{}') as unknown;
    return d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** The rev a ping carries, or null for `{}`, bad JSON or anything that isn't a whole number. */
export function pingRev(data: string): number | null {
  try {
    const rev = (JSON.parse(data || '{}') as { rev?: unknown } | null)?.rev;
    return typeof rev === 'number' && Number.isInteger(rev) ? rev : null;
  } catch {
    return null;
  }
}

/** A frame of the table's stream (§4.2), or null for a ping or anything unknown. */
export function toEvent(f: Frame): TableEvent | null {
  const d = json(f);
  if (!d) return null;
  if (f.event === 'state' && d.table && typeof d.serverNow === 'number')
    return { type: 'state', view: d as unknown as SpViewOut };
  if (f.event === 'seat-presence' && Array.isArray(d.seats))
    return { type: 'presence', seats: d.seats.map((x) => x === true) };
  if (f.event === 'reaction' && isSeat(d.seat) && typeof d.emoji === 'string')
    return { type: 'reaction', seat: d.seat, emoji: d.emoji };
  if (f.event === 'ended') return { type: 'ended' };
  return null;
}

/** Follows one table's per-viewer stream until the returned stop is called; the server sends the state on open. */
export function followTable(id: string, h: FollowHandlers): () => void {
  return followStream(eventsUrl(id), {
    onFrame: (f) => {
      const e = toEvent(f);
      if (e) h.onEvent(e);
    },
    onPing: (data) => h.onPing?.(pingRev(data)),
    onConn: h.onConn,
    onGone: h.onGone,
  });
}

export type LiveEvent =
  { type: 'game'; table: SpPublic } | { type: 'reaction'; seat: Seat | null; emoji: string };

/** A share link's stream: `game` frames carry the public table; reactions are the players'. */
export function followLive(
  token: string,
  h: { onEvent(e: LiveEvent): void; onConn(live: boolean): void; onGone(status: number): void },
): () => void {
  return followStream(liveEventsUrl(token), {
    onFrame: (f) => {
      const d = json(f);
      if (!d) return;
      if (f.event === 'game' && d.game)
        h.onEvent({ type: 'game', table: (d as unknown as SpLiveOut).game });
      else if (f.event === 'reaction' && typeof d.emoji === 'string')
        h.onEvent({ type: 'reaction', seat: isSeat(d.seat) ? d.seat : null, emoji: d.emoji });
    },
    onConn: h.onConn,
    onGone: h.onGone,
  });
}
