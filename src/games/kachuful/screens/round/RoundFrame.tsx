import type { ReactNode } from 'react';
import type { Round } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { Ticker } from '@/components/ui/Ticker';
import { t } from '@/strings';

interface RoundFrameProps {
  r: Round;
  title?: string;
  bar: ReactNode;
  barNote?: ReactNode;
  children: ReactNode;
  navLeft?: ReactNode;
  aside?: ReactNode;
  asideFirst?: boolean;
  fit?: boolean;
  /** The hero layout (Bidding and Playing): mono header with who deals and leads, and the ticker. */
  hero?: boolean;
  /** A mono header with this second line, without the ticker (Results: "Bids in order"). */
  sub?: string;
}

export function RoundFrame({
  r,
  title,
  bar,
  barNote,
  children,
  navLeft,
  aside,
  asideFirst,
  fit,
  hero,
  sub,
}: RoundFrameProps) {
  const { state, actions } = useApp();
  const ps = state.game.players;
  const dealer = ps[r.dealerIndex]?.name ?? '',
    first = ps[r.firstPlayerIndex]?.name ?? '';
  const bids = Object.values(r.bids).reduce((a, v) => a + v, 0);
  return (
    <Scaffold
      title={title}
      aside={aside}
      asideFirst={asideFirst}
      fit={fit}
      navTitle={
        hero || sub ? (
          <>
            <span>{t.round.title(r.index + 1)}</span> {t.round.heroCards(r.cards)}{' '}
            <SuitGlyph trump={r.trump} />
          </>
        ) : (
          t.round.title(r.index + 1)
        )
      }
      navSub={hero ? t.round.heroSub(dealer, first) : sub}
      ticker={
        hero ? (
          <Ticker items={t.round.ticker(r.index + 1, r.cards, r.trump, dealer, first, bids)} />
        ) : undefined
      }
      bar={bar}
      barNote={barNote}
      left={
        navLeft || (
          <IconButton
            chrome
            label={t.round.menu}
            onClick={() => actions.openSheet({ type: 'menu' })}
          >
            {Icon.menu}
          </IconButton>
        )
      }
      right={
        <IconButton
          chrome
          label={t.round.scoreboard}
          onClick={() => actions.openSheet({ type: 'board' })}
        >
          {Icon.board}
        </IconButton>
      }
    >
      {children}
    </Scaffold>
  );
}
