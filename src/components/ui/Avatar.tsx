import {
  lazy,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { archive } from '@/state/archive';
import { resolveId } from '@/state/registry';
import { seatColor } from '@/theme/palette';
import { dressed, ringOf } from '@/wardrobe/ring';
import type { Look } from '@/wardrobe/types';

// The bust's art is a lazy chunk: only an avatar of hero size or more with a look ever fetches it.
const BustLayers = lazy(() =>
  import('@/wardrobe/StageBust').then((m) => ({ default: m.BustLayers })),
);

/** Anything drawn as a player: a registry player, a summary from the server, or a seat in a game. */
export interface Face {
  emoji: string;
  color: string;
  photoUrl?: string | null;
  /** What they wear (the Wardrobe); left out, the registry's. `null`: nothing. */
  look?: Look | null;
  /** A seat's registry id; for registry players and summaries `id` is the player. */
  playerId?: string | null;
  id?: string;
}

const subscribe = (f: () => void) => archive.subscribe(f);
const recOf = (p: Face) => {
  const key = p.playerId ?? p.id;
  return key ? archive.get('players', resolveId(key)) : undefined;
};

/** The player's photo: the one given, else the registry's (kept fresh by sync), else none. */
export function usePhoto(p: Face): string | null {
  const known = useSyncExternalStore(subscribe, () => recOf(p)?.photoUrl ?? null);
  return p.photoUrl ?? known;
}

/** The player's look: the one given (null included), else the registry's, else none. */
export function useLook(p: Face): Look | null {
  const known = useSyncExternalStore(subscribe, () => recOf(p)?.look ?? null);
  return p.look !== undefined ? p.look : known;
}

/** REWARDS-PLAN §4.3: what an avatar shows depends on the size it is drawn at. */
export type Tier = 'dot' | 'seat' | 'hero' | 'stage';
export const tierOf = (px: number): Tier =>
  px < 32 ? 'dot' : px < 48 ? 'seat' : px < 72 ? 'hero' : 'stage';

const watched = new Map<Element, (px: number) => void>();
let ro: ResizeObserver | undefined;

/** One ResizeObserver for every dressed avatar on screen; the size is never a prop the call sites pass. */
function useTier(el: RefObject<Element | null>, on: boolean): Tier {
  const [tier, setTier] = useState<Tier>('seat');
  useLayoutEffect(() => {
    const node = el.current;
    if (!on || !node || typeof ResizeObserver === 'undefined') return;
    ro ??= new ResizeObserver((es) => {
      for (const e of es) watched.get(e.target)?.(e.contentRect.width);
    });
    watched.set(node, (w) => setTier(tierOf(w)));
    ro.observe(node);
    return () => {
      watched.delete(node);
      ro?.unobserve(node);
    };
  }, [el, on]);
  return tier;
}

/**
 * What goes inside an avatar: the emoji, with the photo over it once loaded (it fades in; reduced motion shows it at
 * once). Its container must be positioned; the photo takes its rounding. `Avatar` is that container.
 * A player with a look gets their frame as a ring, and from hero size the art (dot, seat, hero, stage: `tierOf`).
 * `pip` is the one status mark, top-right.
 */
export function AvatarFill({ p, pip }: { p: Face; pip?: ReactNode }) {
  const url = usePhoto(p);
  const look = useLook(p);
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const host = useRef<HTMLSpanElement>(null);
  const on = dressed(look);
  const tier = useTier(host, on);
  const ring = on ? ringOf(look) : null;
  return (
    <>
      {p.emoji}
      {url && failed !== url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(url)}
          onError={() => setFailed(url)}
          className={`absolute inset-0 h-full w-full rounded-[inherit] object-cover transition-opacity duration-300 motion-reduce:transition-none ${loaded === url ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {on && (
        <span
          ref={host}
          aria-hidden
          data-tier={tier}
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          style={
            ring ? { boxShadow: `inset 0 0 0 ${tier === 'dot' ? 2 : 3}px ${ring}` } : undefined
          }
        >
          {(tier === 'hero' || tier === 'stage') && (
            <Suspense fallback={null}>
              <BustLayers
                p={p}
                url={url && failed !== url ? url : null}
                look={look}
                mode={tier === 'hero' ? 'hero' : 'portrait'}
              />
            </Suspense>
          )}
        </span>
      )}
      {pip != null && (
        <span
          aria-hidden
          data-pip
          className="pointer-events-none absolute -right-[6%] -top-[6%] grid h-[42%] min-h-3 w-[42%] min-w-3 place-items-center rounded-full bg-[var(--surface-1)] leading-none shadow-[0_0_0_1.5px_var(--bg)]"
          style={{ fontSize: '0.42em' }}
        >
          {pip}
        </span>
      )}
    </>
  );
}

/**
 * A player's round face: their photo when they have one, else the emoji on their colour. `className` sets the size
 * and shape, as each place drew the emoji before. Decorative: names sit beside it.
 */
export function Avatar({
  p,
  pip,
  className = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-22',
  style,
}: {
  p: Face;
  pip?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  // The photo fills a positioned parent and takes its rounding; callers that place the avatar themselves already are.
  const pos = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className) ? '' : 'relative ';
  return (
    <span
      aria-hidden
      className={`${pos}${className}`}
      style={{ background: seatColor(p.color), ...style }}
    >
      <AvatarFill p={p} pip={pip} />
    </span>
  );
}
