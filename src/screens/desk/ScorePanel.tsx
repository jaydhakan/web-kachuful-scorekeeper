import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { curRound, doneRounds, pts, standings, type Game } from '@/domain';
import { sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { SPRING } from '@/components/ui/motion';
import { Delta, Ticker, rankTone } from './DeskParts';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

/** Strip columns on a tablet held upright: one row up to six players, else two even rows. */
const stripCols = (n: number) => (n <= 6 ? n : Math.ceil(n / 2));

/**
 * Live totals, or (while results are entered) the totals the round would leave, with each player's change and
 * movement. A column on desktop, a dense list beside the table on a tablet on its side, a strip when upright.
 */
export function ScorePanel({ g, projected }: { g: Game; projected: boolean }) {
  const { actions } = useApp();
  const done = doneRounds(g),
    r = curRound(g);
  const live = standings(g);
  const rows = projected ? standings(g, [...done, r]) : live;
  const before = Object.fromEntries(live.map((x) => [x.p.id, x.rank]));
  const lastDone = done.length ? done[done.length - 1].index + 1 : 0;
  const sub = projected ? t.desk.scores.projected(r.index + 1) : t.desk.scores.after(lastDone);
  return (
    <section
      aria-label={sub}
      className="glass flex min-h-0 flex-col gap-3 px-2.5 py-2.5 [grid-area:scores] rail:gap-3.5 rail:px-3.5 rail:pb-[18px] rail:pt-5 tl:max-h-[22rem]"
    >
      <div className="hidden items-baseline justify-between gap-3 px-1.5 rail:flex">
        <h2 className="disp text-22 font-extrabold tracking-[-0.02em]">{t.desk.scores.title}</h2>
        <span className="text-13 text-[var(--tx2)]">{sub}</span>
      </div>
      <ol
        className="scroll-thin grid gap-1.5 rail:-mr-1.5 rail:flex rail:min-h-0 rail:flex-col rail:overflow-y-auto rail:pr-1.5 tp:grid-cols-[repeat(var(--sc),minmax(0,1fr))]"
        style={{ '--sc': stripCols(g.players.length) } as CSSProperties}
      >
        {rows.map((x) => {
          const id = x.p.id,
            d = projected ? pts(r, id) : null,
            move = before[id] - x.rank,
            lead = x.rank === 1 && done.length + (projected ? 1 : 0) > 0;
          return (
            <motion.li
              layout="position"
              key={id}
              transition={SPRING}
              className={`grid shrink-0 items-center gap-x-2 rounded-2xl px-1 py-1 [grid-template-areas:'av_tot'_'av_name'] grid-cols-[auto_minmax(0,1fr)] rail:min-h-12 rail:gap-x-3 dt:min-h-14 rail:pl-1.5 rail:pr-3 rail:[grid-template-areas:'rank_av_name_tot'] rail:grid-cols-[2rem_auto_minmax(0,1fr)_auto] dt:min-h-[72px] dt:gap-x-2 dt:pr-2 dt:grid-cols-[1.75rem_auto_minmax(0,1fr)_auto] ${lead ? 'rail:bg-[rgba(226,182,83,.10)] rail:shadow-[inset_0_0_0_1px_rgba(226,182,83,.45)]' : ''}`}
            >
              <span
                className={`disp hidden text-center text-22 font-extrabold [grid-area:rank] rail:block ${done.length ? rankTone(x.rank) : 'text-[var(--tx2)]'}`}
              >
                {x.rank}
              </span>
              <Avatar
                p={x.p}
                className="grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-white/20 text-19 shadow-[0_8px_22px_rgba(0,0,0,.45)] [grid-area:av] tl:h-9 tl:w-9 tl:text-20 dt:h-10 dt:w-10 dt:text-22"
              />
              <div className="min-w-0 [grid-area:name] rail:flex rail:flex-wrap rail:items-center rail:gap-x-2 rail:gap-y-1">
                <div className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere] rail:min-w-0 rail:text-16 rail:font-bold rail:leading-tight rail:tracking-[-0.01em] rail:text-[var(--tx)] dt:basis-full dt:text-18">
                  {x.p.name}
                  {d != null && (
                    <span
                      className={`ml-1 font-bold rail:hidden ${d > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
                    >
                      {sgnN(d)}
                    </span>
                  )}
                </div>
                {/* Beside the name on a tablet, under it in the narrow desktop column, so the name keeps its width. */}
                {d != null && (
                  <span className="hidden rail:inline-flex">
                    <Delta v={d} className="!h-6 !min-w-[44px] !px-1.5 !text-13" />
                  </span>
                )}
                {projected && move !== 0 && (
                  <span
                    className={`hidden text-13 font-bold dt:inline ${move > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}`}
                  >
                    {move > 0 ? t.desk.scores.up(move) : t.desk.scores.down(-move)}
                  </span>
                )}
              </div>
              <Ticker
                v={x.t}
                className={`disp text-24 font-extrabold leading-none tracking-[-0.02em] [grid-area:tot] tick rail:min-w-12 rail:text-right dt:min-w-10 dt:text-28 ${x.t < 0 ? 'text-[var(--neg-tx)]' : ''}`}
              />
            </motion.li>
          );
        })}
      </ol>
      {done.length > 0 && (
        <button
          type="button"
          onClick={() => actions.openSheet({ type: 'board' })}
          className="mt-auto hidden min-h-12 rounded-xl px-1.5 text-left text-14 font-bold text-[var(--accent)] dt:block"
        >
          {t.desk.scores.open}
        </button>
      )}
    </section>
  );
}
