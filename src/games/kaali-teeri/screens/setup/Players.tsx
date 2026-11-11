import { AnimatePresence, m } from 'framer-motion';
import { useId, useState, type ReactNode } from 'react';
import {
  decksFor,
  deckTotal,
  MAX_PLAYERS,
  MIN_PLAYERS,
  minBidRange,
  partnersFor,
  type KtLength,
} from '@/games/kaali-teeri/domain';
import { setupRules } from '@/games/kaali-teeri/state/reducer';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { Table } from '@/components/ui/Table';
import { EASE, PRESS, PRESS_SM } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { PREVIEW_SCALE } from '@/lib/tableGeometry';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';
import { SectionLabel, SetupFrame, TableSlot, useSetup } from './SetupFrame';
import { TakeOut } from './TakeOut';

/** − value + with 44px keys; the value is announced as it changes. */
function Stepper({
  value,
  big,
  lower,
  raise,
  onLower,
  onRaise,
  canLower,
  canRaise,
  labelledBy,
}: {
  value: ReactNode;
  big?: boolean;
  lower: string;
  raise: string;
  onLower: () => void;
  onRaise: () => void;
  canLower: boolean;
  canRaise: boolean;
  labelledBy: string;
}) {
  const key =
    'mat-key grid h-12 w-12 shrink-0 place-items-center rounded-full text-24 font-medium disabled:opacity-35';
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex items-center gap-1">
      <m.button
        type="button"
        aria-label={lower}
        whileTap={PRESS_SM}
        disabled={!canLower}
        onClick={onLower}
        className={key}
      >
        −
      </m.button>
      <output
        aria-live="polite"
        className={`disp min-w-[3.5ch] text-center font-extrabold tabular-nums tracking-[-0.03em] ${big ? 'text-40' : 'text-24'}`}
      >
        {value}
      </output>
      <m.button
        type="button"
        aria-label={raise}
        whileTap={PRESS_SM}
        disabled={!canRaise}
        onClick={onRaise}
        className={key}
      >
        +
      </m.button>
    </div>
  );
}

/** Setup 1: how many play (the decks, partners and cards to take out follow), the game length and Advanced. */
export default function Players() {
  const { su, actions } = useSetup();
  const [more, setMore] = useState(false);
  const ids = { n: useId(), min: useId(), adv: useId() };
  const n = su.n,
    decks = decksFor(n),
    rules = setupRules(su),
    minBid = rules?.minBid ?? su.minBid ?? 0;
  const range = minBidRange(decks),
    lo = Math.ceil(range.lo / su.bidStep) * su.bidStep,
    hi = Math.floor(range.hi / su.bidStep) * su.bidStep;
  const lg = su.lg,
    lgFits = !!lg && lg.players.length >= MIN_PLAYERS && lg.players.length <= MAX_PLAYERS;
  const count = (k: number) => {
    actions.setupCount(k);
    actions.vib();
  };
  return (
    <SetupFrame
      step={1}
      title={s.step1Title}
      asideFirst
      bar={
        <PrimaryButton className="w-full" onClick={() => actions.setupStep(2)}>
          {s.nextSeat}
        </PrimaryButton>
      }
      aside={
        <div className="flex flex-col gap-3 @h-[45rem]:gap-2">
          {lg && lgFits && (
            <m.button
              type="button"
              {...stagger(0)}
              whileTap={PRESS}
              onClick={() => {
                actions.setupLastGroup();
                actions.setupStep(3);
              }}
              className="glass inline-flex min-h-12 items-center gap-2 self-start !rounded-full px-4 py-2 text-left text-16 font-medium leading-[1.3] shadow-[0_0_24px_-6px_var(--accent)] [text-wrap:balance]"
            >
              {s.useLastGroup(lg.players.map((p) => p.name))}
            </m.button>
          )}
          <Glass spot={false} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id={ids.n} className="text-18 font-bold leading-tight">
                  {s.players}
                </h2>
                <p className="text-14 text-[var(--tx2)]">{s.playersRange}</p>
              </div>
              <Stepper
                big
                value={n}
                labelledBy={ids.n}
                lower={s.fewer}
                raise={s.more}
                canLower={n > MIN_PLAYERS}
                canRaise={n < MAX_PLAYERS}
                onLower={() => count(n - 1)}
                onRaise={() => count(n + 1)}
              />
            </div>
            <div aria-hidden className="my-2.5 h-px bg-ov/10" />
            <p aria-label={s.rulesLabel} className="text-14 font-medium text-[var(--tx2)]">
              {s.rulesLine(decks, minBid, partnersFor(n))}
            </p>
            <TakeOut n={n} className="mt-2" />
            <p className="mt-2 text-13 text-[var(--tx2)] @h-short:hidden">
              {s.inPlay(deckTotal(decks))}
            </p>
          </Glass>
          <div>
            <SectionLabel className="mb-1.5">{s.gameLength}</SectionLabel>
            <Seg<KtLength>
              uid="kt-len"
              label={s.gameLength}
              size="sm"
              value={su.length}
              onChange={(v) => actions.setupLength(v)}
              options={[...s.lengthOptions]}
              className="flex w-full [&>button]:min-w-0 [&>button]:flex-1"
            />
          </div>
          <div>
            <button
              type="button"
              aria-expanded={more}
              aria-controls={ids.adv}
              onClick={() => setMore((v) => !v)}
              className="press flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-1 text-left"
            >
              <span className="mono-label text-12 text-[var(--tx2)]">{s.advanced}</span>
              <span className="flex items-center gap-2 text-13 font-medium text-[var(--tx2)]">
                {s.advancedSummary(su.dir, minBid, su.bidStep)}
                <span
                  aria-hidden
                  className={`transition-transform duration-200 ${more ? 'rotate-180' : ''}`}
                >
                  ▾
                </span>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {more && (
                <m.div
                  id={ids.adv}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="mt-1.5 flex flex-col gap-3"
                >
                  <div>
                    <SectionLabel className="mb-1.5">{s.directionLabel}</SectionLabel>
                    <Seg
                      uid="kt-dir"
                      label={s.directionLabel}
                      size="sm"
                      value={su.dir}
                      onChange={(v) => actions.setupDir(v)}
                      options={[
                        { v: 'cw', label: s.cw },
                        { v: 'ccw', label: s.ccw },
                      ]}
                      className="flex w-full [&>button]:flex-1"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 id={ids.min} className="text-16 font-bold">
                        {s.minBid}
                      </h3>
                      <p className="text-13 text-[var(--tx2)]">{s.minBidHint(lo, hi)}</p>
                    </div>
                    <Stepper
                      value={minBid}
                      labelledBy={ids.min}
                      lower={s.minBidLower}
                      raise={s.minBidRaise}
                      canLower={minBid - su.bidStep >= lo}
                      canRaise={minBid + su.bidStep <= hi}
                      onLower={() => actions.setupMinBid(minBid - su.bidStep)}
                      onRaise={() => actions.setupMinBid(minBid + su.bidStep)}
                    />
                  </div>
                  <div>
                    <SectionLabel className="mb-1.5">{s.bidStep}</SectionLabel>
                    <Seg<'5' | '10'>
                      uid="kt-step"
                      label={s.bidStep}
                      size="sm"
                      value={`${su.bidStep}`}
                      onChange={(v) => actions.setupBidStep(v === '10' ? 10 : 5)}
                      options={[...s.stepOptions]}
                      className="flex w-full [&>button]:flex-1"
                    />
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      }
    >
      <TableSlot players={n} minFit={PREVIEW_SCALE}>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div
            key={n}
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <Table
              uid="kt-su1"
              fit
              minFit={PREVIEW_SCALE}
              n={n}
              dir={su.dir}
              center={<div className="text-13 text-[var(--ctr-fg)]">{s.seats(n)}</div>}
            />
          </m.div>
        </AnimatePresence>
      </TableSlot>
    </SetupFrame>
  );
}
