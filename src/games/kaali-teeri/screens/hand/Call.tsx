import { m } from 'framer-motion';
import { useContext, useState } from 'react';
import {
  SUITS,
  partnersFor,
  validCalled,
  type KtGame,
  type KtHand,
} from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { curHand } from '@/games/kaali-teeri/state/select';
import { cardText, ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { TR } from '@/theme/trumps';
import { Avatar } from '@/components/ui/Avatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS, SPRING_POP } from '@/components/ui/motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
import { HandFrame, InPane } from './parts/HandFrame';
import { CardGrid, EMPTY_DRAFT, draftCard, suitColor, type Draft } from './call/CardGrid';
import { Slots } from './call/Slots';

const s = ktBidding;

/** Step one: the bid that was won, then the four suits as big targets. */
function TrumpStep({ g, h, onNext }: { g: KtGame; h: KtHand; onNext: () => void }) {
  const { actions } = useKt();
  const p = g.players.find((x) => x.id === h.bidder)!;
  const n = partnersFor(g.players.length);
  return (
    <HandFrame
      g={g}
      h={h}
      step={s.frame.trump}
      // On a phone on its side the suits sit beside the bid, so all four fit (KT-F02's two-pane layout).
      aside={
        <>
          <h2 className="mono-label mb-2.5 mt-5 px-1 pane:mt-0 text-12 text-[var(--accent-tx)]">
            {s.trump.pick(p.name)}
          </h2>
          <div role="group" aria-label={s.trump.group} className="grid grid-cols-2 gap-3">
            {SUITS.map((suit) => {
              const on = h.trump === suit;
              return (
                <m.button
                  key={suit}
                  type="button"
                  aria-pressed={on}
                  whileTap={PRESS}
                  onClick={() => actions.trump(suit)}
                  className={`mat-key relative flex min-h-[7.5rem] land:min-h-[4.5rem] land:py-2 flex-col items-center justify-center gap-2 rounded-[22px] py-4 ${on ? 'text-ink-on-accent' : ''}`}
                >
                  {on && (
                    <m.span
                      layoutId="kt-trump"
                      transition={SPRING_POP}
                      aria-hidden
                      className="mat-key-on absolute inset-0 rounded-[22px]"
                    />
                  )}
                  <span
                    aria-hidden
                    className="relative text-52 leading-none land:text-36"
                    style={{ color: suitColor(suit, on) }}
                  >
                    {TR[suit].sym}
                  </span>
                  <span className="relative text-18 font-bold">{TR[suit].name}</span>
                </m.button>
              );
            })}
          </div>
        </>
      }
      bar={
        <PrimaryButton className="w-full" disabled={!h.trump} onClick={onNext}>
          {h.trump ? s.trump.next(n) : s.trump.pickFirst}
        </PrimaryButton>
      }
    >
      <div className="glass flex items-center gap-3.5 rounded-[22px] p-4">
        <Avatar
          p={p}
          className="mat-av grid h-12 w-12 shrink-0 place-items-center rounded-full text-28"
        />
        <p className="min-w-0 flex-1 leading-tight">
          <span className="mono-label block text-12 text-[var(--accent-tx)]">{s.trump.bidWon}</span>
          <span className="disp block text-24 font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">
            {p.name}
          </span>
        </p>
        <span className="disp tick text-40 font-extrabold leading-none text-[var(--accent-tx)]">
          {h.bid}
        </span>
      </div>
    </HandFrame>
  );
}

/** Step two: the partner cards, picked rank then suit (then the copy with two decks), checked by the domain. */
function CardsStep({ g, h, onTrump }: { g: KtGame; h: KtHand; onTrump: () => void }) {
  const { actions } = useKt();
  const n = g.players.length;
  const count = partnersFor(n);
  const p = g.players.find((x) => x.id === h.bidder)!;
  const trump = h.trump!;
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [why, setWhy] = useState<string | null>(null);
  const inPane = useContext(InPane);
  const land = useMediaQuery(MQ.land);
  const dense = inPane || land;
  const full = h.called.length >= count;
  const ok = validCalled(h.called, n);
  const onDraft = (d: Draft) => {
    const card = draftCard(d, h.called, n);
    if (card) {
      actions.addCard(card);
      setDraft(EMPTY_DRAFT);
    } else setDraft(d);
  };
  return (
    <HandFrame
      g={g}
      h={h}
      barNote={why ?? ''}
      // The keys are the task: beside the slots on a phone on its side, under them otherwise (KT-F02).
      aside={
        !full && (
          <div className="mt-5 pane:mt-0">
            <CardGrid
              uid="kt-call"
              n={n}
              called={h.called}
              draft={draft}
              onDraft={onDraft}
              onWhy={setWhy}
              dense={dense}
            />
          </div>
        )
      }
      bar={
        <PrimaryButton className="w-full" disabled={!ok} onClick={actions.confirmCall}>
          {ok
            ? s.call.confirm(h.called.map((c) => cardText(c.rank, c.suit)))
            : s.call.left(count - h.called.length)}
        </PrimaryButton>
      }
    >
      {/* Dense: the heading and who leads stack beside the trump chip, saving a row for the keys. */}
      <div className={dense ? 'flex items-center justify-between gap-2' : ''}>
        <div className="min-w-0">
          <h2 className="mono-label px-1 text-12 text-[var(--accent-tx)]">{s.call.head(count)}</h2>
          {dense && (
            <p className="min-w-0 px-1 text-15 text-[var(--tx2)] [overflow-wrap:anywhere]">
              {s.call.leads(p.name)}
            </p>
          )}
        </div>
        <div className={dense ? 'shrink-0' : 'mt-1.5 flex items-center justify-between gap-2'}>
          {!dense && (
            <p className="min-w-0 px-1 text-15 text-[var(--tx2)] [overflow-wrap:anywhere]">
              {s.call.leads(p.name)}
            </p>
          )}
          <m.button
            type="button"
            whileTap={PRESS}
            onClick={onTrump}
            aria-label={s.call.changeTrump(trump)}
            className="glass flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-15 font-bold"
          >
            <span aria-hidden style={{ color: suitColor(trump, false) }}>
              {TR[trump].sym}
            </span>
            {s.call.trumpChip(trump)}
          </m.button>
        </div>
      </div>
      <Slots
        count={count}
        called={h.called}
        draft={draft}
        onRemove={(i) => {
          setWhy(null);
          actions.removeCard(i);
        }}
        onOpen={(i) => actions.openSheet({ type: 'card', i })}
        compact={dense}
      />
    </HandFrame>
  );
}

/** Trump and the call: the bidder names trump, then calls one card per partner. */
export default function Call() {
  const { state } = useKt();
  const g = state.game;
  const h = g && curHand(g);
  const [stage, setStage] = useState<'trump' | 'cards'>(h?.trump ? 'cards' : 'trump');
  if (!g || !h || h.phase !== 'calling' || !h.bidder || h.bid == null) return null;
  return stage === 'trump' || !h.trump ? (
    <TrumpStep g={g} h={h} onNext={() => setStage('cards')} />
  ) : (
    <CardsStep g={g} h={h} onTrump={() => setStage('trump')} />
  );
}
