import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Confetti } from '@/components/ui/Confetti';
import { FLIP_MS } from '@/components/ui/motion';
import { momentRoot } from '../moments';
import { sheen } from '@/fx/stamp';
import { anim, OUT, REDUCED_MS, TRAVEL, wait, EASE } from '@/fx/waapi';
import { fx as s } from '@/strings/fx';
import { palette, themeConfetti } from '@/theme/palette';
import type { PopCard } from '@/components/progression/popCard';

/** WOW-MOMENTS-PLAN A1: drop, turn, one sheen, read, then away; ≤ 2.5s in all. */
const DROP_MS = 420;
const FLIP_AT = 250;
const SHEEN_AT = 800;
const CONFETTI_AT = 600;
const LEAVE_AT = 2050;
const LEAVE_MS = 380;
/** A theme without its own confetti colours gets gold and the warm suits. */
const GOLD = [
  palette['gold-light'],
  palette['gold-mid'],
  palette['accent-diamonds'],
  palette['accent-hearts'],
];
/** Reduced motion: the card face up, read for this long between two short fades. */
const STILL_MS = 1800;

/**
 * A big achievement, dealt as a card over the table: it drops from above, turns from the theme's card back, a gold
 * light crosses it once and confetti leaves it; then it shrinks away. Played by the moment queue (`MomentPop`),
 * which owns the sound and haptic; a tap anywhere or Escape skips (`onSkip`). `reduced` is the still version.
 */
export function UnlockCard({
  card,
  reduced,
  signal,
  onSkip,
  onDone,
}: {
  card: PopCard;
  reduced: boolean;
  signal: AbortSignal;
  onSkip: () => void;
  onDone: () => void;
}) {
  const shade = useRef<HTMLDivElement>(null),
    drop = useRef<HTMLDivElement>(null),
    turn = useRef<HTMLDivElement>(null),
    face = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState(false);

  useLayoutEffect(() => {
    const runs: { cancel: () => void }[] = [];
    let live = true,
      ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      onDone();
    };
    const go = async () => {
      if (reduced) {
        runs.push(
          anim(drop.current, [{ opacity: 0 }, { opacity: 1 }], {
            duration: REDUCED_MS,
            fill: 'both',
          }),
          anim(shade.current, [{ opacity: 0 }, { opacity: 1 }], {
            duration: REDUCED_MS,
            fill: 'both',
          }),
        );
        await wait(STILL_MS);
        if (!live) return;
        const out = anim(drop.current, [{ opacity: 1 }, { opacity: 0 }], {
          duration: REDUCED_MS,
          fill: 'both',
        });
        runs.push(out);
        await out.done;
        return;
      }
      runs.push(
        anim(shade.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'both' }),
        anim(
          drop.current,
          [
            { transform: 'translateY(-120vh) rotate(-8deg)', opacity: 1 },
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
          ],
          { duration: DROP_MS, easing: OUT, fill: 'both' },
        ),
        anim(turn.current, [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], {
          duration: FLIP_MS,
          delay: FLIP_AT,
          easing: EASE,
          fill: 'both',
        }),
        sheen(face.current, { delay: SHEEN_AT }),
      );
      const t = setTimeout(() => live && setBurst(true), CONFETTI_AT);
      runs.push({ cancel: () => clearTimeout(t) });
      await wait(LEAVE_AT);
      if (!live) return;
      // Into the earner's own seat when it is on screen (online, on their phone); else it lifts away.
      const seat = card.mine
        ? document.querySelector('[data-seat-me] [data-seat-avatar]')?.getBoundingClientRect()
        : null;
      const from = drop.current?.getBoundingClientRect();
      const away =
        seat && from && seat.width > 0
          ? `translate(${seat.left + seat.width / 2 - (from.left + from.width / 2)}px,${seat.top + seat.height / 2 - (from.top + from.height / 2)}px) scale(.15)`
          : 'translateY(-45%) scale(.3)';
      const out = anim(
        drop.current,
        [
          { transform: 'translateY(0) scale(1)', opacity: 1 },
          { transform: away, opacity: 0 },
        ],
        { duration: LEAVE_MS, easing: TRAVEL, fill: 'both' },
      );
      runs.push(
        out,
        anim(shade.current, [{ opacity: 1 }, { opacity: 0 }], { duration: LEAVE_MS, fill: 'both' }),
      );
      await out.done;
    };
    const stop = () => {
      live = false;
      runs.forEach((r) => r.cancel());
      end();
    };
    signal.addEventListener('abort', stop);
    void go().then(() => live && end());
    return () => {
      live = false;
      signal.removeEventListener('abort', stop);
      runs.forEach((r) => r.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plays once per card
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onSkip();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onSkip]);

  const who = card.who ?? card.text,
    what = card.what ?? '';
  return createPortal(
    <div data-unlock-card className="fixed inset-0 z-[70] grid place-items-center">
      <div
        ref={shade}
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--shade)_55%,transparent)] opacity-0"
      />
      {/* The whole screen skips; the card itself is read by screen readers once, politely. */}
      <button
        type="button"
        aria-label={s.skip}
        onClick={onSkip}
        className="absolute inset-0 cursor-pointer bg-transparent"
      />
      <div
        ref={drop}
        role="status"
        aria-live="polite"
        className="pointer-events-none relative [perspective:900px]"
      >
        <span className="sr-only">{what ? s.unlockedBy(who, what) : card.text}</span>
        <div
          ref={turn}
          aria-hidden
          className="relative aspect-[5/7] w-[min(62vw,15rem)] [transform-style:preserve-3d]"
        >
          <div
            ref={face}
            data-unlock-face
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[18px] border-2 border-[var(--medal-gold)] bg-[var(--surface-2)] px-4 text-center shadow-[0_24px_60px_-12px_color-mix(in_srgb,var(--shade)_80%,transparent),inset_0_0_0_5px_color-mix(in_srgb,var(--medal-gold)_22%,transparent)] [backface-visibility:hidden]"
          >
            <span className="mono-label text-12 text-[var(--gold-tx)]">{s.unlocked}</span>
            <span className="text-64 leading-none">{card.emoji}</span>
            {what && (
              <span className="disp text-22 font-extrabold leading-tight [overflow-wrap:anywhere]">
                {what}
              </span>
            )}
            <span className="text-15 font-semibold text-[var(--tx2)] [overflow-wrap:anywhere]">
              {who}
            </span>
          </div>
          <div className="card-art absolute inset-0 rounded-[18px] bg-card-back shadow-[inset_0_0_0_2px_var(--card-back-edge)] [backface-visibility:hidden] [transform:rotateY(180deg)]" />
        </div>
      </div>
      {burst && (
        <Confetti
          colors={themeConfetti() ?? GOLD}
          origin={face.current}
          count={80}
          onDone={() => setBurst(false)}
        />
      )}
    </div>,
    momentRoot(),
  );
}
