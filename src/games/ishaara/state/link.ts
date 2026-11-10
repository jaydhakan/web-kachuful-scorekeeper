import type { Action, IshaaraPublic } from '@/games/ishaara/domain';
import { ishEp, gameOfError } from '@/games/ishaara/sync/endpoints';
import { followIshaara, type FollowHandlers, type StreamConn } from '@/games/ishaara/sync/events';
import type { IshaaraActionBody, IshaaraGameOut, IshaaraMe } from '@/games/ishaara/sync/types';
import { uuid } from '@/lib/ids';
import { archiveIshaaraGame } from './persistence';
import { ApiError } from '@/sync/api';

export type LinkStatus = 'loading' | 'ready' | 'error' | 'gone';
export type LinkConn = 'live' | 'reconnecting' | 'offline';

/** What a table or clue phone shows of one game: the server's public state and how the connection is. */
export interface LinkState {
  game: IshaaraPublic | null;
  me: IshaaraMe | null;
  status: LinkStatus;
  conn: LinkConn;
  /** An action is on its way (or waiting to be retried): further picks are refused, never queued. */
  busy: boolean;
  /** The last failed load or action; cleared by the next success. */
  lastError: ApiError | null;
  /** serverNow − Date.now(): add it to the device clock to get the server's. */
  clockOffset: number;
}

export type SendResult =
  | { ok: true; game: IshaaraPublic }
  /** `busy` and `offline` were refused on the device; nothing was sent. */
  | { ok: false; refused: 'busy' | 'offline' | 'not-ready' }
  | { ok: false; error: ApiError };

/** Sends lost to the network are retried with the same actionId this many times once the stream is back. */
export const MAX_RETRIES = 3;
/** When the stream never dropped, a lost send is retried after this long instead. */
export const RETRY_MS = 1000;

export interface LinkDeps {
  follow: (id: string, h: FollowHandlers) => () => void;
  online: () => boolean;
}

const defaultDeps: LinkDeps = {
  follow: followIshaara,
  online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
};

/**
 * One game followed from this device: GET once, then the live stream; every state (response, error body or frame)
 * is adopted when its rev isn't older than what is shown. Finished games are copied to the archive for History.
 */
export class GameLink {
  private s: LinkState;
  private subs = new Set<() => void>();
  private stopFollow: (() => void) | null = null;
  private stream: StreamConn = 'reconnecting';
  private retry: { body: IshaaraActionBody; tries: number; done: (r: SendResult) => void } | null =
    null;
  private started = false;
  private stopped = false;

  constructor(
    readonly id: string,
    private deps: LinkDeps = defaultDeps,
  ) {
    this.s = {
      game: null,
      me: null,
      status: 'loading',
      conn: deps.online() ? 'reconnecting' : 'offline',
      busy: false,
      lastError: null,
      clockOffset: 0,
    };
  }

  get = () => this.s;
  subscribe = (f: () => void) => {
    this.subs.add(f);
    return () => void this.subs.delete(f);
  };
  private set(p: Partial<LinkState>) {
    this.s = { ...this.s, ...p };
    this.subs.forEach((f) => f());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.stopped = false;
    void this.load();
    this.stopFollow = this.deps.follow(this.id, {
      onEvent: (e) => {
        if (e.type === 'state') this.adopt({ game: e.game, serverNow: e.serverNow });
      },
      onConn: (c) => {
        this.stream = c;
        this.setConn();
        if (c === 'live') this.flushRetry();
      },
      onGone: () => this.set({ status: 'gone' }),
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onNet);
      window.addEventListener('offline', this.onNet);
    }
  }

  stop() {
    this.stopped = true;
    this.started = false;
    const r = this.retry;
    this.retry = null;
    r?.done({ ok: false, error: new ApiError(0, 'offline') });
    this.stopFollow?.();
    this.stopFollow = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onNet);
      window.removeEventListener('offline', this.onNet);
    }
  }

  private onNet = () => {
    this.setConn();
    if (this.deps.online() && this.s.status === 'error') void this.load();
  };

  private setConn() {
    const conn: LinkConn = !this.deps.online() ? 'offline' : this.stream;
    if (conn !== this.s.conn) this.set({ conn });
  }

  /** Asks the server again (after an error, or when a screen offers Try again). */
  reload = () => void this.load();

  private async load() {
    try {
      this.adopt(await ishEp.game(this.id));
    } catch (e) {
      if (this.stopped) return;
      const err = e instanceof ApiError ? e : new ApiError(0, 'offline');
      if (err.status === 404 || err.status === 403) this.set({ status: 'gone', lastError: err });
      else if (!this.s.game) this.set({ status: 'error', lastError: err });
    }
  }

  /** Takes a server answer unless it is older than the state shown; `me` only comes with responses. */
  adopt(out: Partial<IshaaraGameOut> & { game: IshaaraPublic; serverNow: number }) {
    if (this.stopped) return;
    const cur = this.s.game;
    const p: Partial<LinkState> = { clockOffset: out.serverNow - Date.now() };
    if (out.me) p.me = out.me;
    if (!cur || out.game.rev >= cur.rev) p.game = out.game;
    if (this.s.status !== 'gone') p.status = p.game || cur ? 'ready' : this.s.status;
    this.set(p);
    if (p.game?.status === 'finished')
      archiveIshaaraGame(p.game, undefined, (out.me ?? this.s.me)?.host);
  }

  /** Sends one action with a fresh actionId and the rev shown; refused while busy or not live. */
  send = (action: Action): Promise<SendResult> => {
    const g = this.s.game;
    if (this.s.busy) return Promise.resolve({ ok: false, refused: 'busy' });
    if (this.s.conn !== 'live') return Promise.resolve({ ok: false, refused: 'offline' });
    if (!g || this.s.status !== 'ready')
      return Promise.resolve({ ok: false, refused: 'not-ready' });
    const body = { ...action, actionId: uuid(), rev: g.rev } as IshaaraActionBody;
    this.set({ busy: true });
    return new Promise((done) => void this.post(body, 0, done));
  };

  private async post(body: IshaaraActionBody, tries: number, done: (r: SendResult) => void) {
    try {
      const out = await ishEp.act(this.id, body);
      this.adopt(out);
      this.set({ busy: false, lastError: null });
      done({ ok: true, game: out.game });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, 'offline');
      if (err.offline && tries < MAX_RETRIES && !this.stopped) {
        // Lost on the way: the same actionId goes again once the stream is back, so it can't act twice.
        this.retry = { body, tries: tries + 1, done };
        if (this.s.conn === 'live') setTimeout(() => this.flushRetry(), RETRY_MS);
        return;
      }
      const g = gameOfError(err);
      if (g) this.adopt(g);
      this.set({ busy: false, lastError: err });
      done({ ok: false, error: err });
    }
  }

  private flushRetry() {
    const r = this.retry;
    if (!r || this.stopped) return;
    this.retry = null;
    void this.post(r.body, r.tries, r.done);
  }
}
