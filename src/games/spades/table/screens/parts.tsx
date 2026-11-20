import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { seatsOf, type SpGame, type TeamId } from '@/games/spades/domain';
import { spTable as s } from '@/games/spades/strings/table';
import { vibrate } from '@/hooks/useHaptics';
import { EASE, PRESS_SM, REDUCED, SPRING, SPRING_POP } from '@/components/ui/motion';
import { totalsOf } from '@/games/spades/table/state/select';
import { Dot } from '@/components/ui/Dot';

/** "Riya & Dev": seats 0 and 2 are team a, 1 and 3 team b. */
export const teamNames = (g: Pick<SpGame, 'players'>, t: TeamId) => {
  const [x, y] = seatsOf(t);
  return s.pair(g.players[x].name, g.players[y].name);
};

/** Each team's colour, from the theme (team tokens, never hex). */
export const TEAM_TONE: Record<TeamId, { dot: string; text: string; fill: string; ring: string }> =
  {
    a: {
      dot: 'bg-team-sun',
      text: 'text-team-sun-tx',
      fill: 'bg-team-sun text-team-sun-ink',
      ring: 'shadow-[0_0_0_2px_var(--team-sun)]',
    },
    b: {
      dot: 'bg-team-moon',
      text: 'text-team-moon-tx',
      fill: 'bg-team-moon text-team-moon-ink',
      ring: 'shadow-[0_0_0_2px_var(--team-moon)]',
    },
  };

/** A team's two faces, overlapped, in the team's ring (REWARDS-PLAN §2: faces at every table). Decoration only. */
export function TeamFaces({
  g,
  t,
  size = 28,
}: {
  g: Pick<SpGame, 'players'>;
  t: TeamId;
  size?: number;
}) {
  return (
    <span aria-hidden className="inline-flex shrink-0">
      {seatsOf(t).map((k, i) => (
        <span key={k} className={`rounded-full ${TEAM_TONE[t].ring} ${i ? '-ml-2' : ''}`}>
          <Dot p={g.players[k]} s={size} />
        </span>
      ))}
    </span>
  );
}

/** The team's band: a coloured dot and "Team A". */
export function TeamBand({ t, className = '' }: { t: TeamId; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-13 font-bold ${TEAM_TONE[t].text} ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${TEAM_TONE[t].dot}`} />
      {s.team(t)}
    </span>
  );
}

/**
 * A number with − and + either side, each a 44px target that stops at the range's ends. The value pops in from the
 * side it moved toward (transform and opacity; a fade under reduced motion).
 */
export function Stepper({
  value,
  min,
  max,
  onChange,
  less,
  more,
  label,
  big,
  show = String,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  less: string;
  more: string;
  label: string;
  big?: boolean;
  show?: (v: number) => string;
}) {
  const rm = useReducedMotion();
  const prev = useRef(value);
  const dirn = value >= prev.current ? 1 : -1;
  useEffect(() => void (prev.current = value), [value]);
  const step = (d: number) => {
    const v = Math.max(min, Math.min(max, value + d));
    if (v === value) return;
    vibrate(6);
    onChange(v);
  };
  const btn = `press-sm grid shrink-0 place-items-center rounded-full mat-fill-s font-bold disabled:opacity-35 ${big ? 'h-14 w-14 text-28' : 'h-11 w-11 text-22'}`;
  return (
    <div className="flex items-center justify-center gap-5">
      <m.button
        type="button"
        whileTap={PRESS_SM}
        aria-label={less}
        disabled={value <= min}
        onClick={() => step(-1)}
        className={btn}
      >
        −
      </m.button>
      <div
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={show(value)}
        onKeyDown={(e) => {
          const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
          if (d) {
            e.preventDefault();
            step(d);
          }
        }}
        className={`disp tick relative grid place-items-center overflow-hidden rounded-2xl font-extrabold tracking-[-0.04em] ${big ? 'h-24 min-w-[7rem] text-96 leading-none' : 'h-12 min-w-[4.5rem] text-28'}`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            key={value}
            initial={rm ? { opacity: 0 } : { opacity: 0, y: 16 * dirn }}
            animate={{ opacity: 1, y: 0 }}
            exit={rm ? { opacity: 0 } : { opacity: 0, y: -16 * dirn }}
            transition={rm ? { duration: REDUCED } : SPRING}
          >
            {show(value)}
          </m.span>
        </AnimatePresence>
      </div>
      <m.button
        type="button"
        whileTap={PRESS_SM}
        aria-label={more}
        disabled={value >= max}
        onClick={() => step(1)}
        className={btn}
      >
        +
      </m.button>
    </div>
  );
}

/**
 * Ten sacks for the bags carried. A new bag drops in with a small wobble; reaching ten swells the meter, −100 floats
 * up and it resets to what carried over. Reduced motion keeps the counts and a fade only.
 */
export function BagMeter({ bags, penalties, t }: { bags: number; penalties: number; t: TeamId }) {
  const rm = useReducedMotion();
  const carried = bags % 10;
  const seen = useRef({ bags, penalties });
  const [burst, setBurst] = useState(0);
  const [fresh, setFresh] = useState<number[]>([]);
  useEffect(() => {
    const was = seen.current;
    seen.current = { bags, penalties };
    if (penalties > was.penalties) {
      setBurst((b) => b + 1);
      vibrate(30);
    }
    const from = penalties > was.penalties ? 0 : was.bags % 10;
    setFresh(
      bags > was.bags
        ? Array.from({ length: Math.max(0, carried - from) }, (_, i) => from + i)
        : [],
    );
  }, [bags, penalties, carried]);
  return (
    <div className="relative flex items-center gap-1.5" aria-hidden>
      <m.div
        key={`m${burst}`}
        initial={burst && !rm ? { scale: 1.25, opacity: 0.4 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING_POP}
        className="flex gap-[3px]"
      >
        {Array.from({ length: 10 }, (_, i) => {
          const full = i < carried;
          const drop = fresh.indexOf(i);
          return (
            <m.i
              key={i}
              initial={false}
              animate={
                full && drop >= 0 && !rm
                  ? { y: [-10, 0, -2, 0], rotate: [0, -8, 6, 0], opacity: [0, 1, 1, 1] }
                  : { y: 0, rotate: 0, opacity: 1 }
              }
              transition={{ duration: 0.5, delay: drop >= 0 ? 0.25 + drop * 0.08 : 0, ease: EASE }}
              className={`block h-[9px] w-[7px] rounded-[2px_2px_3px_3px] ${full ? TEAM_TONE[t].dot : 'bg-ov/15'}`}
            />
          );
        })}
      </m.div>
      <span className="tick text-13 font-semibold text-[var(--tx2)]">
        {s.teamBar.bags(carried)}
      </span>
      <AnimatePresence>
        {burst > 0 && (
          <m.span
            key={burst}
            initial={{ opacity: 0, y: rm ? 0 : 4 }}
            animate={{ opacity: [0, 1, 1, 0], y: rm ? 0 : -18 }}
            transition={{ duration: 1.4, ease: EASE }}
            className="pointer-events-none absolute -top-3 left-6 text-13 font-extrabold text-[var(--neg)]"
          >
            {s.summary.burst(1)}
          </m.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Both teams' scores and bag meters under the header; tapping opens the scoreboard. */
export function TeamBar({ g, onOpen }: { g: SpGame; onOpen: () => void }) {
  const t = totalsOf(g);
  const said = (['a', 'b'] as const)
    .map((k) => s.teamBar.label(s.team(k), teamNames(g, k), t[k].score, t[k].bags % 10))
    .join('; ');
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${s.header.board}. ${said}`}
      className="press mx-4 mb-2 grid w-[calc(100%-2rem)] grid-cols-2 gap-2 text-left"
    >
      {(['a', 'b'] as const).map((k) => (
        <span key={k} className="glass flex min-w-0 flex-col gap-1 px-3 py-2">
          <span className="flex min-w-0 items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-13 font-bold">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TEAM_TONE[k].dot}`} />
              <span className="min-w-0 [overflow-wrap:anywhere]">{teamNames(g, k)}</span>
            </span>
            <ScoreTick v={t[k].score} />
          </span>
          <BagMeter bags={t[k].bags} penalties={t[k].penalties} t={k} />
        </span>
      ))}
    </button>
  );
}

/** A score that rolls to its new value (transform and opacity only). */
export function ScoreTick({ v, className = 'text-24' }: { v: number; className?: string }) {
  const rm = useReducedMotion();
  return (
    <span
      className={`disp tick relative inline-grid shrink-0 overflow-hidden font-extrabold tracking-[-0.03em] ${className}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          key={v}
          initial={rm ? { opacity: 0 } : { opacity: 0, y: '60%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={rm ? { opacity: 0 } : { opacity: 0, y: '-60%' }}
          transition={rm ? { duration: REDUCED } : SPRING}
        >
          {s.sgn(v).replace('+', '')}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/** A labelled glass card section. */
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`glass p-4 ${className}`}>{children}</div>
);
