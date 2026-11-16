import { rulesText as T } from '@/games/spades/strings/rules';

const H3 = 'disp text-20 font-bold tracking-[-0.02em]';

/** The rules in plain words, with the worked examples; its own chunk, loaded when the sheet opens. */
export default function RulesBody() {
  const ex = T.examples;
  const run = ex.bagRun;
  return (
    <div className="flex flex-col gap-6 pb-2 text-16 leading-[1.5]">
      <p className="text-[var(--tx2)]">{T.intro}</p>
      {T.sections.map((s) => (
        <section key={s.title} className="flex flex-col gap-2">
          <h3 className={H3}>{s.title}</h3>
          {s.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {'points' in s && s.points && (
            <ul className="flex flex-col gap-1.5 pl-5 [list-style:disc] marker:text-[var(--tx2)]">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <section className="flex flex-col gap-3">
        <h3 className={H3}>{ex.title}</h3>
        <p className="text-[var(--tx2)]">{ex.intro}</p>
        <ol className="flex flex-col gap-2">
          {ex.rows.map((r) => (
            <li
              key={r.bids + r.took}
              className="glass grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 p-3.5"
            >
              <span className="text-15 font-semibold">
                {ex.head.bids} {r.bids} · {ex.head.took} {r.took}
              </span>
              <span className="row-span-2 flex flex-col items-end">
                <span className="text-20 font-bold tabular-nums">{r.points}</span>
                <span className="text-13 text-[var(--tx2)]">
                  {ex.head.bags} {r.bags}
                </span>
              </span>
              <span className="text-15 text-[var(--tx2)]">{r.result}</span>
            </li>
          ))}
        </ol>
        <p>{ex.minBid}</p>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className={H3}>{run.title}</h3>
        <p className="text-[var(--tx2)]">{run.intro}</p>
        <table className="w-full border-collapse text-15 tabular-nums">
          <thead>
            <tr className="text-left text-13 text-[var(--tx2)]">
              <th className="py-1.5 pr-2 font-semibold">{run.head.hand}</th>
              <th className="py-1.5 pr-2 font-semibold">{run.head.bid}</th>
              <th className="py-1.5 pr-2 font-semibold">{run.head.took}</th>
              <th className="py-1.5 pr-2 font-semibold">{run.head.points}</th>
              <th className="py-1.5 font-semibold">{run.head.bags}</th>
            </tr>
          </thead>
          <tbody>
            {run.rows.map((r) => (
              <tr key={r.hand} className="border-t border-[var(--hairline)]">
                <td className="py-2 pr-2">{r.hand}</td>
                <td className="py-2 pr-2">{r.bid}</td>
                <td className="py-2 pr-2">{r.took}</td>
                <td className="py-2 pr-2">{r.points}</td>
                <td className="py-2">{r.bags}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="font-semibold">{run.total}</p>
      </section>
    </div>
  );
}
