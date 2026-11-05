import { AnimatePresence } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { emailKey, emailOk, NAME_MAX, tidyName } from '@/domain';
import { agoTxt } from '@/lib/format';
import { passwordOk } from '@/lib/password';
import { archive } from '@/state/archive';
import { recFromServer } from '@/state/registry';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { ep } from '@/sync/endpoints';
import { pendingUploads, signOutDevice } from '@/sync/signout';
import { syncNow } from '@/sync/engine';
import { useSyncStatus } from '@/sync/status';
import { PhotoPicker } from '@/components/PhotoPicker';
import { SyncDot } from '@/components/SyncDot';
import { Avatar } from '@/components/ui/Avatar';
import { Field, LookPicker, PasswordField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Page, Section } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { authError } from './AuthPages';
import { InboxList } from './InboxList';
import { t } from '@/strings';
import { icon } from '@/components/ui/IconsMore';

const ac = t.hub.account;

export function AccountPage() {
  const { state, actions } = useApp();
  const s = state.session;
  const status = useSyncStatus();
  const me = useArchive((a) => (s?.player ? a.get('players', s.player.id) : undefined));
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    first: '',
    last: '',
    emoji: '',
    color: '',
  });
  const [err, setErr] = useState('');
  const [pw, setPw] = useState({ cur: '', next: '' });
  const [pwErr, setPwErr] = useState('');
  const [ask, setAsk] = useState(false);
  if (!s)
    return (
      <Page title={ac.title}>
        <PrimaryButton className="w-full" onClick={() => actions.navReset([{ screen: 'signin' }])}>
          {t.hub.auth.signIn}
        </PrimaryButton>
      </Page>
    );
  const p = me ?? (s.player && { ...s.player, firstName: null, lastName: null });
  const startEdit = () => {
    if (!p) return;
    setForm({
      name: p.displayName,
      email: ('email' in p && p.email) || '',
      first: p.firstName ?? '',
      last: p.lastName ?? '',
      emoji: p.emoji,
      color: p.color,
    });
    setErr('');
    setEdit(true);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!p) return;
    // An email can be added or changed, never cleared.
    if (form.email.trim() && !emailOk(form.email)) return setErr(t.hub.sync2.emailInvalid);
    const email = form.email.trim() ? emailKey(form.email) : undefined;
    try {
      const out = await ep.patchPlayer(p.id, {
        ...(tidyName(form.name) !== p.displayName && { displayName: tidyName(form.name) }),
        ...(email && email !== ('email' in p ? p.email : null) && { email }),
        firstName: form.first.trim() || null,
        lastName: form.last.trim() || null,
        emoji: form.emoji,
        color: form.color,
      });
      const prev = archive.get('players', out.id);
      if (prev) archive.put('players', recFromServer(out, prev));
      actions.setSession({
        ...s,
        player: { id: out.id, displayName: out.displayName, emoji: out.emoji, color: out.color },
      });
      setEdit(false);
      actions.say(ac.saved);
    } catch (x) {
      setErr(authError(x));
    }
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordOk(pw.next)) return setPwErr(t.hub.auth.errors.weak_password);
    try {
      await ep.changePassword(pw.cur, pw.next);
      setPw({ cur: '', next: '' });
      setPwErr('');
      actions.say(ac.passwordChanged);
    } catch (x) {
      setPwErr(authError(x));
    }
  };
  const signOut = async (remove: boolean) => {
    setAsk(false);
    await signOutDevice(remove);
    actions.setSession(null);
    actions.navReset();
    actions.say(ac.signedOut);
  };
  return (
    <Page title={ac.title} eyebrow={ac.signedInAs(s.user.email)}>
      {s.stale && (
        <button
          type="button"
          onClick={() => actions.open({ screen: 'signin' })}
          className="press glass mb-5 flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold text-[var(--warn)]"
        >
          {icon('warn')} {ac.stale}
        </button>
      )}
      <Section title={ac.myPlayer}>
        {!p ? (
          <p className="text-15 text-[var(--tx2)]">{ac.noPlayer}</p>
        ) : edit ? (
          <form onSubmit={save} className="glass p-4" noValidate>
            <Field
              label={t.hub.auth.displayName}
              value={form.name}
              maxLength={NAME_MAX}
              onChange={(v) => setForm({ ...form, name: v })}
              error={err}
            />
            <Field
              label={t.hub.auth.yourEmail}
              type="email"
              inputMode="email"
              autoCapitalize="off"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              hint={t.hub.sync2.emailHint}
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
            <LookPicker
              emoji={form.emoji}
              color={form.color}
              onChange={(l) => setForm({ ...form, ...l })}
            />
            <div className="flex gap-3">
              <PrimaryButton
                type="button"
                tone="glass"
                className="flex-1"
                onClick={() => setEdit(false)}
              >
                {t.common.cancel}
              </PrimaryButton>
              <PrimaryButton type="submit" className="flex-1" disabled={!form.name.trim()}>
                {ac.save}
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <div className="glass flex flex-wrap items-center gap-x-4 gap-y-4 p-4">
            <Avatar p={p} className="grid h-14 w-14 place-items-center rounded-full text-30" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="disp block text-22 font-extrabold leading-tight [overflow-wrap:anywhere]">
                {p.displayName}
              </span>
              {(p.firstName || p.lastName) && (
                <span className="block text-14 text-[var(--tx2)]">
                  {[p.firstName, p.lastName].filter(Boolean).join(' ')}
                </span>
              )}
              {'email' in p && p.email && (
                <span className="block text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
                  {p.email}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={startEdit}
              className="press min-h-12 self-start rounded-xl px-3 font-bold text-[var(--accent)]"
            >
              {ac.edit}
            </button>
            <PhotoPicker p={p} className="w-full" />
          </div>
        )}
      </Section>
      <Section title={ac.sync} aside={<SyncDot />}>
        <div className="glass flex flex-col gap-3 p-4">
          <p className="text-15 text-[var(--tx2)]">
            {status.lastSyncAt ? ac.lastSync(agoTxt(status.lastSyncAt)) : ac.neverSynced}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <PrimaryButton className="w-full px-5" onClick={() => void syncNow()}>
              {ac.syncNow}
            </PrimaryButton>
            <PrimaryButton
              tone="glass"
              className="w-full px-5"
              onClick={() => actions.open({ screen: 'import' })}
            >
              {ac.upload}
            </PrimaryButton>
          </div>
        </div>
      </Section>
      <Section title={ac.inbox}>
        <InboxList />
      </Section>
      <Section title={ac.changePassword}>
        <form onSubmit={changePw} className="glass p-4" noValidate>
          <PasswordField
            label={ac.current}
            autoComplete="current-password"
            value={pw.cur}
            onChange={(v) => setPw({ ...pw, cur: v })}
          />
          <PasswordField
            label={ac.newPassword}
            autoComplete="new-password"
            value={pw.next}
            onChange={(v) => setPw({ ...pw, next: v })}
            hint={t.hub.auth.passwordRule}
            error={pwErr}
          />
          <PrimaryButton type="submit" className="w-full" disabled={!pw.cur || !pw.next}>
            {ac.changePassword}
          </PrimaryButton>
        </form>
      </Section>
      <div className={`mt-2 grid gap-3 ${s.user.role === 'admin' ? 'grid-cols-2' : ''}`}>
        {s.user.role === 'admin' && (
          <PrimaryButton
            tone="glass"
            className="w-full gap-2 px-4"
            onClick={() => actions.open({ screen: 'admin' })}
          >
            {icon('shield')} {ac.admin}
          </PrimaryButton>
        )}
        <PrimaryButton tone="danger" className="w-full px-4" onClick={() => setAsk(true)}>
          {ac.signOut}
        </PrimaryButton>
      </div>
      <AnimatePresence>
        {ask && (
          <Modal
            key="out"
            text={ac.signOutOf(s.user.email)}
            body={pendingUploads() ? ac.pending(pendingUploads()) : ac.safe}
            ok={ac.keep}
            alt={{ label: ac.remove, onClick: () => void signOut(true) }}
            onOk={() => void signOut(false)}
            onCancel={() => setAsk(false)}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}
