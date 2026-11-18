import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AvatarFill, type Face } from '@/components/ui/Avatar';
import { seatColor } from '@/theme/palette';
import { play as s } from '@/games/spades/strings/play';
import { anim, POP, rng } from './fx';

/** A Nil bidder's halo: holding, broken by a trick (it shatters), or made at the hand's end (it lifts away). */
export type NilState = 'none' | 'live' | 'broken' | 'made';

export interface SeatTimer {
  /** Server-clock deadline and the device-clock offset, so the bar can run on its own. */
  deadline: number;
  totalMs: number;
  clockOffset: number;
  /** The last 10 seconds: amber. */
  warn: boolean;
}

/** A deal under way: when each of this seat's cards leaves the deck (ms from its start) and how long it flies. */
export interface SeatDeal {
  key: number;
  delays: readonly number[];
  flight: number;
}

/** The seat's card count; during a deal it counts up as each card lands, written straight to the DOM. */
function CardCount({ n, deal }: { n: number; deal: SeatDeal | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!deal) {
      el.textContent = String(n);
      return;
    }
    el.textContent = '0';
    const ids = deal.delays.map((d, j) =>
      setTimeout(() => (el.textContent = String(j + 1)), d + deal.flight),
    );
    return () => ids.forEach(clearTimeout);
    // A deal is one run per key; `n` only matters once it's over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.key, deal ? null : n]);
  return <span ref={ref} data-cards className="tabular-nums" />;
}

export interface SeatProps {
  seat: number;
  face: Face | null;
  name: string;
  me: boolean;
  /** The pill: "3 / 4", "NIL · 0", "–". */
  pill: string;
  pillNil: boolean;
  /** Bumps when the seat takes a trick: the pill pops. */
  took: number;
  aria: string;
  cardsLeft: number;
  /** Set while the deal runs, so the count climbs from 0 with the cards. */
  deal?: SeatDeal | null;
  dealer: boolean;
  turn: boolean;
  away: boolean;
  nil: NilState;
  /** A Blind Nil: a second, outer ring for the hand (static; a Nil has the one halo). */
  blind?: boolean;
  timer: SeatTimer | null;
  invited: boolean;
  /** A bid that just came in: it pops above the avatar for a moment. */
  bubble: { text: string; nil: boolean; key: number } | null;
  className?: string;
}

/** The bar under the seat to act, shrinking linearly to the deadline; it measures the time left once per deadline. */
export function TimerBar({
  timer,
  className = '',
}: {
  timer: SeatTimer | null;
  className?: string;
}) {
  const fill = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = fill.current;
    if (!el || !timer) return;
    const left = Math.max(0, timer.deadline - (Date.now() + timer.clockOffset));
    const frac = Math.max(0, Math.min(1, left / timer.totalMs));
    el.style.transition = 'none';
    el.style.transform = `scaleX(${frac})`;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = `transform ${left}ms linear`;
        el.style.transform = 'scaleX(0)';
      }),
    );
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer?.deadline, timer?.totalMs]);
  return (
    <span
      aria-hidden
      className={`block h-1 w-[58px] overflow-hidden rounded-[2px] bg-ov/[.14] transition-opacity duration-200 ${timer ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      <span
        ref={fill}
        className={`sp-tfill block h-full ${timer?.warn ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'}`}
      />
    </span>
  );
}

/** Eight pieces flying out and falling: a Nil halo breaking, or the ♠ chip when spades break (`tone` paints them). */
export function Shards({
  seed,
  tone = 'bg-[var(--medal-gold-hi)]',
}: {
  seed: number;
  tone?: string;
}) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const r = rng(seed);
    const runs = [...(box.current?.children ?? [])].map((el, i) => {
      const a = (i / 8) * Math.PI * 2;
      return anim(
        el,
        [
          {
            transform: `translate(${Math.cos(a) * 30}px, ${Math.sin(a) * 30}px) rotate(${a}rad)`,
            opacity: 1,
          },
          {
            transform: `translate(${Math.cos(a) * 60}px, ${Math.sin(a) * 60 + 60}px) rotate(${a + r() * 6 - 3}rad)`,
            opacity: 0,
          },
        ],
        { duration: 900, easing: 'cubic-bezier(.3,.1,.7,1)', fill: 'forwards' },
      );
    });
    return () => runs.forEach((x) => x.cancel());
  }, [seed]);
  return (
    <span ref={box} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-10">
      {Array.from({ length: 8 }, (_, i) => (
        <i
          key={i}
          className={`absolute -ml-[5px] -mt-[2px] h-1 w-2.5 rounded-[2px] opacity-0 ${tone}`}
        />
      ))}
    </span>
  );
}

/**
 * A seat on the felt: avatar with the turn ring, Nil halo and dealer chip; the name; the bid and tricks pill; the
 * cards left; the timer bar; and the away mark. Every moment is a reaction to its props changing.
 */
export function Seat({
  seat,
  face,
  name,
  me,
  pill,
  pillNil,
  took,
  aria,
  cardsLeft,
  deal = null,
  dealer,
  turn,
  away,
  nil,
  blind = false,
  timer,
  invited,
  bubble,
  className = '',
}: SeatProps) {
  const pillRef = useRef<HTMLSpanElement>(null);
  const halo = useRef<HTMLSpanElement>(null);
  const bub = useRef<HTMLSpanElement>(null);
  const prev = useRef({ took, nil });
  const [shatter, setShatter] = useState(0);
  const [showBubble, setShowBubble] = useState(bubble);

  useEffect(() => {
    const p = prev.current;
    prev.current = { took, nil };
    if (took > p.took)
      anim(
        pillRef.current,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
        {
          duration: 420,
          easing: POP,
        },
      );
    if (nil === 'broken' && p.nil === 'live') setShatter((x) => x + 1);
    if (nil === 'made' && p.nil === 'live')
      anim(
        halo.current,
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.6)', opacity: 0 },
        ],
        {
          duration: 900,
          fill: 'forwards',
        },
      );
  }, [took, nil]);

  useEffect(() => {
    if (!bubble) return;
    setShowBubble(bubble);
    const id = setTimeout(() => setShowBubble(null), 1900);
    return () => clearTimeout(id);
  }, [bubble]);
  useLayoutEffect(() => {
    if (!showBubble) return;
    const a = anim(
      bub.current,
      [
        { transform: 'translateX(-50%) translateY(8px) scale(.6)', opacity: 0 },
        { transform: 'translateX(-50%) scale(1)', opacity: 1 },
      ],
      { duration: 480, easing: POP },
    );
    return () => a.cancel();
  }, [showBubble]);

  const size = me ? 'h-10 w-10 text-20' : 'h-12 w-12 text-24';
  return (
    <div
      data-seat={seat}
      data-seat-me={me || undefined}
      role="group"
      aria-label={aria}
      className={`pointer-events-none absolute z-[3] w-[92px] -translate-x-1/2 -translate-y-1/2 text-center ${className}`}
    >
      <div className={`relative mx-auto ${size} ${away ? 'opacity-60' : ''}`}>
        <span
          data-seat-avatar
          className={`relative grid h-full w-full place-items-center rounded-full shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--ov)_18%,transparent)] ${face ? '' : 'bg-ov/[.08]'}`}
          style={face ? { background: seatColor(face.color) } : undefined}
        >
          {face && <AvatarFill p={face} />}
        </span>
        {invited && !face && (
          <span
            aria-hidden
            className="sp-turning absolute -inset-1.5 rounded-full border-2 border-dashed border-[var(--accent)]"
          />
        )}
        <span
          aria-hidden
          className={`absolute -inset-1.5 rounded-full border-[2.5px] border-[var(--accent)] transition-[transform,opacity] duration-300 ${turn ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
        >
          {turn && (
            <span className="sp-ping absolute -inset-1.5 rounded-full border-2 border-[var(--accent)] opacity-40" />
          )}
        </span>
        <span
          ref={halo}
          aria-hidden
          className={`absolute -inset-[7px] rounded-full border-[2.5px] border-[var(--medal-gold-hi)] shadow-[0_0_16px_var(--medal-gold)] ${nil === 'live' ? 'sp-halo opacity-100' : nil === 'made' ? 'opacity-100' : 'opacity-0'}`}
        />
        {blind && (nil === 'live' || nil === 'made') && (
          <span
            aria-hidden
            data-blind-ring
            className="absolute -inset-[13px] rounded-full border-2 border-[color-mix(in_srgb,var(--medal-gold-hi)_70%,transparent)]"
          />
        )}
        {shatter > 0 && <Shards key={shatter} seed={seat * 13 + shatter} />}
        <b
          aria-hidden
          className={`absolute -bottom-1 -right-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-gold-gradient text-13 font-extrabold text-ink-gold shadow-[0_2px_6px_color-mix(in_srgb,var(--shade)_40%,transparent)] transition-[transform,opacity] duration-300 ${dealer ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        >
          {s.seat.dealer}
        </b>
        {showBubble && (
          <span
            ref={bub}
            aria-hidden
            className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-[3px] text-14 font-extrabold shadow-[0_6px_16px_color-mix(in_srgb,var(--shade)_35%,transparent)] ${showBubble.nil ? 'bg-[var(--medal-gold-hi)] text-ink-gold' : 'bg-card-face text-card-ink'}`}
          >
            {showBubble.text}
          </span>
        )}
      </div>
      <div
        aria-hidden
        className="mt-1 text-13 font-bold leading-tight [overflow-wrap:anywhere] [text-shadow:0_1px_2px_color-mix(in_srgb,var(--shade)_50%,transparent)]"
      >
        {name}
      </div>
      <span
        ref={pillRef}
        aria-hidden
        className={`mt-[3px] inline-flex min-h-[22px] items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] px-2 py-0.5 text-13 font-bold tabular-nums ${pillNil ? 'text-[var(--gold-tx)]' : ''}`}
      >
        {pill}
      </span>
      <TimerBar timer={timer} className="mx-auto mt-1" />
      {away && (
        <span
          aria-hidden
          className="mx-auto mt-0.5 block w-fit rounded-full bg-[color-mix(in_srgb,var(--warning)_30%,transparent)] px-2 text-13 font-bold text-[var(--tx)]"
        >
          {s.seat.away}
        </span>
      )}
      {!me && face && (
        <span
          aria-hidden
          className="absolute right-1 top-0.5 flex items-center gap-[3px] text-13 font-bold text-[var(--tx2)]"
        >
          <i className="inline-block h-3 w-[9px] rounded-[2px] bg-card-deal shadow-[0_0_0_1px_var(--card-bg)]" />
          <CardCount n={cardsLeft} deal={deal} />
        </span>
      )}
    </div>
  );
}
