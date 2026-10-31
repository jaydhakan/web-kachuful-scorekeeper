import { motion } from 'framer-motion';
import { pts, type Game, type Outcome } from '@/domain';
import { useApp } from '@/state/store';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { SPRING, SPRING_POP } from '@/components/ui/motion';
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
  const { r, st, od, tricks, left, blocked, why } = resultsView(g);
  const open = g.players.filter((p) => !r.results[p.id]).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 rail:gap-3.5">
      {/* Title and tricks left share a row when the pane is wide enough (a tablet held upright). */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 className="disp text-28 font-extrabold tracking-[-0.03em]">{t.results.title}</h2>
        <div className="flex min-h-12 min-w-[17rem] flex-1 items-center gap-3">
          {tricks ? (
            <p className="flex-1 text-14 text-[var(--tx2)]">
              {t.results.totalTricks(
                Object.values(tricks).reduce((a, b) => a + b, 0),
                r.cards,
              )}
            </p>
          ) : (
            <div role="status" aria-live="polite" className="flex flex-1 items-center gap-3">
              <span className="shrink-0 text-14 font-medium text-[var(--tx2)]">
                {t.results.tricksLeft}
              </span>
              <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-white/[.08]">
                <motion.div
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
          )}
          <motion.button
            type="button"
            role="switch"
            aria-checked={st.exact}
            aria-label={t.results.exactSwitch}
            onClick={actions.toggleExact}
            whileTap="press"
            className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl pl-2"
          >
            <span className="text-14 text-[var(--tx2)]">{t.desk.results.exactShort}</span>
            <motion.span
              aria-hidden
              variants={{ press: { scale: 0.94 } }}
              className="relative h-[30px] w-[52px] shrink-0 rounded-full bg-white/[.16]"
            >
              <span
                className={`absolute inset-0 rounded-full bg-[var(--accent)] transition-opacity duration-300 ease-apple ${st.exact ? '' : 'opacity-0'}`}
              />
              <motion.span
                animate={{ x: st.exact ? 22 : 0 }}
                transition={SPRING_POP}
                className="absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-text-primary shadow-[0_2px_6px_rgba(0,0,0,.4)]"
              />
            </motion.span>
          </motion.button>
        </div>
      </div>
      <ol className="scroll-thin -mr-1.5 flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1.5 rail:gap-2">
        {od.map((k, i) => {
          const p = g.players[k],
            b = r.bids[p.id],
            res = r.results[p.id],
            pv = pts(r, p.id),
            forced = state.autoResult === p.id && !!res && !tricks,
            note =
              !res && !tricks ? why(blocked(p.id, 'made') ?? blocked(p.id, 'missed')) : undefined;
          return (
            <motion.li
              key={p.id}
              {...stagger(i)}
              className="@container shrink-0 rounded-2xl bg-white/5"
            >
              <div className="flex min-h-14 flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3 py-1 @[24rem]:gap-x-3 rail:min-h-16 rail:py-2">
                <Avatar
                  p={p}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white/20 text-20 @[24rem]:h-11 @[24rem]:w-11 @[24rem]:text-24"
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
                  {tricks ? (
                    <div className="flex items-center">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        aria-label={t.results.fewer(p.name)}
                        onClick={() => actions.setTricks(p.id, -1)}
                        className="h-12 w-12 rounded-xl bg-white/[.08] text-24 font-bold"
                      >
                        −
                      </motion.button>
                      <output className="disp w-9 text-center text-24 font-extrabold">
                        {tricks[p.id]}
                      </output>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        aria-label={t.results.more(p.name)}
                        onClick={() => actions.setTricks(p.id, 1)}
                        className="h-12 w-12 rounded-xl bg-white/[.08] text-24 font-bold"
                      >
                        +
                      </motion.button>
                    </div>
                  ) : (
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
                  )}
                  <span className="w-[52px]">{pv != null && <Delta v={pv} />}</span>
                </div>
              </div>
            </motion.li>
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
