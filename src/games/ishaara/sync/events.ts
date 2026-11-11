import type { EndedBy, IshaaraPublic, Team } from '../domain';
import { eventsUrl } from './endpoints';

export type IshaaraEvent =
  | { type: 'state'; game: IshaaraPublic; serverNow: number }
  | { type: 'joined'; team: Team }
  | { type: 'ended'; winner: Team | null; endedBy: EndedBy | null };

/** `live` while the stream is open; `reconnecting` while it is down and being retried. */
export type StreamConn = 'live' | 'reconnecting';

export interface FollowHandlers {
  onEvent(e: IshaaraEvent): void;
  onConn(c: StreamConn): void;
  /** The server refused the stream (404 gone or deleted, 401/403): it won't come back by itself. */
  onGone(status: number): void;
}

/** Waits between attempts, in ms; the last one repeats. */
export const BACKOFF = [1000, 2000, 5000, 10_000, 20_000, 30_000];
/** Pings come every 25 s, so a stream silent for longer than this is dead even if the socket isn't. */
export const SILENCE_MS = 60_000;

interface Frame {
  event: string;
  id: string | null;
  data: string;
}

/** Splits a text/event-stream buffer into whole frames; the unfinished tail is returned for the next chunk. */
export function parseFrames(buf: string): { frames: Frame[]; rest: string } {
  const parts = buf.replace(/\r\n?/g, '\n').split('\n\n');
  const rest = parts.pop() ?? '';
  const frames: Frame[] = [];
  for (const block of parts) {
    let event = 'message';
    let id: string | null = null;
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const at = line.indexOf(':');
      const field = at < 0 ? line : line.slice(0, at);
      const value = at < 0 ? '' : line.slice(at + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'id') id = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length || event !== 'message') frames.push({ event, id, data: data.join('\n') });
  }
  return { frames, rest };
}

function toEvent(f: Frame): IshaaraEvent | null {
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(f.data || '{}') as Record<string, unknown>;
  } catch {
    return null;
  }
  if (f.event === 'state' && d.game && typeof d.serverNow === 'number')
    return { type: 'state', game: d.game as IshaaraPublic, serverNow: d.serverNow };
  if (f.event === 'joined' && (d.team === 'sun' || d.team === 'moon'))
    return { type: 'joined', team: d.team };
  if (f.event === 'ended')
    return {
      type: 'ended',
      winner: (d.winner as Team | null) ?? null,
      endedBy: (d.endedBy as EndedBy | null) ?? null,
    };
  return null;
}

/**
 * Follows a game's public state over SSE, read with fetch so it can send Last-Event-ID (the last rev seen) and back
 * off between attempts, which EventSource can't. Reconnects at once when the browser comes back online.
 */
export function followIshaara(id: string, h: FollowHandlers): () => void {
  let stopped = false;
  let attempt = 0;
  let lastId: string | null = null;
  let ctl: AbortController | null = null;
  let wait: ReturnType<typeof setTimeout> | null = null;
  let silence: ReturnType<typeof setTimeout> | null = null;
  let conn: StreamConn | null = null;

  const setConn = (c: StreamConn) => {
    if (c !== conn) h.onConn((conn = c));
  };
  const quiet = () => {
    if (silence) clearTimeout(silence);
    silence = setTimeout(() => ctl?.abort(), SILENCE_MS);
  };

  const retry = () => {
    if (stopped) return;
    setConn('reconnecting');
    const ms = BACKOFF[Math.min(attempt++, BACKOFF.length - 1)];
    wait = setTimeout(open, ms);
  };

  async function open() {
    wait = null;
    if (stopped) return;
    ctl = new AbortController();
    const mine = ctl;
    try {
      const res = await fetch(eventsUrl(id), {
        headers: { Accept: 'text/event-stream', ...(lastId && { 'Last-Event-ID': lastId }) },
        credentials: 'include',
        cache: 'no-store',
        signal: mine.signal,
      });
      if ([401, 403, 404, 410].includes(res.status)) {
        stopped = true;
        h.onGone(res.status);
        return;
      }
      if (!res.ok || !res.body) throw new Error(String(res.status));
      attempt = 0;
      setConn('live');
      quiet();
      const reader = res.body.getReader();
      // Aborting (silence, stop) ends the read even where the body ignores the fetch's signal.
      mine.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}));
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        quiet();
        const out = parseFrames(buf + dec.decode(value, { stream: true }));
        buf = out.rest;
        for (const f of out.frames) {
          if (f.id) lastId = f.id;
          const e = toEvent(f);
          if (e && !stopped) h.onEvent(e);
        }
      }
    } catch {
      /* dropped, refused or gone silent: retried below */
    } finally {
      if (silence) clearTimeout(silence);
    }
    if (mine === ctl) retry();
  }

  // Coming back online skips the rest of the wait.
  const online = () => {
    if (stopped || !wait) return;
    clearTimeout(wait);
    attempt = 0;
    void open();
  };
  if (typeof window !== 'undefined') window.addEventListener('online', online);
  void open();

  return () => {
    stopped = true;
    if (wait) clearTimeout(wait);
    if (silence) clearTimeout(silence);
    ctl?.abort();
    if (typeof window !== 'undefined') window.removeEventListener('online', online);
  };
}
