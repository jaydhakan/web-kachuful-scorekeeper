import { m } from 'framer-motion';
import { pts, type Game, type Outcome } from '@/domain';
import { useApp } from '@/state/store';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { SPRING } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { resultsView } from '@/screens/round/roundView';
import { Delta, Kbd } from './DeskParts';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

/** A tick or cross, with its word once the row has room; the word always names the button for assistive tech. */
const mark = (icon: string, word: string) => (
  <>
    <span aria-hidden>{icon}</span>
    <span className="sr-only @[28rem]:not-sr-only @[28rem]:ml-1.5">{word}</span>
  </>
);

export function ResultsPane({ g }: { g: Game }) {
  const { state, actions } = useApp();
  const { r, st, od, left, blocked, why } = resultsView(g);
  const open = g.players.filter((p) => !r.results[p.id]).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 rail:gap-3.5">
      {/* Title and tricks left share a row when the pane is wide enough (a tablet held upright). */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 className="disp text-28 font-extrabold tracking-[-0.03em]">{t.results.title}</h2>
        <div className="flex min-h-12 min-w-[17rem] flex-1 items-center gap-3">
          <div role="status" aria-live="polite" className="flex flex-1 items-center gap-3">
            <span className="shrink-0 text-14 font-medium text-[var(--tx2)]">
              {t.results.tricksLeft}
            </span>
            <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-ov/[.08]">
              <m.div
                className="h-full origin-left rounded-full bg-[var(--accent)]"
                initial={false}
                animate={{ scaleX: r.cards ? left / r.cards : 0 }}
                transition={SPRING}
              />
            </div>
            <span className="disp tick shrink-0 text-22 font-extrabold leading-none">
              {left}
              <span className="text-14 font-medium text-[var(--tx2)]">
                {t.results.tricksOf(r.cards)}
              </span>
            </span>
          </div>
        </div>
      </div>
      <ol className="scroll-thin -mr-1.5 flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1.5 rail:gap-2">
        {od.map((k, i) => {
          const p = g.players[k],
            b = r.bids[p.id],
            res = r.results[p.id],
            pv = pts(r, p.id),
            forced = state.autoResult === p.id && !!res,
            note = !res ? why(blocked(p.id, 'made') ?? blocked(p.id, 'missed')) : undefined;
          return (
            <m.li key={p.id} {...stagger(i)} className="@container shrink-0 rounded-2xl bg-ov/5">
              <div className="flex min-h-14 flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 py-1 @[24rem]:gap-x-3 rail:min-h-16 rail:py-2">
                <Avatar
                  p={p}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ov/20 text-20 @[24rem]:h-11 @[24rem]:w-11 @[24rem]:text-24"
                />
                <div className="min-w-[4.5rem] flex-1">
                  <div className="text-18 font-bold leading-tight [overflow-wrap:anywhere]">
                    {p.name}
                  </div>
                  <div className="text-13 text-[var(--tx2)]">
                    {t.results.bid(b)}
                    {k === r.dealerIndex && t.desk.results.dealer}
                    {forced && <> · {t.results.onlyOption}</>}
                    {note && <span className="text-[var(--warn)]"> · {note}</span>}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2.5 @[24rem]:gap-3">
                  <Seg<Outcome>
                    uid={'wsr' + p.id}
                    label={t.results.resultFor(p.name)}
                    value={res}
                    onChange={(v) => actions.setResult(p.id, v)}
                    className="[&_button]:h-12 [&_button]:min-w-12 [&_button]:px-3 [&_button]:text-18 @[28rem]:[&_button]:px-4 @[28rem]:[&_button]:text-16"
                    options={[
                      {
                        v: 'made',
                        label: mark(t.table.made, t.results.made),
                        tone: 'pos',
                        disabled: !!blocked(p.id, 'made'),
                        why: why(blocked(p.id, 'made')),
                      },
                      {
                        v: 'missed',
                        label: mark(t.table.missed, t.results.missed),
                        tone: 'neg',
                        disabled: !!blocked(p.id, 'missed'),
                        why: why(blocked(p.id, 'missed')),
                      },
                    ]}
                  />
                  <span className="w-[52px]">{pv != null && <Delta v={pv} />}</span>
                </div>
              </div>
            </m.li>
          );
        })}
      </ol>
      <div
        role="status"
        aria-live="polite"
        className={`flex min-h-6 items-center gap-2 text-15 font-bold ${st.msg ? 'text-[var(--warn)]' : st.ok ? 'text-[var(--pos)]' : 'text-[var(--tx2)]'}`}
      >
        {st.msg ? (
          <>
            {Icon.warn}
            {st.msg}
          </>
        ) : st.ok ? (
          <>
            {Icon.check}
            {t.desk.results.valid}
          </>
        ) : (
          t.desk.results.pending(open)
        )}
      </div>
      <PrimaryButton className="mt-auto w-full" disabled={!st.ok} onClick={actions.confirmRound}>
        {t.results.confirm}
        {st.ok && <Kbd>⏎</Kbd>}
      </PrimaryButton>
    </div>
  );
}
