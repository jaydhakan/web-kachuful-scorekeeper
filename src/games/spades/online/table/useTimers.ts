import { useEffect, useRef, useState } from 'react';
import { ABSENT_MS, timedTurn } from '@/games/spades/domain/timer';
import type { Action, Seat, SpPublic } from '@/games/spades/domain/types';
import type { ActResult } from '@/games/spades/online/state/tableContext';

/** The server's clock (device clock + offset), ticking every `ms` while `active`. */
export function useServerNow(clockOffset: number, active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now + clockOffset;
}

/** A refused `timeout` (the server's clock not there yet) is sent again this soon. */
export const TIMEOUT_RETRY_MS = 1000;
/** Other phones wait this long past the deadline, so the late player's own phone usually settles its turn. */
export const TIMEOUT_GRACE_MS = 1200;
/** With the timer off, how often an absent seat's turn is tried once its minute is up. */
const ABSENT_RETRY_MS = 5000;
const MAX_TRIES = 8;

/**
 * There is no scheduler on the server, so any seated phone sends `timeout` once the turn's deadline passes (plan
 * §1.6); the server ignores all but the first. With the timer off, a seat that has left (no presence) is timed out
 * a minute after its turn began, and the server judges that against when it was last seen.
 */
export function useAutoTimeout(
  t: SpPublic | null,
  me: Seat | null,
  clockOffset: number,
  presence: readonly boolean[],
  act: (a: Action) => Promise<ActResult>,
) {
  const send = useRef(act);
  send.current = act;
  const offset = useRef(clockOffset);
  offset.current = clockOffset;
  const timed = !!t && timedTurn(t) && me !== null;
  const deadline = timed ? t.deadline : null;
  const turn = t?.turn ?? null;
  const absent =
    timed && deadline === null && turn !== null && presence[turn] === false
      ? (t.turnStartedAt as number) + ABSENT_MS
      : null;
  const at = deadline ?? absent;
  useEffect(() => {
    if (at === null || me === null) return;
    let live = true,
      tries = 0,
      timer: ReturnType<typeof setTimeout> | null = null;
    const fire = async () => {
      tries += 1;
      const r = await send.current({ type: 'timeout' });
      if (!live || r === 'ok' || tries >= MAX_TRIES) return;
      timer = setTimeout(fire, deadline === null ? ABSENT_RETRY_MS : TIMEOUT_RETRY_MS);
    };
    const grace = turn === me ? 0 : TIMEOUT_GRACE_MS;
    timer = setTimeout(fire, Math.max(0, at - offset.current - Date.now()) + grace);
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
    // A new rev with the same deadline is the same turn; a new deadline (or turn) starts over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, me, turn]);
}
