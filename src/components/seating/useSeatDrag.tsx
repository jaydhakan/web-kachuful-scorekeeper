import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { AvatarFill } from '@/components/ui/Avatar';
import { seatColor } from '@/theme/palette';
import type { Seat } from '@/people';

interface DragState {
  k: number;
  x: number;
  y: number;
  on: boolean;
  timer: ReturnType<typeof setTimeout>;
}

// Long enough that a tap (choose the dealer) never starts a drag; a finger that wanders first is a scroll.
const HOLD_MS = 380;
const SLOP_PX = 10;

/**
 * Press and hold a seat, then drag it onto another to swap the two (the first-dealer step of every game). Spread the
 * handlers on the box around the table; a seat tap that ends a drag is reported by `justDragged()` so it's ignored.
 */
export function useSeatDrag(
  wrap: RefObject<HTMLElement | null>,
  seats: (Seat | null)[],
  onSwap: (a: number, b: number) => void,
  o: { off?: boolean; vib?: () => void } = {},
) {
  const drag = useRef<DragState | null>(null),
    ended = useRef(0);
  const [ghost, setGhost] = useState<{ x: number; y: number; p: Seat } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const s = (e.target as HTMLElement).closest<HTMLElement>('[data-seat]');
    if (!s || o.off) return;
    const k = +(s.dataset.seat ?? -1),
      p = seats[k];
    if (!p) return;
    const st: DragState = {
      k,
      x: e.clientX,
      y: e.clientY,
      on: false,
      timer: setTimeout(() => {
        st.on = true;
        o.vib?.();
        const r = wrap.current?.getBoundingClientRect();
        if (r) setGhost({ x: st.x - r.left, y: st.y - r.top, p });
      }, HOLD_MS),
    };
    drag.current = st;
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const st = drag.current;
    if (!st) return;
    if (!st.on) {
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > SLOP_PX) {
        clearTimeout(st.timer);
        drag.current = null;
      }
      return;
    }
    const r = wrap.current?.getBoundingClientRect();
    if (r) setGhost((gh) => gh && { ...gh, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const st = drag.current;
    if (!st) return;
    clearTimeout(st.timer);
    drag.current = null;
    if (!st.on) return;
    ended.current = Date.now();
    setGhost(null);
    const el = document.elementFromPoint(e.clientX, e.clientY),
      s = el?.closest<HTMLElement>('[data-seat]');
    const to = s && wrap.current?.contains(s) ? +(s.dataset.seat ?? -1) : -1;
    if (to >= 0 && to !== st.k) {
      onSwap(st.k, to);
      o.vib?.();
    }
  };
  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    /** The click that follows a drop lands on a seat; it isn't a tap. */
    justDragged: () => Date.now() - ended.current < 450,
    ghost: ghost && (
      <div
        aria-hidden
        className="pointer-events-none absolute z-[9] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 scale-110 place-items-center rounded-full border-2 border-ov/40 text-30 shadow-[0_18px_40px_color-mix(in_srgb,var(--shade)_60%,transparent)]"
        style={{ left: ghost.x, top: ghost.y, background: seatColor(ghost.p.color) }}
      >
        <AvatarFill p={ghost.p} />
      </div>
    ),
  };
}
