import { AnimatePresence, m, useIsPresent, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  cardsEach,
  deckTotal,
  firstSpeaker,
  type KtGame,
  type KtHand,
  type Suit,
} from '@/games/kaali-teeri/domain';
import { curHand, preview, shownPoints } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { ktDesk as kd } from '@/games/kaali-teeri/strings/desk';
import { kp } from '@/games/kaali-teeri/strings/play';
import { DeskPage, GhostButton, Kbd, PageHead } from '@/components/desk/DeskParts';
import { StepTracker } from '@/components/desk/StepTracker';
import { stepBid } from '@/components/ui/BidKeypad';
import { showNames } from '@/lib/tableGeometry';
import { Icon } from '@/components/ui/Icons';
import { Table } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import Call from '../hand/Call';
import Result from '../hand/Result';
import { TrumpCentre } from '../hand/Play';
import { auctionView } from '../hand/bidding/auctionView';
import { PassChip, PassVeil, TableMiddle } from '../hand/bidding/BidTable';
import { ROLE_ICON, TEAM_FILL, seatBadges } from '../hand/parts/bits';
import { InPane } from '../hand/parts/HandFrame';
import { TakeOut } from '../setup/TakeOut';
import { AuctionPane, QuickPane } from './BidPanes';
import { KtScorePanel } from './KtScorePanel';
import { PlayPane } from './PlayPane';
import { onGrid, useKtDeskKeys, useTypedNumber } from './useKtDeskKeys';

// One DOM tree for every layout, as in Kachuful's workspace: upright, table, score strip, action pane; on its side,
// table and scores left, action pane right; desktop, table, action pane, scores.
const GRID =
  "grid flex-1 gap-3 [grid-template-areas:'table'_'scores'_'action'] min-h-0 grid-rows-[minmax(15rem,1fr)_auto_minmax(0,auto)] rail:gap-4 tl:gap-5 tl:[grid-template-areas:'table_action'_'scores_action'] tl:grid-cols-[minmax(0,1fr)_clamp(22rem,37vw,27.5rem)] tl:grid-rows-[minmax(0,1fr)_auto] dt:gap-6 dt:[grid-template-areas:'table_action_scores'] dt:grid-cols-[minmax(0,1fr)_clamp(23rem,27vw,30rem)_clamp(16.5rem,23vw,21rem)] dt:grid-rows-[minmax(0,1fr)]";

type Phase = 'bidding' | 'calling' | 'playing' | 'result';
const STEP: Record<Phase, number> = { bidding: 0, calling: 1, playing: 2, result: 3 };
const SUIT_KEYS: Record<string, Suit> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };

/** A pane on its way out can no longer be clicked or focused. */
function Leaving({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <div className="flex min-h-0 flex-1 flex-col" {...(!present && { inert: '' as const })}>
      {children}
    </div>
  );
}

/** The title over the workspace: what the table is deciding right now. */
function titleFor(g: KtGame, h: KtHand, seat: number | null, amount: number): string {
  const name = (id: string | null) => g.players.find((p) => p.id === id)?.name ?? '';
  if (h.phase === 'bidding') {
    if (h.mode === 'quick')
      return seat == null ? kd.title.quickPick : kd.title.quickPicked(g.players[seat].name, amount);
    const v = auctionView(g, h);
    return v.st.holder && v.st.high != null
      ? kd.title.high(v.st.high, name(v.st.holder))
      : kd.title.noBid(name(v.order[0]));
  }
  if (h.bid == null) return '';
  return h.trump && h.phase !== 'calling'
    ? kd.title.trump(h.trump, name(h.bidder), h.bid)
    : kd.title.won(name(h.bidder), h.bid);
}

/**
 * A hand as one workspace: the table and the scores stay put while the action pane changes with the phase (bid, call,
 * play, points). Calling and points are the phone's own screens drawn inside the pane.
 */
export function KtWorkspace({ g }: { g: KtGame }) {
  const { state, actions } = useKt();
  const h = curHand(g);
  const phase = h.phase as Phase;
  const step = STEP[phase];
  const n = g.players.length;
  const total = deckTotal(g.rules.decks);
  const { minBid, step: bidStep } = g.rules;
  const rm = useReducedMotion();
  const typed = useTypedNumber();
  const quickMode = phase === 'bidding' && h.mode === 'quick';
  const av = phase === 'bidding' && h.mode === 'auction' ? auctionView(g, h) : null;

  // Quick mode's picked seat and amount belong to one hand; a new hand starts with nothing picked at the minimum.
  const [quick, setQuick] = useState({ hand: -1, seat: null as number | null, amount: minBid });
  const q = quick.hand === h.index ? quick : { hand: h.index, seat: null, amount: minBid };
  const setQ = (patch: Partial<typeof q>) => setQuick({ ...q, ...patch });
  // The auction's amount goes back to the lowest legal bid after every call (and after an undo).
  const [bid, setBid] = useState({ at: '', v: 0 });
  const bidAt = `${h.index}:${h.calls.length}`;
  const amount = bid.at === bidAt ? bid.v : (av?.min ?? minBid);
  const setAmount = (v: number) => setBid({ at: bidAt, v });

  // The points step: the number shown is the hand's own, else where the bid is exactly made (as on the phone).
  const by = h.countedBy ?? state.prefs.countedBy;
  const entered =
    phase === 'result' && h.bid != null
      ? (shownPoints(g, h) ?? (by === 'bidders' ? h.bid : total - h.bid))
      : 0;
  const ready = h.playedBy.every((p) => p != null);
  const pv = phase === 'result' && ready ? preview(g, entered, by) : null;

  const pane = useRef<HTMLElement>(null);
  const prevStep = useRef(step);
  const stepDir = step >= prevStep.current ? 1 : -1;
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    // The old pane is animating out; focus left on it would act on a step that is gone, so it moves to the new one.
    const el = pane.current,
      at = document.activeElement;
    if (el && (!at || at === document.body || el.contains(at))) el.focus({ preventScroll: true });
  }, [step]);

  /** Calling and points are the phone's screens; their bar's last enabled button is the step's confirm. */
  const pressPrimary = () => {
    const bs = pane.current?.querySelectorAll<HTMLButtonElement>(
      '[data-kt-bar] button:not(:disabled)',
    );
    bs?.[bs.length - 1]?.click();
  };
  const confirmQuick = () => {
    if (q.seat != null) actions.quickBid(g.players[q.seat].id, q.amount);
  };
  const confirmAuction = () => {
    if (!av?.speaker) return;
    if (av.st.forcedTo) actions.call('forced');
    else if (av.min != null) actions.call(amount);
  };
  const nudge = (dir: 1 | -1) => {
    if (quickMode)
      setQ({
        amount: stepBid(q.amount, dir * bidStep, { min: minBid, max: total, step: bidStep }),
      });
    else if (av?.min != null)
      setAmount(stepBid(amount, dir * bidStep, { min: av.min, max: total, step: bidStep }));
    else if (phase === 'result') actions.points(stepBid(entered, dir * 5, { max: total, step: 5 }));
  };
  const moveSeat = (dir: 1 | -1) => {
    if (!quickMode) return;
    setQ({ seat: q.seat == null ? (dir > 0 ? 0 : n - 1) : (q.seat + dir + n) % n });
  };

  useKtDeskKeys({
    digit: (e) => {
      if (phase === 'playing') {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < h.called.length) actions.openSheet({ type: 'playedBy', i });
        return;
      }
      const v = typed(e.key);
      if (quickMode) {
        if (onGrid(v, minBid, total, bidStep)) setQ({ amount: v });
      } else if (av?.min != null) {
        if (onGrid(v, av.min, total, bidStep)) setAmount(v);
      } else if (phase === 'result' && onGrid(v, 0, total, 5)) actions.points(v);
    },
    up: () => nudge(1),
    down: () => nudge(-1),
    right: () => moveSeat(1),
    left: () => moveSeat(-1),
    enter: () => {
      if (quickMode) confirmQuick();
      else if (av) confirmAuction();
      else if (phase === 'playing') actions.toResult();
      else pressPrimary();
    },
    p: () => av?.canPass && actions.call('pass'),
    m: () => phase === 'bidding' && actions.setMode(h.mode === 'quick' ? 'auction' : 'quick'),
    e: () => phase === 'result' && actions.toPlay(),
    ...(phase === 'calling' &&
      Object.fromEntries(
        Object.entries(SUIT_KEYS).map(([k, suit]) => [k, () => actions.trump(suit)]),
      )),
  });

  const bi = g.players.findIndex((p) => p.id === h.bidder);
  const bidder = bi >= 0 ? g.players[bi] : null;
  const dealer = g.players[h.dealerIndex];
  const center = quickMode ? (
    <TableMiddle
      flat={false}
      kicker={ktBidding.quick.winningBid}
      amount={q.amount}
      who={q.seat != null ? g.players[q.seat].name : ktBidding.quick.pickFirst}
    />
  ) : av ? (
    <TableMiddle
      flat={false}
      kicker={av.st.high != null ? ktBidding.auction.highBid : ktBidding.auction.minBid}
      amount={av.st.high ?? minBid}
      who={av.st.holder ? av.nameOf(av.st.holder) : ktBidding.auction.noBid}
    />
  ) : h.trump && phase !== 'calling' ? (
    <TrumpCentre suit={h.trump} />
  ) : (
    <TableMiddle
      flat={false}
      kicker={ktBidding.trump.bidWon}
      amount={h.bid ?? ''}
      who={bidder?.name ?? ''}
    />
  );
  const badges = quickMode
    ? q.seat != null
      ? seatBadges({ bidder: g.players[q.seat].id, playedBy: [] })
      : undefined
    : av
      ? av.st.holder
        ? {
            [av.st.holder]: {
              icon: ROLE_ICON.bidder,
              label: ktBidding.table.high,
              style: TEAM_FILL,
            },
          }
        : undefined
      : seatBadges(h);

  return (
    <DeskPage>
      <PageHead
        barTitled
        eyebrow={kd.eyebrow(h.index + 1, phase)}
        title={titleFor(g, h, q.seat, q.amount)}
        actions={
          <>
            <GhostButton disabled={!state.undo.length} onClick={actions.undo}>
              {Icon.undo}
              {kd.nav.undo} <Kbd className="bg-ov/[.12]">Z</Kbd>
            </GhostButton>
            <GhostButton onClick={() => actions.ask('finish')}>{kd.endGame}</GhostButton>
          </>
        }
      />
      <div className={GRID}>
        <section className="flex min-h-0 flex-col gap-4 [grid-area:table]">
          <div className="flex min-h-[15rem] flex-1 flex-col rail:min-h-0">
            <Table
              uid="kt-ws"
              size="wide"
              fit
              minFit={0.62}
              big
              noSeatAnim
              players={g.players}
              dir={g.direction}
              dealer={h.dealerIndex}
              first={phase === 'bidding' ? firstSpeaker(g, h.index) : bi >= 0 ? bi : undefined}
              firstLabel={phase === 'bidding' ? ktBidding.table.bidsFirst : kp.play.leads}
              cur={
                quickMode ? (q.seat ?? undefined) : av?.speaker ? av.idx(av.speaker.id) : undefined
              }
              bids={av?.bids}
              badges={badges}
              onSeat={
                quickMode
                  ? (k) => {
                      setQ({ seat: k });
                      actions.vib();
                    }
                  : undefined
              }
              center={center}
            >
              {av && (
                <AnimatePresence>
                  {av.passed
                    .filter((k) => k !== av.idx(av.speaker?.id ?? null))
                    .map((k) => (
                      <PassVeil key={'v' + k} size="wide" n={n} k={k} g={g} />
                    ))}
                  {showNames(n) &&
                    av.passed.map((k) => <PassChip key={k} size="wide" n={n} k={k} g={g} />)}
                </AnimatePresence>
              )}
            </Table>
          </div>
          <div className="glass hidden shrink-0 flex-col gap-2 px-5 py-4 dt:flex">
            <div className="disp text-22 font-bold leading-tight tracking-[-0.02em]">
              {ktBidding.frame.dealt(dealer.name, cardsEach(n))}
            </div>
            <TakeOut n={n} />
          </div>
        </section>
        <section
          ref={pane}
          tabIndex={-1}
          aria-label={kd.steps.label}
          className="glass glass-glow relative flex min-h-0 flex-col gap-3 overflow-hidden p-4 outline-none [grid-area:action] rail:gap-4 rail:p-5"
        >
          <StepTracker
            labels={kd.steps.names}
            label={kd.steps.label}
            step={step}
            can={(s) => (step === 3 && s === 2) || (step === 2 && s === 3)}
            go={(s) => (s === 2 ? actions.toPlay() : actions.toResult())}
          />
          <div className="grid min-h-0 flex-1">
            <AnimatePresence initial={false} mode="popLayout" custom={stepDir}>
              <m.div
                key={phase === 'bidding' ? `bid-${h.mode}` : phase}
                custom={stepDir}
                variants={{
                  in: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 56 }),
                  on: { opacity: 1, x: 0 },
                  out: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * -56 }),
                }}
                initial="in"
                animate="on"
                exit="out"
                transition={{ duration: 0.34, ease: EASE }}
                className="flex min-h-0 flex-col [grid-area:1/1]"
              >
                <Leaving>
                  {quickMode ? (
                    <QuickPane
                      g={g}
                      seat={q.seat}
                      amount={q.amount}
                      onAmount={(v) => setQ({ amount: v })}
                      onConfirm={confirmQuick}
                    />
                  ) : av ? (
                    <AuctionPane g={g} h={h} v={av} amount={amount} onAmount={setAmount} />
                  ) : phase === 'playing' ? (
                    <PlayPane g={g} h={h} />
                  ) : (
                    <InPane.Provider value>
                      {phase === 'calling' ? <Call /> : <Result />}
                    </InPane.Provider>
                  )}
                </Leaving>
              </m.div>
            </AnimatePresence>
          </div>
        </section>
        <KtScorePanel g={g} changes={pv?.scores} />
      </div>
    </DeskPage>
  );
}
