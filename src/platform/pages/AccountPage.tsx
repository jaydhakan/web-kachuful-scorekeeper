import { AnimatePresence } from 'framer-motion';
import { useState, type FormEvent, type ReactNode } from 'react';
import { emailKey, emailOk, NAME_MAX, tidyName } from '@/people';
import { ACHIEVEMENTS } from '@/games/kachuful/domain';
import { agoTxt } from '@/lib/format';
import { timeLabel } from '@/lib/dates';
import { passwordOk } from '@/lib/password';
import { archive } from '@/state/archive';
import { recFromServer } from '@/state/registry';
import { useApp } from '@/games/kachuful/state/store';
import { useArchive } from '@/state/useArchive';
import { useThemeState } from '@/state/theme';
import { ep } from '@/sync/endpoints';
import { pendingUploads, signOutDevice } from '@/sync/signout';
import { syncNow } from '@/games/kachuful/sync/engine';
import { useSyncStatus } from '@/sync/status';
import { useRemote } from '@/sync/useRemote';
import { PhotoPicker } from '@/components/PhotoPicker';
import { SyncDot } from '@/components/SyncDot';
import { Avatar } from '@/components/ui/Avatar';
import { Field, LookPicker, PasswordField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, Page, Section } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { ProgressRing } from '@/components/ui/Stats';
import { HeroStat, HeroStatsSkeleton } from '@/components/ui/HeroStat';
import { authError } from './AuthPages';
import { InboxList } from './InboxList';
import { ClaimsList, useClaims } from './ClaimsList';
import { t } from '@/strings';
import { icon } from '@/components/ui/IconsMore';

const ac = t.hub.account;
type Open = 'photo' | 'edit' | 'password' | null;
interface Me {
  id: string;
  displayName: string;
  emoji: string;
  color: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
}

/** The signed-in person: their face, where they stand, sync, what needs them, and settings. */
export function AccountPage() {
  const { state, actions } = useApp();
  const s = state.session;
  const status = useSyncStatus();
  const me = useArchive((a) => (s?.player ? a.get('players', s.player.id) : undefined));
  const local = useArchive((a) => a.all('inbox').length);
  const claims = useClaims(!!state.session);
  const asks = claims.data?.items ?? [];
  const inbox = local + asks.length;
  const th = useThemeState();
  const [open, setOpen] = useState<Open>(null);
  const [ask, setAsk] = useState(false);
  if (!s)
    return (
      <Page title={ac.title}>
        <PrimaryButton className="w-full" onClick={() => actions.navReset([{ screen: 'signin' }])}>
          {t.hub.auth.signIn}
        </PrimaryButton>
      </Page>
    );
  const p: Me | null = me ?? (s.player && { ...s.player, firstName: null, lastName: null });
  const close = () => setOpen(null);
  const signOut = async (remove: boolean) => {
    setAsk(false);
    await signOutDevice(remove);
    actions.setSession(null);
    actions.navReset();
    actions.say(ac.signedOut);
  };
  const settings: (readonly [ReactNode, string, () => void])[] = [
    // Players pick their own theme only while the admin allows it.
    ...(th.appearance?.allowUserOverride
      ? [[Icon.palette, t.theme.menu, () => actions.openSheet({ type: 'theme' })] as const]
      : []),
    [Icon.key, ac.changePassword, () => setOpen('password')],
    ...(s.user.role === 'admin'
      ? [[icon('shield'), ac.admin, () => actions.open({ screen: 'admin' })] as const]
      : []),
  ];
  return (
    <Page title={ac.title}>
      {s.stale && (
        <button
          type="button"
          onClick={() => actions.open({ screen: 'signin' })}
          className="press glass mb-5 flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold text-[var(--warn)]"
        >
          {icon('warn')} {ac.stale}
        </button>
      )}
      {p ? (
        <>
          <Hero
            p={p}
            email={s.user.email}
            onPhoto={() => setOpen('photo')}
            onEdit={() => setOpen('edit')}
          />
          <MeStats id={p.id} />
          <button
            type="button"
            onClick={() => actions.open({ screen: 'player', params: { id: p.id } })}
            className="press glass mb-6 flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold"
          >
            <span className="flex-1">{ac.viewPlayer}</span>
            <span aria-hidden className="text-[var(--tx2)]">
              {Icon.chev}
            </span>
          </button>
        </>
      ) : (
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <p className="text-15 text-[var(--tx2)]">{ac.noPlayer}</p>
          <p className="text-14 text-[var(--tx2)] [overflow-wrap:anywhere]">{s.user.email}</p>
        </div>
      )}
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
      {inbox > 0 && (
        <Section title={ac.inbox(inbox)}>
          {asks.length > 0 && (
            <div className={local ? 'mb-2' : ''}>
              <ClaimsList items={asks} onDone={claims.reload} />
            </div>
          )}
          <InboxList />
        </Section>
      )}
      <Section title={ac.settings}>
        <ul className="glass overflow-hidden">
          {settings.map(([ic, label, go], i) => (
            <li key={label} className={i ? 'border-t border-ov/10' : ''}>
              <button
                type="button"
                onClick={go}
                className="press flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold"
              >
                <span aria-hidden className="grid h-6 w-6 place-items-center text-[var(--accent)]">
                  {ic}
                </span>
                <span className="flex-1">{label}</span>
                <span aria-hidden className="text-[var(--tx2)]">
                  {Icon.chev}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <PrimaryButton tone="danger" className="w-full px-4" onClick={() => setAsk(true)}>
        {ac.signOut}
      </PrimaryButton>
      <AnimatePresence>
        {open === 'photo' && p && (
          <Sheet key="photo" title={ac.photo} onClose={close}>
            <div className="flex flex-col items-center gap-4 pb-2">
              <Avatar p={p} className="grid h-24 w-24 place-items-center rounded-full text-52" />
              <PhotoPicker p={p} className="items-center" />
            </div>
          </Sheet>
        )}
        {open === 'edit' && p && (
          <Sheet key="edit" title={ac.editMe} onClose={close} full>
            <EditMe p={p} onDone={close} />
          </Sheet>
        )}
        {open === 'password' && (
          <Sheet key="password" title={ac.changePassword} onClose={close}>
            <ChangePassword onDone={close} />
          </Sheet>
        )}
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

/** The photo large, with the name, full name and email once beneath it. */
function Hero({
  p,
  email,
  onPhoto,
  onEdit,
}: {
  p: Me;
  email: string;
  onPhoto: () => void;
  onEdit: () => void;
}) {
  const full = [p.firstName, p.lastName].filter(Boolean).join(' ');
  return (
    <div className="mb-5 flex flex-col items-center text-center">
      <div className="relative">
        <button
          type="button"
          aria-label={ac.photoOf(p.displayName)}
          onClick={onPhoto}
          className="press rounded-full"
        >
          <Avatar p={p} className="grid h-28 w-28 place-items-center rounded-full text-64" />
        </button>
        <button
          type="button"
          aria-label={ac.editMe}
          onClick={onEdit}
          className="press glass absolute -bottom-1 -right-2 grid h-11 w-11 place-items-center !rounded-full text-[var(--accent)]"
        >
          {Icon.edit}
        </button>
      </div>
      <h2 className="disp mt-3 text-30 font-extrabold leading-tight [overflow-wrap:anywhere]">
        {p.displayName}
      </h2>
      <p className="mt-1 text-14 text-[var(--tx2)] [overflow-wrap:anywhere]">
        {[full, email].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

/** Rank, games and achievements from my profile (the one Home loads too); each opens its screen. */
function MeStats({ id }: { id: string }) {
  const { actions } = useApp();
  const r = useRemote(`p:${id}`, (o) => ep.player(id, o));
  if (r.data == null) {
    if (r.error) return <ErrorState msg={authError(r.error)} onRetry={r.reload} />;
    return (
      <div className="mb-3">
        <HeroStatsSkeleton />
      </div>
    );
  }
  const { rank, totals, achievements } = r.data;
  const unlocked = new Set(achievements.map((a) => a.code)).size;
  return (
    <div className="mb-3">
      {r.offline && r.fetchedAt && (
        <p role="status" className="mb-2 text-center text-13 text-[var(--tx2)]">
          {t.hub.common.offline} · {t.hub.common.asOf(timeLabel(r.fetchedAt))}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <HeroStat
          label={ac.rank}
          said={ac.rankSaid(rank.global, rank.outOf)}
          value={rank.global ? `#${rank.global}` : '–'}
          sub={rank.global ? ac.rankOf(rank.outOf) : ac.unranked}
          onClick={() => actions.open({ screen: 'leaderboard' })}
        />
        <HeroStat
          label={ac.games}
          said={ac.gamesSaid(totals.games)}
          value={totals.games}
          onClick={() => actions.open({ screen: 'history' })}
        />
        <HeroStat
          label={ac.achievements}
          said={ac.achievementsSaid(unlocked, ACHIEVEMENTS.length)}
          value={
            <span className="inline-flex items-center gap-1.5">
              <ProgressRing share={unlocked / ACHIEVEMENTS.length} className="h-6 w-6" />
              {unlocked}
            </span>
          }
          sub={`/ ${ACHIEVEMENTS.length}`}
          onClick={() => actions.open({ screen: 'achievements', params: { id } })}
        />
      </div>
    </div>
  );
}

function EditMe({ p, onDone }: { p: Me; onDone: () => void }) {
  const { state, actions } = useApp();
  const [form, setForm] = useState({
    name: p.displayName,
    email: p.email ?? '',
    first: p.firstName ?? '',
    last: p.lastName ?? '',
    emoji: p.emoji,
    color: p.color,
  });
  const [err, setErr] = useState('');
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const s = state.session;
    if (!s) return;
    // An email can be added or changed, never cleared.
    if (form.email.trim() && !emailOk(form.email)) return setErr(t.hub.sync2.emailInvalid);
    const email = form.email.trim() ? emailKey(form.email) : undefined;
    try {
      const out = await ep.patchPlayer(p.id, {
        ...(tidyName(form.name) !== p.displayName && { displayName: tidyName(form.name) }),
        ...(email && email !== (p.email ?? null) && { email }),
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
      onDone();
      actions.say(ac.saved);
    } catch (x) {
      setErr(authError(x));
    }
  };
  return (
    <form onSubmit={save} className="pb-2" noValidate>
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
        <PrimaryButton type="button" tone="glass" className="flex-1" onClick={onDone}>
          {t.common.cancel}
        </PrimaryButton>
        <PrimaryButton type="submit" className="flex-1" disabled={!form.name.trim()}>
          {ac.save}
        </PrimaryButton>
      </div>
    </form>
  );
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const { actions } = useApp();
  const [pw, setPw] = useState({ cur: '', next: '' });
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordOk(pw.next)) return setErr(t.hub.auth.errors.weak_password);
    try {
      await ep.changePassword(pw.cur, pw.next);
      onDone();
      actions.say(ac.passwordChanged);
    } catch (x) {
      setErr(authError(x));
    }
  };
  return (
    <form onSubmit={submit} className="pb-2" noValidate>
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
        error={err}
      />
      <PrimaryButton type="submit" className="w-full" disabled={!pw.cur || !pw.next}>
        {ac.changePassword}
      </PrimaryButton>
    </form>
  );
}
