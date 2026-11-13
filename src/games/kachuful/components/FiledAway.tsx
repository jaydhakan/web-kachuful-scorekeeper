import { useReducedMotion } from 'framer-motion';
import { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Game, Player } from '@/games/kachuful/domain';
import { Dot } from '@/components/ui/Dot';

const FLY_MS = 480;
const SEEK_MS = 300;

/** The History entry on the screen arriving, if it is drawn and in view. */
function historyRect(): DOMRect | null {
  for (const hook of document.querySelectorAll('[data-dest="history"]')) {
    // The large-screen rail wraps its item in a box-less element, so the item itself is measured.
    const b = (hook.firstElementChild ?? hook).getBoundingClientRect(),
      x = b.left + b.width / 2,
      y = b.top + b.height / 2;
    if (b.width && b.height && x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight) return b;
  }
  return null;
}

/**
 * The finished game is filed into History: on leaving the winner screen for Home, a chip of the winner travels from
 * the headline to the History entry and fades as it arrives. A copy on <body> moved by transform only (as the bid
 * flight is), so it outlives the screen it left and never takes a tap. No chip for the demo, an unfinished game or
 * reduced motion, or when History is not on screen within SEEK_MS.
 */
export function useFiledAway(g: Game, winner: Player | undefined) {
  const rm = useReducedMotion();
  const chip = useRef<HTMLDivElement>(null);
  const on = !rm && !!winner && g.status === 'finished' && g.id !== 'demo';
  const file = useCallback((from: Element | null) => {
    const tpl = chip.current,
      a = from?.getBoundingClientRect();
    if (!tpl || !a?.width || typeof tpl.animate !== 'function') return;
    const el = tpl.cloneNode(true) as HTMLElement;
    document.body.append(el);
    const w = el.offsetWidth,
      h = el.offsetHeight,
      at = (b: DOMRect) =>
        `translate(${b.left + (b.width - w) / 2}px, ${b.top + (b.height - h) / 2}px)`;
    const t0 = performance.now();
    // Home mounts after the tap, so its History entry is looked for over the next frames.
    const seek = () => {
      const b = historyRect();
      if (!b) {
        if (performance.now() - t0 < SEEK_MS) requestAnimationFrame(seek);
        else el.remove();
        return;
      }
      const fly = el.animate(
        [
          { transform: `${at(a)} scale(1)`, opacity: 1 },
          { opacity: 1, offset: 0.7 },
          { transform: `${at(b)} scale(0.4)`, opacity: 0 },
        ],
        { duration: FLY_MS, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
      );
      fly.onfinish = fly.oncancel = () => el.remove();
    };
    requestAnimationFrame(seek);
  }, []);
  // Drawn once, unseen, so the copy that flies needs no React of its own.
  const node = on
    ? createPortal(
        <div
          ref={chip}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[80] flex items-center gap-2 rounded-full border border-ov/10 bg-toast py-1 pl-1 pr-3 text-15 font-bold opacity-0 shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--shade)_70%,transparent)]"
        >
          <Dot p={winner} s={28} />
          <span className="whitespace-nowrap">{winner.name}</span>
        </div>,
        document.body,
      )
    : null;
  return { node, file };
}
