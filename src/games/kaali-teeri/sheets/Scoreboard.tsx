import { doneHands, handScore, result, totals, type KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { ROLE_ICON, roleOf } from '@/games/kaali-teeri/screens/hand/parts/bits';
import { Avatar } from '@/components/ui/Avatar';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { fmt, sgnN } from '@/lib/format';

/** Every done hand, one column per player; a row opens that hand in the Edit sheet. Totals are derived. */
export default function Scoreboard() {
  const { state, actions } = useKt();
  const g = state.game;
  if (!g || !doneHands(g).length)
    return <p className="py-5 text-16 text-[var(--tx2)]">{kp.board.empty}</p>;
  return (
    <>
      <p className="mb-2 text-13 text-[var(--tx2)]">{kp.board.hint}</p>
      <ScoreTable g={g} onRow={(i) => actions.openSheet({ type: 'edit', i })} />
    </>
  );
}

export function ScoreTable({ g, onRow }: { g: KtGame; onRow?: (i: number) => void }) {
  const done = doneHands(g),
    tot = totals(g),
    ids = g.players.map((p) => p.id);
  return (
    <div className="scroll-thin max-h-[calc(100%-28px)] overflow-auto rounded-2xl @container">
      <table className="min-w-full border-separate border-spacing-0 text-13 @[40rem]:table-fixed">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 min-w-[112px] bg-sheet px-2.5 py-2 text-left">
              {kp.board.hand}
            </th>
            {g.players.map((p) => (
              <th
                key={p.id}
                className="sticky top-0 z-10 min-w-[76px] bg-sheet px-1 py-2 text-center align-top"
              >
                <Avatar
                  p={p}
                  className="mx-auto mb-0.5 grid h-8 w-8 place-items-center rounded-full text-18 land:hidden"
                />
                <div className="break-words font-medium text-[var(--tx2)]">{p.name}</div>
                <div
                  className={`disp text-20 font-extrabold land:text-16 ${tot[p.id] > 0 ? 'text-[var(--pos)]' : ''}`}
                >
                  <span className="sr-only">{kp.board.total} </span>
                  {fmt(tot[p.id])}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {done.map((h) => {
            const s = handScore(h, g.rules, ids),
              res = result(h, g.rules)!,
              bidder = g.players.find((p) => p.id === h.bidder);
            return (
              <tr
                key={h.index}
                onClick={onRow && (() => onRow(h.index))}
                className={onRow ? 'cursor-pointer active:bg-ov/5' : ''}
              >
                <th scope="row" className="sticky left-0 z-[5] bg-sheet text-left font-bold">
                  {onRow ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRow(h.index);
                      }}
                      className="flex min-h-12 w-full flex-col items-start justify-center rounded-xl px-2.5 py-1.5 text-left"
                    >
                      {/* Named by what it shows, so the spoken name matches the visible one (WCAG 2.5.3). */}
                      <span className="sr-only">{kp.board.edit} </span>
                      <RowHead
                        n={h.index + 1}
                        bid={h.bid!}
                        made={res.made}
                        trump={h.trump!}
                        who={bidder?.name ?? ''}
                      />
                    </button>
                  ) : (
                    <div className="px-2.5 py-1.5">
                      <RowHead
                        n={h.index + 1}
                        bid={h.bid!}
                        made={res.made}
                        trump={h.trump!}
                        who={bidder?.name ?? ''}
                      />
                    </div>
                  )}
                </th>
                {g.players.map((p) => {
                  const v = s[p.id],
                    role = roleOf(h, p.id);
                  return (
                    <td
                      key={p.id}
                      className="border-b border-ov/[.06] bg-sheet px-1 py-1.5 text-center"
                    >
                      <div
                        className={`inline-flex items-center gap-1 text-15 font-extrabold ${v > 0 ? 'text-[var(--pos)]' : 'text-[var(--tx2)]'}`}
                      >
                        {role && (
                          <span className="text-[var(--accent)]">
                            {ROLE_ICON[role]}
                            <span className="sr-only">{kp.role[role]}</span>
                          </span>
                        )}
                        {sgnN(v)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowHead({
  n,
  bid,
  made,
  trump,
  who,
}: {
  n: number;
  bid: number;
  made: boolean;
  trump: KtGame['hands'][number]['trump'] & string;
  who: string;
}) {
  return (
    <>
      <span>
        {kp.hand.title(n)} · {bid} <SuitGlyph trump={trump} />{' '}
        <span className={made ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}>
          <span aria-hidden>{made ? kp.board.made : kp.board.missed}</span>
          <span className="sr-only">{made ? kp.board.madeWord : kp.board.missedWord}</span>
        </span>
      </span>
      <span className="break-words text-13 font-medium text-[var(--tx2)]">{who}</span>
    </>
  );
}
