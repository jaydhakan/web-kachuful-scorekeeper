import { AnimatePresence, motion } from 'framer-motion';
import { COLORS, DECK_OPTIONS, EMOJIS, maxFor, playerCounts, type Decks } from '@/domain';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { Seg } from '@/components/ui/Seg';
import { Table } from '@/components/ui/Table';
import { EASE, SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { PREVIEW_SCALE } from '@/lib/tableGeometry';
import { SetupFrame, TableSlot } from './SetupFrame';
import { useSetup } from './useSetup';
import { t } from '@/strings';

export function Step1() {
  const { su, actions } = useSetup();
  const lg = su.lg;
  const counts = playerCounts(su.decks),
    // Eight buttons do not fit one row on a phone: two even rows of four.
    grid = counts.length > 5;
  const roving = useRovingFocus({
    selected: counts.indexOf(su.n ?? 0),
    ...(grid && { columns: 4, orientation: 'grid' as const }),
  });
  const lgDecks = lg?.decks ?? 1,
    lgFits = !!lg && playerCounts(lgDecks).includes(lg.names.length);
  return (
    <SetupFrame
      step={1}
      title={t.setup.step1Title}
      fit
      asideFirst
      bar={
        <PrimaryButton
          className="w-full"
          disabled={!su.n}
          onClick={() => actions.setupPatch({ step: 2, seats: Array<null>(su.n ?? 0).fill(null) })}
        >
          {t.common.next}
        </PrimaryButton>
      }
      aside={
        <>
          {lg && lgFits && (
            <motion.button
              type="button"
              {...stagger(0)}
              whileTap={{ scale: 0.96 }}
              onClick={() =>
                actions.setupPatch({
                  decks: lgDecks,
                  n: lg.names.length,
                  dir: lg.direction || 'cw',
                  seats: lg.names.map((nm, i) => ({
                    name: nm,
                    emoji: lg.emojis[i] || EMOJIS[i],
                    color: lg.colors[i] || COLORS[i],
                  })),
                  dealer: 0,
                  step: 3,
                })
              }
              className="glass mb-3 inline-flex min-h-12 items-center gap-2 !rounded-full px-4 py-2 text-left text-16 font-medium leading-[1.3] shadow-[0_0_24px_-6px_var(--accent)] [text-wrap:balance] @h-[45rem]:mb-1.5 @h-[45rem]:min-h-11 @h-[45rem]:py-1 @h-[45rem]:text-14"
            >
              {t.setup.useLastGroup(lg.names)}
            </motion.button>
          )}
          <div className="mt-2 flex flex-col items-center gap-1 @h-[45rem]:mt-1">
            <Seg<`${Decks}`>
              uid="deckseg"
              label={t.setup.decksLabel}
              size="sm"
              value={`${su.decks}`}
              onChange={(v) => {
                const decks = +v as Decks;
                // A count the new decks cannot seat is dropped rather than quietly changed.
                actions.setupPatch({
                  decks,
                  n: su.n && playerCounts(decks).includes(su.n) ? su.n : null,
                });
              }}
              options={DECK_OPTIONS.map((d) => ({ v: `${d}` as const, label: t.setup.deck(d) }))}
            />
            <p className="text-13 text-[var(--tx2)] @h-short:hidden">
              {t.setup.decksHint(counts[counts.length - 1])}
            </p>
          </div>
          <div
            className={`my-2 justify-center land:gap-2 land:@max-[40rem]:gap-[3px] @h-[45rem]:my-1 ${grid ? 'grid grid-cols-4 justify-items-center gap-2' : 'flex gap-2.5'}`}
            role="group"
            aria-label={t.setup.playerCount}
            {...roving.group}
          >
            {counts.map((n, i) => (
              <motion.button
                key={n}
                type="button"
                aria-pressed={su.n === n}
                aria-label={t.setup.players(n)}
                {...roving.item(i)}
                {...stagger(i, 0.05)}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  actions.setupPatch({ n });
                  actions.vib();
                }}
                className={`disp relative grid w-16 min-w-11 max-w-16 place-items-center ${grid ? 'h-14 w-full @h-[45rem]:h-11' : 'h-16 flex-1 @h-[45rem]:h-12'} rounded-[22px] text-30 font-extrabold tracking-[-0.03em] @h-tiny:!h-11 @h-tiny:rounded-2xl ${su.n === n ? 'text-ink-on-accent' : 'glass'}`}
              >
                {su.n === n && (
                  <motion.span
                    layoutId="nsel"
                    transition={SPRING_POP}
                    className="absolute inset-0 rounded-[inherit] bg-accent-gradient shadow-[0_0_0_4px_var(--glow),0_12px_32px_-8px_var(--accent)]"
                  />
                )}
                <span className="relative">{n}</span>
              </motion.button>
            ))}
          </div>
          <div className="mt-3 flex justify-center @h-[45rem]:mt-1.5">
            <Seg
              uid="dirseg"
              label={t.setup.directionLabel}
              size="sm"
              value={su.dir}
              onChange={(v) => actions.setupPatch({ dir: v })}
              options={[
                { v: 'cw', label: t.setup.cw },
                { v: 'ccw', label: t.setup.ccw },
              ]}
            />
          </div>
          <p
            className={`mt-3 text-center text-14 tracking-[0.005em] text-[var(--tx2)] [text-wrap:balance] @h-[45rem]:mt-1.5 ${lg ? '@h-short:hidden' : ''}`}
          >
            {t.setup.info(su.n, su.n ? maxFor(su.n, su.decks) : 0)}
          </p>
        </>
      }
    >
      <TableSlot players={su.n ?? 0} minFit={PREVIEW_SCALE}>
        <AnimatePresence mode="wait">
          {su.n ? (
            <motion.div
              key={su.n}
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Table
                uid="su1"
                fit
                minFit={PREVIEW_SCALE}
                n={su.n}
                dir={su.dir}
                center={<div className="text-13 text-[var(--tx2)]">{t.setup.seats(su.n)}</div>}
              />
            </motion.div>
          ) : (
            <motion.div
              key="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid flex-1 place-items-center text-center text-13 text-[var(--tx2)] [text-wrap:balance]"
            >
              {t.setup.tapNumber}
            </motion.div>
          )}
        </AnimatePresence>
      </TableSlot>
    </SetupFrame>
  );
}
