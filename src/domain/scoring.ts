import { messages } from '../strings/messages';
import { doneRounds } from './rounds';
import { resultsProblem } from './tricks';
import type { Game, Round, Totals } from './types';

export function pts(r: Pick<Round, 'bids' | 'results'>, pid: string): number | null {
  const b = r.bids[pid],
    res = r.results[pid];
  if (b === undefined || !res) return null;
  const v = Math.max(b, 1) * 10;
  return res === 'made' ? v : -v;
}

export function totals(g: Game, rounds?: Round[]): Totals {
  const t: Totals = {};
  g.players.forEach((p) => (t[p.id] = 0));
  (rounds || doneRounds(g)).forEach((r) =>
    g.players.forEach((p) => {
      const v = pts(r, p.id);
      if (v != null) t[p.id] += v;
    }),
  );
  return t;
}

export interface ResultsState {
  all: boolean;
  msg: string;
  ok: boolean;
  exact: boolean;
}

export function resultsState(g: Game, r: Round): ResultsState {
  const exact = !!r.tricks,
    rows = g.players;
  const all = rows.every((p) => r.results[p.id]);
  const allMade = all && rows.every((p) => r.results[p.id] === 'made');
  let msg = '';
  if (r.tricks) {
    const tricks = r.tricks;
    const tsum = rows.reduce((a, p) => a + (tricks[p.id] || 0), 0);
    if (tsum !== r.cards) msg = messages.tricksMismatch(tsum, r.cards);
  }
  if (!msg && allMade) msg = messages.allMade;
  // Only for a real round: the dealer's forbidden number means real bids never add up to the cards, and the
  // checks below have nothing consistent to compare against when they do.
  const sum = rows.reduce((a, p) => a + (r.bids[p.id] ?? 0), 0);
  if (!msg && all && !r.tricks && sum !== r.cards)
    msg = resultsProblem(
      r.cards,
      rows.map((p) => p.id),
      r.bids,
      r.results,
    );
  return { all, msg, ok: all && !msg, exact };
}
