import { AnimatePresence, motion } from 'framer-motion';
import { useId, type CSSProperties } from 'react';
import type { Game } from '@/domain';
import { useApp } from '@/state/store';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE, SPRING, SPRING_POP } from '@/components/ui/motion';
import { shakeKF } from '@/components/ui/stagger';
import type { bidView } from '@/screens/round/roundView';
import { KeyHints, Kbd } from './DeskParts';
import { t } from '@/strings';

export type BidPrimary = 'lock' | 'start' | 'wait';

interface BidPaneProps {
  g: Game;
  v: ReturnType<typeof bidView>;
  /** The number picked for the current bidder and not yet locked in. */
  pending: number | null;
  primary: BidPrimary;
  shake: number | null;
  onKey: (n: number) => void;
  onPrimary: () => void;
}

/** Rows of keys: 0–9 is two rows of five (as on the boards), 0–10 two rows of six; a tablet held upright uses one row. */
const keyCols = (keys: number) => (keys <= 5 ? keys : keys <= 10 ? 5 : 6);

export function BidPane({ g, v, pending, primary, shake, onKey, onPrimary }: BidPaneProps) {
  const { actions } = useApp();
  const { r, n, od, bi, pI, p, isD, forb, hookWarn, sum, diff, cap } = v;
  const reasonId = useId();
  const roving = useRovingFocus({
    selected: pending ?? r.bids[p.id] ?? -1,
    columns: 'auto',
    orientation: 'grid',
  });
  const keys = r.cards + 1;
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
          <motion.div
            key={pI}
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex items-center gap-4 [grid-area:1/1]"
          >
            <span
              aria-hidden
              className="ring-pulse grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-white/20 text-36 rail:h-[72px] rail:w-[72px] rail:text-40"
              style={{ background: p.color }}
            >
              {p.emoji}
            </span>
            <div className="min-w-0">
              <h2 className="disp text-32 font-extrabold leading-[1.05] tracking-[-0.03em] [overflow-wrap:anywhere] rail:text-34">
                {p.name}
              </h2>
              <p className="text-15 text-[var(--tx2)]">
                {cap}
                {!isD && bi > 0 ? '' : t.desk.bid.order(bi + 1, n)}
              </p>
            </div>
          </motion.div>
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
      <div
        role="group"
        aria-label={t.bidding.bidFor(p.name)}
        {...roving.group}
        style={{ '--kc': keyCols(keys), '--kt': keys } as CSSProperties}
        className="grid gap-2.5 [grid-template-columns:repeat(var(--kt),minmax(0,1fr))] tp:gap-1.5 rail:[grid-template-columns:repeat(var(--kc),minmax(0,1fr))]"
      >
        {Array.from({ length: keys }, (_, k) => {
          const lock = isD && forb === k,
            sel = pending === k,
            saved = r.bids[p.id] === k && !sel;
          return (
            <motion.button
              key={k}
              type="button"
              data-bid-key={k}
              aria-label={lock ? t.bidding.locked(k) : t.bidding.bid(k)}
              aria-pressed={sel}
              aria-disabled={lock || undefined}
              aria-describedby={lock ? reasonId : undefined}
              {...roving.item(k)}
              animate={shake === k ? shakeKF : { x: 0 }}
              whileHover={lock ? undefined : { y: -3 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onKey(k)}
              className={`disp relative grid h-[76px] min-w-0 place-items-center rounded-2xl text-30 font-extrabold dt:h-[60px] dt:text-26 tl:text-32 ${lock ? 'cursor-not-allowed border border-dashed border-white/30 bg-white/[.03] text-[var(--dis)]' : sel ? 'text-ink-on-accent' : 'glass'} ${saved ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : ''}`}
            >
              {sel && (
                <motion.span
                  layoutId="ws-key"
                  transition={SPRING_POP}
                  aria-hidden
                  className="absolute inset-0 rounded-2xl bg-accent-gradient shadow-[0_0_0_3px_var(--glow),0_10px_26px_-6px_var(--accent)]"
                />
              )}
              <span className={`relative ${lock ? 'line-through' : ''}`}>{k}</span>
              {lock && (
                <span className="absolute right-1.5 top-1.5 text-[var(--warn)]">{Icon.lock}</span>
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-3 text-16 font-bold">
          <span>{t.bidding.total(sum, r.cards)}</span>
          <span className={diff === 0 ? 'text-[var(--pos)]' : 'text-[var(--warn)]'}>
            {diff < 0 ? t.bidding.under(-diff) : diff > 0 ? t.bidding.over(diff) : t.bidding.level}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[.08]">
          <motion.i
            aria-hidden
            className="absolute inset-0 origin-left rounded-full bg-[var(--accent)] opacity-35"
            initial={false}
            animate={{ scaleX: Math.min(1, ghost / r.cards) }}
            transition={SPRING}
          />
          <motion.i
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
                <motion.li
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
                    className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-3.5 text-14 font-bold ${k === pI ? 'border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]' : 'border-white/10 bg-white/[.06]'}`}
                  >
                    <span
                      aria-hidden
                      className="grid h-[22px] w-[22px] place-items-center rounded-full text-13"
                      style={{ background: q.color }}
                    >
                      {q.emoji}
                    </span>
                    {q.name} {b}
                  </button>
                </motion.li>
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
