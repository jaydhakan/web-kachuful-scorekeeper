import { AnimatePresence, m, useAnimationControls, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { clueGiverOf, wordsLeft, type IshaaraPublic, type Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { Icon } from '@/components/ui/Icons';
import { EASE, REDUCED, SPRING_POP } from '@/components/ui/motion';
import { Mark, TEAM_FILL, TeamCount, TeamPill } from './marks';
import type { Handoff } from './useBoard';

const b = s.board;
/** The last stretch of a timed turn, when the timer turns to the warning colour and pulses. */
export const URGENT_MS = 10_000;

/** Whose turn it is: the team's colour, shape and name; larger on a desktop the whole table reads from. */
export function TurnBanner({ game }: { game: IshaaraPublic }) {
  return (
    <TeamPill
      team={game.turn}
      label={b.turn(game.turn)}
      className="justify-center dt:min-h-14 dt:px-6 dt:text-24"
    />
  );
}

/** The turn's countdown from the server's deadline; nothing while the timer is off or the clue isn't in. */
export function TurnTimer({ deadline, serverNow }: { deadline: number | null; serverNow: number }) {
  const rm = useReducedMotion();
  if (deadline === null) return null;
  const left = Math.max(0, deadline - serverNow);
  const urgent = left <= URGENT_MS;
  const txt = left > 0 ? s.clock(left) : b.timesUp;
  const sec = Math.ceil(left / 1000);
  return (
    <m.span
      role="timer"
      aria-label={b.timeLeft(s.clock(left))}
      // One pulse a second in the last ten: a transform, so it stays off the layout; none under reduced motion.
      key={urgent && !rm ? sec : 'calm'}
      initial={urgent && !rm ? { scale: 1.1 } : false}
      animate={{ scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-17 font-bold tabular-nums dt:min-h-14 dt:text-24 ${urgent ? 'text-[var(--warn)]' : ''}`}
    >
      <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
        {Icon.history}
      </span>
      <span aria-hidden>{txt}</span>
    </m.span>
  );
}

/** A bar under the header that drains over a timed turn and turns to the warning colour near the end. */
export function TimerBar({
  deadline,
  totalMs,
  serverNow,
}: {
  deadline: number | null;
  totalMs: number | null;
  serverNow: number;
}) {
  if (deadline === null || !totalMs) return null;
  const left = Math.max(0, deadline - serverNow);
  const k = Math.min(1, left / totalMs);
  return (
    <div aria-hidden data-timer-bar className="h-1.5 overflow-hidden rounded-full bg-ov/10">
      <div
        style={{ transform: `scaleX(${k})` }}
        className={`h-full origin-left rounded-full transition-transform duration-1000 ease-linear motion-reduce:transition-none ${left <= URGENT_MS ? 'bg-[var(--warn)]' : 'bg-[var(--accent)]'}`}
      />
    </div>
  );
}

/**
 * The clue and its number ("Spice 2"), "Clue given · 2" in spoken mode, or who the table is waiting on. Waiting is
 * the loudest thing on the board: the turn's colour, large; a tap on the inert grid shakes it (`nudge`).
 */
export function ClueCard({ game, nudge = 0 }: { game: IshaaraPublic; nudge?: number }) {
  const rm = useReducedMotion();
  const shake = useAnimationControls();
  useEffect(() => {
    if (nudge && !rm) void shake.start({ x: [0, -8, 7, -4, 2, 0], transition: { duration: 0.42 } });
  }, [nudge, rm, shake]);
  const giver = clueGiverOf(game, game.turn)?.name ?? s.team[game.turn];
  const c = game.clue;
  const left =
    c === null ? null : game.guessesLeft === 'inf' ? b.noLimit : String(game.guessesLeft);
  const waiting = c === null && game.status === 'active';
  return (
    <m.section
      aria-label={b.cluesBy(giver)}
      data-waiting={waiting || undefined}
      animate={shake}
      className={`flex items-center gap-3 rounded-[24px] px-5 py-4 land:px-4 land:py-3 dt:px-7 dt:py-6 ${waiting ? TEAM_FILL[game.turn] : 'glass'}`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`mono-label text-13 dt:text-17 ${waiting ? 'opacity-80' : 'text-[var(--accent-tx)]'}`}
        >
          {b.cluesBy(giver)}
        </p>
        {c ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* The clue inks in and its number pops beside it (A6); reduced motion keeps only the fade. */}
            <m.span
              key={`w${c.team}${c.word}${c.number}`}
              initial={{ opacity: 0, scale: rm ? 1 : 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: rm ? REDUCED : 0.32, ease: EASE }}
              className="disp origin-left text-36 font-extrabold leading-none tracking-[-0.03em] [overflow-wrap:anywhere] land:text-28 dt:text-56"
            >
              {c.word ?? b.clueGiven}
            </m.span>
            <m.span
              key={`n${c.team}${c.word}${c.number}`}
              initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={rm ? { duration: REDUCED } : { ...SPRING_POP, delay: 0.12 }}
              className="inline-grid min-h-11 min-w-11 place-items-center rounded-xl bg-ov px-2 text-28 font-extrabold text-[var(--bg)] dt:min-h-16 dt:min-w-16 dt:text-44"
            >
              {s.num(c.number)}
            </m.span>
          </p>
        ) : (
          <p className="mt-1 flex items-center gap-2 text-24 font-extrabold leading-tight land:text-19 dt:text-32">
            <Mark id={game.turn} className="h-5 w-5 shrink-0" />
            {b.waitingClue(giver)}
          </p>
        )}
      </div>
      {left !== null && (
        <p className="shrink-0 text-right wide:hidden">
          <span className="block text-36 font-extrabold leading-none">{left}</span>
          <span className="text-15 text-[var(--tx2)]">{b.guessesLeft}</span>
        </p>
      )}
    </m.section>
  );
}

/** "2 guesses left" as a line, for the side panel. */
export function GuessesLeft({ game }: { game: IshaaraPublic }) {
  if (!game.clue) return null;
  const left = game.guessesLeft === 'inf' ? b.noLimit : String(game.guessesLeft);
  return (
    <p className="text-17 text-[var(--tx2)] dt:text-22">
      <span className="font-bold text-[var(--tx)]">{left}</span> {b.guessesLeft}
    </p>
  );
}

/** Words still face down per team; a team's count pulses once when it finds one of its own (`pulse`). */
export function WordsLeft({
  game,
  column,
  pulse,
}: {
  game: IshaaraPublic;
  column?: boolean;
  pulse?: { team: Team; key: number } | null;
}) {
  const rm = useReducedMotion();
  const teams: Team[] = ['sun', 'moon'];
  return (
    <ul className={`flex gap-2 ${column ? 'flex-col' : 'flex-wrap'}`}>
      {teams.map((t) => {
        const hit = pulse?.team === t && !rm;
        return (
          <m.li
            key={hit ? `${t}${pulse.key}` : t}
            initial={hit ? { scale: 1.12 } : false}
            animate={{ scale: 1 }}
            transition={SPRING_POP}
            className={`origin-left ${column ? '' : 'glass rounded-full px-4 py-2 land:py-1.5'}`}
          >
            <TeamCount team={t} n={wordsLeft(game, t)} className="text-17 dt:text-22" />
          </m.li>
        );
      })}
    </ul>
  );
}

/**
 * The turn handoff (A2): the incoming team's colour sweeps across from its own side, "Moon's turn" holds large for
 * a moment, then the band clears and leaves the pill. Under reduced motion it is a short cross-fade.
 */
export function TurnSweep({ handoff }: { handoff: Handoff | null }) {
  const rm = useReducedMotion();
  return (
    <AnimatePresence>
      {handoff && (
        <TurnSweepBand
          key={handoff.n}
          handoff={handoff}
          rm={!!rm}
          timeout={handoff.why === 'timeout'}
        />
      )}
    </AnimatePresence>
  );
}

const SWEEP_HOLD_MS = 900;

function TurnSweepBand({
  handoff,
  rm,
  timeout,
}: {
  handoff: Handoff;
  rm: boolean;
  timeout: boolean;
}) {
  const from = handoff.team === 'sun' ? 'left' : 'right';
  return (
    <m.div
      aria-hidden
      data-turn-sweep={handoff.team}
      initial={rm ? { opacity: 0 } : { scaleX: 0, opacity: 1 }}
      animate={
        rm
          ? { opacity: [0, 1, 1, 0] }
          : {
              scaleX: [0, 1, 1, 1],
              opacity: [1, 1, 1, 0],
              transition: { times: [0, 0.25, 0.8, 1] },
            }
      }
      transition={{ duration: (SWEEP_HOLD_MS + 600) / 1000, ease: EASE }}
      style={{ transformOrigin: from }}
      className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex min-h-[7rem] items-center justify-center gap-3 pt-[var(--sat)] shadow-xl dt:min-h-[9rem] ${TEAM_FILL[handoff.team]}`}
    >
      {timeout && <span className="text-19 font-bold opacity-80 dt:text-24">{b.timesUp}</span>}
      <Mark id={handoff.team} className="h-7 w-7 dt:h-10 dt:w-10" />
      <span className="disp text-36 font-extrabold tracking-[-0.03em] dt:text-56">
        {b.turn(handoff.team)}
      </span>
    </m.div>
  );
}
