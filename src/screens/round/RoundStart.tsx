import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { seatPos } from '@/lib/tableGeometry';
import { useApp } from '@/state/store';
import { TR } from '@/theme/trumps';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { t } from '@/strings';

/** The deal animation at the start of a round; one tap skips it. */
export function RoundStart() {
  const { state, actions } = useApp();
  const [seq] = useState(() => state.seq);
  const g = state.game,
    n = g.players.length;
  const [stage, setStage] = useState(0);
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
  const from = seatPos('full', n, r.dealerIndex, g.direction);
  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={t.start.skip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => setStage(4)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') setStage(4);
      }}
      className="scr-bg absolute inset-0 z-[45] flex cursor-pointer flex-col items-center pt-12"
    >
      <div className="disp text-30 font-extrabold tracking-[-0.035em]">
        {t.round.title(r.index + 1)}
      </div>
      <div className="my-3 h-[132px] w-24" style={{ perspective: 800 }}>
        <motion.div
          initial={{ rotateY: 0, scale: 0.9 }}
          animate={{ rotateY: 180, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 rounded-[14px] border-4 border-text-primary bg-card-back [backface-visibility:hidden]" />
          <div
            className={`absolute inset-0 grid place-items-center rounded-[14px] bg-card-face text-64 shadow-[0_0_44px_var(--accent)] [backface-visibility:hidden] ${r.trump === 'spades' || r.trump === 'clubs' ? 'text-card-ink' : 'text-card-red'}`}
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
        className="mb-2 text-17 font-bold text-[var(--accent)]"
      >
        {t.start.trumpIs(th.name)}
      </motion.div>
      <Table
        uid="rs"
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
              to = seatPos('full', n, idx, g.direction),
              rot = ((idx * 47) % 40) - 20;
            return (
              <motion.div
                key={k}
                aria-hidden
                initial={{ x: from.x - 8, y: from.y - 11, opacity: 1, rotate: 0 }}
                animate={{ x: to.x - 8, y: to.y - 11, rotate: rot, opacity: [1, 1, 0] }}
                transition={{
                  default: { duration: 0.52, delay: k * 0.06, ease: EASE },
                  opacity: { duration: 0.52, delay: k * 0.06, times: [0, 0.8, 1] },
                }}
                className="absolute left-0 top-0 z-[7] h-[22px] w-4 rounded-[3px] border-[1.5px] border-text-primary bg-card-deal"
              />
            );
          })}
      </Table>
      <div
        className="min-h-[70px] px-7 py-3 text-center text-17 leading-[1.45] tracking-[-0.01em]"
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
      <div className="absolute bottom-7 text-13 text-[var(--tx2)]">{t.start.tapToSkip}</div>
    </motion.div>
  );
}
