import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icons';
import { fmt } from '@/lib/format';
import { spGo } from '../nav';
import { online as o } from '../strings/online';
import { spEp } from './sync/endpoints';
import type { SpTableSummary } from './sync/types';

const a = o.active;

function line(t: SpTableSummary): string {
  if (t.status === 'lobby') return a.lobby(t.seats.filter(Boolean).length);
  return `${a.hand(t.hands + 1)} · ${a.score(fmt(t.scores.a), fmt(t.scores.b))}`;
}

function Row({ t }: { t: SpTableSummary }) {
  const mine = t.mySeat !== null && t.turn === t.mySeat && t.status === 'playing';
  return (
    <li>
      <button
        type="button"
        onClick={() => spGo(`?table=${encodeURIComponent(t.id)}`)}
        aria-label={`${a.open(t.name)}, ${line(t)}${mine ? `, ${a.yourTurn}` : ''}`}
        className="glass press flex min-h-16 w-full items-center gap-3 p-3.5 text-left"
      >
        <span
          aria-hidden
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${mine ? 'bg-[var(--accent)]' : 'bg-[var(--success)]'}`}
        />
        <span aria-hidden className="flex min-w-0 flex-1 flex-col">
          <span className="[overflow-wrap:anywhere] text-16 font-bold">{t.name}</span>
          <span className="text-14 text-[var(--tx2)]">{line(t)}</span>
        </span>
        {mine && (
          <span
            aria-hidden
            className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-2.5 py-0.5 text-13 font-bold text-[var(--accent-tx)]"
          >
            {a.yourTurn}
          </span>
        )}
        <span aria-hidden className="text-[var(--dis)]">
          {Icon.chev}
        </span>
      </button>
    </li>
  );
}

/**
 * Home's resume rows for this account's online tables still in play: name, hand and score, and whether it's your turn.
 * Nothing at all when there are none; a quiet line while loading, and one with Try again if the list didn't load.
 */
export default function ActiveTables() {
  const [items, setItems] = useState<SpTableSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    let on = true;
    setFailed(false);
    spEp.tables('active').then(
      (p) => on && setItems(p.items),
      () => on && setFailed(true),
    );
    return () => void (on = false);
  }, []);
  useEffect(load, [load]);

  if (failed && !items)
    return (
      <div role="alert" className="glass flex min-h-16 items-center gap-3 p-3.5">
        <p className="flex-1 text-15 text-[var(--tx2)]">{a.failed}</p>
        <button
          type="button"
          onClick={load}
          className="press min-h-11 rounded-xl px-3 text-15 font-bold text-[var(--accent-tx)]"
        >
          {a.retry}
        </button>
      </div>
    );
  if (!items)
    return (
      <p aria-live="polite" className="sr-only">
        {a.loading}
      </p>
    );
  if (!items.length) return null;
  return (
    <section aria-label={a.title}>
      <ul className="flex flex-col gap-2">
        {items.map((t) => (
          <Row key={t.id} t={t} />
        ))}
      </ul>
    </section>
  );
}
