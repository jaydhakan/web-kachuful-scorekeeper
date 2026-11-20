import { useEffect, useRef } from 'react';
import { HAPTIC, playCue } from '@/fx/feedback';
import { reducedMotion } from '@/fx/reduced';
import { vibrate } from '@/hooks/useHaptics';
import { ep } from '@/sync/endpoints';
import { useSyncStatus } from '@/sync/status';
import { useRemote } from '@/sync/useRemote';
import { Counter } from '@/components/ui/Counter';
import { Dot } from '@/components/ui/Dot';
import type { Face } from '@/components/ui/Avatar';
import { sikke as sk } from '@/strings/sikke';

export interface SikkePerson extends Face {
  /** The registry id the server pays. */
  id: string;
  name: string;
}

const COIN_TICKS = 8;
const plus = (v: number) => sk.plus(Math.round(v));

/**
 * "+🪙" per player on a winner screen (REWARDS-PLAN §9): what the server paid for this game, asked once the game's
 * last upload has gone. Signed in only; it shows nothing while nobody earned anything.
 */
export function GameSikke({
  gameId,
  people,
  heading,
}: {
  gameId: string;
  people: SikkePerson[];
  heading: string;
}) {
  const st = useSyncStatus();
  const uploaded = st.phase !== 'signedOut' && st.waiting === 0;
  const r = useRemote(uploaded ? `gsikke:${gameId}` : null, (o) => ep.gameSikke(gameId, o));
  // A later sync can land this game's last round after the first answer: ask again then.
  const last = useRef(st.lastSyncAt);
  useEffect(() => {
    if (!uploaded || st.lastSyncAt === last.current) return;
    last.current = st.lastSyncAt;
    r.reload();
  }, [uploaded, st.lastSyncAt, r]);

  const rows = (r.data?.items ?? [])
    .map((x) => ({ x, p: people.find((p) => p.id === x.playerId) }))
    .filter((v): v is { x: typeof v.x; p: SikkePerson } => !!v.p && v.x.amount > 0);
  const played = useRef(false);
  useEffect(() => {
    if (!rows.length || played.current) return;
    played.current = true;
    const still = reducedMotion();
    rows
      .slice(0, COIN_TICKS)
      .forEach((_, i) =>
        setTimeout(
          () => playCue({ name: 'coin', gain: 0.8 + i * 0.03 }),
          still ? 0 : 200 + i * 120,
        ),
      );
    if (rows.some((v) => v.x.levelUp)) {
      setTimeout(
        () => {
          playCue({ name: 'ghungroo' });
          vibrate(HAPTIC.BEAT);
        },
        still ? 0 : 900,
      );
    }
  }, [rows]);

  if (st.phase === 'signedOut') return null;
  if (r.error && !r.data)
    return (
      <p role="status" className="mt-6 text-14 text-[var(--tx2)]">
        {sk.earned}:{' '}
        <button type="button" onClick={r.reload} className="press min-h-11 font-bold underline">
          {sk.retry}
        </button>
      </p>
    );
  if (!r.data)
    return (
      <p role="status" className="mt-6 text-14 text-[var(--tx2)]">
        {sk.counting}
      </p>
    );
  if (!rows.length) return null;
  const still = reducedMotion();
  return (
    <section data-game-sikke aria-label={sk.earned}>
      <h2 className={heading}>{sk.earned}</h2>
      <ul className="glass overflow-hidden">
        {rows.map(({ x, p }, i) => (
          <li
            key={x.playerId}
            aria-label={sk.rowSaid(p.name, x.amount, x.levelUp?.to ?? null)}
            className="flex min-h-14 items-center gap-3 border-t border-ov/10 px-4 py-2 first:border-t-0"
          >
            <Dot p={p} s={32} />
            <span aria-hidden className="min-w-0 flex-1 text-16 font-bold [overflow-wrap:anywhere]">
              {p.name}
              {x.levelUp && (
                <span className="ml-2 rounded-full bg-[var(--gold)] px-2 py-0.5 text-13 font-bold text-[var(--on-gold)]">
                  {sk.levelUp(x.levelUp.to)}
                </span>
              )}
            </span>
            <span aria-hidden className="num shrink-0 text-16 font-bold text-[var(--gold-tx)]">
              {still ? (
                plus(x.amount)
              ) : (
                <Counter
                  from={0}
                  to={x.amount}
                  run
                  delay={0.2 + i * 0.12}
                  format={plus}
                  swell="scale"
                />
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
