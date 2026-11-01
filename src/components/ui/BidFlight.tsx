import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface Flight {
  id: number;
  v: number;
  from: { left: number; top: number; width: number; height: number };
  dx: number;
  dy: number;
}

let seq = 0;

/**
 * The bid flies from its key to the bidder's seat (DESIGN_SPEC_v1, "bid commit"): a copy of the key leaves the keypad,
 * shrinks towards the seat and fades as the seat's own badge pops in. Measured once at the tap, moved by transform
 * only, never in the way of the next tap, and skipped under reduced motion. Drawn on <body>, so a screen's transform
 * can't offset it.
 */
export function useBidFlight(table: string) {
  const rm = useReducedMotion();
  const [flight, setFlight] = useState<Flight | null>(null);
  const launch = useCallback(
    (key: HTMLElement, v: number, seat: number) => {
      if (rm) return;
      const target = document.querySelector(
        `[data-table="${table}"] [data-seat="${seat}"] [data-seat-avatar]`,
      );
      if (!target) return;
      const a = key.getBoundingClientRect(),
        b = target.getBoundingClientRect();
      // Where the seat's badge sits: centred on the avatar's right edge.
      const tx = b.right,
        ty = b.top + b.height * 0.75;
      setFlight({
        id: ++seq,
        v,
        from: { left: a.left, top: a.top, width: a.width, height: a.height },
        dx: tx - (a.left + a.width / 2),
        dy: ty - (a.top + a.height / 2),
      });
    },
    [rm, table],
  );
  const node = createPortal(
    <AnimatePresence>
      {flight && (
        <m.div
          key={flight.id}
          aria-hidden
          className="disp pointer-events-none fixed z-[80] grid place-items-center rounded-[var(--r-md)] text-22 font-bold text-ink-on-accent"
          style={flight.from}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: flight.dx, y: flight.dy, scale: 0.4, opacity: [1, 1, 0] }}
          exit={{ opacity: 0, transition: { duration: 0.05 } }}
          transition={{
            duration: 0.42,
            ease: [0.22, 1, 0.36, 1],
            opacity: { duration: 0.42, times: [0, 0.7, 1] },
          }}
          onAnimationComplete={() => setFlight((f) => (f?.id === flight.id ? null : f))}
        >
          <span className="mat-key-on absolute inset-0 rounded-[inherit]" />
          <span className="relative">{flight.v}</span>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
  return { launch, node };
}
