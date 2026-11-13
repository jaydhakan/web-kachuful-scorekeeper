import { m } from 'framer-motion';
import type { CSSProperties } from 'react';
import { doneHands, standings, type KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktDesk as kd } from '@/games/kaali-teeri/strings/desk';
import { Delta, Ticker } from '@/components/desk/DeskParts';
import { Avatar } from '@/components/ui/Avatar';
import { SPRING } from '@/components/ui/motion';
import { rankTone } from '@/components/ui/rankTones';

/** Strip columns on a tablet held upright: one row up to six players, else two even rows. */
const stripCols = (n: number) => (n <= 6 ? n : Math.ceil(n / 2));

interface KtScorePanelProps {
  g: KtGame;
  /** While the points are being entered: what confirming would give each player, by id. */
  changes?: Record<string, number> | null;
}

/**
 * Live totals, with each player's change for the hand being scored. A column on desktop, a list beside the table on
 * a tablet on its side, a strip when upright.
 */
export function KtScorePanel({ g, changes }: KtScorePanelProps) {
  const { actions } = useKt();
  const done = doneHands(g);
  const rows = standings(g);
  const h = g.hands[g.hands.length - 1];
  const sub = changes ? kd.scores.projected(h.index + 1) : kd.scores.after(done.length);
  return (
    <section
      aria-label={sub}
      className="glass flex min-h-0 flex-col gap-3 px-2.5 py-2.5 [grid-area:scores] rail:gap-3.5 rail:px-3.5 rail:pb-[18px] rail:pt-5 tl:max-h-[22rem] dt:max-h-none"
    >
      <div className="hidden items-baseline justify-between gap-3 px-1.5 rail:flex">
        <h2 className="disp text-22 font-extrabold tracking-[-0.02em]">{kd.scores.title}</h2>
        <span className="text-13 text-[var(--tx2)]">{sub}</span>
      </div>
      <ol
        className="scroll-thin grid gap-1.5 rail:-mr-1.5 rail:flex rail:min-h-0 rail:flex-col rail:overflow-y-auto rail:pr-1.5 tp:grid-cols-[repeat(var(--sc),minmax(0,1fr))]"
        style={{ '--sc': stripCols(g.players.length) } as CSSProperties}
      >
        {rows.map((x) => {
          const d = changes?.[x.p.id];
          const lead = x.rank === 1 && done.length > 0;
          return (
            <m.li
              layout="position"
              key={x.p.id}
              transition={SPRING}
              className={`grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-2xl px-1 py-1 [grid-template-areas:'av_tot'_'av_name'] rail:min-h-12 rail:grid-cols-[2rem_auto_minmax(0,1fr)_auto] rail:gap-x-3 rail:pl-1.5 rail:pr-3 rail:[grid-template-areas:'rank_av_name_tot'] dt:min-h-14 ${lead ? 'rail:bg-[color-mix(in_srgb,var(--medal-gold)_10%,transparent)] rail:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--medal-gold)_45%,transparent)]' : ''}`}
            >
              <span
                className={`disp hidden text-center text-22 font-extrabold [grid-area:rank] rail:block ${done.length ? rankTone(x.rank) : 'text-[var(--tx2)]'}`}
              >
                {x.rank}
              </span>
              <Avatar
                p={x.p}
                className="mat-av grid h-[34px] w-[34px] place-items-center rounded-full text-19 [grid-area:av] dt:h-10 dt:w-10 dt:text-22"
              />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [grid-area:name]">
                <span className="min-w-0 text-13 text-[var(--tx2)] [overflow-wrap:anywhere] rail:text-16 rail:font-bold rail:leading-tight rail:text-[var(--tx)] dt:text-18">
                  {x.p.name}
                </span>
                {d != null && <Delta v={d} className="!h-6 !min-w-[44px] !px-1.5 !text-13" />}
              </div>
              <Ticker
                v={x.t}
                className="disp tick text-24 font-extrabold leading-none tracking-[-0.02em] [grid-area:tot] rail:min-w-12 rail:text-right dt:text-28"
              />
            </m.li>
          );
        })}
      </ol>
      {done.length > 0 && (
        <button
          type="button"
          onClick={() => actions.openSheet({ type: 'board' })}
          className="press mt-auto hidden min-h-12 rounded-xl px-1.5 text-left text-14 font-bold text-[var(--accent-tx)] dt:block"
        >
          {kd.scores.open}
        </button>
      )}
    </section>
  );
}
