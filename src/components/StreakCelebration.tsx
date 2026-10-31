import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import type { StreakKind } from '@/domain';
import { useApp } from '@/state/store';
import { vibrate } from '@/hooks/useHaptics';
import { palette } from '@/theme/palette';
import { EASE } from './ui/motion';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

const LOOK: Record<StreakKind, { color: string; bits: string[] }> = {
  hot: { color: palette['accent-diamonds'], bits: ['🔥', '✨', '🔥', '⭐'] },
  cold: { color: palette['accent-spades'], bits: ['❄️', '🧊', '❄️', '💧'] },
};
/** How long each step holds the screen; longer runs get a little longer. */
const HOLD_MS = [2300, 2700, 3200, 3600];
const BITS = 16;
const POP = { type: 'spring', stiffness: 380, damping: 13, mass: 0.9 } as const;

/** Where particle k flies to: embers rise, snow drifts down. Fixed per index, so a render is pure. */
function bitPath(k: number, kind: StreakKind) {
  const a = (k / BITS) * Math.PI * 2 + (k % 3) * 0.35,
    d = 120 + ((k * 37) % 90);
  return {
    x: Math.cos(a) * d,
    y: Math.sin(a) * d * 0.8 + (kind === 'hot' ? -70 : 70),
    r: ((k * 53) % 120) - 60,
    delay: 0.08 + (k % 5) * 0.04,
  };
}

/**
 * Plays when a confirmed round takes someone to 3, 5 or 8 made (or missed) bids in a row: one burst per player,
 * then the summary counts up. A tap, click or key moves on; under reduced motion it only fades.
 */
export function StreakCelebration() {
  const { state, actions } = useApp();
  const [fx] = useState(() => state.streakFx ?? []);
  const [i, setI] = useState(0);
  const rm = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const textId = useId();
  const done = i >= fx.length;
  // The rest of the app is inert while this plays, so it holds focus for the keys that move on.
  useEffect(() => root.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (done) {
      actions.streakDone();
      return;
    }
    vibrate(fx[i].tier ? 40 : 20);
    const tm = setTimeout(() => setI((k) => k + 1), HOLD_MS[fx[i].tier]);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advances only with the index
  }, [i]);
  if (!fx.length) return null;
  // The last burst stays on screen while the layer fades out.
  const e = fx[Math.min(i, fx.length - 1)];
  const look = LOOK[e.kind],
    words = t.streak[e.kind][e.tier];
  const next = () => setI((k) => Math.min(k + 1, fx.length));
  return (
    <motion.div
      ref={root}
      role="button"
      tabIndex={0}
      aria-label={t.streak.continue}
      aria-describedby={textId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={next}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Escape') {
          ev.preventDefault();
          next();
        }
      }}
      className="absolute inset-0 z-[58] cq-size flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-felt-950/90 px-6 pb-[max(1rem,var(--sab))] pt-[calc(3.5rem+var(--sat))] outline-none focus-visible:rounded-none focus-visible:[outline-offset:-3px]"
    >
      <motion.div
        aria-hidden
        key={`tint-${e.kind}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${look.color} 34%, transparent), transparent 64%)`,
        }}
      />
      {/* The longer runs open with a flash. */}
      {!rm && e.tier > 0 && (
        <motion.div
          key={`flash-${i}`}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.22, 0] }}
          transition={{ duration: 0.5, times: [0, 0.2, 1] }}
          className="pointer-events-none absolute inset-0 bg-text-primary"
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={i < fx.length ? i : fx.length - 1}
          initial={{ opacity: 0, scale: rm ? 1 : 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: rm ? 1 : 1.04 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="relative flex w-full max-w-[34rem] flex-col items-center text-center"
        >
          <div className="relative grid aspect-square w-[min(68cqw,22rem,40cqh)] place-items-center">
            {!rm && (
              <>
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
                  animate={{ opacity: 1, scale: 1, rotate: 70 }}
                  transition={{
                    opacity: { duration: 0.4 },
                    scale: { duration: 0.6, ease: EASE },
                    rotate: { duration: HOLD_MS[e.tier] / 1000, ease: 'linear' },
                  }}
                  className="absolute inset-[-12%] rounded-full [mask-image:radial-gradient(closest-side,black_35%,transparent)]"
                  style={{
                    background: `repeating-conic-gradient(color-mix(in srgb, ${look.color} 30%, transparent) 0deg 9deg, transparent 9deg 24deg)`,
                  }}
                />
                {[0, 0.22].map((delay) => (
                  <motion.span
                    key={delay}
                    aria-hidden
                    initial={{ opacity: 0.9, scale: 0.25 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.9, delay, ease: EASE }}
                    className="absolute inset-[12%] rounded-full border-4"
                    style={{ borderColor: look.color }}
                  />
                ))}
                {Array.from({ length: BITS }, (_, k) => {
                  const b = bitPath(k, e.kind);
                  return (
                    <motion.span
                      key={k}
                      aria-hidden
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
                      animate={{
                        x: b.x,
                        y: b.y,
                        opacity: [0, 1, 1, 0],
                        scale: [0.4, 1.15, 1, 0.8],
                        rotate: b.r,
                      }}
                      transition={{ duration: 1.5, delay: b.delay, ease: EASE }}
                      className="absolute text-26"
                    >
                      {look.bits[k % look.bits.length]}
                    </motion.span>
                  );
                })}
              </>
            )}
            <motion.span
              aria-hidden
              initial={rm ? false : { scale: 0, rotate: -35 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={POP}
              className="relative text-96 leading-none drop-shadow-[0_12px_30px_rgba(0,0,0,.55)] @h-tiny:text-64 big:text-148"
            >
              {rm ? (
                words.emoji
              ) : (
                <motion.span
                  className="inline-block"
                  animate={e.kind === 'hot' ? { y: [0, -10, 0] } : { x: [0, -3, 3, -2, 2, 0] }}
                  transition={{
                    duration: e.kind === 'hot' ? 1.1 : 0.5,
                    delay: 0.6,
                    repeat: Infinity,
                    repeatDelay: e.kind === 'hot' ? 0 : 0.6,
                  }}
                >
                  {words.emoji}
                </motion.span>
              )}
            </motion.span>
          </div>
          <div id={textId} className="relative">
            <motion.p
              initial={rm ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35, ease: EASE }}
              className="text-15 font-extrabold uppercase tracking-[0.16em] big:text-18"
              style={{ color: look.color }}
            >
              <span className="sr-only">{t.streak.count(e.kind, e.n)}. </span>
              <span aria-hidden>{t.streak.kicker(e.kind, e.n)}</span>
            </motion.p>
            <motion.p
              initial={rm ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4, ease: EASE }}
              className="disp mt-2 flex items-center justify-center gap-3 text-36 font-extrabold leading-[1.05] tracking-[-0.035em] [overflow-wrap:anywhere] @h-tiny:text-28 big:text-56"
            >
              <Avatar
                p={e.p}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/20 text-26 big:h-16 big:w-16 big:text-36"
              />
              <span className="min-w-0">{e.p.name}</span>
            </motion.p>
            <motion.p
              initial={rm ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4, ease: EASE }}
              className="disp mt-1.5 text-26 font-bold tracking-[-0.02em] text-[var(--tx)] @h-tiny:text-20 big:text-36"
            >
              {words.title}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="relative mt-6 flex flex-col items-center gap-1 text-13 text-[var(--tx2)] @h-tiny:mt-2">
        {fx.length > 1 && (
          <span className="font-bold">{t.streak.of(Math.min(i + 1, fx.length), fx.length)}</span>
        )}
        <span className="fine:hidden">{t.streak.tapToContinue}</span>
        <span className="hidden fine:inline">{t.streak.clickToContinue}</span>
      </div>
    </motion.div>
  );
}
