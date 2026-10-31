import { motion } from 'framer-motion';
import { curRound, sumBids } from '@/domain';
import { useApp } from '@/state/store';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { stagger } from '@/components/ui/stagger';
import { RoundFrame } from './RoundFrame';
import { t } from '@/strings';

export function Play() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    sum = sumBids(r);
  return (
    <RoundFrame
      r={r}
      bar={
        <>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => actions.phase('bidding', -1)}
            aria-label={t.play.editBids}
            className="glass grid h-[60px] w-[60px] shrink-0 place-items-center !rounded-[20px]"
          >
            {Icon.edit}
          </motion.button>
          <PrimaryButton className="flex-1" onClick={() => actions.phase('results')}>
            {t.play.enterResults}
          </PrimaryButton>
        </>
      }
    >
      <div className="-mx-5 mt-2 h-[300px]">
        <Table
          uid="play"
          players={g.players}
          dir={g.direction}
          dealer={r.dealerIndex}
          first={r.firstPlayerIndex}
          firstLabel={t.play.leadsFirst}
          bids={r.bids}
          big
          noSeatAnim
          center={<SuitCenter trump={r.trump} cards={r.cards} big />}
        />
      </div>
      <motion.p
        {...stagger(0, 0.1)}
        className="mt-6 text-center text-19 leading-[1.4] tracking-[-0.015em]"
      >
        {t.play.summary(sum, r.cards)}
      </motion.p>
      <p className="mt-2 text-center text-13 text-[var(--tx2)]">
        {t.play.leadsTrick(g.players[r.firstPlayerIndex].name)}
      </p>
    </RoundFrame>
  );
}
