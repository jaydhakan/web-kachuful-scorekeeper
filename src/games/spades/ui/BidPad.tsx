import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Avatar, type Face } from '@/components/ui/Avatar';
import { PRESS_SM, SPRING_POP } from '@/components/ui/motion';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { MAX_BID } from '@/games/spades/domain/bidding';
import type { Seat } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { sfx } from '@/games/spades/sound/sfx';
import { anim } from './fx';
import { shortName } from './teams';

/** One of the other three players, as the pad's "bids so far" strip draws them. */
export interface BidOther {
  seat: Seat;
  name: string;
  face: Face | null;
  /** Null while they have yet to bid. */
  bid: number | null;
  blind: boolean;
  partner: boolean;
}

export interface BidPadProps {
  /** Bids the rules allow this seat (Nil, 0, first when allowed). */
  allowed: readonly number[];
  /** Why a key is off: Nil off, or below the team minimum. */
  why: (bid: number) => string | null;
  /** The team line: the partner's bid and what the other side has so far. */
  info: string;
  /** The other three seats, left to right as on the felt. */
  others: readonly BidOther[];
  disabled?: boolean;
  /** Typed digits pick a key (two digits for 10–13) and Enter places the bid: on while the pad is the focus. */
  keys?: boolean;
  onBid: (bid: number, from: HTMLElement) => void;
  onBlocked: (why: string) => void;
}

const VALUES = Array.from({ length: MAX_BID + 1 }, (_, i) => i);
/** A second digit within this long makes a two-digit bid. */
const DIGIT_MS = 700;

/**
 * The bidding keypad over the felt (plan §2.5): 0 is Nil, keys the rules forbid stay in place, dimmed, and say why
 * when tapped. Pick a key, then place the bid with the button (or Enter).
 */
export function BidPad({
  allowed,
  why,
  info,
  others,
  disabled,
  keys,
  onBid,
  onBlocked,
}: BidPadProps) {
  const [pick, setPick] = useState<number | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const go = useRef<HTMLButtonElement>(null);
  const keyEls = useRef(new Map<number, HTMLButtonElement>());
  const typed = useRef<{ v: number; at: number } | null>(null);
  const rm = useReducedMotion();
  const roving = useRovingFocus({
    selected: pick === null ? -1 : pick,
    columns: 7,
    orientation: 'grid',
  });

  const choose = (v: number) => {
    const off = !allowed.includes(v);
    if (off) {
      setShake(v);
      anim(
        keyEls.current.get(v),
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'none' },
        ],
        { duration: 240 },
      );
      sfx('err', true);
      onBlocked(why(v) ?? s.reasons.generic);
      return;
    }
    setPick(v);
    sfx('pop', true);
  };
  const place = () => {
    if (pick === null || disabled) return;
    onBid(pick, keyEls.current.get(pick) ?? (go.current as HTMLElement));
  };

  useEffect(() => {
    if (!keys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input,textarea,[contenteditable],[aria-modal="true"]')) return;
      if (/^[0-9]$/.test(e.key)) {
        const d = Number(e.key);
        const prev = typed.current;
        const two = prev && prev.v === 1 && Date.now() - prev.at < DIGIT_MS ? 10 + d : null;
        const v = two !== null && two <= MAX_BID ? two : d;
        typed.current = { v, at: Date.now() };
        e.preventDefault();
        choose(v);
      } else if (e.key === 'Enter' && !el?.closest('button')) {
        e.preventDefault();
        place();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <m.section
      aria-label={s.bid.title}
      initial={rm ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
      animate={rm ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={rm ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.2 } }}
      transition={SPRING_POP}
      className="sp-pad mat-sheet @container/pad pointer-events-auto w-[min(368px,calc(100%-4px))] rounded-[22px] shadow-[0_24px_60px_color-mix(in_srgb,var(--shade)_55%,transparent)]"
    >
      <h3 className="sp-pad-title text-18 font-bold">{s.bid.title}</h3>
      <ul aria-label={s.bid.othersLabel} className="mt-1.5 grid grid-cols-3 gap-1.5">
        {others.map((o) => (
          <li
            key={o.seat}
            className={`sp-pad-chip min-w-0 rounded-[11px] bg-ov/[.07] px-1.5 py-0.5 ${o.partner ? 'shadow-[inset_0_0_0_1.5px_var(--accent)]' : ''}`}
          >
            <span className="sr-only">{s.bid.chipAria(o.name, o.bid, o.blind, o.partner)}</span>
            <span aria-hidden className="flex min-w-0 items-center gap-1">
              {o.face && (
                <Avatar
                  p={o.face}
                  className="sp-pad-av grid h-5 w-5 shrink-0 place-items-center rounded-full text-13"
                />
              )}
              <span className="min-w-0 truncate text-13 font-semibold">{shortName(o.name)}</span>
            </span>
            <span
              aria-hidden
              className={`block text-16 font-bold tabular-nums ${o.bid === null ? 'text-[var(--tx2)]' : ''}`}
            >
              {s.bid.chipBid(o.bid, o.blind)}
            </span>
          </li>
        ))}
      </ul>
      <p className="sp-pad-info mb-2 mt-1.5 min-h-[18px] text-13 text-[var(--tx2)]">{info}</p>
      <div
        role="group"
        aria-label={s.bid.group}
        {...roving.group}
        className="sp-pad-keys grid grid-cols-5 gap-[3px] @[20rem]/pad:grid-cols-7"
      >
        {VALUES.map((v, i) => {
          const off = !allowed.includes(v);
          const reason = off ? why(v) : null;
          return (
            <m.button
              key={v}
              ref={(el: HTMLButtonElement | null) => {
                if (el) keyEls.current.set(v, el);
                else keyEls.current.delete(v);
              }}
              type="button"
              {...roving.item(i)}
              aria-pressed={pick === v}
              aria-disabled={off || undefined}
              aria-label={s.bid.keyAria(v, reason)}
              data-shake={shake === v || undefined}
              whileTap={off ? undefined : PRESS_SM}
              onClick={() => choose(v)}
              className={`relative grid h-11 place-items-center rounded-[11px] font-bold tabular-nums ${v === 0 ? 'text-13 text-[var(--gold-tx)]' : 'text-16'} ${off ? 'opacity-30' : ''} ${pick === v ? 'text-ink-on-accent' : 'mat-key'}`}
            >
              {pick === v && (
                <m.span
                  layoutId="sp-bid-pick"
                  transition={SPRING_POP}
                  className="mat-key-on absolute inset-0 rounded-[11px]"
                />
              )}
              <span className="relative">{s.bid.key(v)}</span>
            </m.button>
          );
        })}
      </div>
      <button
        ref={go}
        type="button"
        disabled={pick === null || disabled}
        onClick={place}
        className={`press relative isolate mt-2 flex min-h-11 w-full items-center justify-center rounded-[16px] text-16 font-bold ${pick === null || disabled ? 'mat-fill-off text-[var(--tx2)]' : 'mat-cta mat-cta-on mat-tone-accent text-ink-on-accent'}`}
      >
        {pick !== null && !disabled && (
          <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />
        )}
        {pick === null ? s.bid.pick : s.bid.go(pick)}
      </button>
    </m.section>
  );
}
