import { m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AvatarFill, type Face } from '@/components/ui/Avatar';
import { Confetti } from '@/components/ui/Confetti';
import { Counter } from '@/components/ui/Counter';
import { vibrate } from '@/hooks/useHaptics';
import { uuid } from '@/lib/ids';
import { seatColor } from '@/theme/palette';
import { handLines, scoresOf, totals } from '@/games/spades/domain/standings';
import { seatsOf, teamOf } from '@/games/spades/domain/seats';
import type { Action, Seat, SpPublic, TeamId } from '@/games/spades/domain/types';
import type { ActResult } from '@/games/spades/online/state/tableContext';
import { play as s } from '@/games/spades/strings/play';
import { sfx } from '@/games/spades/sound/sfx';
import { spGo } from '@/games/spades/nav';
import { fillLine, pickLine } from '@/games/spades/ui/pickLine';
import { teamLabels } from '@/games/spades/ui/teams';

export interface TeamStats {
  made: number;
  bid: number;
  nilMade: number;
  nils: number;
  bags: number;
  best: { pts: number; hand: number } | null;
}

/** The strip under the scores: bids made, Nil record, bags and the best hand, for one team. */
export function teamStats(t: SpPublic, team: TeamId): TeamStats {
  const lines = handLines(t.history);
  let made = 0,
    bid = 0,
    nilMade = 0,
    nils = 0;
  let best: TeamStats['best'] = null;
  for (const l of lines) {
    const r = l[team];
    if (r.made !== null) {
      bid++;
      if (r.made) made++;
    }
    for (const n of r.nils) {
      nils++;
      if (n.made) nilMade++;
    }
    if (!best || r.net > best.pts) best = { pts: r.net, hand: l.index + 1 };
  }
  return { made, bid, nilMade, nils, bags: totals(t.history)[team].bags, best };
}

const SPRING = { type: 'spring', stiffness: 380, damping: 22 } as const;
// The reel brings the catalogue with it: its own chunk, after the winner is on screen.
const Reel = lazy(() => import('@/games/spades/progress/OnlineReel'));

export function Winner({
  table,
  me,
  names,
  faces,
  host,
  act,
  onHome,
  onToast,
}: {
  table: SpPublic;
  me: Seat | null;
  names: readonly string[];
  faces: readonly (Face | null)[];
  host: boolean;
  act: (a: Action) => Promise<ActResult>;
  onHome: () => void;
  onToast: (msg: string) => void;
}) {
  const rm = useReducedMotion();
  const [sending, setSending] = useState(false);
  const result = table.result;
  const draw = !result || result.winner === 'draw';
  const win: TeamId = draw ? (me !== null ? teamOf(me) : 'a') : (result.winner as TeamId);
  const lose: TeamId = win === 'a' ? 'b' : 'a';
  const scores = scoresOf(totals(table.history));
  const labels = teamLabels(me, names);
  // A shared line leaves the table, so it names the players, never "You".
  const shared = teamLabels(null, names);
  const teamLabel = (t: TeamId) => labels[t];
  const [p, q] = seatsOf(win);
  const st = teamStats(table, win);
  const mine = me !== null && teamOf(me) === win && !draw;
  // One line from the pool for this outcome, picked by the table and the hand count so every phone reads the same.
  const pool = draw
    ? s.winner.lines.draw
    : me === null
      ? s.winner.lines.watch
      : mine
        ? s.winner.lines.won
        : s.winner.lines.lost;
  const headline = fillLine(pickLine(pool, `${table.id}:${table.history.length}`), {
    w: labels[win],
    l: labels[lose],
  });
  const plain = draw
    ? s.winner.plainDraw(scores.a)
    : s.winner.plain(labels[win], scores[win], scores[lose]);

  useEffect(() => {
    const id = setTimeout(
      () => {
        sfx('cheer', mine);
        if (mine) vibrate(60);
      },
      rm ? 0 : 1000,
    );
    return () => clearTimeout(id);
  }, [mine, rm]);

  const openNext = () => table.next && spGo(`?table=${encodeURIComponent(table.next)}`);
  // The host started the rematch: their phone goes straight to its lobby; everyone else gets a Join button.
  useEffect(() => {
    if (host && table.next) spGo(`?table=${encodeURIComponent(table.next)}`);
  }, [host, table.next]);

  const rematch = async (swap: boolean) => {
    if (sending) return;
    setSending(true);
    const r = await act({ type: 'rematch', id: uuid(), swap });
    setSending(false);
    if (r !== 'ok') onToast(r === 'offline' ? s.reasons.offline : s.reasons.generic);
  };
  const share = async () => {
    const text = s.winner.shareText({
      a: shared.a,
      b: shared.b,
      sa: scores.a,
      sb: scores.b,
      winner: draw ? null : shared[win],
    });
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text });
      else {
        await navigator.clipboard?.writeText(text);
        onToast(s.toast.copied);
      }
    } catch {
      /* the person closed the share sheet */
    }
  };

  const enter = (delay: number, from: Record<string, number>) =>
    rm
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.2, delay: delay / 4 },
        }
      : {
          initial: { opacity: 0, ...from },
          animate: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 },
          transition: { ...SPRING, delay },
        };
  const endedBy = result ? s.winner.endedBy[result.endedBy] : null;
  const ended = typeof endedBy === 'function' ? endedBy(table.rules.target) : endedBy;

  return (
    <div className="scr-bg absolute inset-0 flex flex-col text-center">
      {!rm && !draw && (
        <Confetti colors={[faces[p]?.color ?? 'gold', faces[q]?.color ?? 'gold', 'gold']} />
      )}
      <div className="relative z-[56] min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-2 pt-[calc(var(--sat)+3rem)] land:pt-[calc(var(--sat)+1rem)]">
        <div className="mx-auto max-w-[26rem]">
          <m.div
            {...enter(0.9, { scale: 0.3, rotate: -180 })}
            aria-hidden
            className="mx-auto grid h-[88px] w-[88px] place-items-center rounded-full bg-gold-gradient land:hidden text-[44px] text-ink-gold shadow-[0_0_0_6px_color-mix(in_srgb,var(--medal-gold)_20%,transparent),0_16px_40px_color-mix(in_srgb,var(--medal-gold)_35%,transparent)]"
          >
            ♠
          </m.div>
          <div data-confetti-origin className="my-6 flex justify-center land:my-2">
            {[p, q].map((x, i) => (
              <m.span
                key={x}
                {...enter(0.3, { x: i ? 120 : -120, rotate: i ? 20 : -20 })}
                aria-hidden
                className="relative -mx-1.5 grid h-[84px] w-[84px] place-items-center rounded-full text-[42px] land:h-14 land:w-14 land:text-28 shadow-[0_0_0_4px_var(--bg),0_0_0_6px_var(--medal-gold)]"
                style={faces[x] ? { background: seatColor(faces[x]!.color) } : undefined}
              >
                {faces[x] && <AvatarFill p={faces[x]!} />}
              </m.span>
            ))}
          </div>
          <m.h1
            {...enter(1.1, { y: 20, scale: 0.9 })}
            className="disp text-48 font-bold tracking-[-0.04em] land:text-34"
          >
            {headline}
          </m.h1>
          <p className="mt-1 text-16 text-[var(--tx2)]">
            {plain}
            {ended ? ` · ${ended}` : ''}
          </p>
          <div className="my-6 flex justify-center gap-7 land:my-3">
            {([win, lose] as const).map((t, i) => (
              <div key={t}>
                <span className="block text-13 font-semibold text-[var(--tx2)]">
                  {teamLabel(t)}
                </span>
                <b
                  className={`text-36 font-bold tabular-nums tracking-[-0.03em] ${i === 0 && !draw ? (t === 'a' ? 'text-team-sun-tx' : 'text-team-moon-tx') : ''}`}
                >
                  <Counter from={0} to={scores[t]} run duration={1.2} delay={rm ? 0 : 1.3} />
                </b>
              </div>
            ))}
          </div>
          <dl className="mb-2 grid grid-cols-4 gap-2">
            {[
              [s.winner.ratio(st.made, st.bid), s.winner.madeStat],
              [s.winner.ratio(st.nilMade, st.nils), s.winner.nilStat],
              [String(st.bags), s.winner.bagsStat],
              [
                st.best ? s.winner.bestVal(st.best.pts, st.best.hand) : s.summary.dash,
                s.winner.bestStat,
              ],
            ].map(([v, k]) => (
              <div
                key={k}
                className="flex flex-col-reverse rounded-[14px] bg-ov/[.06] px-1.5 py-2.5 text-13 text-[var(--tx2)]"
              >
                <dt>{k}</dt>
                <dd className="text-18 font-bold text-[var(--tx)]">{v}</dd>
              </div>
            ))}
          </dl>
          <Suspense fallback={null}>
            <Reel table={table} />
          </Suspense>
        </div>
      </div>
      {/* Pinned, so Rematch is on screen however much the celebration above has to scroll. */}
      <div className="relative z-[56] shrink-0 px-5 pb-[max(1rem,var(--sab))] pt-2">
        <div className="mx-auto flex max-w-[26rem] flex-col gap-2">
          {table.next ? (
            <ActionButton accent onClick={openNext} label={s.winner.join} dataNext={table.next} />
          ) : host ? (
            <>
              <ActionButton
                accent
                disabled={sending}
                onClick={() => void rematch(false)}
                label={s.winner.rematch}
              />
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  disabled={sending}
                  onClick={() => void rematch(true)}
                  label={s.winner.swap}
                />
                <ActionButton onClick={() => void share()} label={s.winner.share} />
              </div>
            </>
          ) : (
            <>
              <p className="py-2 text-14 text-[var(--tx2)]">
                {s.winner.waitRematch(names[table.host])}
              </p>
              <ActionButton onClick={() => void share()} label={s.winner.share} />
            </>
          )}
          <button
            type="button"
            onClick={() => onHome()}
            data-home
            className="min-h-11 text-15 font-semibold text-[var(--tx2)] underline"
          >
            {s.winner.home}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  accent,
  disabled,
  dataNext,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
  disabled?: boolean;
  dataNext?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-next={dataNext}
      className={`press relative isolate min-h-[52px] rounded-[16px] px-5 text-16 font-bold disabled:opacity-50 ${accent ? 'mat-cta mat-cta-on mat-tone-accent text-ink-on-accent' : 'mat-fill-s'}`}
    >
      {accent && <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />}
      {label}
    </button>
  );
}

/** A cancelled game: no result, back to Spades. */
export function Cancelled({ onHome }: { onHome: () => void }) {
  return (
    <div className="scr-bg absolute inset-0 grid place-content-center justify-items-center gap-4 p-6 text-center">
      <h1 className="text-24 font-bold">{s.winner.cancelled}</h1>
      <p className="max-w-[34ch] text-16 text-[var(--tx2)]">{s.winner.cancelledBody}</p>
      <ActionButton accent onClick={onHome} label={s.winner.home} />
    </div>
  );
}
