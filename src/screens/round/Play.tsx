import { m } from 'framer-motion';
import { curRound, sumBids } from '@/domain';
import { useApp } from '@/state/store';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { stagger } from '@/components/ui/stagger';
import { HeroWho } from './Bidding';
import { RoundFrame } from './RoundFrame';
import { t } from '@/strings';
import { PRESS_SM } from '@/components/ui/motion';

export function Play() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    sum = sumBids(r);
  return (
    <RoundFrame
      hero
      r={r}
      fit
      aside={
        <div className="pane:flex pane:h-full pane:flex-col pane:justify-center">
          {/* The hero row: who leads, set big, with the bids against the cards (DESIGN-SYSTEM.md, Hero layout). */}
          <m.div {...stagger(0, 0.1)} className="mt-3 @h-short:mt-1">
            <HeroWho
              p={g.players[r.firstPlayerIndex]}
              kicker={t.play.leadsKicker}
              tally={sum}
              of={r.cards}
            />
          </m.div>
          <m.p
            {...stagger(1, 0.1)}
            className="mt-3 text-center text-17 leading-[1.4] tracking-[-0.015em] @h-short:mt-1.5 @h-short:text-15"
          >
            {t.play.summary(sum, r.cards)}
          </m.p>
        </div>
      }
      bar={
        <>
          <m.button
            type="button"
            whileTap={PRESS_SM}
            onClick={() => actions.phase('bidding', -1)}
            aria-label={t.play.editBids}
            className="glass grid h-[60px] w-[60px] shrink-0 place-items-center !rounded-[var(--r-lg)]"
          >
            {Icon.edit}
          </m.button>
          <PrimaryButton className="flex-1" onClick={() => actions.phase('results')}>
            {t.play.enterResults}
          </PrimaryButton>
        </>
      }
    >
      <div className="-mx-5 mt-2 flex min-h-0 flex-1 flex-col pane:mx-0">
        <Table
          uid="play"
          fit
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
    </RoundFrame>
  );
}
