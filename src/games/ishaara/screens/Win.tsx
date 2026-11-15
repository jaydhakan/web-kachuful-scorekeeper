import { m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useRef, useState } from 'react';
import {
  clueGiverOf,
  wordsOf,
  type ClueNumber,
  type Identity,
  type IshaaraPublic,
  type Team,
} from '@/games/ishaara/domain';
import { useIshaara } from '@/games/ishaara/state/store';
import { dealWords } from '@/games/ishaara/state/words';
import { table as s } from '@/games/ishaara/strings/table';
import { loadIshLastSetup } from '@/games/ishaara/state/persistence';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE, REDUCED, SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { Mark, TEAM_FILL } from './board/marks';
import { WordGrid } from './board/WordGrid';

const w = s.win;

const Confetti = lazy(() =>
  import('@/components/ui/Confetti').then((x) => ({ default: x.Confetti })),
);
const INK: Record<Team, string> = { sun: 'text-team-sun-ink', moon: 'text-team-moon-ink' };
/** Confetti in the two teams' colours, the winner's twice as often. */
const teamConfetti = (t: Team) => [
  `var(--team-${t})`,
  `var(--team-${t})`,
  `var(--team-${t === 'sun' ? 'moon' : 'sun'})`,
];

export interface ClueRow {
  team: Team;
  word: string | null;
  number: ClueNumber;
  found: number;
  /** What ended the clue's run, when a guess did: the other team's word, a blank or the trap. */
  endedOn: Identity | null;
  ruledOut: boolean;
}

/** Each clue with how many of its own team's words were found after it, and what ended the run. */
export function clueLog(g: Pick<IshaaraPublic, 'log'>): ClueRow[] {
  const rows: ClueRow[] = [];
  for (const e of g.log) {
    const cur = rows.at(-1);
    if (e.type === 'clue')
      rows.push({
        team: e.team,
        word: e.word ?? null,
        number: e.number ?? 0,
        found: 0,
        endedOn: null,
        ruledOut: false,
      });
    else if (cur && e.type === 'guess' && e.identity) {
      if (e.identity === cur.team) cur.found++;
      else cur.endedOn = e.identity;
    } else if (cur && e.type === 'not-allowed') cur.ruledOut = true;
  }
  return rows;
}

/** The result: who won and how, the whole key, the clue log, the match score, and Rematch. */
export default function Win({ game }: { game: IshaaraPublic }) {
  const { actions } = useIshaara();
  const rm = useReducedMotion();
  // Confetti once, on arriving; never under reduced motion.
  const [party, setParty] = useState(!rm);
  const headline = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const winner = game.winner;
  const trap = game.log.find((e) => e.type === 'guess' && e.identity === 'trap');
  const rows = clueLog(game);
  const { sunWins, moonWins } = game.match;
  const matchWinner: Team | null = sunWins >= 2 ? 'sun' : moonWins >= 2 ? 'moon' : null;

  const rematch = async () => {
    setBusy(true);
    setErr('');
    try {
      const words = await dealWords(game.rules.packs, loadIshLastSetup()?.customWords ?? []);
      const r = await actions.rematch(words);
      if (!r.ok) setErr(r.error.offline ? s.setup.errors.offline : w.rematchFailed);
    } catch {
      setErr(w.noWords);
    }
    setBusy(false);
  };

  return (
    <div className="absolute inset-0 flex flex-col pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))] pane:pl-[max(var(--sal),calc((100%-64rem)/2))] pane:pr-[max(var(--sar),calc((100%-64rem)/2))]">
      <header className="flex min-h-14 shrink-0 items-center gap-2 px-2 pt-[var(--sat)]">
        <IconButton chrome label={w.back} onClick={actions.leave}>
          {Icon.back}
        </IconButton>
        <h1 className="disp flex-1 text-center text-19 font-bold">{w.title}</h1>
        <span className="w-12" />
      </header>
      <div
        tabIndex={0}
        role="region"
        aria-label={w.title}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6"
      >
        <div className="pane:grid pane:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] pane:gap-6">
          <div>
            {/* The win (A4): the winner's colour floods the card from its own side, the headline comes in. */}
            <section
              data-win-hero={winner ?? undefined}
              className={`relative mt-2 overflow-hidden rounded-[28px] p-5 ${winner ? INK[winner] : 'glass'}`}
            >
              {winner && (
                <m.span
                  aria-hidden
                  initial={rm ? { opacity: 0 } : { scaleX: 0 }}
                  animate={rm ? { opacity: 1 } : { scaleX: 1 }}
                  transition={rm ? { duration: REDUCED } : { duration: 0.55, ease: EASE }}
                  style={{ transformOrigin: winner === 'sun' ? 'left' : 'right' }}
                  className={`absolute inset-0 ${TEAM_FILL[winner]}`}
                />
              )}
              <div className="relative flex items-center gap-4">
                <m.span
                  aria-hidden
                  initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={rm ? { duration: REDUCED } : { ...SPRING_POP, delay: 0.35 }}
                  className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ov/10 land:h-16 land:w-16 dt:h-28 dt:w-28"
                >
                  {winner && (
                    <Mark id={winner} className="h-11 w-11 land:h-8 land:w-8 dt:h-14 dt:w-14" />
                  )}
                </m.span>
                <div className="min-w-0">
                  <m.h2
                    ref={headline}
                    data-confetti-origin=""
                    initial={rm ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: rm ? REDUCED : 0.4, ease: EASE, delay: rm ? 0 : 0.45 }}
                    className="disp text-44 font-extrabold leading-none tracking-[-0.035em] land:text-32 dt:text-64"
                  >
                    {winner ? w.wins(winner) : w.noWinner}
                  </m.h2>
                  <p
                    className={`mt-1 text-17 dt:text-22 ${winner ? 'opacity-85' : 'text-[var(--tx2)]'}`}
                  >
                    {w.how(
                      game.endedBy,
                      winner,
                      winner ? wordsOf(game, winner) : 0,
                      trap?.word?.toUpperCase() ?? null,
                    )}
                  </p>
                  {game.rules.bestOf === 3 && (
                    <p className="mt-1 text-16 font-semibold">
                      {matchWinner
                        ? w.matchWon(matchWinner)
                        : w.match(sunWins, moonWins, game.match.game)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {game.solution && (
              <m.section {...stagger(1)} aria-labelledby="ish-key" className="mt-6">
                <h2 id="ish-key" className="mono-label mb-2 text-13 text-[var(--accent-tx)]">
                  {w.key}
                </h2>
                <div className="h-[19rem] land:h-[15rem]">
                  <WordGrid words={game.words} revealed={game.solution} readOnly />
                </div>
              </m.section>
            )}
          </div>

          <m.section {...stagger(2)} aria-labelledby="ish-log" className="mt-6">
            <h2 id="ish-log" className="mono-label mb-2 text-13 text-[var(--accent-tx)]">
              {w.log}
            </h2>
            {rows.length === 0 ? (
              <p className="glass px-4 py-4 text-16 text-[var(--tx2)]">{w.noClues}</p>
            ) : (
              <ol aria-labelledby="ish-log" className="glass overflow-hidden">
                {rows.map((r, k) => {
                  const giver = clueGiverOf(game, r.team)?.name ?? s.team[r.team];
                  const tail = [
                    w.found(r.found),
                    ...(r.endedOn ? [w.endedOn(r.endedOn)] : []),
                    ...(r.ruledOut ? [w.penalty] : []),
                  ].join(', ');
                  return (
                    <li key={k} className="relative flex min-h-14 items-center gap-3 px-4 py-2">
                      {k > 0 && (
                        <span aria-hidden className="absolute left-4 right-4 top-0 h-px bg-ov/10" />
                      )}
                      <Mark id={r.team} className="h-3.5 w-3.5" />
                      <span className="sr-only">{s.team[r.team]}</span>
                      <span className="shrink-0 text-16 text-[var(--tx2)]">{giver}</span>
                      <span className="min-w-0 flex-1 text-17 font-bold [overflow-wrap:anywhere]">
                        {r.word ?? w.spokenClue} · {s.num(r.number)}
                      </span>
                      <span className="shrink-0 text-right text-15 text-[var(--tx2)]">{tail}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </m.section>
        </div>
        {err && (
          <p role="alert" className="mt-4 text-15 font-medium text-[var(--warn)]">
            {err}
          </p>
        )}
      </div>
      {party && winner && (
        <Suspense fallback={null}>
          <Confetti
            colors={teamConfetti(winner)}
            origin={headline.current}
            onDone={() => setParty(false)}
          />
        </Suspense>
      )}
      <div className="chrome-bot flex shrink-0 gap-3 px-5 pb-[max(1.125rem,var(--sab))] pt-[1.125rem]">
        <PrimaryButton tone="glass" className="flex-1" onClick={actions.leave}>
          {w.back}
        </PrimaryButton>
        {game.next ? (
          <PrimaryButton className="flex-1" onClick={() => actions.openGame(game.next!, 'table')}>
            {w.nextGame}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            className="flex-1"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => void rematch()}
          >
            {busy ? w.rematching : w.rematch}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
