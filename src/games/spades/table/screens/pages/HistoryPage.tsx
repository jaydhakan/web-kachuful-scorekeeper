import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import { spGo } from '@/games/spades/nav';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { pidOf } from '@/people/pid';
import { dayKey, dayLabel, timeLabel } from '@/lib/dates';
import { AvatarStack, Chip, ChipRow, EmptyState } from '@/components/ui/PageParts';
import { PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { Gate, NoGames, SpPage } from './parts';
import { fromTableGame, useOnlineHistory, useSpGames, type SpHistoryItem } from './source';

const p = spTable.pages;
type Status = 'all' | 'finished' | 'active' | 'cancelled';

/**
 * Every scored game on this device and, signed in, this account's finished online tables: by day, newest first, with
 * filters by status and by player.
 */
export default function HistoryPage() {
  const src = useSpGames();
  const { state, actions } = useSp();
  const [status, setStatus] = useState<Status>('all');
  const [who, setWho] = useState<string | null>(null);
  const online = useOnlineHistory();
  const items = useMemo(
    () => [...src.recs.map(fromTableGame), ...online.items].sort((a, b) => b.at - a.at),
    [src.recs, online.items],
  );
  // The people who played most, for the filter chips.
  const people = useMemo(() => {
    const n = new Map<string, { name: string; c: number }>();
    for (const it of items)
      for (const q of it.players) {
        const k = pidOf(q);
        n.set(k, { name: q.name, c: (n.get(k)?.c ?? 0) + 1 });
      }
    return [...n].sort((a, b) => b[1].c - a[1].c).slice(0, 10);
  }, [items]);
  const shown = items.filter(
    (it) =>
      (status === 'all' || it.status === status) &&
      (!who || it.players.some((q) => pidOf(q) === who)),
  );
  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: SpHistoryItem[] }[] = [];
    for (const it of shown) {
      const k = dayKey(it.at);
      if (out.at(-1)?.key !== k) out.push({ key: k, label: dayLabel(it.at), rows: [] });
      out.at(-1)!.rows.push(it);
    }
    return out;
  }, [shown]);
  const open = (it: SpHistoryItem) => {
    if (it.kind === 'online') return spGo(`?table=${encodeURIComponent(it.id)}`);
    const rec = src.recs.find((r) => r.syncId === it.id);
    if (!rec) return;
    if (it.status !== 'active') return actions.openPage({ page: 'game', id: it.id });
    // A game still in progress goes back on the table.
    if (it.id !== state.game?.syncId) actions.openGame(rec.game);
    spGo('?keep');
  };
  return (
    <SpPage
      title={p.history}
      sub={
        items.length > 0 && (
          <div className="flex flex-col gap-2">
            <ChipRow label={p.status.label}>
              {(['all', 'finished', 'active', 'cancelled'] as const).map((k) => (
                <Chip key={k} on={status === k} onClick={() => setStatus(k)}>
                  {p.status[k]}
                </Chip>
              ))}
            </ChipRow>
            {people.length > 1 && (
              <ChipRow label={p.filterPlayer}>
                <Chip on={!who} onClick={() => setWho(null)}>
                  {p.allPlayers}
                </Chip>
                {people.map(([k, v]) => (
                  <Chip key={k} on={who === k} onClick={() => setWho(who === k ? null : k)}>
                    {v.name}
                  </Chip>
                ))}
              </ChipRow>
            )}
          </div>
        )
      }
    >
      {online.status === 'error' && (
        <p
          role="status"
          className="mb-3 flex flex-wrap items-center gap-x-2 text-14 text-[var(--tx2)]"
        >
          {p.onlineFailed}
          <button
            type="button"
            onClick={online.retry}
            className="press min-h-11 px-2 font-bold text-[var(--accent-tx)]"
          >
            {p.retry}
          </button>
        </p>
      )}
      <Gate src={src}>
        {() =>
          !items.length ? (
            <NoGames title={p.emptyTitle} body={p.emptyBody} />
          ) : !shown.length ? (
            <EmptyState
              icon="search"
              title={p.noResults}
              action={
                <button
                  type="button"
                  onClick={() => (setStatus('all'), setWho(null))}
                  className="press min-h-12 px-3 text-16 font-bold text-[var(--accent-tx)]"
                >
                  {p.clear}
                </button>
              }
            />
          ) : (
            groups.map((grp) => (
              <section key={grp.key} className="mb-6">
                <h2 className="pointer-events-none sticky top-0 z-[1] mb-2.5">
                  <span className="glass inline-block !rounded-full px-3 py-1 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
                    {grp.label}
                  </span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {grp.rows.map((it, i) => (
                    <m.li key={it.id} {...stagger(Math.min(i, 8))}>
                      <GameRow it={it} current={it.id === src.current} onOpen={() => open(it)} />
                    </m.li>
                  ))}
                </ul>
              </section>
            ))
          )
        }
      </Gate>
    </SpPage>
  );
}

export function GameRow({
  it,
  current,
  onOpen,
}: {
  it: SpHistoryItem;
  current: boolean;
  onOpen: () => void;
}) {
  const badge =
    current && it.status === 'active'
      ? p.onTable
      : it.status === 'active'
        ? p.inProgress
        : it.status === 'cancelled'
          ? p.cancelled
          : it.winner === 'draw'
            ? p.draw
            : it.kind === 'online'
              ? p.online
              : null;
  return (
    <m.button
      type="button"
      whileTap={PRESS}
      onClick={onOpen}
      aria-label={p.rowLabel(`${dayLabel(it.at)} ${timeLabel(it.at)}`, it.line)}
      className={`glass flex min-h-[4.5rem] w-full flex-col gap-1.5 px-4 py-3 text-left ${it.status === 'cancelled' ? 'opacity-75' : ''}`}
    >
      <span className="text-16 font-bold leading-tight break-words">{it.line}</span>
      <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
        <AvatarStack players={it.players} s={24} max={4} />
        <span className="text-14 text-[var(--tx2)]">{p.meta(timeLabel(it.at), it.hands)}</span>
        {badge && (
          <span
            className={`ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-13 font-bold ${current && it.status === 'active' ? 'bg-[var(--accent)] text-ink-on-accent' : 'bg-ov/[.08] text-[var(--tx2)]'}`}
          >
            {badge}
          </span>
        )}
      </span>
    </m.button>
  );
}
