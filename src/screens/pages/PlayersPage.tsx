import { m } from 'framer-motion';
import { useState } from 'react';
import { nameKey } from '@/domain';
import { dayLabel } from '@/lib/dates';
import { mayEdit, people, type Person } from '@/state/registry';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { EmptyState, Page, Skeleton } from '@/components/ui/Page';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { EditPlayerSheet } from '@/sheets/EditPlayerSheet';

const pp = t.hub.people;

/** Everyone in the registry, searchable; a row opens the player. `list` replaces this device's registry. */
export function PlayersPage({ list }: { list?: Person[] }) {
  const { state, actions } = useApp();
  const user = state.session?.user;
  const [editing, setEditing] = useState<Person | null>(null);
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
          className="h-12 w-full rounded-2xl mat-inp px-4 text-17 outline-none placeholder:text-[var(--ph)]"
        />
      }
    >
      {!loaded && !list ? (
        <Skeleton rows={6} h={60} />
      ) : !all.length ? (
        <EmptyState icon="players" title={pp.none} body={pp.noneBody} />
      ) : !shown.length ? (
        <EmptyState icon="search" title={pp.noMatch} />
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.slice(0, 200).map((p, i) => (
            <m.li key={p.id} {...stagger(Math.min(i, 10))} className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => actions.open({ screen: 'player', params: { id: p.id } })}
                className="press glass flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left"
              >
                <Avatar
                  p={p}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
                />
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
              {(!user || p.local || mayEdit(p, user)) && (
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  aria-label={pp.edit(p.displayName)}
                  className="press glass grid min-h-16 w-12 shrink-0 place-items-center text-[var(--accent)]"
                >
                  {Icon.edit}
                </button>
              )}
            </m.li>
          ))}
        </ul>
      )}
      {editing && <EditPlayerSheet p={editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}
