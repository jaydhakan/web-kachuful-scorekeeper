import { AnimatePresence, m } from 'framer-motion';
import { useId } from 'react';
import type { Game } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE, SPRING, SPRING_POP } from '@/components/ui/motion';
import { BidKeys } from '@/components/ui/BidKeypad';
import type { bidView } from '@/games/kachuful/screens/round/roundView';
import { KeyHints, Kbd } from './DeskParts';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

export type BidPrimary = 'lock' | 'start' | 'wait';

interface BidPaneProps {
  g: Game;
  v: ReturnType<typeof bidView>;
  /** The number picked for the current bidder and not yet locked in. */
  pending: number | null;
  primary: BidPrimary;
  shake: number | null;
  /** A key was tapped or clicked; `el` is the key, for the flight to the seat. */
  onKey: (n: number, el: HTMLElement) => void;
  onPrimary: () => void;
}

export function BidPane({ g, v, pending, primary, shake, onKey, onPrimary }: BidPaneProps) {
  const { actions } = useApp();
  const { r, n, od, bi, pI, p, isD, forb, hookWarn, sum, diff, cap } = v;
  const reasonId = useId();
  const reason =
    hookWarn && isD
      ? t.bidding.earlierBidInvalid
      : isD && forb != null
        ? t.bidding.cantBid(forb, r.cards)
        : null;
  // What the total would be with the picked number in place of this bidder's saved bid.
  const ghost = pending != null ? sum - (r.bids[p.id] ?? 0) + pending : sum;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid">
        <AnimatePresence initial={false} mode="popLayout">
          <m.div
            key={pI}
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex items-center gap-4 [grid-area:1/1]"
          >
            <Avatar
              p={p}
              className="ring-pulse grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-ov/20 text-36 rail:h-[72px] rail:w-[72px] rail:text-40"
            />
            <div className="min-w-0">
              <h2 className="disp face-body text-32 font-extrabold leading-[1.05] tracking-[-0.03em] [overflow-wrap:anywhere] rail:text-34">
                {p.name}
              </h2>
              <p className="text-15 text-[var(--tx2)]">
                {cap}
                {!isD && bi > 0 ? '' : t.desk.bid.order(bi + 1, n)}
              </p>
            </div>
          </m.div>
        </AnimatePresence>
      </div>
      <div
        id={reasonId}
        aria-live="polite"
        className="flex min-h-[1.375rem] items-center gap-2 text-15 font-bold text-[var(--warn)]"
      >
        {reason && (
          <>
            {Icon.lockLg}
            <span>{reason}</span>
          </>
        )}
      </div>
      <BidKeys
        look="pane"
        max={r.cards}
        label={t.bidding.bidFor(p.name)}
        selected={pending}
        saved={r.bids[p.id]}
        locked={isD && forb != null ? [forb] : []}
        describedBy={reasonId}
        shake={shake}
        onPick={onKey}
      />
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-3 text-16 font-bold">
          <span>{t.bidding.total(sum, r.cards)}</span>
          <span className={diff === 0 ? 'text-[var(--pos)]' : 'text-[var(--warn)]'}>
            {diff < 0 ? t.bidding.under(-diff) : diff > 0 ? t.bidding.over(diff) : t.bidding.level}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-ov/[.08]">
          <m.i
            aria-hidden
            className="absolute inset-0 origin-left rounded-full bg-[var(--accent)] opacity-35"
            initial={false}
            animate={{ scaleX: Math.min(1, ghost / r.cards) }}
            transition={SPRING}
          />
          <m.i
            aria-hidden
            className={`absolute inset-0 origin-left rounded-full ${diff > 0 ? 'bg-[var(--warn)]' : 'bg-[var(--accent)]'}`}
            initial={false}
            animate={{ scaleX: Math.min(1, sum / r.cards) }}
            transition={SPRING}
          />
        </div>
      </div>
      <ul aria-label={t.desk.bid.soFar} className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {od
            .filter((k) => r.bids[g.players[k].id] !== undefined)
            .map((k) => {
              const q = g.players[k],
                b = r.bids[q.id];
              return (
                <m.li
                  key={q.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={SPRING_POP}
                >
                  <button
                    type="button"
                    aria-label={t.desk.bid.change(q.name, b)}
                    onClick={() => actions.pickSeat(k)}
                    className={`press inline-flex min-h-12 items-center gap-2 rounded-full border px-3.5 text-14 font-bold ${k === pI ? 'border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]' : 'border-ov/10 bg-ov/[.06]'}`}
                  >
                    <Avatar
                      p={q}
                      className="grid h-[22px] w-[22px] place-items-center rounded-full text-13"
                    />
                    {q.name} {b}
                  </button>
                </m.li>
              );
            })}
        </AnimatePresence>
      </ul>
      <div className="mt-auto flex flex-col gap-3">
        <PrimaryButton className="w-full" disabled={primary === 'wait'} onClick={onPrimary}>
          {primary === 'lock' && pending != null
            ? t.desk.bid.lockIn(pending)
            : primary === 'start'
              ? t.bidding.startPlaying
              : pending == null
                ? t.desk.bid.pick
                : t.bidding.bidsIn(Object.keys(r.bids).length, n)}
          {primary !== 'wait' && <Kbd>⏎</Kbd>}
        </PrimaryButton>
        <KeyHints
          items={[
            [r.cards >= 10 ? '0–10' : `0–${r.cards}`, t.desk.bid.keyHint],
            ['⏎', t.desk.bid.confirmHint],
            ['Z', t.desk.bid.undoHint],
          ]}
        />
      </div>
    </div>
  );
}
