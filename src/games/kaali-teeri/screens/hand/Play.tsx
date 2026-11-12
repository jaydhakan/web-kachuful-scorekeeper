import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { CardRef, KtGame, KtHand, Suit } from '@/games/kaali-teeri/domain';
import { curHand } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { Avatar } from '@/components/ui/Avatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { HALO, onFelt } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { PRESS, REDUCED, SPRING } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { TR } from '@/theme/trumps';
import { HandFrame } from './parts/HandFrame';
import { CardName, FlipCard, RoleBadge, cardText, roleOf } from './parts/bits';
import { FLIP_S, useFreshMarks, useRevealBadges, useRevealFlight } from './parts/reveal';

/** Plan §3 screen 6: the hand in play. Who played each called card can be marked as it lands, or at the result. */
export default function Play() {
  const { state, actions } = useKt();
  const g = state.game;
  const h = g && curHand(g);
  const badges = useRevealBadges(h);
  if (!g || !h || h.bidder == null || h.trump == null) return null;
  const bi = g.players.findIndex((p) => p.id === h.bidder);
  const bidder = g.players[bi];
  return (
    <HandFrame
      g={g}
      h={h}
      fit
      // Beside the table in two panes; under it otherwise, in the same column as the table (see below).
      aside={
        <div className="hidden pane:block">
          <CalledCards g={g} h={h} id="kt-called-p" />
        </div>
      }
      bar={
        <PrimaryButton className="flex-1" onClick={actions.toResult}>
          {kp.play.handOver}
        </PrimaryButton>
      }
    >
      {/* No min-h-0: the table keeps its smallest size and the cards below push the page to scroll, never overlap. */}
      <div className="-mx-5 mt-1 flex flex-1 flex-col pane:mx-0">
        <Table
          uid="kt-play"
          fit
          players={g.players}
          dir={g.direction}
          dealer={h.dealerIndex}
          first={bi}
          firstLabel={kp.play.leads}
          badges={badges}
          noSeatAnim
          center={<TrumpCentre suit={h.trump} />}
        />
      </div>
      <div className="pane:hidden">
        <CalledCards g={g} h={h} id="kt-called" />
      </div>
      <p className="sr-only">{kp.play.leadsLine(bidder.name)}</p>
    </HandFrame>
  );
}

/** The called cards, face down until someone plays them, each with its "Played by…" button; phone and desk. */
export function CalledCards({ g, h, id, className = 'mt-3 pane:mt-0' }: CalledCardsProps) {
  const { state, actions } = useKt();
  const said = useReveal(g, h);
  const fresh = useFreshMarks(h, state.undo.length);
  const { fly, node } = useRevealFlight();
  const shown = h.playedBy.filter((p) => p != null).length;
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2
          id={id}
          className="mono-label text-13 font-bold uppercase tracking-[0.14em] text-[var(--accent)]"
        >
          {kp.play.called}
        </h2>
        <span className="text-14 text-[var(--tx2)]">
          {shown === 0
            ? kp.play.secret
            : shown === h.called.length
              ? kp.play.allRevealed
              : kp.play.revealed(shown, h.called.length)}
        </span>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      <div className={h.called.length === 2 ? 'grid grid-cols-2 gap-2.5' : 'grid gap-2'}>
        {h.called.map((c, i) => (
          <m.div key={i} {...stagger(i)}>
            <CalledCard
              g={g}
              h={h}
              c={c}
              i={i}
              tile={h.called.length === 2}
              fresh={fresh.get(i)}
              fly={fly}
              onPick={() => actions.openSheet({ type: 'playedBy', i })}
            />
          </m.div>
        ))}
      </div>
      {node}
    </section>
  );
}

interface CalledCardsProps {
  g: KtGame;
  h: KtHand;
  /** The heading's id; the phone renders two copies (one per layout), so each needs its own. */
  id: string;
  className?: string;
}

/** What the live region says when a called card is marked: who joined, and how many are still hidden. */
function useReveal(g: KtGame | null, h: KtHand | null): string {
  const [said, setSaid] = useState('');
  const prev = useRef(h?.playedBy);
  const marks = h?.playedBy;
  useEffect(() => {
    const was = prev.current;
    prev.current = marks;
    if (!g || !h || !marks || !was || marks === was) return;
    const k = marks.findIndex((p, j) => p != null && p !== was[j]);
    const who = g.players.find((p) => p.id === marks[k]);
    const bidder = g.players.find((p) => p.id === h.bidder);
    if (!who || !bidder) return;
    const left = marks.filter((p) => p == null).length;
    setSaid(`${kp.play.joined(who.name, bidder.name)}. ${kp.play.stillHidden(left)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change of marks speaks
  }, [marks]);
  return said;
}

export function TrumpCentre({ suit }: { suit: Suit }) {
  return (
    <>
      <div
        aria-hidden
        className="relative text-52 leading-none @[17rem]:text-64 @[19rem]:text-72"
        style={{ color: onFelt(suit), textShadow: `0 0 20px ${HALO}` }}
      >
        <span aria-hidden className="suit-ring" />
        {TR[suit].sym}
      </div>
      <div className="whitespace-nowrap text-14 font-medium text-[var(--ctr-fg)] @[38rem]:text-16">
        {kp.play.trumpCentre(suit)}
      </div>
    </>
  );
}

interface CalledCardProps {
  g: KtGame;
  h: KtHand;
  c: CardRef;
  i: number;
  /** Two cards share the width as tiles; one, three or four stack as rows. */
  tile: boolean;
  /** Set when the card was marked just now, on this screen: its reveal plays. One value per marking. */
  fresh?: number;
  fly: (card: HTMLElement, seat: number) => void;
  onPick: () => void;
}

function CalledCard({ g, h, c, i, tile, fresh, fly, onPick }: CalledCardProps) {
  const rm = useReducedMotion();
  const card = useRef<HTMLSpanElement>(null);
  const seat = g.players.findIndex((p) => p.id === h.playedBy[i]);
  const by = g.players[seat];
  // Partner revealed: once the card has turned, the team's colour runs to the seat of whoever was marked first.
  useEffect(() => {
    if (fresh === undefined || rm || seat < 0) return;
    const id = setTimeout(() => card.current && fly(card.current, seat), FLIP_S * 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per marking, not when the name is changed
  }, [fresh]);
  const role = by && roleOf(h, by.id);
  const label = by ? kp.play.change(cardText(c), by.name) : kp.play.hidden(cardText(c));
  const button = (
    <m.button
      type="button"
      whileTap={PRESS}
      onClick={onPick}
      aria-label={label}
      className={`mat-fill-s flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-3 text-16 font-bold ${tile ? 'w-full' : 'shrink-0'}`}
    >
      {by ? (
        <>
          <Avatar
            p={by}
            className="mat-av grid h-7 w-7 shrink-0 place-items-center rounded-full text-15"
          />
          <span className="min-w-0 break-words">{by.name}</span>
        </>
      ) : (
        kp.play.playedBy
      )}
    </m.button>
  );
  return (
    <div
      className={`glass relative flex gap-3 p-3 ${tile ? 'flex-col items-center text-center' : 'items-center'}`}
    >
      {/* The revealed card's frame in the bidding team's colour; a separate layer, as glass owns the box shadow. */}
      <m.span
        aria-hidden
        initial={false}
        animate={{ opacity: by ? 1 : 0 }}
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: 'inset 0 0 0 2px var(--kt-bid)' }}
      />
      <FlipCard c={c} up={!!by} size={tile ? 'md' : 'sm'} at={card} />
      <div
        className={`flex min-w-0 flex-1 gap-2 ${tile ? 'w-full flex-col items-center' : 'flex-wrap items-center justify-between'}`}
      >
        <div className={`flex flex-col gap-1 ${tile ? 'items-center' : ''}`}>
          <span className="text-20 font-extrabold leading-none">
            <CardName c={c} />
          </span>
          {role && (
            // Settles in after the flip when marked just now; already there otherwise.
            <m.span
              className="inline-flex"
              initial={
                fresh === undefined ? false : rm ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={rm ? { duration: REDUCED } : { ...SPRING, delay: FLIP_S }}
            >
              <RoleBadge kind={role} />
            </m.span>
          )}
        </div>
        {button}
      </div>
    </div>
  );
}
