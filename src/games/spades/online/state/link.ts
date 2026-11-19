import { ABSENT_MS, timedTurn, type Action, type Seat } from '../../domain';
import { uuid } from '@/lib/ids';
import { ApiError } from '@/sync/api';
import { qrUrl, reasonOf, spEp, viewOfError } from '../sync/endpoints';
import { followTable, type FollowHandlers } from '../sync/events';
import type { SpActionBody, SpViewOut } from '../sync/types';
import type { ActResult, LinkStatus, SeatInviteMark } from './tableContext';

/** What one table's link holds: the server's view of it for this account, and how the connection is. */
export interface LinkState {
  view: SpViewOut | null;
  invites: readonly (SeatInviteMark | null)[];
  presence: readonly boolean[];
  status: LinkStatus;
  clockOffset: number;
  busy: boolean;
  lastError: string | null;
  /** Nothing has arrived for a while at a table in play, and the link is asking the server whether it missed something. */
  stale: boolean;
}

/** Sends lost to the network go again with the same actionId this many times, once the stream is back. */
export const MAX_RETRIES = 3;
/** When the stream never dropped, a lost send is retried after this long instead. */
export const RETRY_MS = 1000;
/** A refused `timeout` (too early by the server's clock, or busy) is sent again after this long. */
export const TIMEOUT_RETRY_MS = 1000;
/** Sent just after the deadline, so the server's clock has surely passed it. */
export const TIMEOUT_MARGIN_MS = 150;
/** A table in play that has sent no view for this long is read again: a dropped frame leaves nothing else to repair it. */
export const STALE_MS = 15_000;
/** How often the link checks for that. */
export const WATCH_MS = 5000;
/** A ping that carries the rev and shows the table unchanged counts as proof of freshness this long (pings come every 25 s). */
export const PROOF_MS = 30_000;
/** A read of the table that hasn't answered by now is given up: a half-open socket must not hold the link forever. */
export const READ_TIMEOUT_MS = 10_000;
/** Same for an action (its actionId makes the resend safe, so waiting longer buys nothing). */
export const ACT_TIMEOUT_MS = 15_000;

export interface LinkDeps {
  follow: (id: string, h: FollowHandlers) => () => void;
  online: () => boolean;
}

const defaultDeps: LinkDeps = {
  follow: followTable,
  online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
};

/** Runs a request that is aborted if it hasn't settled after `ms` (an abort reads as offline to the callers). */
async function within<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await run(ctl.signal);
  } finally {
    clearTimeout(t);
  }
}

const NO_INVITES: readonly (SeatInviteMark | null)[] = [null, null, null, null];

function marks(v: SpViewOut): (SeatInviteMark | null)[] {
  return [0, 1, 2, 3].map((s) => {
    const i = v.invites?.[s];
    return i
      ? { inviteId: i.id, userId: i.userId, name: i.name, emoji: i.emoji, color: i.color }
      : null;
  });
}

type Retry = { body: SpActionBody; tries: number; quiet: boolean; done: (r: ActResult) => void };

/**
 * One online table followed from this device: GET once, then the per-viewer stream. Every view (response, error body
 * or frame) is adopted unless its rev is older than the one shown. One action at a time: a second is refused, never
 * queued. While seated it also watches the turn's deadline and sends `timeout` once it passes (any seat may).
 */
export class TableLink {
  private s: LinkState;
  private subs = new Set<() => void>();
  private reactions = new Set<(r: { seat: Seat; emoji: string }) => void>();
  private stopFollow: (() => void) | null = null;
  private stream = false;
  private hadStream = false;
  private loadFailed = false;
  private gone = false;
  /** Seat presence from the stream; null until the first frame (then everyone seated counts as here). */
  private seen: boolean[] | null = null;
  /** When each seat's phone went away, on the server's clock. */
  private awaySince: (number | null)[] = [null, null, null, null];
  private retry: Retry | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timerKey: string | null = null;
  private started = false;
  private stopped = false;
  private loading = false;
  /** A read was asked for while another was in flight (which may predate the reason): read once more after it. */
  private reread = false;
  private lastStateAt = Date.now();
  /** When a ping last showed that the table was at the rev held. */
  private lastProofAt = 0;
  private watchdog: ReturnType<typeof setInterval> | null = null;

  constructor(
    readonly id: string,
    private deps: LinkDeps = defaultDeps,
  ) {
    this.s = {
      view: null,
      invites: NO_INVITES,
      presence: [false, false, false, false],
      status: 'loading',
      clockOffset: 0,
      busy: false,
      lastError: null,
      stale: false,
    };
  }

  get = () => this.s;
  subscribe = (f: () => void) => {
    this.subs.add(f);
    return () => void this.subs.delete(f);
  };
  onReaction = (fn: (r: { seat: Seat; emoji: string }) => void) => {
    this.reactions.add(fn);
    return () => void this.reactions.delete(fn);
  };
  /** The join QR's address, once the table has loaded. */
  get qrUrl(): string | null {
    return this.s.view ? qrUrl(this.id) : null;
  }

  private set(p: Partial<LinkState>) {
    this.s = { ...this.s, ...p };
    const status = this.statusNow();
    const presence = this.presenceNow();
    if (status !== this.s.status || presence.some((x, i) => x !== this.s.presence[i]))
      this.s = { ...this.s, status, presence };
    this.subs.forEach((f) => f());
    this.schedule();
  }

  private statusNow(): LinkStatus {
    if (this.gone) return 'gone';
    if (!this.s.view) return this.loadFailed ? 'error' : 'loading';
    return this.stream && this.deps.online() ? 'live' : 'reconnecting';
  }

  private presenceNow(): boolean[] {
    const seats = this.s.view?.table.seats;
    return [0, 1, 2, 3].map((i) => !!seats?.[i]?.who && (this.seen ? this.seen[i] : true));
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.stopped = false;
    void this.load();
    this.stopFollow = this.deps.follow(this.id, {
      onEvent: (e) => {
        if (e.type === 'state') this.adopt(e.view);
        else if (e.type === 'presence') this.setPresence(e.seats);
        else if (e.type === 'reaction') this.reactions.forEach((f) => f(e));
      },
      onConn: (live) => {
        this.stream = live;
        this.set({});
        if (live) {
          // After a drop (or a first read that failed) read the table now; the first open's state frame suffices.
          if ((this.hadStream || !this.s.view) && !this.loading) void this.load();
          this.hadStream = true;
          this.flushRetry();
        }
      },
      onPing: this.onPing,
      // A refused stream on 401 is a lost session: one more API read marks it stale, and the root asks to sign in.
      onGone: (status) => {
        if (status === 401) return void this.load();
        this.gone = true;
        this.set({});
      },
    });
    this.lastStateAt = Date.now();
    this.watchdog = setInterval(this.check, WATCH_MS);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onNet);
      window.addEventListener('offline', this.onNet);
      document.addEventListener('visibilitychange', this.onVisible);
    }
  }

  stop() {
    this.stopped = true;
    this.started = false;
    this.clearTimer();
    const r = this.retry;
    this.retry = null;
    r?.done('offline');
    this.stopFollow?.();
    this.stopFollow = null;
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onNet);
      window.removeEventListener('offline', this.onNet);
      document.removeEventListener('visibilitychange', this.onVisible);
    }
  }

  /** A phone coming back may have missed frames while it slept: read the table before the stream catches up. */
  private onVisible = () => {
    if (document.visibilityState === 'visible' && !this.loading) void this.load();
  };

  /** A ping with a rev: ahead of the view held means a frame was lost (read now); otherwise the table is current. */
  private onPing = (rev: number | null) => {
    const v = this.s.view;
    if (rev === null || this.stopped || !v) return;
    if (rev > v.table.rev) void this.load();
    else this.lastProofAt = Date.now();
  };

  private check = () => {
    const v = this.s.view;
    if (this.stopped || this.loading || !v || v.table.status !== 'playing') return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const now = Date.now();
    // A recent ping showing the same rev proves a quiet turn is just quiet; pings without a rev prove nothing.
    if (now - this.lastProofAt <= PROOF_MS) return;
    if (now - this.lastStateAt > STALE_MS) void this.watch();
  };

  private async watch() {
    // Counted from now, so a failing read is tried again after STALE_MS, not every tick.
    this.lastStateAt = Date.now();
    this.set({ stale: true });
    await this.load();
    if (!this.stopped) this.set({ stale: false });
  }

  private onNet = () => {
    if (this.deps.online() && this.s.status === 'error') void this.load();
    else this.set({});
  };

  /** Asks the server again (after an error, or from a screen's Try again). */
  reload = () => void this.load();

  /** One read at a time; a request made meanwhile makes one more read after it, so none is lost. */
  private async load() {
    if (this.loading) {
      this.reread = true;
      return;
    }
    this.loading = true;
    try {
      do {
        this.reread = false;
        await this.read();
      } while (this.reread && !this.stopped);
    } finally {
      this.loading = false;
    }
  }

  private async read() {
    try {
      const v = await within(READ_TIMEOUT_MS, (signal) => spEp.view(this.id, signal));
      this.loadFailed = false;
      this.adopt(v);
    } catch (e) {
      if (this.stopped) return;
      const err = e instanceof ApiError ? e : new ApiError(0, 'offline');
      if (err.status === 404 || err.status === 403) this.gone = true;
      else this.loadFailed = true;
      this.set({});
    }
  }

  /** Takes a view unless it is older than the one shown; the same rev still brings new invites. */
  adopt = (v: SpViewOut) => {
    if (this.stopped) return;
    this.lastStateAt = Date.now();
    const cur = this.s.view;
    const p: Partial<LinkState> = { clockOffset: v.serverNow - Date.now() };
    if (!cur || v.table.rev >= cur.table.rev) {
      p.view = v;
      p.invites = marks(v);
    }
    this.set(p);
  };

  private setPresence(seats: boolean[]) {
    const now = Date.now() + this.s.clockOffset;
    this.awaySince = [0, 1, 2, 3].map((i) => (seats[i] ? null : (this.awaySince[i] ?? now)));
    this.seen = [0, 1, 2, 3].map((i) => seats[i] === true);
    this.set({});
  }

  /** One action with a fresh actionId and the rev shown: refused while another is in flight or the link isn't live. */
  act = (action: Action): Promise<ActResult> => this.send(action, false);

  private send(action: Action, quiet: boolean): Promise<ActResult> {
    const v = this.s.view;
    if (this.s.busy) return Promise.resolve('refused');
    if (!v || this.s.status !== 'live') return Promise.resolve('offline');
    const body = { ...action, actionId: uuid(), rev: v.table.rev } as SpActionBody;
    this.set({ busy: true });
    return new Promise((done) => void this.post({ body, tries: 0, quiet, done }));
  }

  private async post(r: Retry) {
    try {
      const out = await within(ACT_TIMEOUT_MS, (signal) => spEp.act(this.id, r.body, signal));
      this.adopt(out);
      this.set(r.quiet ? { busy: false } : { busy: false, lastError: null });
      r.done('ok');
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, 'offline');
      if (err.offline && r.tries < MAX_RETRIES && !this.stopped) {
        // Lost on the way: the same actionId goes again once the stream is back, so it can't act twice.
        this.retry = { ...r, tries: r.tries + 1 };
        if (this.s.status === 'live') setTimeout(() => this.flushRetry(), RETRY_MS);
        return;
      }
      const v = viewOfError(err);
      // No view came back (lost, 5xx, rate limit): the send may or may not have landed, so ask rather than guess.
      if (v) this.adopt(v);
      else if (!this.stopped) void this.load();
      this.set(r.quiet ? { busy: false } : { busy: false, lastError: reasonOf(err) });
      r.done(err.offline ? 'offline' : 'refused');
    }
  }

  private flushRetry() {
    const r = this.retry;
    if (!r || this.stopped) return;
    this.retry = null;
    void this.post(r);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.timerKey = null;
  }

  /** When this phone should send `timeout`, on the server's clock: the deadline, or 60 s after the seat to act left. */
  private due(): number | null {
    const v = this.s.view;
    if (!v || v.me.seat === null || this.stopped) return null;
    const t = v.table;
    if (!timedTurn(t)) return null;
    if (t.deadline !== null) return t.deadline;
    const turn = t.turn as Seat;
    const since = this.awaySince[turn];
    return this.seen && !this.seen[turn] && since !== null
      ? Math.max(t.turnStartedAt as number, since) + ABSENT_MS
      : null;
  }

  private schedule() {
    const due = this.due();
    const key = due === null ? null : `${this.s.view?.table.rev}:${due}`;
    if (key === this.timerKey) return;
    this.clearTimer();
    if (due === null || key === null) return;
    this.timerKey = key;
    const wait = Math.max(0, due - (Date.now() + this.s.clockOffset)) + TIMEOUT_MARGIN_MS;
    this.timer = setTimeout(() => void this.fire(key), wait);
  }

  private async fire(key: string) {
    if (this.timerKey !== key) return;
    this.timer = null;
    const r = await this.send({ type: 'timeout' }, true);
    // Settled by this send or anyone else's: the new view reschedules. Otherwise try again shortly.
    if (r === 'ok' || this.timerKey !== key || this.stopped) return;
    this.timer = setTimeout(() => void this.fire(key), TIMEOUT_RETRY_MS);
  }
}
