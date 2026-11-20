import { m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useState } from 'react';
import { handLines, seatsOf, type SpGame, type TeamId } from '@/games/spades/domain';
import { spGo } from '@/games/spades/nav';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { totalsOf } from '@/games/spades/table/state/select';
import { vibrate } from '@/hooks/useHaptics';
import { palette, themeConfetti } from '@/theme/palette';
import { Counter } from '@/components/ui/Counter';
import { Dot } from '@/components/ui/Dot';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { icon } from '@/components/ui/IconsMore';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Scaffold } from '@/components/ui/Scaffold';
import { REDUCED, SPRING_POP, SPRING_SOFT } from '@/components/ui/motion';
import { TEAM_TONE, teamNames } from './parts';
import { useSpGames, useWho } from './pages/source';
import { signedInAs, useSession } from '@/sync/session';
import { GameSikke } from '@/components/sikke/GameSikke';

const s = spTable.winner;
// The reel brings the catalogue with it: its own chunk, after the winner is on screen.
const Reel = lazy(() => import('@/games/spades/progress/SpReel'));
const Confetti = lazy(() =>
  import('@/components/ui/Confetti').then((x) => ({ default: x.Confetti })),
);

const QUIET =
  'press min-h-12 px-3 text-16 font-medium text-[var(--tx2)] underline decoration-ov/25 underline-offset-[5px]';

/** A team's game in four numbers: bids made, Nils made, bags taken, contracts set. */
function teamStats(g: SpGame, t: TeamId) {
  let bids = 0,
    made = 0,
    nils = 0,
    nilsMade = 0,
    sets = 0;
  for (const l of handLines(g.hands)) {
    const r = l[t];
    if (r.made !== null) {
      bids++;
      if (r.made) made++;
      else sets++;
    }
    nils += r.nils.length;
    nilsMade += r.nils.filter((n) => n.made).length;
  }
  return { bids, made, nils, nilsMade, sets, bags: totalsOf(g)[t].bags };
}

/** The pair's avatars sliding together from either side (a fade under reduced motion). */
function Pair({ g, t, delay, size = 76 }: { g: SpGame; t: TeamId; delay: number; size?: number }) {
  const rm = useReducedMotion();
  return (
    <div className="flex justify-center" aria-hidden>
      {seatsOf(t).map((k, i) => (
        <m.span
          key={k}
          initial={rm ? { opacity: 0 } : { opacity: 0, x: i ? 110 : -110, rotate: i ? 20 : -20 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={rm ? { duration: REDUCED, delay } : { ...SPRING_POP, delay }}
          className={`-mx-1.5 rounded-full ${TEAM_TONE[t].ring}`}
        >
          <Dot p={g.players[k]} s={size} />
        </m.span>
      ))}
    </div>
  );
}

/** The winner: the winning pair, the medal, confetti and both scores counting up; then Rematch or a new game. */
export default function Winner() {
  const { state, actions } = useSp();
  const rm = useReducedMotion();
  const g = state.game;
  const [fresh] = useState(() => state.fresh);
  useEffect(() => {
    if (!fresh) return;
    actions.setFresh(false);
    if (!rm) vibrate(40);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, as the screen opens
  }, []);
  const [party, setParty] = useState(fresh && !rm);
  const signedIn = !!signedInAs(useSession());
  const src = useSpGames();
  const who = useWho(src.games);
  const header = (
    <IconButton chrome label={s.home} onClick={() => spGo('')}>
      {Icon.back}
    </IconButton>
  );
  if (!g || !g.result)
    return (
      <Scaffold
        left={header}
        navTitle={s.final}
        bar={
          <PrimaryButton className="w-full" onClick={actions.startSetup}>
            {s.newGame}
          </PrimaryButton>
        }
      >
        <p className="mt-10 text-center text-17 text-[var(--tx2)]">{s.empty}</p>
      </Scaffold>
    );
  const t = totalsOf(g);
  const w = g.result.winner;
  const order: TeamId[] = w === 'b' ? ['b', 'a'] : ['a', 'b'];
  const count = fresh && !rm;
  const endedBy =
    g.result.endedBy === 'target'
      ? s.endedBy.target(g.rules.target ?? 0)
      : s.endedBy[g.result.endedBy];
  const st = w === 'draw' ? null : teamStats(g, w);
  return (
    <div className="relative h-full">
      <Scaffold
        left={header}
        navTitle={s.final}
        bar={
          <div className="flex w-full flex-col gap-2 md:mx-auto md:max-w-[26rem]">
            <PrimaryButton className="w-full" onClick={() => actions.rematch(false)}>
              {s.rematch}
            </PrimaryButton>
            <PrimaryButton tone="glass" className="w-full" onClick={() => actions.rematch(true)}>
              {s.swap}
            </PrimaryButton>
          </div>
        }
      >
        <div className="mx-auto flex max-w-[28rem] flex-col items-center pt-2 text-center">
          {w === 'draw' ? (
            <div className="flex items-center gap-6">
              <Pair g={g} t="a" delay={0.2} size={60} />
              <Pair g={g} t="b" delay={0.3} size={60} />
            </div>
          ) : (
            <>
              <m.span
                aria-hidden
                initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={rm ? { duration: REDUCED } : { ...SPRING_POP, delay: 0.9 }}
                className="mb-3 block h-14 w-14 text-[var(--gold-tx)]"
              >
                {icon('trophy', 'h-full w-full')}
              </m.span>
              <Pair g={g} t={w} delay={0.3} />
            </>
          )}
          <m.h2
            initial={rm ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={rm ? { duration: REDUCED } : { ...SPRING_SOFT, delay: 1.1 }}
            className="disp mt-4 text-36 font-extrabold leading-tight tracking-[-0.04em] [text-wrap:balance]"
          >
            {w === 'draw' ? s.draw : s.wins(teamNames(g, w))}
          </m.h2>
          <p className="mt-1 text-15 text-[var(--tx2)]">
            {endedBy} · {s.hands(handLines(g.hands).length)}
          </p>
          <dl className="mt-5 flex justify-center gap-8">
            {order.map((k) => (
              <div key={k} className="flex flex-col items-center">
                <dt
                  className={`flex items-center gap-1.5 text-13 font-semibold ${TEAM_TONE[k].text}`}
                >
                  <span aria-hidden className={`h-2 w-2 rounded-full ${TEAM_TONE[k].dot}`} />
                  {teamNames(g, k)}
                </dt>
                <dd
                  className={`disp tick text-40 font-extrabold tracking-[-0.03em] ${k === w ? TEAM_TONE[k].text : ''}`}
                >
                  <Counter
                    from={count ? 0 : t[k].score}
                    to={t[k].score}
                    run={count}
                    delay={1.3}
                    duration={1.2}
                  />
                </dd>
              </div>
            ))}
          </dl>
          {st && (
            <dl className="mt-5 grid w-full grid-cols-2 gap-2 min-[380px]:grid-cols-4">
              {(
                [
                  [`${st.made}/${st.bids}`, s.statBids],
                  [`${st.nilsMade}/${st.nils}`, s.statNils],
                  [String(st.bags), s.statBags],
                  [String(st.sets), s.statSets],
                ] as const
              ).map(([v, k], i) => (
                <m.div
                  key={k}
                  initial={rm ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    rm ? { duration: REDUCED } : { ...SPRING_SOFT, delay: 1.6 + i * 0.06 }
                  }
                  className="glass flex flex-col-reverse px-2 py-2.5"
                >
                  <dt className="text-13 text-[var(--tx2)]">{k}</dt>
                  <dd className="disp tick text-20 font-extrabold">{v}</dd>
                </m.div>
              ))}
            </dl>
          )}
          <Suspense fallback={null}>
            <Reel
              game={g}
              device={!signedIn && src.status === 'ready' ? src.games : undefined}
              person={who}
            />
          </Suspense>
          <GameSikke
            gameId={g.syncId}
            people={g.players.flatMap((p) => (p.playerId ? [{ ...p, id: p.playerId }] : []))}
            heading="disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]"
          />
          <div className="mt-4 flex flex-wrap justify-center gap-x-1">
            <button type="button" onClick={actions.startSetup} className={QUIET}>
              {s.newGame}
            </button>
            <button
              type="button"
              onClick={() => actions.openSheet({ type: 'share' })}
              className={QUIET}
            >
              {s.share}
            </button>
            <button type="button" onClick={() => spGo('')} className={QUIET}>
              {s.home}
            </button>
          </div>
        </div>
      </Scaffold>
      {party && (
        <Suspense fallback={null}>
          <Confetti
            colors={themeConfetti() ?? [...g.players.map((p) => p.color), palette['gold-light']]}
            onDone={() => setParty(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
