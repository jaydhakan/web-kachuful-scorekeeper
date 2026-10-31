import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { archive } from '@/state/archive';
import { resolveId } from '@/state/registry';

/** Anything drawn as a player: a registry player, a summary from the server, or a seat in a game. */
export interface Face {
  emoji: string;
  color: string;
  photoUrl?: string | null;
  /** A seat's registry id; for registry players and summaries `id` is the player. */
  playerId?: string | null;
  id?: string;
}

const subscribe = (f: () => void) => archive.subscribe(f);

/** The player's photo: the one given, else the registry's (kept fresh by sync), else none. */
export function usePhoto(p: Face): string | null {
  const key = p.playerId ?? p.id;
  const known = useSyncExternalStore(subscribe, () =>
    key ? (archive.get('players', resolveId(key))?.photoUrl ?? null) : null,
  );
  return p.photoUrl ?? known;
}

/**
 * What goes inside an avatar: the emoji, with the photo over it once loaded (it fades in; reduced motion shows it at
 * once). Its container must be positioned; the photo takes its rounding. `Avatar` is that container.
 */
export function AvatarFill({ p }: { p: Face }) {
  const url = usePhoto(p);
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  return (
    <>
      {p.emoji}
      {url && failed !== url && (
        <img
          src={url}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(url)}
          onError={() => setFailed(url)}
          className={`absolute inset-0 h-full w-full rounded-[inherit] object-cover transition-opacity duration-300 motion-reduce:transition-none ${loaded === url ? 'opacity-100' : 'opacity-0'}`}
        />
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
  className = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-22',
  style,
}: {
  p: Face;
  className?: string;
  style?: CSSProperties;
}) {
  // The photo fills a positioned parent and takes its rounding; callers that place the avatar themselves already are.
  const pos = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className) ? '' : 'relative ';
  return (
    <span
      aria-hidden
      className={`${pos}${className}`}
      style={{ background: p.color, ...style }}
    >
      <AvatarFill p={p} />
    </span>
  );
}
