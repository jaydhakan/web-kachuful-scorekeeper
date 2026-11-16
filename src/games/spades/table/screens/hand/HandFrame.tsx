import type { ReactNode } from 'react';
import type { SpGame, SpHand } from '@/games/spades/domain';
import { spGo } from '@/games/spades/nav';
import { spTable as s } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Scaffold } from '@/components/ui/Scaffold';
import { TeamBar } from '../parts';

/** "Riya deals · first to 200". */
export const handSub = (g: SpGame, h: SpHand) =>
  s.bids.sub(
    g.players[h.dealer].name,
    g.rules.target === null ? s.bids.endless : s.bids.toWin(g.rules.target),
  );

/** Every hand screen: Back to Spades, the hand and dealer, the menu, both teams' scores, the body and its bar. */
export function HandFrame({
  g,
  h,
  children,
  bar,
  barNote,
}: {
  g: SpGame;
  h: SpHand;
  children: ReactNode;
  bar?: ReactNode;
  barNote?: ReactNode;
}) {
  const { actions } = useSp();
  return (
    <Scaffold
      left={
        <IconButton chrome label={s.header.back} onClick={() => spGo('')}>
          {Icon.back}
        </IconButton>
      }
      right={
        <IconButton
          chrome
          label={s.header.menu}
          onClick={() => actions.openSheet({ type: 'menu' })}
        >
          {Icon.menu}
        </IconButton>
      }
      navTitle={s.bids.title(h.index + 1)}
      navSub={handSub(g, h)}
      ticker={<TeamBar g={g} onOpen={() => actions.openSheet({ type: 'board' })} />}
      bar={bar}
      barNote={barNote}
    >
      {children}
    </Scaffold>
  );
}
