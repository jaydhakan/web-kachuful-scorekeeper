import { AnimatePresence, motion } from 'framer-motion';
import { COLORS, EMOJIS, maxFor } from '@/domain';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { Table } from '@/components/ui/Table';
import { EASE, SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { SetupFrame } from './SetupFrame';
import { useSetup } from './useSetup';

const infoLine = (n: number | null) =>
  n
    ? `Max ${maxFor(n)} cards · 3 → ${maxFor(n)} → 3, repeating`
    : 'Pick the number of players to see the table';

export function Step1() {
  const { su, actions } = useSetup();
  const lg = su.lg;
  return (
    <SetupFrame
      step={1}
      title="How many players?"
      bar={
        <PrimaryButton
          className="w-full"
          disabled={!su.n}
          onClick={() => actions.setupPatch({ step: 2, seats: Array<null>(su.n ?? 0).fill(null) })}
        >
          Next
        </PrimaryButton>
      }
    >
      {lg && (
        <motion.button
          type="button"
          {...stagger(0)}
          whileTap={{ scale: 0.96 }}
          onClick={() =>
            actions.setupPatch({
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
          className="glass mb-3 inline-flex min-h-12 items-center gap-2 !rounded-full px-4 text-16 font-medium shadow-[0_0_24px_-6px_var(--accent)]"
        >
          ↺ Use last group: {lg.names.slice(0, 3).join(', ')}
          {lg.names.length > 3 ? ` +${lg.names.length - 3}` : ''}
        </motion.button>
      )}
      <div className="my-2 flex justify-center gap-2.5">
        {[3, 4, 5, 6, 7].map((n, i) => (
          <motion.button
            key={n}
            type="button"
            aria-pressed={su.n === n}
            aria-label={`${n} players`}
            {...stagger(i, 0.05)}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              actions.setupPatch({ n });
              actions.vib();
            }}
            className={`disp relative grid h-16 w-16 max-w-[calc((100%-40px)/5)] flex-1 place-items-center rounded-[22px] text-30 font-extrabold tracking-[-0.03em] ${su.n === n ? 'text-ink-on-accent' : 'glass'}`}
          >
            {su.n === n && (
              <motion.span
                layoutId="nsel"
                transition={SPRING_POP}
                className="absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_58%,black))] shadow-[0_0_0_4px_var(--glow),0_12px_32px_-8px_var(--accent)]"
              />
            )}
            <span className="relative">{n}</span>
          </motion.button>
        ))}
      </div>
      <div className="h-[300px]">
        <AnimatePresence mode="wait">
          {su.n ? (
            <motion.div
              key={su.n}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Table
                uid="su1"
                n={su.n}
                dir={su.dir}
                center={<div className="text-13 text-[var(--tx2)]">{su.n} seats</div>}
              />
            </motion.div>
          ) : (
            <motion.div
              key="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-[130px] text-center text-13 text-[var(--tx2)]"
            >
              Tap a number above
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center">
        <Seg
          uid="dirseg"
          size="sm"
          value={su.dir}
          onChange={(v) => actions.setupPatch({ dir: v })}
          options={[
            { v: 'cw', label: '⟳ Clockwise' },
            { v: 'ccw', label: '⟲ Anticlockwise' },
          ]}
        />
      </div>
      <p className="mt-3 text-center text-14 tracking-[0.005em] text-[var(--tx2)]">
        {infoLine(su.n)}
      </p>
    </SetupFrame>
  );
}
