import { archive, type InboxItem } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { t } from '@/strings';

/** Things sync could not settle alone; each says what happened and what to do. */
export function InboxList() {
  const items = useArchive((a) => a.all('inbox').sort((x, y) => y.createdAt - x.createdAt));
  if (!items.length) return <p className="text-15 text-[var(--tx2)]">{t.hub.account.inboxEmpty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.id} className="glass flex items-center gap-3 p-4">
          <span className="min-w-0 flex-1 text-15">{describe(i)}</span>
          <button
            type="button"
            onClick={() => archive.del('inbox', i.id)}
            className="min-h-11 rounded-xl px-3 text-14 font-bold text-[var(--accent)]"
          >
            {t.common.done}
          </button>
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
