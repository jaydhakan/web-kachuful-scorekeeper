import { motion } from 'framer-motion';
import { bidOrder, curRound, pts, resultsState, type Outcome } from '@/domain';
import { sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { Glass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { Table } from '@/components/ui/Table';
import { SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { RoundFrame } from './RoundFrame';
import { t } from '@/strings';

export function Results() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    st = resultsState(g, r),
    od = bidOrder(g, r);
  const tricks = r.tricks;
  return (
    <RoundFrame
      r={r}
      title={t.results.title}
      fit
      asideFirst
      navLeft={
        <IconButton label={t.common.back} onClick={() => actions.phase('playing', -1)}>
          {Icon.back}
        </IconButton>
      }
      aside={
        <>
          {/* Marks and bids already exist in the round; only a pane with room shows them on a table. */}
          <div className="mb-4 hidden aspect-[34/30] w-full flex-col wide:flex">
            <Table
              uid="results"
              fit
              big
              noSeatAnim
              players={g.players}
              dir={g.direction}
              bids={r.bids}
              res={r.results}
            />
          </div>
          <motion.button
            type="button"
            role="switch"
            aria-checked={st.exact}
            onClick={actions.toggleExact}
            whileTap="press"
            className="mb-1 flex min-h-12 w-full items-center justify-between rounded-2xl px-1 text-left"
          >
            <span className="text-16 font-medium">{t.results.exactSwitch}</span>
            <motion.span
              aria-hidden
              variants={{ press: { scale: 0.94 } }}
              className="relative h-[30px] w-[52px] shrink-0 rounded-full bg-white/[.14]"
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
          {tricks && (
            <div className="mb-3 px-1 text-13 text-[var(--tx2)]">
              {t.results.totalTricks(
                Object.values(tricks).reduce((a, b) => a + b, 0),
                r.cards,
              )}
            </div>
          )}
        </>
      }
      barNote={st.msg}
      bar={
        <PrimaryButton className="w-full" disabled={!st.ok} onClick={actions.confirmRound}>
          {t.results.confirm}
        </PrimaryButton>
      }
    >
      <div
        // A container, so the Made/Missed buttons can relax once the row has room for them.
        className="@container scroll-thin min-h-[8.5rem] flex-1 overflow-y-auto overflow-x-hidden pane:overflow-visible"
      >
        {od.map((i, k) => {
          const p = g.players[i],
            b = r.bids[p.id],
            res = r.results[p.id],
            pv = pts(r, p.id);
          return (
            <motion.div key={p.id} {...stagger(k)} className="mb-1.5">
              {/* The controls wrap under the name when the pane is too narrow for both. */}
              <Glass
                spot={false}
                className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 px-2 py-[3px]"
              >
                <div className="flex min-w-[7.5rem] flex-1 items-center gap-2">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/20 text-22"
                    style={{ background: p.color }}
                  >
                    {p.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-16 font-bold @[26rem]:text-18 leading-[1.2] tracking-[-0.015em] [text-wrap:balance]">
                      {p.name}
                    </div>
                    <div className="whitespace-nowrap text-13 font-medium leading-4 text-[var(--tx2)]">
                      {t.results.bid(b)}
                      {pv != null && (
                        <>
                          {' '}
                          ·{' '}
                          <b className={pv > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}>
                            {sgnN(pv)}
                          </b>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {tricks ? (
                  <div className="ml-auto flex items-center">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      aria-label={t.results.fewer(p.name)}
                      onClick={() => actions.setTricks(p.id, -1)}
                      className="h-11 w-11 rounded-xl bg-white/[.07] text-24 font-bold"
                    >
                      −
                    </motion.button>
                    <output className="disp w-[34px] text-center text-24 font-extrabold">
                      {tricks[p.id]}
                    </output>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      aria-label={t.results.more(p.name)}
                      onClick={() => actions.setTricks(p.id, 1)}
                      className="h-11 w-11 rounded-xl bg-white/[.07] text-24 font-bold"
                    >
                      +
                    </motion.button>
                  </div>
                ) : (
                  <Seg<Outcome>
                    uid={'seg' + p.id}
                    label={t.results.resultFor(p.name)}
                    size="sm"
                    value={res}
                    onChange={(v) => actions.setResult(p.id, v)}
                    className="ml-auto [&_button]:px-2 [&_button]:text-14 @[26rem]:[&_button]:px-3.5 @[26rem]:[&_button]:text-15"
                    options={[
                      { v: 'made', label: t.results.made, tone: 'pos' },
                      { v: 'missed', label: t.results.missed, tone: 'neg' },
                    ]}
                  />
                )}
              </Glass>
            </motion.div>
          );
        })}
      </div>
    </RoundFrame>
  );
}
