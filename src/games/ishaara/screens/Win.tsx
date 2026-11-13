import { m } from 'framer-motion';
import { useState } from 'react';
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
import { stagger } from '@/components/ui/stagger';
import { Mark, TEAM_FILL } from './board/marks';
import { WordGrid } from './board/WordGrid';

const w = s.win;

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
            <m.section {...stagger(0)} className="mt-2 flex items-center gap-4">
              <span
                aria-hidden
                className={`grid h-24 w-24 shrink-0 place-items-center rounded-full land:h-16 land:w-16 ${winner ? TEAM_FILL[winner] : 'glass'}`}
              >
                {winner && <Mark id={winner} className="h-11 w-11 land:h-8 land:w-8" />}
              </span>
              <div className="min-w-0">
                <h2 className="disp text-44 font-extrabold leading-none tracking-[-0.035em] land:text-32">
                  {winner ? w.wins(winner) : w.noWinner}
                </h2>
                <p className="mt-1 text-17 text-[var(--tx2)]">
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
            </m.section>

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
