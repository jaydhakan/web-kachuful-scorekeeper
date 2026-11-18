import { AnimatePresence, m } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SPRING_POP } from '@/components/ui/motion';
import { ApiError } from '@/sync/api';
import {
  SEATS,
  lastTrick,
  scoresOf,
  seatsOf,
  totalsOf,
  tricksWon,
  type Play,
  type Seat,
  type SpPublic,
  type TeamId,
} from '../../domain';
import { online as o } from '../../strings/online';
import { spEp } from '../sync/endpoints';
import { followLive } from '../sync/events';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

const s = o.live;
type Place = 'S' | 'W' | 'N' | 'E';
const PLACE: Place[] = ['S', 'W', 'N', 'E'];
const CARD_AT: Record<Place, string> = {
  S: 'left-1/2 top-[64%]',
  N: 'left-1/2 top-[36%]',
  W: 'left-[36%] top-1/2',
  E: 'left-[64%] top-1/2',
};
const SEAT_AT: Record<Place, string> = {
  S: 'left-1/2 bottom-2 -translate-x-1/2',
  N: 'left-1/2 top-2 -translate-x-1/2',
  W: 'left-2 top-1/2 -translate-y-1/2',
  E: 'right-2 top-1/2 -translate-y-1/2',
};

function Team({ t, table }: { t: TeamId; table: SpPublic }) {
  const [a, b] = seatsOf(t).map((x) => table.seats[x].who?.name ?? '');
  const score = scoresOf(totalsOf(table))[t];
  const lead = table.result && table.result.winner === t;
  return (
    <div
      className={`glass flex flex-1 flex-col items-center gap-1 p-4 ${lead ? 'shadow-[inset_0_0_0_2px_var(--medal-gold)]' : ''}`}
    >
      <span className="text-16 font-semibold text-[var(--tx2)]">{s.team(a, b)}</span>
      <span className="disp text-48 font-bold tabular-nums">{score}</span>
    </div>
  );
}

/**
 * The centre screen (plan §2.7): a share link's read-only view for a tablet or TV on the table. The public state only
 * (it never receives a hand): both teams' scores, each seat's bid and tricks, and the trick in play, large.
 */
export default function LiveView({ token }: { token: string }) {
  const [table, setTable] = useState<SpPublic | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'gone'>('loading');
  const [live, setLive] = useState(true);
  const [react, setReact] = useState<{ seat: Seat | null; emoji: string; n: number } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const take = useCallback(
    (t: SpPublic) => setTable((cur) => (!cur || t.rev >= cur.rev ? t : cur)),
    [],
  );
  useEffect(() => {
    let on = true;
    spEp.live(token).then(
      (r) => {
        if (!on) return;
        take(r.game);
        setState('ok');
      },
      (e: unknown) => {
        if (!on) return;
        const st = e instanceof ApiError ? e.status : 0;
        setState(st === 404 || st === 410 ? 'gone' : 'error');
      },
    );
    const stop = followLive(token, {
      onEvent: (e) => {
        if (e.type === 'game') {
          take(e.table);
          setState('ok');
        } else setReact((r) => ({ seat: e.seat, emoji: e.emoji, n: (r?.n ?? 0) + 1 }));
      },
      onConn: setLive,
      onGone: () => setState((x) => (x === 'ok' ? x : 'gone')),
    });
    return () => {
      on = false;
      stop();
    };
  }, [token, take, attempt]);
  useEffect(() => {
    if (!react) return;
    const t = setTimeout(() => setReact(null), 2400);
    return () => clearTimeout(t);
  }, [react]);

  if (state === 'gone')
    return (
      <main className="app-root scr-bg grid h-full w-full place-content-center gap-3 p-6 text-center">
        <h1 className="disp text-28 font-bold">{s.goneTitle}</h1>
        <p className="text-16 text-[var(--tx2)]">{s.goneBody}</p>
      </main>
    );
  if (state === 'error' && !table)
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
  if (!table) return <TableSkeleton kind="felt" hand={false} label={s.loading} />;

  const won = tricksWon(table);
  const shown: Play[] = table.trick.length ? table.trick : (lastTrick(table)?.plays ?? []);
  const isLast = !table.trick.length && shown.length > 0;
  const phase =
    table.status === 'lobby'
      ? s.lobby
      : table.status === 'playing'
        ? s.hand(table.history.length + 1)
        : s.finished;
  const turnWho =
    table.turn !== null && table.phase === 'playing' ? table.seats[table.turn].who : null;

  return (
    <main className="app-root scr-bg flex h-full w-full flex-col gap-4 overflow-y-auto p-[max(1rem,var(--sat))] pb-[max(1rem,var(--sab))]">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="mono-label text-13 text-[var(--tx2)]">{s.title}</p>
          <h1 className="disp [overflow-wrap:anywhere] text-28 font-bold tracking-[-0.02em]">
            {table.name}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-20 font-bold">{phase}</span>
          <span role="status" className="text-14 text-[var(--tx2)]">
            {!live ? s.reconnecting : turnWho ? s.turn(turnWho.name) : ''}
          </span>
        </div>
      </header>
      <div className="flex gap-3">
        <Team t="a" table={table} />
        <Team t="b" table={table} />
      </div>
      <section
        aria-label={isLast ? s.lastTrick : s.trick}
        className="felt relative mx-auto aspect-square w-full max-w-[40rem] flex-1 rounded-[32px]"
      >
        {SEATS.map((seat) => {
          const who = table.seats[seat].who;
          const place = PLACE[seat];
          return (
            <div key={seat} className={`absolute flex items-center gap-2 ${SEAT_AT[place]}`}>
              {who && (
                <Avatar
                  p={who}
                  className="grid h-12 w-12 place-items-center rounded-full text-26"
                />
              )}
              <div className="flex flex-col">
                <span
                  className={`text-16 font-bold ${table.turn === seat ? 'text-[var(--accent-tx)]' : ''}`}
                >
                  {who?.name ?? ''}
                </span>
                {table.status === 'playing' && (
                  <span className="text-14 text-[var(--tx2)]">
                    {s.tricks(won[seat], table.bids[seat])}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {react && react.seat === seat && (
                  <m.span
                    key={react.n}
                    aria-hidden
                    initial={{ opacity: 0, y: 8, scale: 0.8 }}
                    animate={{ opacity: 1, y: -6, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={SPRING_POP}
                    className="text-34"
                  >
                    {react.emoji}
                  </m.span>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <>
          {shown.map((p) => (
            <span
              key={`${p.card.rank}${p.card.suit}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${CARD_AT[PLACE[p.seat]]}`}
            >
              <m.span
                className="block"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isLast ? 0.6 : 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <PlayingCard rank={p.card.rank} suit={p.card.suit} size="lg" />
              </m.span>
            </span>
          ))}
        </>
        {!shown.length && table.status === 'playing' && (
          <p className="absolute inset-0 grid place-items-center text-18 text-[var(--tx2)]">
            {s.noTrick}
          </p>
        )}
        {table.status === 'playing' && (
          <span className="absolute right-3 top-3 rounded-full bg-[color-mix(in_srgb,var(--tx)_12%,transparent)] px-3 py-1 text-14 font-bold">
            ♠ {table.broken ? s.spadesBroken : s.spadesLocked}
          </span>
        )}
      </section>
    </main>
  );
}
