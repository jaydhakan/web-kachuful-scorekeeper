import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { dpx, seatPos, toPct } from '@/lib/tableGeometry';
import { useApp } from '@/state/store';
import { TR } from '@/theme/trumps';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table, TablePin } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { t } from '@/strings';

// One column when upright; the title group on the left and the table on the right when short or wide.
const ROOT =
  'scr-bg absolute inset-0 z-[45] cq-size flex cursor-pointer flex-col items-center pt-[calc(3rem+var(--sat))] pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))] focus-visible:rounded-none focus-visible:[outline-offset:-3px] @h-short:pt-[calc(2rem+var(--sat))] pane:grid pane:items-stretch pane:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] pane:grid-rows-[1fr_auto_auto_auto_auto_auto_1fr] pane:justify-items-center pane:gap-x-6 pane:pb-[max(1rem,var(--sab))] pane:pl-[max(var(--sal),calc((100%-72rem)/2))] pane:pr-[max(var(--sar),calc((100%-72rem)/2))] pane:pt-[calc(1rem+var(--sat))]';

/** The deal animation at the start of a round; one tap skips it. */
export function RoundStart() {
  const { state, actions } = useApp();
  const [seq] = useState(() => state.seq);
  const g = state.game,
    n = g.players.length;
  const [stage, setStage] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  // The rest of the app is inert during the deal, so keys only reach the skip control if it holds focus.
  useEffect(() => root.current?.focus({ preventScroll: true }), []);
  const r = seq?.round,
    prev = seq?.prev ?? null;
  const needPass = r !== undefined && prev != null && prev !== r.dealerIndex;
  const dealMs = (n - 1) * 60 + 520 + 150;
  useEffect(() => {
    if (stage >= 4) {
      actions.seqDone();
      return;
    }
    const T = [820, needPass ? 800 : 120, dealMs, 700];
    const t = setTimeout(() => setStage((s) => s + 1), T[stage]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advances only with the stage
  }, [stage]);
  if (!r) return null;
  const th = TR[r.trump];
  const from = toPct('full', seatPos('full', n, r.dealerIndex, g.direction));
  return (
    <motion.div
      ref={root}
      role="button"
      tabIndex={0}
      aria-label={t.start.skip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => setStage(4)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          setStage(4);
        }
      }}
      className={ROOT}
    >
      <div className="disp text-30 font-extrabold tracking-[-0.035em] @h-short:text-24 pane:[grid-area:2/1]">
        {t.round.title(r.index + 1)}
      </div>
      <div
        className="my-3 h-[132px] w-24 @h-short:my-2 @h-short:h-[6.25rem] @h-short:w-[4.5rem] @h-tiny:h-20 @h-tiny:w-14 pane:[grid-area:3/1]"
        style={{ perspective: 800 }}
      >
        <motion.div
          initial={{ rotateY: 0, scale: 0.9 }}
          animate={{ rotateY: 180, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 rounded-[14px] border-4 border-text-primary bg-card-back [backface-visibility:hidden]" />
          <div
            className={`absolute inset-0 grid place-items-center rounded-[14px] bg-card-face text-64 @h-short:text-52 @h-tiny:text-36 shadow-[0_0_44px_var(--accent)] [backface-visibility:hidden] ${r.trump === 'spades' || r.trump === 'clubs' ? 'text-card-ink' : 'text-card-red'}`}
            style={{ transform: 'rotateY(180deg)' }}
          >
            {th.sym}
          </div>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-2 px-7 text-center text-17 font-bold text-[var(--accent)] @h-short:mb-1 pane:[grid-area:4/1]"
      >
        {t.start.trumpIs(th.name)}
      </motion.div>
      <div className="flex min-h-0 w-full flex-1 flex-col pane:[grid-area:1/2/8/3]">
        <Table
          uid="rs"
          fit
          players={g.players}
          dir={g.direction}
          dealer={stage < 1 ? (prev ?? r.dealerIndex) : r.dealerIndex}
          first={stage >= 2 ? r.firstPlayerIndex : undefined}
          noSeatAnim={false}
          center={<SuitCenter trump={r.trump} cards={r.cards} />}
        >
          {stage === 2 &&
            Array.from({ length: n }, (_, k) => {
              const idx = (r.dealerIndex + 1 + k) % n,
                to = toPct('full', seatPos('full', n, idx, g.direction)),
                rot = ((idx * 47) % 40) - 20,
                delay = k * 0.06;
              return (
                <TablePin
                  key={k}
                  initial={{ x: `${from.x}%`, y: `${from.y}%` }}
                  animate={{ x: `${to.x}%`, y: `${to.y}%` }}
                  transition={{ duration: 0.52, delay, ease: EASE }}
                  className="z-[7]"
                >
                  <motion.div
                    initial={{ rotate: 0, opacity: 1 }}
                    animate={{ rotate: rot, opacity: [1, 1, 0] }}
                    transition={{
                      default: { duration: 0.52, delay, ease: EASE },
                      opacity: { duration: 0.52, delay, times: [0, 0.8, 1] },
                    }}
                    className="absolute left-0 top-0 rounded-[3px] border-[1.5px] border-text-primary bg-card-deal"
                    // Centred on the point the layer is translated to.
                    style={{ width: dpx(16), height: dpx(22), translate: '-50% -50%' }}
                  />
                </TablePin>
              );
            })}
        </Table>
      </div>
      <div
        className="min-h-[70px] px-7 py-3 text-center text-17 leading-[1.45] tracking-[-0.01em] @h-short:min-h-[4.25rem] @h-short:py-1 land:text-15 pane:[grid-area:5/1]"
        aria-live="polite"
      >
        <AnimatePresence>
          {stage >= 3 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {t.start.dealsCards(g.players[r.dealerIndex].name, r.cards)}
              <br />
              {t.start.firstCard(g.players[r.firstPlayerIndex].name)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Both hints are mounted; the pointer type decides which one shows. */}
      <div className="pb-[max(1.75rem,var(--sab))] text-13 text-[var(--tx2)] @h-short:pb-[max(0.75rem,var(--sab))] pane:[grid-area:6/1]">
        <span className="fine:hidden">{t.start.tapToSkip}</span>
        <span className="hidden fine:inline">{t.start.clickToSkip}</span>
      </div>
    </motion.div>
  );
}
