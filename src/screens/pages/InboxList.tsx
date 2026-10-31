import { archive, type InboxItem } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { useApp } from '@/state/store';
import { livePlayers } from '@/state/registry';
import { suggestName } from '@/domain';
import { resolveNameMatch } from '@/sync/engine';
import { t } from '@/strings';

/** Things sync could not settle alone; each says what happened and what to do. */
export function InboxList() {
  const { actions } = useApp();
  const items = useArchive((a) => a.all('inbox').sort((x, y) => y.createdAt - x.createdAt));
  if (!items.length) return <p className="text-15 text-[var(--tx2)]">{t.hub.account.inboxEmpty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.id} className="glass flex flex-wrap items-center gap-3 p-4">
          <span className="min-w-0 flex-1 basis-60 text-15">{describe(i)}</span>
          {i.kind === 'nameMatch' && <NameMatch i={i} />}
          {i.kind === 'conflict' && (
            <button
              type="button"
              onClick={() => actions.open({ screen: 'game', params: { id: String(i.data.copy) } })}
              className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
            >
              {t.hub.sync2.view}
            </button>
          )}
          {i.kind !== 'nameMatch' && (
            <button
              type="button"
              onClick={() => archive.del('inbox', i.id)}
              className="min-h-11 rounded-xl px-3 text-14 font-bold text-[var(--accent)]"
            >
              {t.common.done}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

const describe = (i: InboxItem) => {
  const x = t.hub.inbox;
  if (i.kind === 'rejected') return x.rejected(String(i.data.reason ?? ''));
  if (i.kind === 'conflict') return x.conflict;
  return x.nameMatch(String(i.data.name ?? ''));
};

/** "Is it the same person?" for a name the server already has: yes moves the games to them, no renames. */
function NameMatch({ i }: { i: InboxItem }) {
  const existing = i.data.existing as { id: string; displayName: string } | undefined;
  const name = String(i.data.name ?? '');
  const taken = new Set(livePlayers().map((p) => p.nameKey));
  const other = suggestName(name, taken);
  return (
    <span className="flex flex-wrap gap-2">
      {existing && (
        <button
          type="button"
          onClick={() => resolveNameMatch(i.key, { existingId: existing.id })}
          className="min-h-11 rounded-xl bg-[var(--accent)] px-3 text-14 font-bold text-ink-on-accent"
        >
          {t.hub.sync2.yes}
        </button>
      )}
      <button
        type="button"
        onClick={() => resolveNameMatch(i.key, { rename: other })}
        className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
      >
        {t.hub.sync2.useSuggestion(other)}
      </button>
    </span>
  );
}
