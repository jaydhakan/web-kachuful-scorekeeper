import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { momentRoot } from '../moments';
import { anim, OUT, POP, REDUCED_MS, TRAVEL, wait } from '../waapi';

export interface SeatPoint {
  x: number;
  y: number;
  /** The avatar's radius: the ring sits just outside it. */
  r: number;
}

const DIM_MS = 200;
const TRAVEL_MS = 700;
const RING_MS = 360;
const LEAVE_AT = 1350;
const LEAVE_MS = 250;
/** Reduced motion: the ring and the line, still, for this long. */
const STILL_MS = 1200;
const LIGHT = 240;

/**
 * A Beat (WOW-MOMENTS-PLAN K1): the table dims, a soft light travels from one seat to another, a ring in `tone`
 * snaps on there and `line` inks in under it; ≤ 1.6s, and it never takes a tap (`pointer-events: none`). Points are
 * viewport coordinates. Reduced motion: the ring and the line appear, then go.
 */
export function SeatSpotlight({
  from,
  to,
  line,
  tone,
  reduced,
  signal,
  onDone,
}: {
  from: SeatPoint | null;
  to: SeatPoint;
  line: string;
  /** A colour token, `var(--kt-bid)`. */
  tone: string;
  reduced: boolean;
  signal: AbortSignal;
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    dim = useRef<HTMLDivElement>(null),
    light = useRef<HTMLSpanElement>(null),
    ring = useRef<HTMLSpanElement>(null),
    say = useRef<HTMLParagraphElement>(null),
    ink = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const runs: { cancel: () => void }[] = [];
    let live = true,
      ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      onDone();
    };
    const go = async () => {
      if (reduced) {
        runs.push(
          anim(ring.current, [{ opacity: 0 }, { opacity: 1 }], {
            duration: REDUCED_MS,
            fill: 'both',
          }),
          anim(say.current, [{ opacity: 0 }, { opacity: 1 }], {
            duration: REDUCED_MS,
            fill: 'both',
          }),
        );
        await wait(STILL_MS);
      } else {
        const dx = from ? from.x - to.x : 0,
          dy = from ? from.y - to.y : 0;
        runs.push(
          anim(dim.current, [{ opacity: 0 }, { opacity: 1 }], { duration: DIM_MS, fill: 'both' }),
          anim(
            light.current,
            [
              { transform: `translate(${dx}px,${dy}px)`, opacity: 0 },
              { transform: `translate(${dx * 0.8}px,${dy * 0.8}px)`, opacity: 1, offset: 0.2 },
              { transform: 'translate(0,0)', opacity: 1 },
            ],
            { duration: TRAVEL_MS, easing: TRAVEL, fill: 'both' },
          ),
          anim(
            ring.current,
            [
              { transform: 'scale(.5)', opacity: 0 },
              { transform: 'scale(1)', opacity: 1 },
            ],
            { duration: RING_MS, delay: TRAVEL_MS - 80, easing: POP, fill: 'both' },
          ),
          anim(say.current, [{ opacity: 0 }, { opacity: 1 }], {
            duration: 120,
            delay: TRAVEL_MS,
            fill: 'both',
          }),
          // The line inks in from its outline (the headline's fill, DESIGN-SYSTEM.md Motion), left to right.
          anim(
            ink.current,
            [{ clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }],
            { duration: 500, delay: TRAVEL_MS, easing: OUT, fill: 'both' },
          ),
        );
        await wait(LEAVE_AT);
      }
      if (!live) return;
      const outs = [dim, light, ring, say].map((r) =>
        anim(r.current, [{ opacity: 1 }, { opacity: 0 }], { duration: LEAVE_MS, fill: 'forwards' }),
      );
      runs.push(...outs);
      await Promise.all(outs.map((x) => x.done));
    };
    const stop = () => {
      live = false;
      runs.forEach((r) => r.cancel());
      end();
    };
    signal.addEventListener('abort', stop);
    void go().then(() => live && end());
    return () => {
      live = false;
      signal.removeEventListener('abort', stop);
      runs.forEach((r) => r.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plays once
  }, []);

  const host = momentRoot();
  // Points are viewport coordinates; a host other than the body (the lab's transformed stage) is offset from them.
  const o = host === document.body ? { left: 0, top: 0 } : host.getBoundingClientRect();
  const size = to.r * 2 + 18;
  const at = (w: number, h = w): CSSProperties => ({
    left: to.x - o.left - w / 2,
    top: to.y - o.top - h / 2,
    width: w,
    height: h,
  });
  return createPortal(
    <div
      ref={root}
      data-seat-spotlight
      className="pointer-events-none fixed inset-0 z-[79]"
      style={{ '--tone': tone } as CSSProperties}
    >
      {!reduced && (
        <>
          <div
            ref={dim}
            aria-hidden
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--shade)_45%,transparent)] opacity-0"
          />
          <span
            ref={light}
            aria-hidden
            className="absolute rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--tone)_40%,transparent),transparent)] opacity-0"
            style={at(LIGHT)}
          />
        </>
      )}
      <span
        ref={ring}
        aria-hidden
        className="absolute rounded-full border-[3px] border-[var(--tone)] opacity-0 shadow-[0_0_18px_var(--tone)]"
        style={at(size)}
      />
      <p
        ref={say}
        role="status"
        className="disp absolute w-max max-w-[86vw] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] px-4 py-1.5 text-center text-20 font-extrabold opacity-0"
        // Centred on the screen, under the seat: a seat at the edge would push it off.
        style={{ left: '50%', top: to.y - o.top + to.r + 22 }}
      >
        <span className="ink-fill">
          {line}
          <span
            ref={ink}
            aria-hidden
            data-fill={line}
            style={{ WebkitTextStroke: 0 }}
            className="absolute inset-0 text-[var(--brand)] after:content-[attr(data-fill)]"
          />
        </span>
      </p>
    </div>,
    host,
  );
}
