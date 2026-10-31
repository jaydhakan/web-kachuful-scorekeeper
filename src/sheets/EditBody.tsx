import { motion } from 'framer-motion';
import type { Outcome } from '@/domain';
import { useRoundEdit } from '@/hooks/useRoundEdit';
import { TR } from '@/theme/trumps';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { t } from '@/strings';

export function EditBody({ i }: { i: number }) {
  const { g, r, od, bids, res, problem, step, mark, save } = useRoundEdit(i);
  return (
    <>
      <div className="mb-2 text-13 text-[var(--tx2)]">
        {t.sheets.editInfo(r.cards, TR[r.trump].name, g.players[r.dealerIndex].name)}
      </div>
      {od.map((k) => {
        const p = g.players[k];
        return (
          <Glass key={p.id} spot={false} className="mb-2 flex flex-wrap items-center gap-2.5 p-2.5">
            <Dot p={p} s={40} />
            <div className="min-w-0 flex-1 basis-40">
              <div className="break-words text-18 font-bold tracking-[-0.015em] [text-wrap:balance]">
                {p.name}
              </div>
              <div className="mt-1 flex items-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  aria-label={t.sheets.lowerBid(p.name)}
                  onClick={() => step(p.id, -1)}
                  className="h-11 w-11 shrink-0 rounded-xl bg-white/[.07] text-22 font-bold"
                >
                  −
                </motion.button>
                <output className="disp w-8 text-center text-22 font-extrabold">
                  {bids[p.id]}
                </output>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  aria-label={t.sheets.raiseBid(p.name)}
                  onClick={() => step(p.id, 1)}
                  className="h-11 w-11 shrink-0 rounded-xl bg-white/[.07] text-22 font-bold"
                >
                  +
                </motion.button>
              </div>
            </div>
            <Seg<Outcome>
              uid={'e' + p.id}
              label={t.results.resultFor(p.name)}
              size="sm"
              value={res[p.id]}
              onChange={(v) => mark(p.id, v)}
              options={[
                { v: 'made', label: t.table.made, tone: 'pos' },
                { v: 'missed', label: t.table.missed, tone: 'neg' },
              ]}
            />
          </Glass>
        );
      })}
      {problem && (
        <div className="py-2 text-14 font-medium text-[var(--warn)]" role="alert">
          {problem}
        </div>
      )}
      <PrimaryButton className="mt-2 w-full" disabled={!!problem} onClick={save}>
        {t.common.save}
      </PrimaryButton>
    </>
  );
}
