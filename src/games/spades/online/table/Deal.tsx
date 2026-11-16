import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { vibrate } from '@/hooks/useHaptics';
import { SPRING_POP } from '@/components/ui/motion';
import type { Seat } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { sfx } from '@/games/spades/sound/sfx';
import { anim, boxOf, EASE, mid, POP, reducedMotion } from '@/games/spades/ui/fx';
import { SpCard } from '@/games/spades/ui/SpCard';

/** The deal's timing (plan §4): the deck pops in, riffles twice, then 52 cards leave about 26 ms apart. */
export const DEAL = { pop: 300, riffle: 840, gap: 26, flight: 360 };
export const dealStart = () => (reducedMotion() ? 0 : DEAL.pop + DEAL.riffle);
export const dealLength = () =>
  reducedMotion() ? 320 : dealStart() + 51 * DEAL.gap + DEAL.flight + 200;

/** Deal order: left of the dealer first, clockwise, 13 times round. */
export const dealOrder = (dealer: Seat): Seat[] =>
  Array.from({ length: 52 }, (_, k) => ((dealer + 1 + k) % 4) as Seat);

/** When each of `seat`'s 13 cards leaves the deck, in ms from the deal's start. */
export const dealDelays = (dealer: Seat, seat: Seat): number[] => {
  const first = (seat - dealer - 1 + 8) % 4;
  return Array.from({ length: 13 }, (_, j) => dealStart() + (j * 4 + first) * DEAL.gap);
};

/**
 * The deck in the middle of the felt: it riffles (a sound only on the dealer's phone) and sends the other seats'
 * cards flying to their avatars. Your own cards land in your hand (`Hand`'s `deal`). A tap anywhere skips it.
 */
export function DealLayer({
  dealer,
  me,
  root,
  dealerPhone,
  onDone,
}: {
  dealer: Seat;
  me: Seat | null;
  root: RefObject<HTMLElement>;
  dealerPhone: boolean;
  onDone: () => void;
}) {
  const deck = useRef<HTMLDivElement>(null);
  const flyers = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const order = dealOrder(dealer);

  useLayoutEffect(() => {
    const runs: { cancel: () => void }[] = [];
    const rm = reducedMotion();
    runs.push(
      anim(
        deck.current,
        [
          { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        ],
        { duration: DEAL.pop, easing: POP },
      ),
    );
    if (dealerPhone) setTimeout(() => sfx('riffle', true), rm ? 0 : DEAL.pop);
    const cards = [...(deck.current?.children ?? [])];
    if (!rm)
      for (let rep = 0; rep < 2; rep++)
        cards.forEach((c, i) =>
          runs.push(
            anim(
              c,
              [
                { transform: `translate(${-i * 0.6}px, ${-i * 0.8}px)` },
                {
                  transform: `translate(${i < 3 ? -34 : 34}px, ${-6 - (i % 3) * 3}px) rotate(${i < 3 ? -12 : 12}deg)`,
                },
                { transform: `translate(${(i % 2 ? 1 : -1) * 2}px, ${-i}px)` },
              ],
              { duration: 420, delay: DEAL.pop + rep * 420 + (i % 3) * 30 },
            ),
          ),
        );
    // Measured against the flyers' own layer, so a transformed ancestor can't offset them.
    const o = flyers.current ? boxOf(flyers.current) : { x: 0, y: 0 };
    const rel = (p: { x: number; y: number }) => ({ x: p.x - o.x, y: p.y - o.y });
    const from = deck.current ? rel(mid(boxOf(deck.current))) : null;
    const nodes = [...(flyers.current?.children ?? [])] as HTMLElement[];
    nodes.forEach((el) => {
      const seat = Number(el.dataset.to) as Seat;
      const k = Number(el.dataset.k);
      const av = root.current?.querySelector(`[data-seat="${seat}"] [data-seat-avatar]`);
      if (!av || !from) return;
      const to = rel(mid(boxOf(av)));
      const spin = ((k * 53) % 80) - 40;
      runs.push(
        anim(
          el,
          [
            {
              transform: `translate(${from.x}px, ${from.y}px) translate(-50%,-50%) rotate(${spin}deg)`,
              opacity: 0,
            },
            {
              transform: `translate(${from.x}px, ${from.y}px) translate(-50%,-50%) rotate(${spin}deg)`,
              opacity: 1,
              offset: 0.05,
            },
            {
              transform: `translate(${to.x}px, ${to.y}px) translate(-50%,-50%) scale(.7)`,
              opacity: 1,
              offset: 0.9,
            },
            {
              transform: `translate(${to.x}px, ${to.y}px) translate(-50%,-50%) scale(.6)`,
              opacity: 0,
            },
          ],
          { duration: DEAL.flight, delay: dealStart() + k * DEAL.gap, easing: EASE, fill: 'both' },
        ),
      );
      if (k % 3 === 0 && !rm) setTimeout(() => sfx('deal'), dealStart() + k * DEAL.gap);
    });
    const end = setTimeout(() => done.current(), dealLength());
    return () => {
      clearTimeout(end);
      runs.forEach((r) => r.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        ref={deck}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[48%] z-[4] h-[67px] w-12 -translate-x-1/2 -translate-y-1/2"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className="absolute left-0 top-0 w-12"
            style={{ transform: `translate(${-i * 0.6}px, ${-i * 0.8}px)` }}
          >
            <SpCard card={null} down size="slot" className="w-12" />
          </span>
        ))}
      </div>
      <div ref={flyers} aria-hidden className="pointer-events-none absolute left-0 top-0 z-[40]">
        {order.map((seat, k) =>
          seat === me ? null : (
            <span key={k} data-to={seat} data-k={k} className="absolute left-0 top-0 w-9 opacity-0">
              <SpCard card={null} down size="mini" className="w-9" />
            </span>
          ),
        )}
      </div>
    </>
  );
}

/** Press and hold to shuffle and deal: the fill grows while held; letting go early cancels it. */
export function HoldToDeal({
  label,
  hint,
  disabled,
  onDeal,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  onDeal: () => void;
}) {
  const fill = useRef<HTMLSpanElement>(null);
  const run = useRef<Animation | null>(null);
  const fired = useRef(false);
  const deal = () => {
    if (fired.current) return;
    fired.current = true;
    vibrate(20);
    onDeal();
  };
  const start = () => {
    if (disabled || run.current) return;
    fired.current = false;
    const el = fill.current;
    if (!el || typeof el.animate !== 'function') return deal();
    const a = el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 700,
      fill: 'forwards',
    });
    a.onfinish = () => {
      run.current = null;
      deal();
    };
    run.current = a;
  };
  const stop = () => {
    if (run.current && !fired.current) run.current.cancel();
    run.current = null;
  };
  useEffect(() => () => run.current?.cancel(), []);
  return (
    <div className="w-[240px] max-w-full text-center">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        className="mat-cta mat-cta-on mat-tone-accent press relative isolate flex min-h-[52px] w-full touch-none select-none items-center justify-center overflow-hidden rounded-[16px] px-5 text-16 font-bold text-ink-on-accent disabled:opacity-40"
      >
        <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />
        <span
          ref={fill}
          aria-hidden
          className="absolute inset-0 origin-left scale-x-0 bg-[color-mix(in_srgb,var(--on-brand)_22%,transparent)]"
        />
        <span className="relative">{label}</span>
      </button>
      {hint && <p className="mt-2 text-13 text-[var(--tx2)]">{hint}</p>}
    </div>
  );
}

/** Only with Blind Nil on: look at your cards, or bid Blind Nil without looking (plan §1.2). */
export function LookGate({
  onLook,
  onBlind,
  disabled,
}: {
  onLook: () => void;
  onBlind: () => void;
  disabled?: boolean;
}) {
  const rm = useReducedMotion();
  return (
    <m.div
      initial={rm ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={rm ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={SPRING_POP}
      className="flex flex-col gap-2"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onLook}
        className="mat-cta mat-cta-on mat-tone-accent press relative isolate min-h-[52px] rounded-[16px] px-5 text-16 font-bold text-ink-on-accent disabled:opacity-40"
      >
        <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />
        {s.gate.look}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onBlind}
        className="press min-h-[52px] rounded-[16px] border-[1.5px] border-[var(--medal-gold)] bg-[var(--sheet-bg)] px-5 text-16 font-bold text-[var(--gold-tx)] disabled:opacity-40"
      >
        {s.gate.blind}
      </button>
      <p className="self-center rounded-full bg-[color-mix(in_srgb,var(--bg)_70%,transparent)] px-2.5 py-1 text-center text-13 text-[var(--tx2)]">
        {s.gate.note}
      </p>
    </m.div>
  );
}
