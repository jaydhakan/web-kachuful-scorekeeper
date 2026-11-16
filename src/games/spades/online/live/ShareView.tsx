import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/Loader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ApiError } from '@/sync/api';
import {
  gameTotals,
  seatsOf,
  totalsOf,
  type SpGame,
  type SpPublic,
  type SpResult,
  type TeamId,
  type Totals,
} from '../../domain';
import { online as o } from '../../strings/online';
import { spEp } from '../sync/endpoints';
import type { SpShareOut } from '../sync/types';
import LiveView from './LiveView';

const s = o.live;
const sh = o.share;
// A scorekeeper game changes once a hand, so a slow poll is enough; an online table streams instead.
const POLL_MS = 15_000;

interface Board {
  names: Record<TeamId, string[]>;
  totals: Totals;
  hands: number;
  result: SpResult | null;
  status: 'active' | 'finished' | 'cancelled' | 'lobby' | 'playing';
}

const fromGame = (g: SpGame): Board => ({
  names: {
    a: seatsOf('a').map((i) => g.players[i]?.name ?? ''),
    b: seatsOf('b').map((i) => g.players[i]?.name ?? ''),
  },
  totals: gameTotals(g),
  hands: g.hands.filter((h) => h.phase === 'done').length,
  result: g.result ?? null,
  status: g.status,
});

const fromTable = (t: SpPublic): Board => ({
  names: {
    a: seatsOf('a').map((i) => t.seats[i]?.who?.name ?? ''),
    b: seatsOf('b').map((i) => t.seats[i]?.who?.name ?? ''),
  },
  totals: totalsOf(t),
  hands: t.history.length,
  result: t.result,
  status: t.status,
});

/** A read-only scoreboard: both teams' totals and bags, the hands played, and the result once there is one. */
export function ScoreBoard({ board, recap }: { board: Board; recap: boolean }) {
  const line =
    board.status === 'cancelled'
      ? sh.cancelled
      : board.result
        ? board.result.winner === 'draw'
          ? sh.draw
          : sh.won(board.names[board.result.winner].join(' & '))
        : sh.hands(board.hands);
  return (
    <main className="app-root scr-bg flex h-full w-full flex-col items-center gap-5 overflow-y-auto p-6 pt-[calc(var(--sat)+24px)]">
      <h1 className="disp text-28 font-bold">{recap ? sh.recapTitle : s.title}</h1>
      <p role="status" className="text-16 text-[var(--tx2)]">
        {line}
      </p>
      <div className="grid w-full max-w-[32rem] grid-cols-2 gap-3">
        {(['a', 'b'] as const).map((t) => {
          const won = board.result?.winner === t;
          return (
            <section
              key={t}
              aria-label={sh.teamAria(board.names[t].join(' & '), board.totals[t].score)}
              className="glass flex flex-col gap-1 rounded-[var(--r-lg)] p-4"
            >
              <h2 className="text-15 font-bold">{board.names[t].join(' & ')}</h2>
              <p
                className={`disp text-48 font-bold tabular-nums ${won ? 'text-[var(--accent-tx)]' : ''}`}
              >
                {board.totals[t].score}
              </p>
              <p className="text-14 text-[var(--tx2)]">{sh.bags(board.totals[t].bags % 10)}</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}

/**
 * A share link, live or recap, of either Spades kind. An online table's live link streams through LiveView; a
 * scorekeeper game's live link polls, and a recap of either kind shows the final board.
 */
export default function ShareView({ token, recap }: { token: string; recap: boolean }) {
  const [body, setBody] = useState<SpShareOut | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'gone'>('loading');
  const [attempt, setAttempt] = useState(0);
  const pollTable = !recap && body?.kind === 'spades';

  useEffect(() => {
    let on = true;
    const load = () =>
      spEp.share(token, recap).then(
        (r) => {
          if (!on) return;
          setBody(r);
          setState('ok');
        },
        (e: unknown) => {
          if (!on) return;
          const st = e instanceof ApiError ? e.status : 0;
          setState((x) => (x === 'ok' ? x : st === 404 || st === 410 ? 'gone' : 'error'));
        },
      );
    void load();
    return () => {
      on = false;
    };
  }, [token, recap, attempt]);

  useEffect(() => {
    if (!pollTable) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setAttempt((n) => n + 1);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [pollTable]);

  if (body?.kind === 'spades-online' && !recap) return <LiveView token={token} />;
  if (body) {
    const board = body.kind === 'spades' ? fromGame(body.game) : fromTable(body.game);
    return <ScoreBoard board={board} recap={recap} />;
  }
  if (state === 'gone')
    return (
      <main className="app-root scr-bg grid h-full w-full place-content-center gap-3 p-6 text-center">
        <h1 className="disp text-28 font-bold">{s.goneTitle}</h1>
        <p className="text-16 text-[var(--tx2)]">{s.goneBody}</p>
      </main>
    );
  if (state === 'error')
    return (
      <main
        role="alert"
        className="app-root scr-bg grid h-full w-full place-content-center justify-items-center gap-4 p-6 text-center"
      >
        <h1 className="disp text-28 font-bold">{s.failed}</h1>
        <PrimaryButton className="min-w-[14rem]" onClick={() => setAttempt((n) => n + 1)}>
          {s.retry}
        </PrimaryButton>
      </main>
    );
  return (
    <div className="app-root scr-bg relative h-full w-full">
      <p role="status" className="sr-only">
        {s.loading}
      </p>
      <Loader />
    </div>
  );
}
