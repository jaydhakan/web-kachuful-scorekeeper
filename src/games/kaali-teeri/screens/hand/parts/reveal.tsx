import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KtHand } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { SeatBadge } from '@/components/ui/Table';
import { seatBadges } from './bits';

/** Seconds: the flip's spring has settled by then; and the dot's run from the card to the seat. */
export const FLIP_S = 0.35;
export const FLY_S = 0.48;
const FLY_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];
// The tables a hand in play is drawn on: the phone's and the desk's.
const SEATS = ['kt-play', 'kt-ws'];
const DOT = 12;

type Marks = Pick<KtHand, 'index' | 'playedBy'>;
const NONE: ReadonlyMap<number, number> = new Map();
let seq = 0;

/**
 * The called cards marked while this screen is open, by index, each with a token for that marking. A card already
 * marked when the screen opened, or one an undo brought back, is not in it: those are simply there.
 */
export function useFreshMarks(
  h: Marks | null | undefined,
  depth: number,
): ReadonlyMap<number, number> {
  const [seen, setSeen] = useState({ hand: h?.index, marks: h?.playedBy, depth });
  const [fresh, setFresh] = useState(NONE);
  // Derived while rendering, so a badge mounts already knowing whether it is new.
  if (seen.marks !== h?.playedBy || seen.hand !== h?.index || seen.depth !== depth) {
    setSeen({ hand: h?.index, marks: h?.playedBy, depth });
    const next = new Map<number, number>();
    const was = seen.marks;
    if (h && was && seen.hand === h.index) {
      const undone = depth < seen.depth;
      h.playedBy.forEach((by, i) => {
        if (by == null) return;
        const tok = fresh.get(i);
        if (tok !== undefined) next.set(i, tok);
        else if (was[i] == null && !undone) next.set(i, ++seq);
      });
    }
    if (next.size || fresh.size) setFresh(next);
  }
  return fresh;
}

/**
 * The seat badges for the hand in play. A partner marked just now gets theirs as the dot lands on the seat, not
 * before; under reduced motion there is no dot, so nothing waits.
 */
export function useRevealBadges(
  h: KtHand | null | undefined,
): Record<string, SeatBadge> | undefined {
  const rm = useReducedMotion();
  const fresh = useFreshMarks(h, useKt().state.undo.length);
  const [landed, setLanded] = useState<ReadonlySet<number>>(new Set());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    for (const tok of fresh.values())
      if (!timers.current.has(tok))
        timers.current.set(
          tok,
          setTimeout(() => setLanded((s) => new Set(s).add(tok)), (FLIP_S + FLY_S) * 1000),
        );
  }, [fresh]);
  useEffect(() => {
    const ts = timers.current;
    return () => {
      ts.forEach(clearTimeout);
      ts.clear();
    };
  }, []);
  if (!h) return undefined;
  const wait = new Set<number>();
  if (!rm) fresh.forEach((tok, i) => !landed.has(tok) && wait.add(i));
  return seatBadges(h, wait);
}

interface Flight {
  id: number;
  left: number;
  top: number;
  dx: number;
  dy: number;
}

const onScreen = (r: DOMRect) =>
  r.width > 0 &&
  r.height > 0 &&
  r.right > 0 &&
  r.bottom > 0 &&
  r.left < window.innerWidth &&
  r.top < window.innerHeight;

/**
 * Partner revealed (DESIGN-SYSTEM.md, Motion): a dot in the bidding team's colour runs from the turned card to that
 * player's seat. Same idea as the bid flight: measured once, moved by transform on <body>, never in the way of a tap.
 * No seat on screen (or a hidden copy of the cards): no flight.
 */
export function useRevealFlight() {
  const [flight, setFlight] = useState<Flight | null>(null);
  const fly = useCallback((card: HTMLElement, seat: number) => {
    const a = card.getBoundingClientRect();
    if (!onScreen(a)) return;
    for (const uid of SEATS) {
      const seatEl = document.querySelector(`[data-table="${uid}"] [data-seat="${seat}"]`);
      const b = seatEl?.querySelector('[data-seat-avatar]')?.getBoundingClientRect();
      if (!seatEl || !b || !onScreen(b)) continue;
      // Where the seat's badge sits: under the name, or under the avatar on a table that hides names.
      const ty = b.bottom + (seatEl.querySelector('[data-seat-name]') ? 27 : 11);
      const x = a.left + a.width / 2,
        y = a.top + a.height / 2;
      setFlight({
        id: ++seq,
        left: x - DOT / 2,
        top: y - DOT / 2,
        dx: b.left + b.width / 2 - x,
        dy: ty - y,
      });
      return;
    }
  }, []);
  const node = createPortal(
    <AnimatePresence>
      {flight && (
        <m.span
          key={flight.id}
          aria-hidden
          data-kt-flight
          className="pointer-events-none fixed z-[80] rounded-full bg-kt-bid"
          style={{ left: flight.left, top: flight.top, width: DOT, height: DOT }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 0 }}
          animate={{ x: flight.dx, y: flight.dy, scale: 0.7, opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0, transition: { duration: 0.05 } }}
          transition={{
            duration: FLY_S,
            ease: FLY_EASE,
            opacity: { duration: FLY_S, times: [0, 0.12, 0.8, 1], ease: 'linear' },
          }}
          onAnimationComplete={() => setFlight((f) => (f?.id === flight.id ? null : f))}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
  return { fly, node };
}
