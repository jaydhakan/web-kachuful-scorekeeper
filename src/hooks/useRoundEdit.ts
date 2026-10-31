import { useState } from 'react';
import { bidOrder, resultsProblem, type Outcome } from '@/domain';
import { useApp } from '@/state/store';
import { t } from '@/strings';

/** Draft bids and results for editing a finished round, checked by the same rules as when it was entered. */
export function useRoundEdit(i: number) {
  const { state, actions } = useApp();
  const g = state.game,
    r = g.rounds[i];
  const [bids, setBids] = useState({ ...r.bids }),
    [res, setRes] = useState({ ...r.results });
  const ids = g.players.map((p) => p.id);
  const allMade = ids.every((id) => res[id] === 'made');
  const problem =
    ids.reduce((a, id) => a + (bids[id] ?? 0), 0) === r.cards
      ? t.sheets.editBidsEqual(r.cards)
      : allMade
        ? t.results.allMadeEdit
        : resultsProblem(r.cards, ids, bids, res);
  return {
    g,
    r,
    od: bidOrder(g, r),
    bids,
    res,
    problem,
    step: (id: string, d: number) =>
      setBids((b) => ({ ...b, [id]: Math.max(0, Math.min(r.cards, b[id] + d)) })),
    mark: (id: string, v: Outcome) => setRes((s) => ({ ...s, [id]: v })),
    save: () => {
      if (!problem) actions.editRound(i, bids, res);
    },
  };
}
