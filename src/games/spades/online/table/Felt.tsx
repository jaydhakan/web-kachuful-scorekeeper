import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cardId } from '@/games/spades/domain/cards';
import type { Card, Play, Seat } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { anim, boxOf, EASE, mid, OUT, POP, rng, type Box } from '@/games/spades/ui/fx';
import { Seat as SeatView, Shards, type SeatProps } from '@/games/spades/ui/Seat';
import { SpCard, cardName } from '@/games/spades/ui/SpCard';

type Place = 0 | 1 | 2 | 3;
/** Where each place sits on the felt (bottom, left, top, right), as in the approved preview. */
const SEAT_AT: Record<Place, string> = {
  0: 'left-1/2 top-[87%]',
  1: 'left-[15%] top-[47%]',
  2: 'left-1/2 top-[13%]',
  3: 'left-[85%] top-[47%]',
};
const SLOT_AT: Record<Place, string> = {
  0: 'left-1/2 top-[61%]',
  1: 'left-[37%] top-[48%]',
  2: 'left-1/2 top-[36%]',
  3: 'left-[63%] top-[48%]',
};

/** A card's resting tilt on the felt: the same every render, different card to card. */
const tilt = (c: Card) => {
  const h = [...cardId(c)].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7);
  return ((Math.abs(h) % 17) - 8) as number;
};

/** Where a card flies in from: a seat's avatar (face down, it turns in flight) or a box (your hand). */
export type FlyFrom = { seat: Seat } | { box: Box };

export interface TrickPlay extends Play {
  place: Place;
  fly: FlyFrom | null;
  /** The card that decides the hand flies at 1.5× its length (WOW-MOMENTS-PLAN S3). */
  slow?: boolean;
}

function TrickCard({
  p,
  root,
  win,
  beaten,
  pulse,
}: {
  p: TrickPlay;
  root: RefObject<HTMLElement>;
  win: boolean;
  beaten: boolean;
  pulse: boolean;
}) {
  const wrap = useRef<HTMLSpanElement>(null);
  const flip = useRef<HTMLSpanElement>(null);
  const rot = tilt(p.card);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el || !p.fly) return;
    let src: Box | null = null;
    if ('box' in p.fly) src = p.fly.box;
    else {
      const av = root.current?.querySelector(`[data-seat="${p.fly.seat}"] [data-seat-avatar]`);
      if (av) src = boxOf(av);
    }
    if (!src) return;
    const to = mid(boxOf(el)),
      from = mid(src);
    const dx = from.x - to.x,
      dy = from.y - to.y;
    const k = Math.max(0.4, Math.min(1.4, src.w / el.offsetWidth || 1));
    const spin = 'box' in p.fly ? 0 : rot * 1.6;
    const a = anim(
      el,
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(${k})`, opacity: 0 },
        {
          transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(${k})`,
          opacity: 1,
          offset: 0.05,
        },
        {
          transform: `translate(${dx * 0.25}px, ${dy * 0.25 - 14}px) rotate(${rot * 1.6}deg) scale(1.1)`,
          offset: 0.7,
        },
        { transform: `rotate(${rot}deg)`, opacity: 1 },
      ],
      { duration: p.slow ? 690 : 460, easing: EASE },
    );
    // Someone else's card leaves their seat face down and turns over on the way.
    const f =
      'seat' in p.fly
        ? anim(flip.current, [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], {
            duration: p.slow ? 690 : 460,
            easing: OUT,
          })
        : null;
    return () => {
      a.cancel();
      f?.cancel();
    };
    // One flight, when the card first lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (!pulse) return;
    const a = anim(
      wrap.current,
      [
        { transform: `rotate(${rot}deg) scale(1)` },
        { transform: `rotate(${rot}deg) scale(1.14)` },
        { transform: `rotate(${rot}deg) scale(1.06)` },
        { transform: `rotate(${rot}deg) scale(1)` },
      ],
      { duration: 520, delay: p.fly ? 440 : 0, easing: POP },
    );
    return () => a.cancel();
  }, [pulse, rot, p.fly]);
  return (
    <span
      className={`absolute z-[2] w-[52px] -translate-x-1/2 -translate-y-1/2 [@media(min-width:390px)]:w-[clamp(60px,18vw,76px)] big:w-16 ${SLOT_AT[p.place]}`}
    >
      <span
        ref={wrap}
        data-trick-card={cardId(p.card)}
        className="relative block"
        style={{ transform: `rotate(${rot}deg)` }}
      >
        <SpCard card={p.card} size="slot" label flipRef={flip} className="w-full" />
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-[11%_/_7.9%] bg-[color-mix(in_srgb,var(--bg)_50%,transparent)] transition-opacity duration-300 ${beaten ? 'opacity-100' : 'opacity-0'}`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute -inset-1 rounded-[9px] border-[2.5px] border-[var(--medal-gold-hi)] shadow-[0_0_18px_var(--medal-gold)] transition-opacity duration-300 ${win ? 'opacity-100' : 'opacity-0'}`}
        />
      </span>
    </span>
  );
}

export interface TrickAreaProps {
  plays: TrickPlay[];
  /** The seat winning so far, and whether it got there by cutting (a spade on another suit's lead). */
  leader: Seat | null;
  cut: boolean;
  /** The trick is done: gather the cards and slide them to this seat, then call `onSwept`. */
  sweepTo: Seat | null;
  onSwept: () => void;
  root: RefObject<HTMLElement>;
}

function TrickArea({ plays, leader, cut, sweepTo, onSwept, root }: TrickAreaProps) {
  const box = useRef<HTMLDivElement>(null);
  const done = useRef(onSwept);
  done.current = onSwept;
  useLayoutEffect(() => {
    if (sweepTo === null) return;
    const felt = root.current?.querySelector('[data-felt]');
    const av = root.current?.querySelector(`[data-seat="${sweepTo}"] [data-seat-avatar]`);
    const cards = [...(box.current?.querySelectorAll<HTMLElement>('[data-trick-card]') ?? [])];
    if (!felt || !av || !cards.length) {
      done.current();
      return;
    }
    const f = boxOf(felt);
    const centre = { x: f.x + f.w / 2, y: f.y + f.h * 0.48 },
      target = mid(boxOf(av));
    let live = true;
    const runs: { cancel: () => void }[] = [];
    const go = async () => {
      const first = cards.map((c, i) => {
        const at = mid(boxOf(c));
        const r = anim(
          c,
          [
            { transform: c.style.transform },
            {
              transform: `translate(${centre.x - at.x}px, ${centre.y - at.y}px) rotate(${(i - 1.5) * 6}deg)`,
            },
          ],
          { duration: 260, fill: 'forwards' },
        );
        runs.push(r);
        return { r, at };
      });
      await Promise.all(first.map((x) => x.r.done));
      if (!live) return;
      const second = first.map(({ at }, i) => {
        const r = anim(
          cards[i],
          [
            {
              transform: `translate(${centre.x - at.x}px, ${centre.y - at.y}px) rotate(${(i - 1.5) * 6}deg)`,
            },
            {
              transform: `translate(${target.x - at.x}px, ${target.y - at.y}px) scale(.25)`,
              opacity: 0,
            },
          ],
          { duration: 420, fill: 'forwards' },
        );
        runs.push(r);
        return r.done;
      });
      await Promise.all(second);
      if (live) done.current();
    };
    void go();
    return () => {
      live = false;
      runs.forEach((r) => r.cancel());
    };
  }, [sweepTo, root]);
  return (
    <div ref={box} className="contents">
      {plays.map((p, i) => (
        <TrickCard
          key={`${p.seat}-${cardId(p.card)}`}
          p={p}
          root={root}
          win={leader === p.seat}
          beaten={cut && leader !== p.seat}
          pulse={cut && leader === p.seat && i === plays.length - 1}
        />
      ))}
    </div>
  );
}

/** The crack across the felt when spades break, its big spade and the banner; it settles to a faint mark. */
function Crack({ seed }: { seed: number }) {
  const layer = useRef<HTMLDivElement>(null);
  const spade = useRef<HTMLDivElement>(null);
  const banner = useRef<HTMLDivElement>(null);
  const r = rng(seed);
  const segs: { x: number; y: number; ang: number; len: number; k: number }[] = [];
  for (let a = 0; a < 5; a++) {
    let ang = (a / 5) * Math.PI * 2 + (r() - 0.5) * 0.6,
      x = 0,
      y = 0;
    for (let k = 0; k < 4; k++) {
      const len = 18 + r() * 16;
      segs.push({ x, y, ang, len, k });
      x += Math.cos(ang) * len;
      y += Math.sin(ang) * len;
      ang += (r() - 0.5) * 1.2;
    }
  }
  useLayoutEffect(() => {
    const runs = [...(layer.current?.children ?? [])].map((el, i) => {
      const sg = segs[i];
      const tf = `translate(${sg.x}px, ${sg.y}px) rotate(${sg.ang}rad)`;
      return anim(
        el,
        [
          { transform: `${tf} scaleX(0)`, opacity: 0 },
          { transform: `${tf} scaleX(1)`, opacity: 1 },
        ],
        {
          duration: 120,
          delay: sg.k * 90,
          easing: 'linear',
          fill: 'backwards',
        },
      );
    });
    runs.push(
      // The felt itself shakes once (S4): 3px, two cycles, 200ms. Reduced motion: still.
      anim(
        layer.current?.closest('[data-felt]'),
        [0, 3, -3, 3, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 200, easing: 'linear' },
      ),
      anim(layer.current, [{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0.22 }], {
        duration: 2100,
        fill: 'forwards',
      }),
      anim(
        spade.current,
        [
          { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0.9, offset: 0.4 },
          { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 },
        ],
        { duration: 1000, fill: 'forwards' },
      ),
      anim(
        banner.current,
        [
          { transform: 'translate(-50%,-20px) scale(.8)', opacity: 0 },
          { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: 0.25 },
          { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: 0.8 },
          { transform: 'translate(-50%,0) scale(1)', opacity: 0 },
        ],
        { duration: 2000, easing: OUT, fill: 'forwards' },
      ),
    );
    return () => runs.forEach((x) => x.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  return (
    <>
      <div
        ref={layer}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[48%] z-[1] opacity-[.22]"
      >
        {segs.map((sg, i) => (
          <i
            key={i}
            className="absolute left-0 top-0 h-[3px] origin-[0_50%] rounded-[2px] bg-[var(--text-1)] shadow-[0_0_10px_var(--trump-spades)]"
            style={{
              width: sg.len,
              transform: `translate(${sg.x}px, ${sg.y}px) rotate(${sg.ang}rad)`,
            }}
          />
        ))}
      </div>
      <div
        ref={spade}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[48%] z-[5] text-[110px] leading-none text-[var(--trump-spades)] opacity-0"
      >
        ♠
      </div>
      <div
        ref={banner}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[23%] z-[6] -translate-x-1/2 whitespace-nowrap rounded-full border border-[color-mix(in_srgb,var(--trump-spades)_60%,transparent)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-4 py-[7px] text-15 font-bold opacity-0"
      >
        {s.chip.banner}
      </div>
    </>
  );
}

/** The ♠ locked / broken chip; it pops as it turns. */
function SpadesChip({ broken }: { broken: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const was = useRef(broken);
  // The chip breaks into the shards a Nil halo uses, as it turns (S4).
  const [shards, setShards] = useState(0);
  useLayoutEffect(() => {
    if (broken && !was.current) setShards((n) => n + 1);
    if (broken && !was.current)
      anim(
        ref.current,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
        {
          duration: 420,
          delay: 300,
          easing: POP,
        },
      );
    was.current = broken;
  }, [broken]);
  return (
    <span
      className="absolute left-[18%] top-[20%] z-[3] -translate-x-1/2 -translate-y-1/2"
      title={broken ? s.chip.brokenTip : s.chip.lockedTip}
    >
      <span
        ref={ref}
        className={`flex items-center gap-[5px] whitespace-nowrap rounded-full py-[3px] pl-2 pr-2.5 text-13 font-bold ${broken ? 'bg-[color-mix(in_srgb,var(--trump-spades)_18%,transparent)] text-[var(--text-1)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--trump-spades)_50%,transparent)]' : 'bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] text-[var(--tx2)]'}`}
      >
        {!broken && (
          <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3">
            <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="currentColor" />
            <path
              d="M4 5.5V4a2 2 0 0 1 4 0v1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
        )}
        {broken ? s.chip.broken : s.chip.locked}
      </span>
      {shards > 0 && <Shards key={shards} seed={shards * 31} tone="bg-[var(--trump-spades)]" />}
    </span>
  );
}

export interface FeltProps {
  root: RefObject<HTMLDivElement>;
  feltRef: RefObject<HTMLDivElement>;
  seats: (SeatProps & { place: Place })[];
  trick: TrickAreaProps | null;
  broken: boolean;
  /** Spades broke this deal: the crack's seed (one per deal), or null. */
  crack: number | null;
  /** Tap the centre to see the last trick. */
  onCentre: () => void;
  centreLabel: string;
  centreText: string | null;
  showChip: boolean;
  children?: ReactNode;
}

/** The felt: four seats, the trick in the middle, the spades chip, the crack, and whatever lies over it. */
export function Felt({
  root,
  feltRef,
  seats,
  trick,
  broken,
  crack,
  onCentre,
  centreLabel,
  centreText,
  showChip,
  children,
}: FeltProps) {
  return (
    <div className="relative h-full min-h-0 px-2.5">
      <div
        ref={feltRef}
        data-felt
        className="felt absolute inset-x-2.5 bottom-1.5 top-1 rounded-[46%_/_30%]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3.5 rounded-[inherit] border border-dashed border-ov/[.18]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center text-[120px] opacity-[.07]"
        >
          ♠
        </div>
        <button
          type="button"
          aria-label={centreLabel}
          onClick={onCentre}
          className="absolute left-1/2 top-[48%] z-[1] h-[46%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-[40%] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)]"
        />
        {crack !== null && <Crack key={crack} seed={crack} />}
        {showChip && <SpadesChip broken={broken} />}
        {centreText && (
          <p className="pointer-events-none absolute left-1/2 top-[48%] z-[4] w-[70%] -translate-x-1/2 -translate-y-1/2 text-center text-14 font-semibold text-[var(--tx2)]">
            {centreText}
          </p>
        )}
        {trick && <TrickArea {...trick} root={root} />}
        {seats.map((p) => (
          <SeatView key={p.seat} {...p} className={SEAT_AT[p.place]} />
        ))}
        {children}
      </div>
    </div>
  );
}

export { cardName, SEAT_AT };
