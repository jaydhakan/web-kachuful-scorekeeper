import { motion } from 'framer-motion';
import { useState } from 'react';
import { bidOrder, type Outcome } from '@/domain';
import { useApp } from '@/state/store';
import { TR } from '@/theme/trumps';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';

export function EditBody({ i }: { i: number }) {
  const { state, actions } = useApp();
  const g = state.game,
    r = g.rounds[i],
    od = bidOrder(g, r);
  const [bids, setBids] = useState({ ...r.bids }),
    [res, setRes] = useState({ ...r.results });
  const allMade = g.players.every((p) => res[p.id] === 'made');
  return (
    <>
      <div className="mb-2 text-13 text-[var(--tx2)]">
        {r.cards} cards · {TR[r.trump].name} · dealt by {g.players[r.dealerIndex].name}
      </div>
      {od.map((k) => {
        const p = g.players[k];
        return (
          <Glass key={p.id} spot={false} className="mb-2 flex items-center gap-2.5 p-2.5">
            <Dot p={p} s={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-18 font-bold tracking-[-0.015em]">{p.name}</div>
              <div className="mt-1 flex items-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  aria-label={`Lower bid for ${p.name}`}
                  onClick={() => setBids((b) => ({ ...b, [p.id]: Math.max(0, b[p.id] - 1) }))}
                  className="h-10 w-10 rounded-xl bg-white/[.07] text-22 font-bold"
                >
                  −
                </motion.button>
                <output className="disp w-8 text-center text-22 font-extrabold">
                  {bids[p.id]}
                </output>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  aria-label={`Raise bid for ${p.name}`}
                  onClick={() => setBids((b) => ({ ...b, [p.id]: Math.min(r.cards, b[p.id] + 1) }))}
                  className="h-10 w-10 rounded-xl bg-white/[.07] text-22 font-bold"
                >
                  +
                </motion.button>
              </div>
            </div>
            <Seg<Outcome>
              uid={'e' + p.id}
              size="sm"
              value={res[p.id]}
              onChange={(v) => setRes((s) => ({ ...s, [p.id]: v }))}
              options={[
                { v: 'made', label: '✓', tone: 'pos' },
                { v: 'missed', label: '✗', tone: 'neg' },
              ]}
            />
          </Glass>
        );
      })}
      {allMade && (
        <div className="py-2 text-14 font-medium text-[var(--warn)]">
          Someone has to miss — the bids can’t all be right. Check again.
        </div>
      )}
      <PrimaryButton
        className="mt-2 w-full"
        disabled={allMade}
        onClick={() => actions.editRound(i, bids, res)}
      >
        Save
      </PrimaryButton>
    </>
  );
}
