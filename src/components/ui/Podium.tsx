import { m, useReducedMotion, type MotionProps } from 'framer-motion';
import { fmt, sgnN, trunc } from '@/lib/format';
import { seatColor } from '@/theme/palette';
import { t } from '@/strings';
import { AvatarFill, type Face } from './Avatar';
import { SPRING_POP } from './motion';
import {
  LAND_AFTER_MS,
  LAND_MS,
  RISE_EASE,
  STEP_MS,
  type Place,
  type RevealPlan,
} from './podiumReveal';
import { PODIUM_BG } from './rankTones';

/** One player in the final standings; tied players share a rank. */
export interface PodiumStanding extends Face {
  id: string;
  name: string;
  rank: number;
  total: number;
}

// Phone sizes in design pixels times --pu, which is 1px except on a short screen where the podium shrinks to fit.
const AVATAR = {
  1: { w: 'max(2rem, calc(64 * var(--pu)))' },
  2: { w: 'max(1.75rem, calc(52 * var(--pu)))' },
  3: { w: 'max(1.75rem, calc(52 * var(--pu)))' },
} as const;
const STEP_MIN = '3rem';

const DESK = {
  1: {
    h: 'h-[min(310px,42cqh)]',
    text: 'text-64',
    av: 104,
    ring: 'border-gold shadow-[0_0_44px_color-mix(in_srgb,var(--medal-gold)_60%,transparent)]',
  },
  2: { h: 'h-[min(230px,31cqh)]', text: 'text-48', av: 72, ring: 'border-rank-silver' },
  3: { h: 'h-[min(170px,23cqh)]', text: 'text-44', av: 72, ring: 'border-rank-bronze' },
} as const;

const place = (k: 1 | 2 | 3) =>
  k === 1 ? t.winner.first : k === 2 ? t.winner.second : t.winner.third;
const STEP_SHADOW = 'shadow-[0_20px_50px_-16px_color-mix(in_srgb,var(--shade)_70%,transparent)]';

interface PodiumProps {
  /** Best first, as the game ranks them. */
  standings: PodiumStanding[];
  /** `phone`: steps sized to the screen (`--pu` set by the parent); `desk`: the large screen's tall steps. */
  look?: 'phone' | 'desk';
  /**
   * A plan stages the reveal (lowest place first) and marks the winner's avatar as the confetti's origin; `null` shows
   * everything in place; left out, the steps rise together a beat apart. Reduced motion is always in place.
   */
  reveal?: RevealPlan | null;
}

const STEP_S = STEP_MS / 1000;
type Entrance = Pick<MotionProps, 'initial' | 'animate' | 'transition'>;

/** The top three places as steps (2nd, 1st, 3rd), tied players side by side on theirs. */
export function Podium({ standings: st, look = 'phone', reveal }: PodiumProps) {
  const rm = useReducedMotion();
  const staged = !!reveal;
  // When a step starts rising, in seconds; null when it does not move.
  const stepAt = (k: Place) => {
    if (rm || reveal === null) return null;
    if (!reveal) return (3 - k) * 0.15;
    const at = reveal.step[k];
    return at == null ? null : at / 1000;
  };
  // A player lands on a staged step as it settles; otherwise they pop in after the steps, `late` seconds in.
  const land = (k: Place, i: number, late: number, from: Entrance['initial']): Entrance => {
    const at = stepAt(k);
    if (at == null) return { initial: false };
    return staged
      ? {
          initial: { y: -24, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: {
            duration: LAND_MS / 1000,
            ease: RISE_EASE,
            delay: at + LAND_AFTER_MS / 1000 + i * 0.05,
          },
        }
      : {
          initial: from,
          animate: { y: 0, opacity: 1, scale: 1 },
          transition: { ...SPRING_POP, delay: late + i * 0.05 },
        };
  };
  // The step slides up inside a box of its final size, so its label and score are never squashed.
  const rise = (k: Place, on: boolean) => {
    const at = stepAt(k);
    return {
      box: {
        initial: at == null ? (false as const) : { opacity: 0 },
        animate: { opacity: on ? 1 : 0.25 },
        transition: { duration: 0.2, delay: at ?? 0 },
      },
      slab: {
        initial: at == null ? (false as const) : { y: '100%' },
        animate: { y: 0 },
        transition: { duration: STEP_S, ease: RISE_EASE, delay: at ?? 0 },
      },
    };
  };
  const origin = (k: Place, i: number) => (staged && k === 1 && i === 0 ? '' : undefined);
  const phone = (k: 1 | 2 | 3) => {
    const tied = st.filter((x) => x.rank === k),
      h = k === 1 ? 128 : k === 2 ? 96 : 76,
      r = rise(k, tied.length > 0);
    // Tied players share their step side by side, so their avatars shrink to fit the column.
    const w = `calc(${AVATAR[k].w} * ${tied.length > 2 ? 0.56 : tied.length > 1 ? 0.82 : 1})`;
    return (
      <div
        key={k}
        className="flex max-w-[120px] flex-1 flex-col items-center justify-end wide:max-w-[9rem]"
      >
        <div className="mb-1.5 flex flex-wrap items-end justify-center gap-1.5">
          {tied.map((x, i) => (
            <m.div
              key={x.id}
              {...land(k, i, 0.9 + (3 - k) * 0.12, { y: -30, opacity: 0 })}
              // The name is shortened to fit the column; the full one is the accessible name and the tooltip.
              role="group"
              aria-label={x.name}
              title={x.name}
              className="flex min-w-0 max-w-[70px] flex-col items-center text-center text-13 font-bold leading-tight [overflow-wrap:anywhere] wide:max-w-[7rem]"
              style={tied.length > 1 ? { maxWidth: `max(${w}, 3.5rem)` } : undefined}
            >
              <span
                aria-hidden
                data-confetti-origin={origin(k, i)}
                className={`relative grid place-items-center rounded-full border-2 ${k === 1 ? 'border-gold shadow-[0_0_28px_color-mix(in_srgb,var(--medal-gold)_60%,transparent)]' : 'border-ov/25'}`}
                style={{
                  background: seatColor(x.color),
                  width: w,
                  height: w,
                  fontSize: `calc(${w} * 0.56)`,
                }}
              >
                <AvatarFill p={x} />
              </span>
              <span aria-hidden>{trunc(x.name)}</span>
            </m.div>
          ))}
        </div>
        <m.div
          data-step={k}
          {...r.box}
          style={{ height: `max(${STEP_MIN}, calc(${h} * var(--pu)))` }}
          className={`w-full overflow-hidden rounded-t-2xl ${STEP_SHADOW}`}
        >
          <m.div
            {...r.slab}
            className={`disp flex h-full w-full flex-col items-center rounded-t-2xl pt-2 text-32 land:text-22 land:leading-none font-extrabold text-ink-podium ${PODIUM_BG[k]}`}
          >
            {place(k)}
            <small className="font-sans text-13 font-bold land:mt-1">
              {tied.length ? sgnN(tied[0].total) : '—'}
            </small>
          </m.div>
        </m.div>
      </div>
    );
  };
  const desk = (k: 1 | 2 | 3) => {
    const tied = st.filter((x) => x.rank === k),
      s = DESK[k],
      av = tied.length > 1 ? s.av * 0.7 : s.av,
      r = rise(k, tied.length > 0);
    return (
      <div key={k} className="flex min-w-0 flex-1 flex-col items-center justify-end">
        <div className="mb-2.5 flex flex-wrap justify-center gap-2">
          {tied.map((x, i) => (
            <m.div
              key={x.id}
              {...land(k, i, 0.7 + (3 - k) * 0.15, { y: -40, opacity: 0, scale: 0.6 })}
              className="flex min-w-0 flex-col items-center"
            >
              <span
                aria-hidden
                data-confetti-origin={origin(k, i)}
                className={`relative grid place-items-center rounded-full border-[3px] ${s.ring}`}
                style={{
                  width: av,
                  height: av,
                  fontSize: av * 0.56,
                  background: seatColor(x.color),
                }}
              >
                <AvatarFill p={x} />
              </span>
              <span className="mt-2 max-w-[9rem] text-center text-20 font-bold leading-tight [overflow-wrap:anywhere]">
                {x.name}
              </span>
            </m.div>
          ))}
        </div>
        <m.div
          data-step={k}
          {...r.box}
          className={`w-full overflow-hidden rounded-t-[20px] ${STEP_SHADOW} ${s.h}`}
        >
          <m.div
            {...r.slab}
            className={`flex h-full w-full flex-col items-center rounded-t-[20px] pt-3.5 text-ink-podium ${PODIUM_BG[k]}`}
          >
            <span className={`disp font-extrabold leading-none ${s.text}`}>{place(k)}</span>
            <span className="disp tick mt-1 text-30 font-extrabold">
              {tied.length ? fmt(tied[0].total) : '—'}
            </span>
          </m.div>
        </m.div>
      </div>
    );
  };
  return look === 'phone' ? (
    <div
      data-podium
      data-steps
      className="mb-4 mt-2 flex min-h-[240px] items-end justify-center gap-2 land:mb-0 land:mt-0 land:min-h-0"
    >
      {([2, 1, 3] as const).map(phone)}
    </div>
  ) : (
    <div data-steps className="flex w-full max-w-[40rem] items-end justify-center gap-4">
      {([2, 1, 3] as const).map(desk)}
    </div>
  );
}
