import { motion } from 'framer-motion';
import { useState } from 'react';
import { nameKey } from '@/domain';
import { dayLabel } from '@/lib/dates';
import { people, type Person } from '@/state/registry';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { EmptyState, Page, Skeleton } from '@/components/ui/Page';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';

const pp = t.hub.people;

/** Everyone in the registry, searchable; a row opens the player. `list` replaces this device's registry. */
export function PlayersPage({ list }: { list?: Person[] }) {
  const { actions } = useApp();
  const local = useArchive(() => people());
  const loaded = useArchive((a) => a.loaded);
  const all = list ?? local;
  const [q, setQ] = useState('');
  const k = nameKey(q);
  const shown = k
    ? all.filter(
        (p) =>
          p.nameKey.includes(k) || nameKey(`${p.firstName ?? ''} ${p.lastName ?? ''}`).includes(k),
      )
    : all;
  return (
    <Page
      title={pp.title}
      sub={
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={pp.search}
          placeholder={pp.search}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-2xl bg-white/[.07] px-4 text-17 outline-none placeholder:text-[var(--ph)] focus:shadow-[0_0_0_3px_var(--glow),inset_0_0_0_1px_var(--accent)]"
        />
      }
    >
      {!loaded && !list ? (
        <Skeleton rows={6} h={60} />
      ) : !all.length ? (
        <EmptyState icon="👥" title={pp.none} body={pp.noneBody} />
      ) : !shown.length ? (
        <EmptyState icon="🔍" title={pp.noMatch} />
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.slice(0, 200).map((p, i) => (
            <motion.li key={p.id} {...stagger(Math.min(i, 10))}>
              <button
                type="button"
                onClick={() => actions.open({ screen: 'player', params: { id: p.id } })}
                className="glass flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left"
              >
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
                  style={{ background: p.color }}
                >
                  {p.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-17 font-bold [overflow-wrap:anywhere]">
                    {p.displayName}
                    {(p.firstName || p.lastName) && (
                      <span className="ml-2 text-14 font-medium text-[var(--tx2)]">
                        {[p.firstName, p.lastName].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </span>
                  <span className="block text-13 text-[var(--tx2)]">
                    {p.lastPlayedAt ? pp.meta(p.games, dayLabel(p.lastPlayedAt)) : pp.never}
                  </span>
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </Page>
  );
}
