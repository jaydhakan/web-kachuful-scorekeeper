/**
 * A server-sent event stream read with fetch, so it carries the session cookie, backs off between attempts and
 * notices a silent socket, which EventSource can't. Same timings as Ishaara's game stream.
 */

/** Waits between attempts, in ms; the last one repeats. */
export const BACKOFF = [1000, 2000, 5000, 10_000, 20_000, 30_000];
/** Pings come every 25 s, so a stream silent for longer than this is dead even if the socket isn't. */
export const SILENCE_MS = 60_000;

export interface Frame {
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

export interface StreamHandlers {
  onFrame(f: Frame): void;
  /** Connected (after the first byte of headers) or dropped and retrying. */
  onConn?(live: boolean): void;
  /** Refused for good (401, 403, 404, 410): not retried. */
  onGone?(status: number): void;
}

/** Follows `url` until the returned stop is called; reconnects with backoff, at once on coming online. */
export function followStream(url: string, h: StreamHandlers): () => void {
  let stopped = false;
  let attempt = 0;
  let ctl: AbortController | null = null;
  let wait: ReturnType<typeof setTimeout> | null = null;
  let silence: ReturnType<typeof setTimeout> | null = null;

  const quiet = () => {
    if (silence) clearTimeout(silence);
    silence = setTimeout(() => ctl?.abort(), SILENCE_MS);
  };
  const retry = () => {
    if (stopped) return;
    h.onConn?.(false);
    wait = setTimeout(open, BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
  };

  async function open() {
    wait = null;
    if (stopped) return;
    ctl = new AbortController();
    const mine = ctl;
    try {
      const res = await fetch(url, {
        headers: { Accept: 'text/event-stream' },
        credentials: 'include',
        cache: 'no-store',
        signal: mine.signal,
      });
      if ([401, 403, 404, 410].includes(res.status)) {
        stopped = true;
        h.onGone?.(res.status);
        return;
      }
      if (!res.ok || !res.body) throw new Error(String(res.status));
      attempt = 0;
      h.onConn?.(true);
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
        for (const f of out.frames) if (!stopped) h.onFrame(f);
      }
    } catch {
      /* dropped, refused or gone silent: retried below */
    } finally {
      if (silence) clearTimeout(silence);
    }
    if (mine === ctl) retry();
  }

  const online = () => {
    if (stopped || !wait) return;
    clearTimeout(wait);
    attempt = 0;
    void open();
  };
  window.addEventListener('online', online);
  void open();

  return () => {
    stopped = true;
    if (wait) clearTimeout(wait);
    if (silence) clearTimeout(silence);
    ctl?.abort();
    window.removeEventListener('online', online);
  };
}
