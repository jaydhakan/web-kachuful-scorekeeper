import { archive, type InboxItem } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { useApp } from '@/state/store';
import { livePlayers } from '@/state/registry';
import { useState } from 'react';
import { emailOk, suggestName } from '@/domain';
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
  if (i.kind === 'rejected')
    return i.data.reason === 'deleted' ? x.deleted : x.rejected(String(i.data.reason ?? ''));
  if (i.kind === 'conflict') return x.conflict;
  if (i.data.missing) return x.needEmail(String(i.data.name ?? ''));
  if (i.data.field === 'email') return x.emailMatch(String(i.data.name ?? ''));
  return x.nameMatch(String(i.data.name ?? ''));
};

/**
 * A new player the server refused: their name or email belongs to someone else (who isn't named), or the email is
 * missing. A name clash takes a free name; an email clash or a missing email needs the right email.
 */
function NameMatch({ i }: { i: InboxItem }) {
  const name = String(i.data.name ?? '');
  const byEmail = i.data.field === 'email';
  const [email, setEmail] = useState('');
  const taken = new Set(livePlayers().map((p) => p.nameKey));
  const other = suggestName(name, taken);
  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      {byEmail ? (
        <form
          className="flex min-w-0 flex-1 basis-60 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (emailOk(email)) resolveNameMatch(i.key, { email });
          }}
        >
          <input
            type="email"
            aria-label={t.hub.sync2.emailFor(name)}
            placeholder={t.hub.sync2.emailFor(name)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl bg-white/[.07] px-3 text-15 outline-none"
          />
          <button
            type="submit"
            disabled={!emailOk(email)}
            className="glass min-h-11 rounded-xl px-3 text-14 font-bold disabled:opacity-50"
          >
            {t.common.save}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => resolveNameMatch(i.key, { rename: other })}
          className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
        >
          {t.hub.sync2.useSuggestion(other)}
        </button>
      )}
    </span>
  );
}
