import { useState, type FormEvent } from 'react';
import { emailKey, emailOk, NAME_MAX, tidyName } from '@/domain';
import { keepPlayer, patchLocal, type Person } from '@/state/registry';
import { useApp } from '@/state/store';
import { ep } from '@/sync/endpoints';
import { authError } from '@/screens/pages/AuthPages';
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
      keepPlayer(p.id, { ...out, email: out.email ?? p.email, nameKey: p.nameKey, local: false });
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
