import type { CSSProperties, ReactNode } from 'react';
import { usePhoto, useLook, type Face } from '@/components/ui/Avatar';
import { seatColor } from '@/theme/palette';
import { artOf, toneOf } from './art';
import { Base } from './art/base';
import type { Look, LookItem, Slot } from './types';

/**
 * The stage bust (REWARDS-PLAN §4.2), a lazy chunk: aura, outfit, face disc, neckwear, headwear, frame, badge, pip.
 * `AvatarFill` loads `BustLayers` from here for its hero and stage tiers; shared screens use `StageBust`.
 */

// The face disc (r 22 at 50,42) mapped onto an avatar's emoji (about 55% of the disc) and onto its edge.
const HERO = 'translate(50 50) scale(1.25) translate(-50 -42)';
const EDGE = 'translate(50 50) scale(2.05) translate(-50 -42)';
// The face disc's box in percent of the bust, for the HTML layers (photo, pip, a crown).
const FACE_BOX: CSSProperties = { left: '28%', top: '20%', width: '44%', height: '44%' };
const FACE_FONT = '24cqw';

function Item({ slot, it, at }: { slot: Slot; it: LookItem | undefined; at?: string }) {
  const art = it && artOf(slot, it.id);
  if (!it || !art) return null;
  return <g transform={at}>{art.draw(toneOf(art, it.v), it)}</g>;
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 100 100"
    aria-hidden
    focusable="false"
    className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
  >
    {children}
  </svg>
);

function FaceDisc({ p, url }: { p: Face; url: string | null }) {
  return (
    <span
      className="absolute grid place-items-center overflow-hidden rounded-full leading-none"
      style={{ ...FACE_BOX, background: seatColor(p.color), fontSize: FACE_FONT }}
    >
      {p.emoji}
      {url && (
        <img
          src={url}
          alt=""
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

interface Layers {
  p: Face;
  url: string | null;
  look: Look;
  hide?: readonly Slot[];
}

/** Back to front, around the face disc. */
function Stack({ p, url, look, hide = [] }: Layers) {
  const w = (s: Slot) => (hide.includes(s) ? undefined : look[s]);
  return (
    <>
      <Svg>
        <Item slot="aura" it={w('aura')} />
        <Base />
        <Item slot="outfit" it={w('outfit')} />
      </Svg>
      <FaceDisc p={p} url={url} />
      <Svg>
        <Item slot="neckwear" it={w('neckwear')} />
        <Item slot="headwear" it={w('headwear')} />
        <Item slot="frame" it={w('frame')} />
        <Item slot="badge" it={w('badge')} />
      </Svg>
    </>
  );
}

/**
 * Inside an avatar's disc (it clips): `hero` lays headwear, neckwear and the frame over the avatar's own face;
 * `portrait` covers the disc with the whole bust, shoulders cut by the circle.
 */
export function BustLayers({ mode, ...l }: Layers & { mode: 'hero' | 'portrait' }) {
  if (mode === 'hero')
    return (
      <Svg>
        <Item slot="neckwear" it={l.look.neckwear} at={HERO} />
        <Item slot="headwear" it={l.look.headwear} at={HERO} />
        <Item slot="frame" it={l.look.frame} at={EDGE} />
      </Svg>
    );
  return (
    <span
      className="absolute inset-0"
      style={{
        containerType: 'size',
        background: `color-mix(in srgb, ${seatColor(l.p.color)} 70%, var(--shade))`,
      }}
    >
      <Stack {...l} />
    </span>
  );
}

export interface StageBustProps {
  p: Face;
  /** Defaults to the player's own (`useLook`). */
  look?: Look | null;
  /** The bust's square box, as a CSS length or px; the face disc is 44% of it. */
  size: number | string;
  /** The one status mark, top-right of the face disc. */
  pip?: ReactNode;
  /** Laid over the face disc's box (a crown dropping in); its font size is the face emoji's. */
  over?: ReactNode;
  /** Slots left off: a Taj or Kursi crown replaces the headwear. */
  hide?: readonly Slot[];
  /** Read as an image with this name; otherwise decorative (a name sits beside it). */
  label?: string;
  className?: string;
}

/** The full bust, unclipped, for the moments one player owns the screen. */
export function StageBust({
  p,
  look,
  size,
  pip,
  over,
  hide,
  label,
  className = '',
}: StageBustProps) {
  const url = usePhoto(p),
    own = useLook(p),
    worn = look === undefined ? own : look;
  return (
    <span
      data-stage-bust
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, containerType: 'size' }}
    >
      <Stack p={p} url={url} look={worn ?? {}} hide={hide} />
      {pip != null && (
        <span
          className="absolute grid place-items-center rounded-full bg-[var(--surface-1)] leading-none shadow-[0_0_0_1.5px_var(--bg)]"
          style={{ left: '61%', top: '17%', width: '15%', height: '15%', fontSize: '9cqw' }}
        >
          {pip}
        </span>
      )}
      {over != null && (
        <span className="absolute" style={{ ...FACE_BOX, fontSize: FACE_FONT }}>
          {over}
        </span>
      )}
    </span>
  );
}

export default StageBust;
