import { motion } from 'framer-motion';
import { bidOrder, curRound, pts, resultsState, type Outcome } from '@/domain';
import { sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { Glass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
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
      navLeft={
        <IconButton label={t.common.back} onClick={() => actions.phase('playing', -1)}>
          {Icon.back}
        </IconButton>
      }
      bar={
        <PrimaryButton className="w-full" disabled={!st.ok} onClick={actions.confirmRound}>
          {t.results.confirm}
        </PrimaryButton>
      }
    >
      <div className="mb-3 flex min-h-12 items-center justify-between px-1">
        <span className="text-16 font-medium">{t.results.exactSwitch}</span>
        <motion.button
          type="button"
          role="switch"
          aria-checked={st.exact}
          aria-label={t.results.exactSwitch}
          onClick={actions.toggleExact}
          whileTap={{ scale: 0.94 }}
          className={`relative h-[30px] w-[52px] rounded-full transition-colors duration-300 ease-apple ${st.exact ? 'bg-[var(--accent)]' : 'bg-white/[.14]'}`}
        >
          <motion.span
            animate={{ x: st.exact ? 22 : 0 }}
            transition={SPRING_POP}
            className="absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-text-primary shadow-[0_2px_6px_rgba(0,0,0,.4)]"
          />
        </motion.button>
      </div>
      {od.map((i, k) => {
        const p = g.players[i],
          b = r.bids[p.id],
          res = r.results[p.id],
          pv = pts(r, p.id);
        return (
          <motion.div key={p.id} {...stagger(k)} className="mb-2">
            <Glass spot={false} className="flex min-h-16 items-center gap-2.5 px-2.5 py-2">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white/20 text-24"
                style={{ background: p.color }}
              >
                {p.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-18 font-bold tracking-[-0.015em]">{p.name}</div>
                <div className="whitespace-nowrap text-13 font-medium text-[var(--tx2)]">
                  {t.results.bid(b)}
                  {pv != null && (
                    <>
                      {' '}
                      ·{' '}
                      <b className={pv > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}>
                        {sgnN(pv)}
                      </b>
                    </>
                  )}
                </div>
              </div>
              {tricks ? (
                <div className="flex items-center">
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
                  size="sm"
                  value={res}
                  onChange={(v) => actions.setResult(p.id, v)}
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
      <div
        className="min-h-6 px-1 pt-1 text-14 font-medium leading-[1.35] text-[var(--warn)]"
        aria-live="polite"
      >
        {st.msg}
      </div>
      {tricks && (
        <div className="px-1 text-13 text-[var(--tx2)]">
          {t.results.totalTricks(
            Object.values(tricks).reduce((a, b) => a + b, 0),
            r.cards,
          )}
        </div>
      )}
    </RoundFrame>
  );
}
