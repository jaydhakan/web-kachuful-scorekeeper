import { motion } from 'framer-motion';
import { bidOrder, curRound, sumBids, type Game } from '@/domain';
import { useApp } from '@/state/store';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { stagger } from '@/components/ui/stagger';
import { GhostButton, Kbd } from './DeskParts';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

export function PlayPane({ g }: { g: Game }) {
  const { actions } = useApp();
  const r = curRound(g),
    sum = sumBids(r),
    diff = sum - r.cards;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <h2 className="disp text-32 font-extrabold leading-[1.05] tracking-[-0.03em] rail:text-34">
          {t.desk.play.title(sum, r.cards)}
        </h2>
        {diff !== 0 && (
          <p className="mt-1 text-16 font-bold text-[var(--warn)]">
            {diff > 0 ? t.desk.play.over(diff) : t.desk.play.under(-diff)}
          </p>
        )}
      </div>
      <ol
        aria-label={t.desk.play.order}
        className="scroll-thin -mr-1.5 flex min-h-0 flex-col gap-2 overflow-y-auto pr-1.5"
      >
        {bidOrder(g, r).map((k, i) => {
          const q = g.players[k];
          return (
            <motion.li
              key={q.id}
              {...stagger(i)}
              className="flex min-h-14 shrink-0 items-center gap-3.5 rounded-2xl bg-white/5 px-3 py-1.5"
            >
              <Avatar
                p={q}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/20 text-22"
              />
              <span className="min-w-0 flex-1 text-18 font-bold leading-tight [overflow-wrap:anywhere]">
                {q.name}
                {k === r.dealerIndex && (
                  <span className="ml-1.5 text-13 font-medium text-[var(--tx2)]">
                    {t.desk.play.dealer}
                  </span>
                )}
              </span>
              {k === r.firstPlayerIndex && (
                <span className="rounded-xl bg-[var(--accent)] px-2.5 py-0.5 text-13 font-extrabold text-ink-on-accent">
                  {t.desk.play.leads}
                </span>
              )}
              <span className="disp tick w-8 text-right text-28 font-extrabold">
                {r.bids[q.id]}
              </span>
            </motion.li>
          );
        })}
      </ol>
      <div className="mt-auto flex flex-col gap-3">
        <PrimaryButton className="w-full" onClick={() => actions.phase('results')}>
          {t.play.enterResults} <Kbd>⏎</Kbd>
        </PrimaryButton>
        <GhostButton className="w-full" onClick={() => actions.phase('bidding', -1)}>
          {Icon.edit}
          {t.play.editBids} <Kbd className="bg-white/[.12]">E</Kbd>
        </GhostButton>
      </div>
    </div>
  );
}
