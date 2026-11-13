import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import { doneHands, playerKey, roster, standings } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kpg } from '@/games/kaali-teeri/strings/pages';
import type { KtGameRec } from '@/state/archive';
import { dayKey, dayLabel, timeLabel } from '@/lib/dates';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack, Chip, ChipRow, EmptyState } from '@/components/ui/PageParts';
import { PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { Gate, gameLine, KtPage, NoGames } from './parts';
import { useKtGames } from './source';

const h = kpg.history;
type Status = 'all' | 'finished' | 'active';

/** Every game this device knows, by day, newest first; filters by status and by player. */
export function HistoryPage() {
  const src = useKtGames();
  const [status, setStatus] = useState<Status>('all');
  const [who, setWho] = useState<string | null>(null);
  // The people who played most, for the filter chips.
  const people = useMemo(() => roster(src.games).slice(0, 12), [src.games]);
  const shown = src.recs.filter(
    (r) =>
      (status === 'all' || r.game.status === status) &&
      (!who || r.game.players.some((p) => playerKey(p) === who)),
  );
  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: KtGameRec[] }[] = [];
    for (const r of shown) {
      const at = r.endedAt ?? r.updatedAt,
        k = dayKey(at);
      if (out.at(-1)?.key !== k) out.push({ key: k, label: dayLabel(at), rows: [] });
      out.at(-1)!.rows.push(r);
    }
    return out;
  }, [shown]);

  return (
    <KtPage
      title={h.title}
      sub={
        src.recs.length > 0 && (
          <div className="flex flex-col gap-2">
            <ChipRow label={h.status.label}>
              {(['all', 'finished', 'active'] as const).map((k) => (
                <Chip key={k} on={status === k} onClick={() => setStatus(k)}>
                  {h.status[k]}
                </Chip>
              ))}
            </ChipRow>
            {people.length > 1 && (
              <ChipRow label={h.filterPlayer}>
                <Chip on={!who} onClick={() => setWho(null)}>
                  {h.allPlayers}
                </Chip>
                {people.map((p) => (
                  <Chip
                    key={p.playerId}
                    on={who === p.playerId}
                    onClick={() => setWho(who === p.playerId ? null : p.playerId)}
                  >
                    {p.player.name}
                  </Chip>
                ))}
              </ChipRow>
            )}
          </div>
        )
      }
    >
      <Gate src={src} rows={5}>
        {() =>
          !src.recs.length ? (
            <NoGames title={h.emptyTitle} body={h.emptyBody} />
          ) : !shown.length ? (
            <EmptyState
              icon="search"
              title={h.noResults}
              action={
                <button
                  type="button"
                  onClick={() => (setStatus('all'), setWho(null))}
                  className="press min-h-12 px-3 text-16 font-bold text-[var(--accent-tx)]"
                >
                  {h.clear}
                </button>
              }
            />
          ) : (
            groups.map((grp) => (
              <section key={grp.key} className="mb-6">
                {/* The day stays in view while its games scroll under it. */}
                <h2 className="pointer-events-none sticky top-0 z-[1] mb-2.5">
                  <span className="glass inline-block !rounded-full px-3 py-1 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
                    {grp.label}
                  </span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {grp.rows.map((r, i) => (
                    <m.li key={r.syncId} {...stagger(Math.min(i, 8))}>
                      <GameRow rec={r} current={r.syncId === src.current} />
                    </m.li>
                  ))}
                </ul>
              </section>
            ))
          )
        }
      </Gate>
    </KtPage>
  );
}

function GameRow({ rec, current }: { rec: KtGameRec; current: boolean }) {
  const { actions } = useKt();
  const g = rec.game,
    at = rec.endedAt ?? rec.updatedAt;
  const top = standings(g).filter((s) => s.rank === 1);
  const winner = g.status === 'finished' && top.length === 1 ? top[0].p : null;
  const badge = current ? h.onTable : g.status !== 'finished' ? h.inProgress : null;
  const line = gameLine(g);
  return (
    <m.button
      type="button"
      whileTap={PRESS}
      onClick={() => actions.openPage({ page: 'game', id: rec.syncId })}
      aria-label={h.rowLabel(`${dayLabel(at)} ${timeLabel(at)}`, line)}
      className="glass flex min-h-[4.5rem] w-full flex-col gap-1.5 px-4 py-3 text-left"
    >
      <span className="flex w-full items-center gap-2 text-16 font-bold leading-tight [overflow-wrap:anywhere]">
        {winner && (
          <Avatar
            p={winner}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-16"
          />
        )}
        <span className="min-w-0">{line}</span>
      </span>
      <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
        <AvatarStack players={g.players} s={24} max={6} />
        <span className="text-14 text-[var(--tx2)]">
          {h.meta(timeLabel(at), doneHands(g).length, g.players.length)}
        </span>
        {badge && (
          <span
            className={`ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-13 font-bold ${current ? 'bg-[var(--accent)] text-ink-on-accent' : 'bg-ov/[.08] text-[var(--tx2)]'}`}
          >
            {badge}
          </span>
        )}
      </span>
    </m.button>
  );
}
