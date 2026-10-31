import { motion } from 'framer-motion';
import { useState } from 'react';
import { bidOrder, resultsProblem, type Outcome } from '@/domain';
import { useApp } from '@/state/store';
import { TR } from '@/theme/trumps';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { t } from '@/strings';

export function EditBody({ i }: { i: number }) {
  const { state, actions } = useApp();
  const g = state.game,
    r = g.rounds[i],
    od = bidOrder(g, r);
  const [bids, setBids] = useState({ ...r.bids }),
    [res, setRes] = useState({ ...r.results });
  const ids = g.players.map((p) => p.id);
  const allMade = ids.every((id) => res[id] === 'made');
  // The same rules as when the round was first entered, on the edited bids and results.
  const problem =
    ids.reduce((a, id) => a + (bids[id] ?? 0), 0) === r.cards
      ? t.sheets.editBidsEqual(r.cards)
      : allMade
        ? t.results.allMadeEdit
        : resultsProblem(r.cards, ids, bids, res);
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
                  onClick={() => setBids((b) => ({ ...b, [p.id]: Math.max(0, b[p.id] - 1) }))}
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
                  onClick={() => setBids((b) => ({ ...b, [p.id]: Math.min(r.cards, b[p.id] + 1) }))}
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
              onChange={(v) => setRes((s) => ({ ...s, [p.id]: v }))}
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
      <PrimaryButton
        className="mt-2 w-full"
        disabled={!!problem}
        onClick={() => actions.editRound(i, bids, res)}
      >
        {t.common.save}
      </PrimaryButton>
    </>
  );
}
