import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PRIORITY, useMoments, type MomentCtx } from '../moments';
import { UnlockCard } from './UnlockCard';
import { anim, OUT } from '../waapi';
import { fx as s } from '@/strings/fx';
import type { PopCard } from '@/components/progression/popCard';

/** Small cards shown at once; the rest of a batch is one "+N more" line. */
const SMALL_MAX = 3;
/** How long the small cards are read, plus a little per card. */
const READ_MS = 2200;
const UNLOCK_HAPTIC = [12, 40, 18];

type Big = { card: PopCard; reduced: boolean; signal: AbortSignal; done: () => void };
type Batch = { id: number | string; cards: PopCard[] };

/**
 * A batch of moments just earned (WOW-MOMENTS-PLAN A1). Big ones play first, one at a time, as the full unlock card
 * through the moment queue (two a batch; past that they join the small cards). Then the small cards drop in under
 * the top bar, at most three and "+N more", and leave on their own; a 🙃 one is silver and wobbles. Small cards
 * never take focus or block a tap. A new `pops` object is a new batch (null shows nothing); `onDone` fires once
 * the batch has been read.
 */
export function MomentPop({ pops, onDone }: { pops: Batch | null; onDone: () => void }) {
  const q = useMoments();
  const [big, setBig] = useState<Big | null>(null);
  const [small, setSmall] = useState<Batch | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!pops) {
      setSmall(null);
      return;
    }
    let live = true,
      timer = 0;
    const scope = `pops:${pops.id}`,
      rest: PopCard[] = [],
      waits: Promise<void>[] = [],
      ids: string[] = [];
    for (const c of pops.cards) {
      // A big moment someone else earned (online, on this player's own phone) is a compact card here.
      if (c.tier !== 'big' || c.mine === false) {
        rest.push(c.tier === 'big' ? { ...c, tier: undefined } : c);
        continue;
      }
      let finish = () => undefined as void;
      const over = new Promise<void>((r) => (finish = r));
      const show =
        (reduced: boolean) =>
        ({ signal }: MomentCtx) =>
          new Promise<void>((r) =>
            setBig({
              card: c,
              reduced,
              signal,
              done: () => {
                setBig(null);
                r();
              },
            }),
          ).finally(finish);
      const id = `unlock:${scope}:${c.k}`;
      const res = q.push({
        id,
        tier: 'moment',
        priority: PRIORITY.bigUnlock,
        scope,
        sound: 'chime',
        haptic: UNLOCK_HAPTIC,
        play: show(false),
        reduced: show(true),
      });
      ids.push(id);
      if (res === 'capped') rest.push({ ...c, tier: undefined });
      else if (res !== 'duplicate') waits.push(over);
    }
    // Small cards wait for every Moment on the page (a Boston, another game's card), not only this batch's.
    void Promise.all(waits)
      .then(() => q.idle())
      .then(() => {
        if (!live) return;
        if (!rest.length) return done.current();
        const extra = rest.length - SMALL_MAX;
        const cards =
          extra > 0
            ? [...rest.slice(0, SMALL_MAX), { k: 'more', emoji: '✨', text: s.more(extra) }]
            : rest;
        setSmall({ id: pops.id, cards });
        // Small cards are quiet unless Sounds is "All"; a 🙃 one sounds its own way.
        const sound = rest.some((c) => c.tier === 'shame') ? 'womp' : 'chime';
        void import('@/fx/sound').then((m) => m.cue(sound, 'beat'));
        timer = window.setTimeout(() => done.current(), READ_MS + cards.length * 250);
      });
    return () => {
      live = false;
      clearTimeout(timer);
      ids.forEach((id) => q.cancel(id));
    };
  }, [pops, q]);

  return (
    <>
      {big && (
        <UnlockCard
          key={big.card.k}
          card={big.card}
          reduced={big.reduced}
          signal={big.signal}
          onSkip={() => q.skip()}
          onDone={big.done}
        />
      )}
      <SmallCards batch={small} />
    </>
  );
}

function SmallCards({ batch }: { batch: Batch | null }) {
  const rm = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-[var(--toast-x,0px)] top-[calc(var(--toast-top,calc(var(--sat)+0.375rem))+3.25rem)] z-[57] flex w-[var(--toast-w,100%)] flex-col items-center gap-1.5 px-4"
    >
      <AnimatePresence>
        {batch &&
          batch.cards.map((c, i) => (
            <m.div
              key={`${batch.id}-${c.k}`}
              data-pop={c.tier ?? 'small'}
              initial={rm ? { opacity: 0 } : { opacity: 0, y: '-100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={rm ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
              transition={{
                duration: rm ? 0.15 : 0.32,
                ease: [0.22, 1, 0.36, 1],
                delay: rm ? 0 : i * 0.12,
              }}
              className={`badge-pop max-w-full rounded-2xl text-[var(--toast-fg)] border px-3.5 py-2 text-15 font-bold shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--shade)_70%,transparent)] ${
                c.tier === 'shame'
                  ? 'border-[var(--medal-silver-lo)] bg-[color-mix(in_srgb,var(--medal-silver-lo)_28%,var(--toast-bg))]'
                  : 'border-ov/10 bg-toast'
              }`}
            >
              <Wobble on={c.tier === 'shame'} delay={i * 120 + 320}>
                <span aria-hidden className="text-22">
                  {c.emoji}
                </span>
                <span className="[overflow-wrap:anywhere]">{c.text}</span>
              </Wobble>
            </m.div>
          ))}
      </AnimatePresence>
    </div>
  );
}

/** A 🙃 card wobbles once it lands (±3°, two cycles); still under reduced motion. */
function Wobble({ on, delay, children }: { on: boolean; delay: number; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!on) return;
    return anim(
      ref.current,
      [0, -3, 3, -3, 3, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
      { duration: 360, delay, easing: OUT },
    ).cancel;
  }, [on, delay]);
  return (
    <span ref={ref} className="flex items-center gap-2">
      {children}
    </span>
  );
}
