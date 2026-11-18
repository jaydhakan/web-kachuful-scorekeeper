import { m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { SeasonResult } from '@/progression/types';
import { Avatar } from '@/components/ui/Avatar';
import { InkFill } from '@/components/ui/InkFill';
import { SPRING_POP } from '@/components/ui/motion';
import { Crown, LIGHT_MS, Spotlight } from '@/components/ui/PodiumLight';
import {
  BOARD_GAP_MS,
  LAND_AFTER_MS,
  LAND_MS,
  revealPlan,
  RISE_EASE,
  STEP_MS,
} from '@/components/ui/podiumReveal';
import { PODIUM_BG } from '@/components/ui/rankTones';
import { palette, themeConfetti } from '@/theme/palette';
import { useProgressionEnv } from './env';

const Confetti = lazy(() =>
  import('@/components/ui/Confetti').then((x) => ({ default: x.Confetti })),
);
/** The ceremony's title inks in first; the steps follow it. */
const TITLE_MS = 700;

/**
 * A month's top three on steps. With a `ceremony` (the season close, WOW-MOMENTS-PLAN A2) its title inks in, the
 * steps rise third to first, the light lands on first, the crown drops on the champion and confetti leaves them; a
 * new `ceremony.key` plays it again. Otherwise the steps simply rise. Reduced motion: all in place, the title and
 * crown fade in.
 */
export function SeasonPodium({
  s,
  ceremony,
}: {
  s: SeasonResult;
  ceremony: { key: number; title: string } | null;
}) {
  const { person } = useProgressionEnv();
  const rm = useReducedMotion();
  const champ = useRef<HTMLSpanElement>(null);
  const [party, setParty] = useState(false);
  const top = s.standings.filter((r) => r.qualified && r.rank && r.rank <= 3).slice(0, 3);
  const play = !!ceremony && !rm;
  const plan = revealPlan(
    top.map((r) => r.rank ?? 0),
    BOARD_GAP_MS,
  );
  const stepAt = (rank: number) => {
    const at = plan.step[rank as 1 | 2 | 3];
    return play && at != null ? TITLE_MS + at : null;
  };
  const first = stepAt(1);
  const crownAt = first == null ? null : first + LAND_AFTER_MS + LAND_MS;
  useEffect(() => {
    if (crownAt == null) return;
    const tm = setTimeout(() => setParty(true), crownAt + 250);
    return () => clearTimeout(tm);
  }, [crownAt, ceremony?.key]);
  if (!top.length) return null;
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return (
    <div className="mb-6" data-season-podium={ceremony ? 'ceremony' : undefined}>
      {ceremony && (
        <h3 className="disp mb-4 text-center text-24 font-extrabold">
          <InkFill
            text={ceremony.title}
            fill={play ? { delay: 0, duration: TITLE_MS / 1000 } : 'done'}
          />
        </h3>
      )}
      <div aria-hidden className="flex items-end justify-center gap-3">
        {order.map((r) => {
          const w = person(r.playerId),
            k = top.indexOf(r),
            at = stepAt(r.rank ?? 3);
          return (
            <div
              key={r.playerId}
              className="relative isolate flex w-24 flex-col items-center gap-1 text-center"
            >
              {k === 0 && <Spotlight at={at} ms={LIGHT_MS.ceremony} />}
              <m.span
                ref={k === 0 ? champ : undefined}
                className="relative mt-5"
                initial={at == null ? false : { y: -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: LAND_MS / 1000,
                  ease: RISE_EASE,
                  delay: ((at ?? 0) + LAND_AFTER_MS) / 1000,
                }}
              >
                <Avatar p={w} className="grid h-12 w-12 place-items-center rounded-full text-26" />
                {k === 0 && (
                  <span className="absolute inset-0 text-26">
                    <Crown at={ceremony ? (crownAt ?? 0) : null} />
                  </span>
                )}
              </m.span>
              <span className="text-14 font-bold [overflow-wrap:anywhere]">{w.name}</span>
              <span
                className={`block w-full overflow-hidden rounded-t-xl ${['h-20', 'h-14', 'h-10'][k]}`}
              >
                <m.span
                  initial={at != null ? { y: '100%' } : rm ? false : { scaleY: 0 }}
                  animate={{ y: 0, scaleY: 1 }}
                  transition={
                    at != null
                      ? { duration: STEP_MS / 1000, ease: RISE_EASE, delay: at / 1000 }
                      : { ...SPRING_POP, delay: 0.15 * (2 - k) }
                  }
                  className={`disp grid h-full w-full origin-bottom place-items-start justify-center pt-1 text-24 font-extrabold text-ink-podium ${PODIUM_BG[r.rank as 1 | 2 | 3]}`}
                >
                  {r.rank}
                </m.span>
              </span>
            </div>
          );
        })}
      </div>
      {party && (
        <Suspense fallback={null}>
          <div className="pointer-events-none fixed inset-0 z-[55]">
            <Confetti
              colors={
                themeConfetti() ?? [
                  ...top.map((r) => person(r.playerId).color),
                  palette['gold-light'],
                ]
              }
              origin={champ.current}
              onDone={() => setParty(false)}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
