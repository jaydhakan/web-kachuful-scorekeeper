import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useState } from 'react';
import { vibrate } from '@/hooks/useHaptics';
import {
  bidOrder,
  blindAllowed,
  minBidFor,
  seatsOf,
  teamOf,
  type Seat,
  type SpGame,
  type SpHand,
} from '@/games/spades/domain';
import { spTable as s } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { lastBidder, minBidNote, toBid } from '@/games/spades/table/state/select';
import { BidKeys } from '@/components/ui/BidKeypad';
import { Dot } from '@/components/ui/Dot';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ToggleTrack } from '@/components/ui/Toggle';
import { REDUCED, SPRING, SPRING_POP } from '@/components/ui/motion';
import { TeamBand, TEAM_TONE } from '../parts';
import { HandFrame } from './HandFrame';

/** The keys the rules forbid for this seat, and why (the first reason that applies). */
export function lockedFor(g: SpGame, h: SpHand, seat: Seat, blind: boolean) {
  const min = minBidFor(seat, h.bids, g.rules);
  const locked: number[] = [];
  if (!g.rules.nil) locked.push(0);
  for (let v = 1; v <= 13; v++) if (blind || v < min) locked.push(v);
  const note = minBidNote(g, h, seat);
  const why = blind
    ? s.bids.blindOn
    : note
      ? s.bids.minBid(min, g.players[note.partner].name, note.pb, g.rules.minTeamBid ?? 0)
      : !g.rules.nil
        ? s.bids.nilOff
        : null;
  return { locked, why };
}

const contract = (h: SpHand, t: 'a' | 'b') =>
  seatsOf(t).reduce<number>((n, k) => n + (h.bids[k] ?? 0), 0);

/** Bids: four rows from the dealer's left, the bidder lit, and a keypad (0 is Nil) that greys out what the rules forbid. */
export default function Bids({ g, h }: { g: SpGame; h: SpHand }) {
  const { actions } = useSp();
  const rm = useReducedMotion();
  const cur = toBid(h);
  const [blindFor, setBlindFor] = useState<Seat | null>(null);
  const blind = cur !== null && blindFor === cur;
  const [shake, setShake] = useState<number | null>(null);
  useEffect(() => {
    if (shake === null) return;
    const t = setTimeout(() => setShake(null), 350);
    return () => clearTimeout(t);
  }, [shake]);
  const whyId = useId();
  const canBlind = blindAllowed(g.rules);
  const { locked, why } = cur === null ? { locked: [], why: null } : lockedFor(g, h, cur, blind);
  const pick = (v: number) => {
    if (cur === null) return;
    if (locked.includes(v)) {
      setShake(v);
      vibrate(24);
      return;
    }
    actions.bid(v, blind && v === 0);
    setBlindFor(null);
  };
  return (
    <HandFrame
      g={g}
      h={h}
      bar={
        <>
          <PrimaryButton
            tone="glass"
            className="px-5"
            disabled={lastBidder(h) === null}
            onClick={actions.unbid}
          >
            {s.bids.undo}
          </PrimaryButton>
          <PrimaryButton className="flex-1" disabled={cur !== null} onClick={actions.toTricks}>
            {s.bids.play}
          </PrimaryButton>
        </>
      }
    >
      <h2 className="mb-2 text-15 font-semibold text-[var(--tx2)]">{s.bids.heading}</h2>
      <ol className="mb-4 flex flex-col gap-2">
        {bidOrder(h.dealer).map((k) => {
          const p = g.players[k],
            t = teamOf(k),
            b = h.bids[k],
            now = k === cur;
          const text = b === null ? null : s.bidText(b, h.blind[k]);
          return (
            <li
              key={k}
              aria-current={now ? 'step' : undefined}
              aria-label={s.bids.rowLabel(p.name, s.team(t), text, now)}
              className={`glass flex min-h-14 items-center gap-3 px-3 py-2 ${now ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : ''}`}
            >
              <span className={`rounded-full ${TEAM_TONE[t].ring}`}>
                <Dot p={p} s={40} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="min-w-0 [overflow-wrap:anywhere] text-16 font-bold">{p.name}</span>
                <TeamBand t={t} />
              </span>
              <span aria-hidden className="relative grid min-w-[4rem] justify-items-end">
                <AnimatePresence initial={false} mode="popLayout">
                  <m.span
                    key={text ?? (now ? 'now' : 'none')}
                    initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={rm ? { duration: REDUCED } : text ? SPRING_POP : SPRING}
                    className={
                      text === null
                        ? 'text-15 text-[var(--tx2)]'
                        : b === 0
                          ? 'disp text-15 font-extrabold uppercase tracking-[0.04em] text-[var(--gold-tx)]'
                          : 'disp tick text-28 font-extrabold tracking-[-0.03em]'
                    }
                  >
                    {text ?? (now ? s.bids.waiting : '')}
                  </m.span>
                </AnimatePresence>
              </span>
            </li>
          );
        })}
      </ol>
      {cur !== null ? (
        <section aria-label={s.bids.keysFor(g.players[cur].name)} className="flex flex-col gap-3">
          <BidKeys
            label={s.bids.keysFor(g.players[cur].name)}
            max={13}
            zeroLabel={s.nil}
            locked={locked}
            describedBy={why ? whyId : undefined}
            shake={shake}
            key={cur}
            keyLabel={s.bids.key}
            onPick={pick}
          />
          {canBlind && (
            <button
              type="button"
              role="switch"
              aria-checked={blind}
              onClick={() => setBlindFor(blind ? null : cur)}
              className="glass flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left"
            >
              <span className="flex flex-col">
                <span className="text-16 font-semibold">{s.bids.blind(g.players[cur].name)}</span>
                <span className="text-13 text-[var(--tx2)]">{s.bids.blindBody}</span>
              </span>
              <ToggleTrack on={blind} />
            </button>
          )}
          <p id={whyId} role="status" className="min-h-5 text-14 leading-[1.4] text-[var(--warn)]">
            {why}
          </p>
        </section>
      ) : (
        <p className="glass px-4 py-3 text-16" role="status">
          {s.bids.contract(s.teamA, contract(h, 'a'))} ·{' '}
          {s.bids.contract(s.teamB, contract(h, 'b'))}
        </p>
      )}
    </HandFrame>
  );
}
