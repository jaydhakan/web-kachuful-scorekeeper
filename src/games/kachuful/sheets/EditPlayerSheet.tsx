import { useState, type FormEvent } from 'react';
import { emailKey, emailOk, NAME_MAX, tidyName } from '@/games/kachuful/domain';
import { keepPlayer, namesOf, patchLocal, recFromServer, type Person } from '@/state/registry';
import { archive } from '@/state/archive';
import { useApp } from '@/games/kachuful/state/store';
import { ep } from '@/sync/endpoints';
import { authError } from '@/platform/pages/AuthPages';
import { Field } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { t } from '@/strings';

const pp = t.hub.people;

/** Name, first and last name, and (for a player the server knows) email. */
export function EditPlayerSheet({ p, onClose }: { p: Person; onClose: () => void }) {
  const { actions } = useApp();
  const remote = !p.local;
  const [form, setForm] = useState({
    name: p.displayName,
    first: p.firstName ?? '',
    last: p.lastName ?? '',
    email: p.email ?? '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const others = remote ? namesOf(p).slice(1) : [];

  // The alias and the main name swap on the server; boards then show the new main name.
  const makeMain = async (alias: string) => {
    setBusy(true);
    try {
      const out = await ep.patchPlayer(p.id, { mainAlias: alias });
      keepPlayer(p.id, recFromServer(out, archive.get('players', p.id)));
      actions.say(pp.madeMain(out.displayName));
      onClose();
    } catch (x) {
      setErr(authError(x));
      setBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const name = tidyName(form.name);
    if (!name) return;
    // An email can be added or changed, never cleared.
    if (remote && form.email.trim() && !emailOk(form.email))
      return setErr(t.hub.sync2.emailInvalid);
    const names = { firstName: form.first.trim() || null, lastName: form.last.trim() || null };
    if (!remote) {
      if (!patchLocal(p.id, { displayName: name, ...names })) return setErr(pp.nameTaken);
      actions.say(t.hub.account.saved);
      return onClose();
    }
    const email = form.email.trim() ? emailKey(form.email) : undefined;
    setBusy(true);
    try {
      const out = await ep.patchPlayer(p.id, {
        ...(name !== p.displayName && { displayName: name }),
        ...(email && email !== p.email && { email }),
        ...names,
      });
      keepPlayer(p.id, recFromServer(out, archive.get('players', p.id)));
      actions.say(t.hub.account.saved);
      onClose();
    } catch (x) {
      setErr(authError(x));
      setBusy(false);
    }
  };

  return (
    <Sheet title={pp.editTitle(p.displayName)} onClose={onClose}>
      <form onSubmit={save} noValidate>
        <Field
          label={t.hub.auth.displayName}
          value={form.name}
          maxLength={NAME_MAX}
          onChange={(v) => (setForm({ ...form, name: v }), setErr(''))}
          error={err}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t.hub.auth.firstName}
            value={form.first}
            onChange={(v) => setForm({ ...form, first: v })}
          />
          <Field
            label={t.hub.auth.lastName}
            value={form.last}
            onChange={(v) => setForm({ ...form, last: v })}
          />
        </div>
        {others.length > 0 && (
          <div role="group" aria-labelledby="other-names" className="mb-5">
            <h3 id="other-names" className="mono-label text-12 text-[var(--tx2)]">
              {pp.otherNames}
            </h3>
            <p className="mb-2 mt-1 text-13 text-[var(--tx2)]">{pp.otherNamesHint}</p>
            <div className="flex flex-wrap gap-2">
              {others.map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={busy}
                  aria-label={pp.makeMain(a)}
                  onClick={() => void makeMain(a)}
                  className="press glass inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-15 font-bold disabled:opacity-50"
                >
                  {a}
                  <span aria-hidden className="text-13 font-medium text-[var(--accent)]">
                    ↑
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {remote && (
          <Field
            label={t.hub.auth.yourEmail}
            type="email"
            inputMode="email"
            autoCapitalize="off"
            value={form.email}
            onChange={(v) => (setForm({ ...form, email: v }), setErr(''))}
            hint={t.hub.sync2.emailHint}
          />
        )}
        <div className="flex gap-3">
          <PrimaryButton type="button" tone="glass" className="flex-1" onClick={onClose}>
            {t.common.cancel}
          </PrimaryButton>
          <PrimaryButton type="submit" className="flex-1" disabled={busy || !form.name.trim()}>
            {t.common.save}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
