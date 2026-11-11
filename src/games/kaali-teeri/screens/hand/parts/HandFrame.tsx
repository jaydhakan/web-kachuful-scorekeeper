import { createContext, useContext, type ReactNode } from 'react';
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

/**
 * True inside the large-screen action pane: the desk shell draws the header, table and scores, so a hand screen there
 * is only its content over its bar.
 */
export const InPane = createContext(false);

/** A hand screen as the desk's action pane shows it: the content scrolls, the bar stays at the bottom. */
function PaneFrame({ title, aside, asideFirst, bar, barNote, children }: HandFrameProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="scroll-thin -mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1">
        {title && (
          <h2 className="disp mb-3 text-22 font-extrabold leading-tight tracking-[-0.02em]">
            {title}
          </h2>
        )}
        {asideFirst && aside}
        {children}
        {!asideFirst && aside}
      </div>
      <div data-kt-bar className="shrink-0">
        {barNote !== undefined && (
          <div
            role="status"
            aria-live="polite"
            className="text-14 font-medium leading-[1.35] text-[var(--warn)] [&:not(:empty)]:mb-2.5"
          >
            {barNote}
          </div>
        )}
        <div className="flex min-h-[3.75rem] items-center gap-3">{bar}</div>
      </div>
    </div>
  );
}

/** The hand's screens: a mono header ("Hand 3 · ♥ trump" over "Riya bid 185"), menu and scoreboard buttons. */
export function HandFrame(props: HandFrameProps) {
  const pane = useContext(InPane);
  return pane ? <PaneFrame {...props} /> : <PhoneFrame {...props} />;
}

function PhoneFrame({ g, h, points, step, sub, navLeft, ...rest }: HandFrameProps) {
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
