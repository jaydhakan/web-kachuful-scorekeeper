import { m } from 'framer-motion';
import { useState } from 'react';
import { emailKey, emailOk, nameKey } from '@/people';
import { useApp } from '@/games/kachuful/state/store';
import { ep } from '@/sync/endpoints';
import type { Player } from '@/sync/types';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, ErrorState, Section, Skeleton } from '@/components/ui/Page';
import { Field } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { Sheet } from '@/components/ui/Sheet';
import { stagger } from '@/components/ui/stagger';
import { authError } from '../AuthPages';
import { t } from '@/strings';
import { ad, adminError, allPlayers, Chevron, useLoad } from './shared';

const names = (p: Player) => [p.displayName, ...(p.aliases ?? []).map((a) => a.displayName)];
const others = (p: Player) => names(p).slice(1);

/** Name, aliases, email and photo, and the way into a merge. */
function PlayerSheet({
  p,
  onClose,
  onSaved,
  onMerge,
}: {
  p: Player;
  onClose: () => void;
  onSaved: () => void;
  onMerge: () => void;
}) {
  const { actions } = useApp();
  const [mail, setMail] = useState(p.email ?? '');
  const [err, setErr] = useState('');
  return (
    <Sheet title={p.displayName} onClose={onClose}>
      <PhotoPicker p={p} className="mb-5" />
      {others(p).length > 0 && (
        <p className="mb-4 text-15">
          <span className="font-bold">{ad.otherNames}: </span>
          {others(p).join(', ')}
        </p>
      )}
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!emailOk(mail)) return setErr(t.hub.sync2.emailInvalid);
          try {
            await ep.patchPlayer(p.id, { email: emailKey(mail) });
            actions.say(t.hub.account.saved);
            onSaved();
          } catch (x) {
            setErr(adminError(x));
          }
        }}
      >
        <Field
          label={ad.email}
          type="email"
          inputMode="email"
          autoCapitalize="off"
          value={mail}
          onChange={(v) => (setMail(v), setErr(''))}
          error={err}
          hint={t.hub.sync2.emailHint}
        />
        <PrimaryButton type="submit" className="w-full">
          {t.common.save}
        </PrimaryButton>
      </form>
      <PrimaryButton tone="glass" className="mt-3 w-full" onClick={onMerge}>
        {ad.mergeWith}
      </PrimaryButton>
    </Sheet>
  );
}

/** Pick the second player of a merge, searchable. */
function MergePick({
  from,
  list,
  onPick,
  onClose,
}: {
  from: Player;
  list: Player[];
  onPick: (p: Player) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const k = nameKey(q);
  const shown = list.filter(
    (p) => p.id !== from.id && (!k || names(p).some((n) => nameKey(n).includes(k))),
  );
  return (
    <Sheet title={ad.mergePick(from.displayName)} onClose={onClose}>
      <Field label={t.hub.people.search} type="search" value={q} onChange={setQ} />
      {shown.length === 0 ? (
        <EmptyState icon="search" title={ad.noMatch(q)} />
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="press flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-left text-17 font-bold"
              >
                <Avatar p={p} />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{p.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/** Every player: search by any name or email, sort, and open one to edit or merge. */
export function Players({ onCompare }: { onCompare: (a: string, b: string) => void }) {
  const [list, reload] = useLoad(allPlayers);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'az' | 'new'>('az');
  const [open, setOpen] = useState<Player | null>(null);
  const [from, setFrom] = useState<Player | null>(null);
  if (list instanceof Error) return <ErrorState msg={authError(list)} onRetry={reload} />;
  if (!list) return <Skeleton rows={5} />;
  if (list.length === 0) return <EmptyState icon="cards" title={ad.noPlayers} />;
  const k = nameKey(q);
  const shown = list
    .filter(
      (p) =>
        !k ||
        names(p).some((n) => nameKey(n).includes(k)) ||
        (p.email ?? '').includes(q.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'az' ? a.displayName.localeCompare(b.displayName) : b.createdAt - a.createdAt,
    );
  return (
    <>
      <Field label={ad.searchPlayers} type="search" value={q} onChange={setQ} />
      <Section
        title={ad.playerCount(shown.length)}
        aside={
          <Seg
            uid="admsort"
            label={ad.sort}
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { v: 'az', label: ad.sortAz },
              { v: 'new', label: ad.sortNew },
            ]}
          />
        }
      >
        {shown.length === 0 ? (
          <EmptyState icon="search" title={ad.noMatch(q)} />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((p, i) => (
              <m.li key={p.id} {...stagger(Math.min(i, 10))}>
                <button
                  type="button"
                  onClick={() => setOpen(p)}
                  aria-label={ad.open(p.displayName)}
                  className="press glass flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left"
                >
                  <Avatar p={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-16 font-bold [overflow-wrap:anywhere]">
                      {p.displayName}
                      {others(p).length > 0 && (
                        <span className="font-medium text-[var(--tx2)]">
                          {' · '}
                          {t.setup.alsoAs(others(p))}
                        </span>
                      )}
                    </span>
                    <span className="block text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
                      {p.email ?? ad.noEmail}
                      {p.linkedUserId && ` · ${ad.linked}`}
                    </span>
                  </span>
                  <Chevron />
                </button>
              </m.li>
            ))}
          </ul>
        )}
      </Section>
      {open && !from && (
        <PlayerSheet
          p={open}
          onClose={() => (setOpen(null), reload())}
          onSaved={() => (setOpen(null), reload())}
          onMerge={() => setFrom(open)}
        />
      )}
      {from && (
        <MergePick
          from={from}
          list={list}
          onClose={() => (setFrom(null), setOpen(null))}
          onPick={(p) => {
            setFrom(null);
            setOpen(null);
            onCompare(from.id, p.id);
          }}
        />
      )}
    </>
  );
}
