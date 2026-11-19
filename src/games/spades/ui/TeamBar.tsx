import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Counter } from '@/components/ui/Counter';
import { vibrate } from '@/hooks/useHaptics';
import type { TeamId } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { sfx } from '@/games/spades/sound/sfx';
import { anim, EASE, OUT, POP, rng } from './fx';

/** One team as the bar shows it; every number is derived by the caller from the server's view. */
export interface TeamLine {
  team: TeamId;
  /** "Us" / "Them", or the pair's names for someone watching. */
  name: string;
  names: string;
  score: number;
  /** The partners' contract once both have bid; null while bidding. */
  contract: number | null;
  /** Each partner's bid so far, in seat order; null for one yet to bid. */
  partial: readonly (number | null)[];
  doubleNil: boolean;
  took: number;
  /** Bags toward the next 10 (0–9). */
  bags: number;
  /** Bumps each time a 10-bag penalty lands this hand. */
  bursts: number;
  made: boolean;
  /** Set at the end of the hand: the contract points lost (negative). */
  set: number | null;
  /** This phone's team: its sounds play under "Only mine". */
  mine: boolean;
}

const TONE: Record<TeamId, { dot: string; fill: string }> = {
  a: { dot: 'bg-team-sun', fill: 'bg-team-sun' },
  b: { dot: 'bg-team-moon', fill: 'bg-team-moon' },
};

function Sack({ on, drop }: { on: boolean; drop: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!drop) return;
    const a = anim(
      ref.current,
      [
        { transform: 'translateY(-16px) rotate(-20deg)', opacity: 0 },
        { transform: 'translateY(0) rotate(8deg)', opacity: 1, offset: 0.6 },
        { transform: 'rotate(-6deg)', offset: 0.8 },
        { transform: 'none' },
      ],
      { duration: 620 },
    );
    return () => a.cancel();
  }, [drop]);
  return (
    <span ref={ref} aria-hidden className="relative h-[10px] w-[9px]">
      <span className="absolute inset-0 rounded-[3px_3px_5px_5px] bg-ov/[.12]" />
      <span className="absolute inset-x-[2px] -top-[3px] h-[3px] rounded-t-[2px] bg-ov/[.12]" />
      <span
        className={`absolute inset-0 rounded-[3px_3px_5px_5px] bg-[var(--medal-bronze-hi)] transition-opacity duration-200 ${on ? 'opacity-100' : 'opacity-0'}`}
      />
    </span>
  );
}

function Burst({ seed }: { seed: number }) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const r = rng(seed);
    const kids = [...(box.current?.children ?? [])];
    const runs = kids.map((el, i) => {
      if (i === kids.length - 1)
        return anim(
          el,
          [
            { transform: 'translateY(0) scale(.6)', opacity: 0 },
            { transform: 'translateY(-26px) scale(1.2)', opacity: 1, offset: 0.3 },
            { transform: 'translateY(-60px) scale(1)', opacity: 0 },
          ],
          { duration: 1500, fill: 'forwards' },
        );
      const a = r() * Math.PI * 2,
        d = 30 + r() * 50;
      return anim(
        el,
        [
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          {
            transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 30}px) rotate(${r() * 400 - 200}deg)`,
            opacity: 0,
          },
        ],
        { duration: 800, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' },
      );
    });
    return () => runs.forEach((x) => x.cancel());
  }, [seed]);
  return (
    <span ref={box} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-10">
      {Array.from({ length: 14 }, (_, i) => (
        <i
          key={i}
          className="absolute h-[7px] w-[7px] rounded-[2px] bg-[var(--medal-bronze-hi)] opacity-0"
        />
      ))}
      <b className="absolute -left-6 text-20 font-extrabold text-[var(--neg-tx)] opacity-0">
        {s.team.minus100}
      </b>
    </span>
  );
}

function TeamCard({ line }: { line: TeamLine }) {
  const card = useRef<HTMLDivElement>(null);
  const bagsRef = useRef<HTMLSpanElement>(null);
  const check = useRef<HTMLSpanElement>(null);
  const stamp = useRef<HTMLSpanElement>(null);
  const prev = useRef(line);
  const [score, setScore] = useState({ from: line.score, to: line.score, run: false });
  const [drops, setDrops] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const p = prev.current;
    prev.current = line;
    if (p.score !== line.score) setScore({ from: p.score, to: line.score, run: true });
    if (line.bursts > p.bursts) {
      setBurst(line.bursts);
      anim(
        bagsRef.current,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
        {
          duration: 600,
          easing: POP,
        },
      );
      sfx('burst', line.mine);
      vibrate(40);
    } else if (line.bags > p.bags) {
      setDrops(line.bags - 1);
      sfx('bag', line.mine);
    }
    if (line.made && !p.made) {
      anim(
        card.current,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
        {
          duration: 420,
          easing: POP,
        },
      );
      anim(
        check.current,
        [
          { transform: 'scale(.3)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        {
          duration: 450,
          easing: POP,
        },
      );
      sfx('tick', line.mine);
    }
    if (line.set !== null && p.set === null) {
      anim(
        card.current,
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-7px)' },
          { transform: 'translateX(7px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'none' },
        ],
        { duration: 380 },
      );
      anim(
        stamp.current,
        [
          { transform: 'translate(-50%,-50%) rotate(-8deg) scale(2.2)', opacity: 0 },
          { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1)', opacity: 1 },
        ],
        { duration: 360, easing: 'cubic-bezier(.5,0,.75,0)' },
      );
      sfx('thud', line.mine);
      vibrate(25);
    }
  }, [line]);

  const tone = TONE[line.team];
  const meter =
    line.contract === null
      ? s.team.partial(line.partial)
      : line.doubleNil
        ? s.team.doubleNil
        : null;
  return (
    <div
      ref={card}
      role="group"
      aria-label={s.team.aria(line.name, line.names, line.score)}
      className="glass relative min-w-0 flex-1 !rounded-[16px] px-2.5 py-2"
    >
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-13 font-bold">
          <span aria-hidden className={`h-2 w-2 rounded-full ${tone.dot}`} />
          {line.name}
        </span>
        <span className="text-24 font-bold tabular-nums tracking-[-0.03em]">
          <Counter from={score.from} to={score.to} run={score.run} duration={0.7} />
        </span>
      </div>
      <div className="mt-1 flex h-4 items-center gap-1.5">
        {meter ? (
          <span className="text-13 text-[var(--tx2)]">{meter}</span>
        ) : (
          <>
            <span aria-hidden className="flex h-1.5 flex-1 gap-0.5" key={`segs-${line.contract}`}>
              {Array.from({ length: line.contract ?? 0 }, (_, i) => (
                <Seg key={i} i={i} on={i < line.took} made={line.made} fill={tone.fill} />
              ))}
            </span>
            <span
              className="whitespace-nowrap text-13 tabular-nums text-[var(--tx2)]"
              aria-label={s.team.meterAria(line.took, line.contract ?? 0)}
            >
              {s.team.meter(line.took, line.contract ?? 0)}
            </span>
          </>
        )}
      </div>
      <span
        ref={bagsRef}
        className="relative mt-[5px] flex h-3.5 origin-left items-end gap-0.5"
        aria-label={s.team.bagsAria(line.bags)}
        role="img"
      >
        {Array.from({ length: 10 }, (_, i) => (
          <Sack key={i} on={i < line.bags} drop={drops === i} />
        ))}
        <span aria-hidden className="ml-1 text-13 leading-none text-[var(--tx2)]">
          {s.team.bags(line.bags)}
        </span>
        {burst > 0 && <Burst key={burst} seed={burst * 7 + (line.team === 'a' ? 1 : 2)} />}
      </span>
      <span
        ref={check}
        aria-hidden={!line.made}
        aria-label={line.made ? s.team.made : undefined}
        role={line.made ? 'img' : undefined}
        className={`absolute -top-2 right-2 grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--success)] text-13 font-extrabold text-[var(--on-success)] ${line.made ? 'opacity-100' : 'opacity-0'}`}
      >
        ✓
      </span>
      {line.set !== null && (
        <span
          ref={stamp}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] whitespace-nowrap rounded-[10px] border-[2.5px] border-[var(--danger)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-3 py-1 text-20 font-extrabold tracking-[0.04em] text-[var(--neg-tx)]"
        >
          {s.team.set(line.set)}
        </span>
      )}
    </div>
  );
}

function Seg({ i, on, made, fill }: { i: number; on: boolean; made: boolean; fill: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // The meter builds in once both partners have bid.
  useLayoutEffect(() => {
    const a = anim(ref.current, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 300,
      delay: i * 40,
      easing: OUT,
      fill: 'backwards',
    });
    return () => a.cancel();
  }, [i]);
  return (
    <span ref={ref} className="relative flex-1 origin-left rounded-[3px] bg-ov/[.14]">
      <span
        className={`absolute inset-0 rounded-[inherit] transition-opacity duration-300 ${made ? 'bg-[var(--success)]' : fill} ${on || made ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionTimingFunction: EASE }}
      />
    </span>
  );
}

/** Both teams' scores, contract meters and bag meters (plan §2.4), with their moments: ✓, bag drops, bursts, SET. */
export function TeamBar({ lines, className = '' }: { lines: TeamLine[]; className?: string }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {lines.map((l) => (
        <TeamCard key={l.team} line={l} />
      ))}
    </div>
  );
}
