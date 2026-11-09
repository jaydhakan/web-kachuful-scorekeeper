import type { ReactNode } from 'react';
import type { KtGame, KtHand } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { SuitGlyph } from '@/components/ui/SuitGlyph';

interface HandFrameProps {
  g: KtGame;
  h: KtHand;
  /** The header's second word: the trump (play) or "Points" (result). */
  points?: boolean;
  /** Before trump is named: the step's own word ("Bidding", "Trump"), in place of the trump. */
  step?: ReactNode;
  /** A second line in place of "Riya bid 185" (bidding: who deals and how many each). */
  sub?: ReactNode;
  title?: ReactNode;
  navLeft?: ReactNode;
  aside?: ReactNode;
  asideFirst?: boolean;
  fit?: boolean;
  bar: ReactNode;
  barNote?: ReactNode;
  children: ReactNode;
}

/** The hand's screens: a mono header ("Hand 3 · ♥ trump" over "Riya bid 185"), menu and scoreboard buttons. */
export function HandFrame({ g, h, points, step, sub, navLeft, ...rest }: HandFrameProps) {
  const { actions } = useKt();
  const bidder = g.players.find((p) => p.id === h.bidder);
  return (
    <Scaffold
      {...rest}
      navTitle={
        <>
          <span>{kp.hand.title(h.index + 1)}</span>
          <span aria-hidden>·</span>
          {points ? (
            <span>{kp.hand.points}</span>
          ) : step ? (
            <span>{step}</span>
          ) : (
            h.trump && (
              <span>
                <SuitGlyph trump={h.trump} /> {kp.hand.trump}
              </span>
            )
          )}
        </>
      }
      navSub={sub ?? (bidder && h.bid != null ? kp.hand.bidLine(bidder.name, h.bid) : undefined)}
      left={
        navLeft ?? (
          <IconButton
            chrome
            label={kp.hand.menu}
            onClick={() => actions.openSheet({ type: 'menu' })}
          >
            {Icon.menu}
          </IconButton>
        )
      }
      right={
        <IconButton
          chrome
          label={kp.hand.scoreboard}
          onClick={() => actions.openSheet({ type: 'board' })}
        >
          {Icon.board}
        </IconButton>
      }
    />
  );
}
