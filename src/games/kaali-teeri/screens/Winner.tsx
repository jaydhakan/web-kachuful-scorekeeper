import { m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { doneHands, gamePlayerRows, standings, type KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { finalStandings } from '@/games/kaali-teeri/lib/share';
import { end } from '@/games/kaali-teeri/strings/end';
import { fmt } from '@/lib/format';
import { palette, themeConfetti } from '@/theme/palette';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { icon } from '@/components/ui/IconsMore';
import { InkFill } from '@/components/ui/InkFill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Podium } from '@/components/ui/Podium';
import { rankTone } from '@/components/ui/podium';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING_POP, SPRING_SOFT } from '@/components/ui/motion';
import { t } from '@/strings';

const Confetti = lazy(() =>
  import('@/components/ui/Confetti').then((x) => ({ default: x.Confetti })),
);

// Two panes (short screens) and the wide layout share one centred 72rem frame, like every other screen.
const PANE_GUTTERS =
  'pane:pl-[max(var(--sal),calc((100%-72rem)/2))] pane:pr-[max(var(--sar),calc((100%-72rem)/2))]';
const QUIET =
  'press min-h-12 px-4 text-16 font-medium text-[var(--tx2)] underline decoration-ov/25 underline-offset-[5px]';

/** "8 hands · made 4 of 5 bids" for a lone winner; a shared win gives the hands alone. */
function subline(g: KtGame): string {
  const hands = doneHands(g).length;
  const top = standings(g).filter((s) => s.rank === 1);
  if (top.length !== 1) return end.hands(hands);
  const row = gamePlayerRows(g)[top[0].i];
  return end.winner.sub(hands, row.bidsMade, row.handsBid);
}

export default function Winner() {
  const { state, actions } = useKt();
  const rm = useReducedMotion();
  const g = state.game;
  const fresh = state.fresh;
  // Confetti is skipped under reduced motion; the podium still marks the moment.
  useEffect(() => {
    if (rm && fresh) actions.setFresh(false);
  }, [rm, fresh, actions]);
  const home = () => actions.go('home', -1);
  if (!g || !doneHands(g).length)
    return (
      <Scaffold
        left={
          <IconButton label={t.common.home} onClick={home}>
            {Icon.back}
          </IconButton>
        }
        navTitle={t.winner.finalScores}
        bar={
          <PrimaryButton className="w-full" onClick={actions.startSetup}>
            {end.winner.newGame}
          </PrimaryButton>
        }
      >
        <p className="mt-10 text-center text-17 text-[var(--tx2)]">{end.winner.empty}</p>
      </Scaffold>
    );
  const st = standings(g);
  return (
    <div className="relative h-full">
      <Scaffold
        left={
          <IconButton label={t.common.home} onClick={home}>
            {Icon.back}
          </IconButton>
        }
        navTitle={t.winner.finalScores}
        className={PANE_GUTTERS}
        bar={
          // The buttons sit under the right-hand pane when short, and never stretch past 26rem on wide screens.
          <div className="flex w-full gap-3 land:ml-auto land:w-[clamp(17rem,44vw,23rem)] md:mx-auto md:max-w-[26rem] wide:mx-auto wide:max-w-[26rem]">
            <PrimaryButton
              tone="glass"
              className="gap-2 px-5"
              onClick={() => actions.openSheet({ type: 'share' })}
            >
              {Icon.share} {t.winner.share}
            </PrimaryButton>
            <PrimaryButton className="flex-1" onClick={actions.rematch}>
              {t.winner.rematch}
            </PrimaryButton>
          </div>
        }
      >
        <div className="land:grid land:h-full land:grid-cols-[minmax(0,1fr)_clamp(17rem,44vw,23rem)] land:grid-rows-[minmax(0,1fr)] land:gap-x-5 wide:grid wide:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] wide:gap-x-10">
          <div
            role="region"
            // Ties stack more avatars than the design height allows, so this pane scrolls rather than clipping.
            tabIndex={0}
            aria-label={t.winner.finalScores}
            className="scroll-thin land:flex land:min-h-0 land:overflow-y-auto land:overflow-x-hidden land:cq-size"
          >
            <div className="[--pu:1px] land:m-auto land:[--pu:min(1px,calc(100cqh/340))]">
              <m.span
                aria-hidden
                initial={{ y: -140, scale: 0.5, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ ...SPRING_POP, delay: 0.5 }}
                className="mx-auto block h-[3.25rem] w-[3.25rem] text-gold land:hidden"
              >
                {icon('trophy', 'h-full w-full')}
              </m.span>
              <h2 className="framed disp mt-1 text-center text-28 font-extrabold leading-tight [overflow-wrap:anywhere] land:hidden">
                <InkFill
                  text={t.winner.headline(st.filter((x) => x.rank === 1).map((x) => x.p.name))}
                />
              </h2>
              <p className="mt-2 text-center text-15 text-[var(--tx2)] land:hidden">{subline(g)}</p>
              <Podium standings={finalStandings(g)} />
            </div>
          </div>
          <div
            tabIndex={0}
            role="region"
            aria-label={end.winner.standings}
            className="scroll-thin land:min-h-0 land:overflow-y-auto land:overflow-x-hidden land:overscroll-contain"
          >
            <ol aria-label={end.winner.standings}>
              {st.map((x, i) => (
                <m.li
                  key={x.p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING_SOFT, delay: 0.3 + i * 0.03 }}
                  className="mb-2"
                >
                  <Glass spot={false} className="flex min-h-14 items-center gap-2.5 px-3 py-2">
                    <div
                      className={`disp w-[30px] text-center text-22 font-extrabold ${rankTone(x.rank)}`}
                    >
                      {x.rank}
                    </div>
                    <Dot p={x.p} s={40} />
                    <div className="min-w-0 flex-1 text-18 font-bold tracking-[-0.015em] [overflow-wrap:anywhere] [text-wrap:balance] land:text-16">
                      {x.p.name}
                    </div>
                    <div className="disp tick text-26 font-extrabold tracking-[-0.03em] land:text-22">
                      {fmt(x.t)}
                    </div>
                  </Glass>
                </m.li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap justify-center gap-x-2">
              <button type="button" onClick={actions.startSetup} className={QUIET}>
                {end.winner.newGame}
              </button>
              <button type="button" onClick={home} className={QUIET}>
                {t.common.home}
              </button>
            </div>
          </div>
        </div>
      </Scaffold>
      {fresh && !rm && (
        <Suspense fallback={null}>
          <Confetti
            colors={themeConfetti() ?? [...g.players.map((p) => p.color), palette['gold-light']]}
            onDone={() => actions.setFresh(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
