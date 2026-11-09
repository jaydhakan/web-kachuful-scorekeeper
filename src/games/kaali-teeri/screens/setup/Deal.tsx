import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useKt } from '@/games/kaali-teeri/state/store';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { Table, TablePin } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { seatPos, toPct } from '@/lib/tableGeometry';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';
import { DeckStack } from './Dealer';
import { TakeOut } from './TakeOut';

const ROOT =
  'scr-bg absolute inset-0 z-[45] cq-size flex cursor-pointer flex-col items-center pt-[calc(2.5rem+var(--sat))] pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))] focus-visible:rounded-none focus-visible:[outline-offset:-3px] @h-short:pt-[calc(1.5rem+var(--sat))]';

/**
 * The deal at the start of every hand: the dealer's chip moves on, one card flies to each seat from the dealer, then
 * what to take out and how many each. One tap skips it; under reduced motion it doesn't play at all.
 */
export default function Deal() {
  const { state, actions } = useKt();
  const [deal] = useState(state.deal);
  const g = state.game;
  const rm = useReducedMotion();
  const [stage, setStage] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const n = g?.players.length ?? 0;
  const h = g?.hands.find((x) => x.index === deal?.index);
  const needPass = deal?.prev != null && h && deal.prev !== h.dealerIndex;
  const dealMs = (n - 1) * 50 + 480 + 120;
  // The rest of the app is inert meanwhile, so keys only reach the skip control if it holds focus.
  useEffect(() => root.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (rm || !h) return actions.dealDone();
    if (stage >= 4) return actions.dealDone();
    const T = [520, needPass ? 650 : 80, dealMs, 1500];
    const id = setTimeout(() => setStage((v) => v + 1), T[stage]);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advances only with the stage
  }, [stage, rm]);
  if (!g || !h || rm) return null;
  const from = toPct('full', seatPos('full', n, h.dealerIndex, g.direction));
  const skip = () => setStage(4);
  return (
    <m.div
      ref={root}
      role="button"
      tabIndex={0}
      aria-label={s.skip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={skip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          skip();
        }
      }}
      className={ROOT}
    >
      <div className="disp text-30 font-extrabold tracking-[-0.035em] @h-short:text-24">
        {s.hand(h.index + 1)}
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <Table
          uid="kt-deal"
          fit
          players={g.players}
          dir={g.direction}
          dealer={stage < 1 ? (deal?.prev ?? h.dealerIndex) : h.dealerIndex}
          first={stage >= 2 ? (h.dealerIndex + 1) % n : undefined}
          firstLabel={s.bidsFirst}
          noSeatAnim={false}
          center={<DeckStack />}
        >
          {stage === 2 &&
            Array.from({ length: n }, (_, k) => {
              const idx = (h.dealerIndex + 1 + k) % n,
                to = toPct('full', seatPos('full', n, idx, g.direction)),
                rot = ((idx * 47) % 40) - 20,
                delay = k * 0.05;
              return (
                <TablePin
                  key={k}
                  initial={{ x: `${from.x}%`, y: `${from.y}%` }}
                  animate={{ x: `${to.x}%`, y: `${to.y}%` }}
                  transition={{ duration: 0.48, delay, ease: EASE }}
                  className="z-[7]"
                >
                  <m.div
                    initial={{ rotate: 0, opacity: 1 }}
                    animate={{ rotate: rot, opacity: [1, 1, 0] }}
                    transition={{
                      default: { duration: 0.48, delay, ease: EASE },
                      opacity: { duration: 0.48, delay, times: [0, 0.8, 1] },
                    }}
                    className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
                  >
                    <PlayingCard rank="3" suit="spades" face="down" size="xs" />
                  </m.div>
                </TablePin>
              );
            })}
        </Table>
      </div>
      <div
        aria-live="polite"
        className="flex min-h-[6.5rem] flex-col items-center gap-2 px-7 py-3 text-center"
      >
        <AnimatePresence>
          {stage >= 3 && (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-col items-center gap-2"
            >
              <div className="disp text-24 font-bold tracking-[-0.02em]">
                {s.dealerDeals(g.players[h.dealerIndex].name)}
              </div>
              <TakeOut n={n} className="justify-center" />
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <div className="pb-[max(1.5rem,var(--sab))] text-13 text-[var(--tx2)]">
        <span className="fine:hidden">{s.tapToSkip}</span>
        <span className="hidden fine:inline">{s.clickToSkip}</span>
      </div>
    </m.div>
  );
}
