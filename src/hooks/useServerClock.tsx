import { useEffect, useReducer, useRef, type ReactNode } from 'react';

const TICK_MS = 250;
const serverNow = (offset: number) => Date.now() + offset;

/**
 * A value read off the server's clock (device clock + offset). It is checked every 250ms while `active`, but the
 * component re-renders only when `select` gives something different, so a table can read "seconds left" or "late"
 * without re-rendering four times a second (WOW-MOMENTS-PLAN §3.6). `select` should return a primitive.
 */
export function useServerClock<T>(offset: number, active: boolean, select: (now: number) => T): T {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const v = select(serverNow(offset));
  const latest = useRef({ select, v });
  latest.current = { select, v };
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const l = latest.current;
      if (!Object.is(l.select(serverNow(offset)), l.v)) bump();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, offset]);
  return v;
}

/** Whole seconds until `deadline` (server ms), never below 0. */
export const secsUntil = (deadline: number, now: number) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

/** A leaf that re-renders once a second with the seconds left; whatever holds it stays still. */
export function Countdown({
  deadline,
  offset,
  children,
}: {
  deadline: number;
  offset: number;
  children: (secs: number) => ReactNode;
}) {
  const secs = useServerClock(offset, true, (now) => secsUntil(deadline, now));
  return <>{children(secs)}</>;
}
