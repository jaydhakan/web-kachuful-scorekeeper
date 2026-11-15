import { API, ApiError } from './api';
import { seatEp } from './seatInviteApi';
import {
  clearSeatInvites,
  dropInvite,
  putInvite,
  setInvites,
  setServerNow,
  type SeatInvite,
} from './seatInvites';
import { putUpdate, type SeatInviteUpdate } from './seatInviteSignals';
import { followStream, type Frame } from './sse';
import { onSession, signedInAs } from './session';

/**
 * The network side of seat invites, loaded lazily by the platform once someone is signed in: the list on start, on
 * becoming visible and on coming online, and the user stream while the page is visible. Hidden, the stream closes.
 */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

/** One stream frame into the store; anything malformed is ignored. */
export function applyFrame(f: Frame) {
  let d: unknown;
  try {
    d = JSON.parse(f.data || '{}');
  } catch {
    return;
  }
  if (!isObj(d)) return;
  if (f.event === 'hello' && typeof d.serverNow === 'number') setServerNow(d.serverNow);
  else if (f.event === 'seat-invite' && typeof d.id === 'string' && isObj(d.from)) {
    const inv = d as unknown as SeatInvite;
    if (inv.status === 'pending') putInvite(inv);
    else dropInvite(inv.id);
  } else if (f.event === 'seat-invite-gone' && typeof d.id === 'string') dropInvite(d.id);
  else if (f.event === 'seat-invite-update' && typeof d.id === 'string')
    putUpdate(d as unknown as SeatInviteUpdate);
}

let running: (() => void) | null = null;

/** Starts following this account's invites; returns stop. Calling it again while running returns the same stop. */
export function startSeatInvites(): () => void {
  if (running) return running;
  let stream: (() => void) | null = null;
  let user = signedInAs()?.user.id ?? null;
  let fetching: AbortController | null = null;

  const refresh = () => {
    fetching?.abort();
    const ctl = (fetching = new AbortController());
    seatEp
      .mine()
      .then((r) => {
        if (!ctl.signal.aborted && signedInAs()) setInvites(r.items, r.serverNow);
      })
      .catch(() => {
        /* offline or refused: the stream or the next visit brings it */
      });
  };
  const open = () => {
    if (stream || !signedInAs() || document.visibilityState !== 'visible') return;
    refresh();
    let first = true;
    stream = followStream(`${API}/me/events`, {
      onFrame: applyFrame,
      // Reconnected after a drop: anything said meanwhile was missed, so read the list again.
      onConn: (live) => {
        if (live && !first) refresh();
        if (live) first = false;
      },
      onGone: () => (stream = null),
    });
  };
  const close = () => {
    stream?.();
    stream = null;
    fetching?.abort();
  };
  const onVisible = () => (document.visibilityState === 'visible' ? open() : close());
  const onOnline = () => {
    if (stream) refresh();
    else open();
  };
  const offSession = onSession(() => {
    const next = signedInAs()?.user.id ?? null;
    if (next === user) return;
    close();
    if (user) clearSeatInvites();
    user = next;
    open();
  });
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  open();

  running = () => {
    close();
    if (!signedInAs()) clearSeatInvites();
    offSession();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    running = null;
  };
  return running;
}

export type Answer = 'ok' | 'filled' | 'error';

/** The seat or game moved on (409 `filled`), or the invite ran out (410). */
const tooLate = (e: unknown) =>
  e instanceof ApiError && (e.status === 410 || (e.status === 409 && e.code === 'filled'));

/** Says yes. `filled` means it's too late: the caller says so, then drops the invite. */
export async function acceptInvite(inv: SeatInvite): Promise<Answer> {
  try {
    await seatEp.accept(inv.id);
    dropInvite(inv.id);
    return 'ok';
  } catch (e) {
    return tooLate(e) ? 'filled' : 'error';
  }
}

/** Says no; the host hears it. */
export async function declineInvite(inv: SeatInvite): Promise<Answer> {
  try {
    await seatEp.decline(inv.id);
    dropInvite(inv.id);
    return 'ok';
  } catch (e) {
    return tooLate(e) ? 'filled' : 'error';
  }
}
