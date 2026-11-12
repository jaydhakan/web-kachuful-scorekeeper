import { m } from 'framer-motion';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { gameById } from '../catalog';
import { currentGame, go, type GameId } from '../route';

/** The tile grows for GROW_MS, the game is opened under it, and it fades for FADE_MS once the game has drawn. */
export const GROW_MS = 280;
export const FADE_MS = 200;
/** A game still loading by now gets its Loader instead: the cover never outstays this. */
export const CAP_MS = 1200;
const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface Opening {
  id: GameId;
  art: ReactNode;
  phase: 'grow' | 'cover' | 'out';
  // The cover's box at full size, and the transform that puts it back on the tile.
  left: number;
  top: number;
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
}

let now: Opening | null = null;
const subs = new Set<() => void>();
let timers: number[] = [];

function set(next: Opening | null) {
  now = next;
  subs.forEach((f) => f());
}
const later = (f: () => void, ms: number) => timers.push(window.setTimeout(f, ms));
function clear() {
  timers.forEach((id) => clearTimeout(id));
  timers = [];
}

function fade() {
  if (!now || now.phase === 'out') return;
  set({ ...now, phase: 'out' });
  later(() => {
    clear();
    set(null);
  }, FADE_MS);
}

/**
 * Opens a game from its landing tile: a copy of the tile's art grows from `from` to cover the screen, then the game
 * opens beneath it. With nothing to grow from (no element, nothing measured) or under reduced motion it opens at once.
 */
export function openGame(id: GameId, from: Element | null, art: ReactNode) {
  if (now?.phase === 'grow') return;
  const r = from?.getBoundingClientRect();
  const vw = window.innerWidth,
    vh = window.innerHeight;
  if (
    !r ||
    !r.width ||
    !r.height ||
    !vw ||
    !vh ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    go(id);
    return;
  }
  clear();
  // Laid out at its final size and scaled down to the tile, so the art is drawn once and stays sharp as it grows.
  const k = Math.max(vw / r.width, vh / r.height);
  const width = r.width * k,
    height = r.height * k;
  const left = (vw - width) / 2,
    top = (vh - height) / 2;
  set({
    id,
    art,
    phase: 'grow',
    left,
    top,
    width,
    height,
    x: r.left - left,
    y: r.top - top,
    scale: 1 / k,
  });
  // The chunk starts loading now, so it is usually there when the tile has grown.
  void gameById(id)
    .load()
    .catch(() => {});
  later(() => {
    if (!now) return;
    // Back or Forward during the growth wins: the address is already somewhere else.
    if (currentGame() !== null) return fade();
    set({ ...now, phase: 'cover' });
    go(id);
  }, GROW_MS);
  later(fade, CAP_MS);
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
/** The tile being opened, if any. */
export const useOpening = () => useSyncExternalStore(subscribe, () => now);

/** Rendered beside a game inside its Suspense: its effect runs once the game has drawn, which lets the cover go. */
export function Arrived() {
  useEffect(() => {
    if (now?.phase === 'cover') fade();
  }, []);
  return null;
}

/** The growing copy of the tile. Decorative, and it never takes a tap. */
export function OpenGameCover() {
  const o = useOpening();
  if (!o) return null;
  return (
    <m.div
      aria-hidden
      data-open-game={o.phase}
      className="pointer-events-none fixed z-[100] overflow-hidden"
      style={{
        left: o.left,
        top: o.top,
        width: o.width,
        height: o.height,
        originX: 0,
        originY: 0,
      }}
      initial={{ x: o.x, y: o.y, scale: o.scale, opacity: 1 }}
      animate={{ x: 0, y: 0, scale: 1, opacity: o.phase === 'out' ? 0 : 1 }}
      transition={{
        duration: GROW_MS / 1000,
        ease: OUT,
        opacity: { duration: FADE_MS / 1000, ease: 'linear' },
      }}
    >
      {o.art}
    </m.div>
  );
}
