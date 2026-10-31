import { doneRounds, pts, totals } from '@/domain';
import { fmt, sgnN, trunc } from '@/lib/format';
import { useApp } from '@/state/store';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { t } from '@/strings';

export function BoardBody() {
  const { state, actions } = useApp();
  const g = state.game,
    done = doneRounds(g),
    tot = totals(g);
  if (!done.length) return <p className="py-5 text-16 text-[var(--tx2)]">{t.sheets.boardEmpty}</p>;
  return (
    <>
      <div className="mb-2 text-13 text-[var(--tx2)]">{t.sheets.boardHint}</div>
      <div className="no-scroll max-h-[calc(100%-28px)] overflow-auto rounded-2xl">
        <table className="min-w-full border-separate border-spacing-0 text-13">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[112px] bg-sheet px-2.5 py-2 text-left">
                {t.sheets.boardRound}
              </th>
              {g.players.map((p) => (
                <th
                  key={p.id}
                  className="sticky top-0 z-10 min-w-[76px] bg-sheet px-1 py-2 text-center"
                >
                  <div
                    className="mx-auto mb-0.5 grid h-8 w-8 place-items-center rounded-full text-18"
                    style={{ background: p.color }}
                  >
                    {p.emoji}
                  </div>
                  <div className="font-medium text-[var(--tx2)]">{trunc(p.name)}</div>
                  <div
                    className={`disp text-20 font-extrabold ${tot[p.id] < 0 ? 'text-[var(--neg)]' : tot[p.id] > 0 ? 'text-[var(--pos)]' : ''}`}
                  >
                    {fmt(tot[p.id])}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {done.map((r) => (
              <tr
                key={r.index}
                tabIndex={0}
                aria-label={t.sheets.editRow(r.index + 1)}
                onClick={() => actions.openSheet({ type: 'edit', i: r.index })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    actions.openSheet({ type: 'edit', i: r.index });
                  }
                }}
                className="cursor-pointer active:bg-white/5"
              >
                <td className="sticky left-0 z-[5] min-w-[112px] bg-sheet px-2.5 py-1.5 text-left font-bold">
                  R{r.index + 1} · {r.cards}
                  <SuitGlyph trump={r.trump} /> · {g.players[r.dealerIndex].name}
                </td>
                {g.players.map((p) => {
                  const v = pts(r, p.id),
                    ok = r.results[p.id] === 'made';
                  return (
                    <td
                      key={p.id}
                      className="border-b border-white/[.06] bg-sheet px-1 py-1.5 text-center"
                    >
                      <div>
                        {r.bids[p.id]}{' '}
                        <span className={ok ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}>
                          {ok ? t.table.made : t.table.missed}
                        </span>
                      </div>
                      <div
                        className={`text-15 font-extrabold ${v != null && v > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}
                      >
                        {v == null ? '–' : sgnN(v)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
