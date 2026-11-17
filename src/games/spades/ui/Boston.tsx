import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Confetti } from '@/components/ui/Confetti';
import { Stamp } from '@/fx/ui';
import { PRIORITY, useMoments } from '@/fx/moments';
import { stamp } from '@/fx/stamp';
import { anim, TRAVEL, wait } from '@/fx/waapi';
import type { TeamId } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { fx } from '@/strings/fx';
import { palette } from '@/theme/palette';

/** WOW-MOMENTS-PLAN S1: the tricks fly in 30ms apart, 360ms each; the stamp lands on the stack; ≤ 2.4s in all. */
const TRICKS = 13;
const GAP_MS = 30;
const FLY_MS = 360;
const STACKED = (TRICKS - 1) * GAP_MS + FLY_MS;
const LEAVE_AT = 2100;
const LEAVE_MS = 300;
/** Reduced motion: the stamp and its line, still, for this long. */
const STILL_MS = 1600;

const TONE: Record<TeamId, 'sun' | 'moon'> = { a: 'sun', b: 'moon' };
const GLOW: Record<TeamId, string> = {
  a: 'bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--team-sun)_45%,transparent),transparent)]',
  b: 'bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--team-moon)_45%,transparent),transparent)]',
};

export interface BostonProps {
  team: TeamId;
  /** The team's name, as the table calls it. */
  name: string;
  /** The viewer's side: the other team's phones read a quieter line. */
  them: boolean;
  /** Where the partners sit, as viewport points; empty draws no stack (the scorekeeper has no trick piles). */
  from: { x: number; y: number }[];
  reduced: boolean;
  signal: AbortSignal;
  onSkip: () => void;
  onDone: () => void;
}

/**
 * A Boston: the hand's 13 tricks come back out of the partners' seats as card backs into one stack, the team's glow
 * comes up under it, BOSTON stamps on top (above the cards and the confetti, so the word is never hidden), and
 * team-coloured confetti leaves the stack. Played by the moment queue, which owns the sound and haptic; a tap skips.
 */
export function Boston({ team, name, them, from, reduced, signal, onSkip, onDone }: BostonProps) {
  const root = useRef<HTMLDivElement>(null),
    stack = useRef<HTMLDivElement>(null),
    glow = useRef<HTMLSpanElement>(null),
    word = useRef<HTMLSpanElement>(null),
    line = useRef<HTMLParagraphElement>(null);
  const [burst, setBurst] = useState(false);
  const cards = from.length > 0;

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
          stamp(word.current),
          anim(line.current, [{ opacity: 0 }, { opacity: 1 }], { fill: 'both' }),
        );
        await wait(STILL_MS);
      } else {
        const c = stack.current?.getBoundingClientRect();
        const centre = c ? { x: c.left + c.width / 2, y: c.top + c.height / 2 } : null;
        [...(stack.current?.children ?? [])].forEach((el, i) => {
          const p = from[i % from.length];
          const dx = p && centre ? p.x - centre.x : 0,
            dy = p && centre ? p.y - centre.y : 0;
          runs.push(
            anim(
              el,
              [
                {
                  transform: `translate(${dx}px,${dy}px) scale(.55) rotate(${i % 2 ? 14 : -14}deg)`,
                  opacity: 0,
                },
                { transform: `translate(${dx}px,${dy}px) scale(.55)`, opacity: 1, offset: 0.1 },
                {
                  transform: `translate(0,${-i * 1.5}px) scale(1) rotate(${(i % 5) - 2}deg)`,
                  opacity: 1,
                },
              ],
              { duration: FLY_MS, delay: i * GAP_MS, easing: TRAVEL, fill: 'both' },
            ),
          );
        });
        const at = cards ? STACKED : 0;
        runs.push(
          anim(glow.current, [{ opacity: 0 }, { opacity: 1 }], {
            duration: 300,
            delay: at - 100,
            fill: 'both',
          }),
          stamp(word.current, { delay: at + 50 }),
          anim(
            line.current,
            [
              { opacity: 0, transform: 'translateY(6px)' },
              { opacity: 1, transform: 'none' },
            ],
            {
              duration: 260,
              delay: at + 300,
              fill: 'both',
            },
          ),
        );
        const tm = setTimeout(() => live && !them && setBurst(true), at + 150);
        runs.push({ cancel: () => clearTimeout(tm) });
        await wait(LEAVE_AT);
      }
      if (!live) return;
      const out = anim(root.current, [{ opacity: 1 }, { opacity: 0 }], {
        duration: LEAVE_MS,
        fill: 'both',
      });
      runs.push(out);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plays once
  }, []);

  return (
    <div ref={root} data-boston={team} className="absolute inset-0 z-[30]">
      <button
        type="button"
        aria-label={fx.skip}
        onClick={onSkip}
        className="absolute inset-0 z-[57] cursor-pointer bg-transparent"
      />
      <span
        ref={glow}
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-[48%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 opacity-0 ${GLOW[team]}`}
      />
      {cards && !reduced && (
        <div
          ref={stack}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[48%] h-0 w-0"
        >
          {Array.from({ length: TRICKS }, (_, i) => (
            <i
              key={i}
              className="card-art absolute -left-6 -top-[34px] h-[68px] w-12 rounded-[7px] bg-card-back opacity-0 shadow-[inset_0_0_0_2px_var(--card-back-edge),0_2px_6px_-1px_color-mix(in_srgb,var(--shade)_45%,transparent)]"
            />
          ))}
        </div>
      )}
      {burst && (
        <Confetti
          colors={[palette[team === 'a' ? 'team-sun' : 'team-moon'], palette['gold-light']]}
          origin={stack.current}
          count={80}
          onDone={() => setBurst(false)}
        />
      )}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute left-1/2 top-[48%] z-[56] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
      >
        <Stamp ref={word} tone={TONE[team]} className="text-36">
          {s.moment.boston}
        </Stamp>
        <p
          ref={line}
          className="whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-3 py-1 text-15 font-bold"
        >
          {them ? s.moment.bostonThem(name) : s.moment.bostonUs(name)}
        </p>
      </div>
    </div>
  );
}

/**
 * A Boston that plays itself through the moment queue once mounted, for a screen that only shows it (the
 * scorekeeper's hand summary). Sound and haptic follow the platform setting.
 */
export function BostonMoment({
  id,
  team,
  name,
  onEnd,
}: {
  id: string;
  team: TeamId;
  name: string;
  /** Once it has played, been skipped, or been seen before. */
  onEnd: () => void;
}) {
  const ended = useRef(onEnd);
  ended.current = onEnd;
  const q = useMoments();
  const [on, setOn] = useState<{ reduced: boolean; signal: AbortSignal; done: () => void } | null>(
    null,
  );
  useEffect(() => {
    const show =
      (reduced: boolean) =>
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<void>((done) =>
          setOn({ reduced, signal, done: () => (setOn(null), done()) }),
        ).finally(() => ended.current());
    const r = q.push({
      id,
      tier: 'moment',
      priority: PRIORITY.verdict,
      scope: id,
      sound: 'boom',
      haptic: [40, 30, 60],
      play: show(false),
      reduced: show(true),
    });
    if (r === 'duplicate' || r === 'capped') ended.current();
    return () => q.cancel(id);
  }, [q, id]);
  if (!on) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] [&>*]:pointer-events-auto">
      <Boston
        team={team}
        name={name}
        them={false}
        from={[]}
        reduced={on.reduced}
        signal={on.signal}
        onSkip={() => q.skip()}
        onDone={on.done}
      />
    </div>
  );
}
