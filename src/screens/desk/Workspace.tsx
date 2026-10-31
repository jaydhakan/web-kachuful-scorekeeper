import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { roundAt, sumBids } from '@/domain';
import { useApp } from '@/state/store';
import { useDeskKeys } from './useDeskKeys';
import { Icon } from '@/components/ui/Icons';
import { Table } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { bidView } from '@/screens/round/roundView';
import { BidPane, type BidPrimary } from './BidPane';
import { ComingUp } from './ComingUp';
import { DeskPage, GhostButton, Kbd, PageHead, TableCenter } from './DeskParts';
import { PlayPane } from './PlayPane';
import { ResultsPane } from './ResultsPane';
import { ScorePanel } from './ScorePanel';
import { StepTracker, type Step } from './StepTracker';
import { t } from '@/strings';

// One DOM tree for every layout: grid areas move, nothing remounts. Upright: table, score strip, action pane.
// On its side: table and scores left, action pane right. Desktop: table, action pane, scores.
const GRID =
  "grid flex-1 gap-3 [grid-template-areas:'table'_'scores'_'action'] min-h-0 grid-rows-[minmax(15rem,1fr)_auto_minmax(0,auto)] rail:gap-4 tl:gap-5 tl:[grid-template-areas:'table_action'_'scores_action'] tl:grid-cols-[minmax(0,1fr)_clamp(22rem,37vw,27.5rem)] tl:grid-rows-[minmax(0,1fr)_auto] dt:gap-6 dt:[grid-template-areas:'table_action_scores'] dt:grid-cols-[minmax(0,1fr)_clamp(23rem,27vw,30rem)_clamp(16.5rem,23vw,21rem)] dt:grid-rows-[minmax(0,1fr)]";

/** A pane on its way out can no longer be clicked or focused. */
function Leaving({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <div className="flex min-h-0 flex-1 flex-col" {...(!present && { inert: '' as const })}>
      {children}
    </div>
  );
}

/** Two digits typed this close together make 10. */
const TEN_MS = 700;

/** Bidding, Play and Results as one workspace: the table and the scores stay put while the action pane changes. */
export function Workspace() {
  const { state, actions } = useApp();
  const g = state.game;
  const v = bidView(g);
  const { r, p, pI, isD, forb, allBid, hookWarn } = v;
  const phase = r.phase === 'bidding' ? 'bidding' : r.phase === 'playing' ? 'playing' : 'results';
  const step: Step = phase === 'bidding' ? 0 : phase === 'playing' ? 1 : 2;
  const rm = useReducedMotion();

  // A picked-but-not-locked bid belongs to one bidder in one round; a new bidder starts from their saved bid.
  const owner = `${r.index}:${pI}`;
  const [pick, setPick] = useState<{ owner: string; v: number | null }>({ owner: '', v: null });
  const picked = pick.owner === owner ? pick.v : (r.bids[p.id] ?? null);
  // A pick that became the dealer's locked number (an earlier bid was voided) is no pick at all.
  const pending = isD && picked === forb ? null : picked;
  const [shake, setShake] = useState<number | null>(null);
  const lastDigit = useRef({ k: -1, at: 0 });
  const prevStep = useRef(step);
  const stepDir = step >= prevStep.current ? 1 : -1;
  const pane = useRef<HTMLElement>(null);
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    // The old pane is animating out; focus left on it would act on a step that is gone, so it moves to the new one.
    const el = pane.current,
      at = document.activeElement;
    if (el && (!at || at === document.body || el.contains(at))) el.focus({ preventScroll: true });
  }, [step]);

  const saved = r.bids[p.id];
  const primary: BidPrimary =
    pending != null && pending !== saved ? 'lock' : allBid && !hookWarn ? 'start' : 'wait';

  const confirm = () => {
    if (primary === 'lock' && pending != null) actions.bid(pending);
    else if (primary === 'start') actions.phase('playing');
  };
  const hooked = (k: number) => {
    if (!isD || k !== forb) return false;
    // The reducer counts the attempt (the "hook victim" stat) and keeps the bid; the key shakes.
    actions.bid(k);
    setShake(k);
    setTimeout(() => setShake(null), 320);
    return true;
  };
  // A tap or click saves the bid and moves on, as on a phone. Typed digits only pick, so 1 then 0 can make 10.
  const tap = (k: number) => {
    if (!hooked(k)) actions.bid(k);
  };
  const choose = (k: number) => {
    if (k < 0 || k > r.cards || hooked(k)) return;
    // The picked key again (a second click, or Enter while it has focus) confirms: lock it in, or start playing.
    if (k === pending && primary !== 'wait') {
      confirm();
      return;
    }
    setPick({ owner, v: k });
  };
  const canStep = (s: Step) =>
    s < step || (s === 1 && step === 0 && allBid && !hookWarn) || (s === 2 && step === 1);
  const goStep = (s: Step) =>
    actions.phase(s === 0 ? 'bidding' : s === 1 ? 'playing' : 'results', s < step ? -1 : 1);

  useDeskKeys({
    digit: (e) => {
      if (phase !== 'bidding') return;
      const d = Number(e.key),
        now = performance.now(),
        ten = d === 0 && lastDigit.current.k === 1 && now - lastDigit.current.at < TEN_MS;
      const k = ten && r.cards >= 10 ? 10 : d;
      lastDigit.current = { k: d, at: now };
      choose(k);
      // Focus follows the pick, so Enter on the focused key locks it in.
      document.querySelector<HTMLElement>(`[data-bid-key="${k}"]`)?.focus({ preventScroll: true });
    },
    enter: () => {
      if (phase === 'bidding') confirm();
      else if (phase === 'playing') actions.phase('results');
      else actions.confirmRound();
    },
    e: () => phase === 'playing' && actions.phase('bidding', -1),
  });

  const prevCards = r.index > 0 ? roundAt(g, r.index - 1).cards : r.cards;
  const first = g.players[r.firstPlayerIndex];
  return (
    <DeskPage>
      <PageHead
        barTitled
        eyebrow={t.desk.roundEyebrow(r.index + 1)}
        title={t.desk.roundTitle(r.cards, r.trump)}
        actions={
          <>
            <GhostButton disabled={!state.undo.length} onClick={actions.undo}>
              {Icon.undo}
              {t.desk.nav.undo} <Kbd className="bg-white/[.12]">Z</Kbd>
            </GhostButton>
            <GhostButton onClick={() => actions.ask('endGame')}>{t.desk.endGame}</GhostButton>
          </>
        }
      />
      <div className={GRID}>
        <section className="flex min-h-0 flex-col gap-4 [grid-area:table]">
          <div className="flex min-h-[15rem] flex-1 flex-col rail:min-h-0">
            <Table
              uid="ws"
              size="wide"
              fit
              minFit={0.62}
              big
              noSeatAnim
              players={g.players}
              dir={g.direction}
              dealer={r.dealerIndex}
              first={phase === 'results' ? undefined : r.firstPlayerIndex}
              firstLabel={phase === 'playing' ? t.play.leadsFirst : undefined}
              bids={r.bids}
              res={phase === 'results' ? r.results : undefined}
              cur={phase === 'bidding' ? pI : undefined}
              warn={
                phase === 'bidding' && hookWarn && r.bids[v.dealer.id] === undefined
                  ? r.dealerIndex
                  : undefined
              }
              onSeat={phase === 'bidding' ? actions.pickSeat : undefined}
              center={<TableCenter trump={r.trump} cards={r.cards} />}
            />
          </div>
          <div className="hidden shrink-0 dt:block">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="glass px-5 py-4 text-18 leading-[1.45] tracking-[-0.01em] [text-wrap:pretty]"
              >
                {phase === 'bidding' ? (
                  <>
                    <div className="disp text-26 font-bold leading-[1.15] tracking-[-0.02em] [&_[data-n]]:text-36 [&_[data-n]]:leading-none [&_[data-n]]:text-[var(--accent)]">
                      {t.deal.head(v.dealer.name, r.cards)}
                    </div>
                    <div className="mt-1.5 text-17 text-[var(--tx2)] [&_b]:text-[var(--tx)]">
                      {t.desk.dealSub(
                        first.name,
                        r.trump,
                        r.index > 0 ? r.cards - prevCards : null,
                      )}
                    </div>
                  </>
                ) : phase === 'playing' ? (
                  t.desk.play.hint(first.name)
                ) : (
                  <>
                    <div>{t.desk.results.bidsCards(sumBids(r), r.cards)}</div>
                    <div className="mt-1 text-13 text-[var(--tx2)]">{t.desk.results.hint}</div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          {phase !== 'results' && (
            <div className="hidden shrink-0 dt:block">
              <ComingUp g={g} from={r.index} />
            </div>
          )}
        </section>
        <section
          ref={pane}
          tabIndex={-1}
          aria-label={t.desk.steps.label}
          className="glass glass-glow relative flex min-h-0 flex-col gap-3 overflow-hidden p-4 outline-none [grid-area:action] rail:gap-4 rail:p-5"
        >
          <StepTracker step={step} can={canStep} go={goStep} />
          <div className="grid min-h-0 flex-1">
            <AnimatePresence initial={false} mode="popLayout" custom={stepDir}>
              <motion.div
                key={phase}
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
                  {phase === 'bidding' ? (
                    <BidPane
                      g={g}
                      v={v}
                      pending={pending}
                      primary={primary}
                      shake={shake}
                      onKey={tap}
                      onPrimary={confirm}
                    />
                  ) : phase === 'playing' ? (
                    <PlayPane g={g} />
                  ) : (
                    <ResultsPane g={g} />
                  )}
                </Leaving>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
        <ScorePanel g={g} projected={phase === 'results'} />
      </div>
    </DeskPage>
  );
}
