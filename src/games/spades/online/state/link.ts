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
}

/** Sends lost to the network go again with the same actionId this many times, once the stream is back. */
export const MAX_RETRIES = 3;
/** When the stream never dropped, a lost send is retried after this long instead. */
export const RETRY_MS = 1000;
/** A refused `timeout` (too early by the server's clock, or busy) is sent again after this long. */
export const TIMEOUT_RETRY_MS = 1000;
/** Sent just after the deadline, so the server's clock has surely passed it. */
export const TIMEOUT_MARGIN_MS = 150;

export interface LinkDeps {
  follow: (id: string, h: FollowHandlers) => () => void;
  online: () => boolean;
}

const defaultDeps: LinkDeps = {
  follow: followTable,
  online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
};

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
        if (live) this.flushRetry();
      },
      // A refused stream on 401 is a lost session: one more API read marks it stale, and the root asks to sign in.
      onGone: (status) => {
        if (status === 401) return void this.load();
        this.gone = true;
        this.set({});
      },
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onNet);
      window.addEventListener('offline', this.onNet);
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
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onNet);
      window.removeEventListener('offline', this.onNet);
    }
  }

  private onNet = () => {
    if (this.deps.online() && this.s.status === 'error') void this.load();
    else this.set({});
  };

  /** Asks the server again (after an error, or from a screen's Try again). */
  reload = () => void this.load();

  private async load() {
    try {
      const v = await spEp.view(this.id);
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
      const out = await spEp.act(this.id, r.body);
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
      if (v) this.adopt(v);
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
