import { handLines, seatsOf, type SpGame, type TeamId } from '@/games/spades/domain';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { totalsOf } from '@/games/spades/table/state/select';
import { TEAM_TONE, teamNames } from '@/games/spades/table/screens/parts';

const b = spTable.board;

/** The scoreboard for any game; `onEdit` makes each hand's number open Edit hand. */
export function Board({ g, onEdit }: { g: SpGame; onEdit?: (i: number) => void }) {
  const lines = handLines(g.hands);
  const byIndex = new Map(g.hands.map((h) => [h.index, h]));
  const bidOf = (i: number, t: TeamId) => {
    const h = byIndex.get(i)!;
    return seatsOf(t)
      .map((k) => b.bidN(h.bids[k] ?? 0, h.blind[k]))
      .join('+');
  };
  const tot = totalsOf(g);
  if (!lines.length) return <p className="py-6 text-center text-16 text-[var(--tx2)]">{b.empty}</p>;
  const th = 'px-1 py-1.5 text-right text-13 font-semibold text-[var(--tx2)]';
  const td = 'border-t border-ov/10 px-1 py-2 text-right';
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="tick w-full min-w-[19rem] border-collapse text-14">
        <caption className="sr-only">{b.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={`${th} text-left`}>
              {b.hand}
            </th>
            {(['a', 'b'] as const).map((t) => (
              <th key={t} scope="colgroup" colSpan={3} className={`${th} !text-center`}>
                <span className={`inline-flex items-center gap-1 ${TEAM_TONE[t].text}`}>
                  <span aria-hidden className={`h-2 w-2 rounded-full ${TEAM_TONE[t].dot}`} />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{teamNames(g, t)}</span>
                </span>
              </th>
            ))}
          </tr>
          <tr>
            <th aria-hidden className={th} />
            {(['a', 'b'] as const).flatMap((t) => [
              <th key={t + 'b'} scope="col" className={th}>
                {b.bid}
              </th>,
              <th key={t + 'p'} scope="col" className={th}>
                {b.pts}
              </th>,
              <th key={t + 't'} scope="col" className={th}>
                {spTable.summary.total}
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.index}>
              <th scope="row" className="border-t border-ov/10 py-1 text-left font-semibold">
                {onEdit ? (
                  <button
                    type="button"
                    aria-label={b.editRow(l.index + 1)}
                    onClick={() => onEdit(l.index)}
                    className="press min-h-11 min-w-11 rounded-lg text-left text-[var(--accent-tx)] underline decoration-ov/25 underline-offset-4"
                  >
                    {l.index + 1}
                  </button>
                ) : (
                  l.index + 1
                )}
              </th>
              {(['a', 'b'] as const).flatMap((t) => [
                <td key={t + 'b'} className={`${td} text-[var(--tx2)]`}>
                  {bidOf(l.index, t)}
                </td>,
                <td
                  key={t + 'p'}
                  className={`${td} ${l[t].net >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}
                >
                  {spTable.sgn(l[t].net)}
                </td>,
                <td key={t + 't'} className={`${td} font-bold`}>
                  {l.after[t]}
                </td>,
              ])}
            </tr>
          ))}
          <tr>
            <th
              scope="row"
              className="border-t border-ov/20 py-2 text-left text-13 text-[var(--tx2)]"
            >
              {b.bagsRow}
            </th>
            {(['a', 'b'] as const).map((t) => (
              <td
                key={t}
                colSpan={3}
                className="border-t border-ov/20 px-1 py-2 text-right text-13 text-[var(--tx2)]"
              >
                {spTable.summary.carriedOf(tot[t].bags % 10)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Hand by hand; a hand's number opens Edit hand. */
export default function Scoreboard() {
  const { state, actions } = useSp();
  const g = state.game;
  if (!g) return null;
  return (
    <>
      <p className="mb-3 text-14 text-[var(--tx2)]">{b.sub}</p>
      <Board g={g} onEdit={(i) => actions.openSheet({ type: 'edit', i })} />
    </>
  );
}
