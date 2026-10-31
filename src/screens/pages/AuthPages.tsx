import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type FormEvent } from 'react';
import { COLORS, EMOJIS, nameKey, NAME_MAX, tidyName } from '@/domain';
import { uuid } from '@/lib/ids';
import { passwordOk } from '@/lib/password';
import { useApp } from '@/state/store';
import { ApiError } from '@/sync/api';
import { sessionOf, signIn } from '@/sync/account';
import { ep } from '@/sync/endpoints';
import type { PlayerSummary } from '@/sync/types';
import { EmptyState, Page, Skeleton } from '@/components/ui/Page';
import { Field, LookPicker, PasswordField } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE } from '@/components/ui/motion';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

const a = t.hub.auth;

/** A sentence for a failed call, with the wait time when rate limited. */
export function authError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'rate_limited' && typeof e.body.retryAfter === 'number')
      return a.wait(e.body.retryAfter);
    return a.errors[e.code] ?? (e.offline ? a.errors.offline : a.errors.server);
  }
  return a.errors.server;
}

export function SignInPage() {
  const { actions } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim() || !pw) return;
    setBusy(true);
    setErr('');
    try {
      const s = await signIn(email, pw);
      actions.setSession(s);
      actions.back();
      actions.say(a.signedIn(s.player?.displayName ?? s.user.email));
    } catch (x) {
      setErr(authError(x));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page title={a.signInTitle}>
      <p className="mb-6 text-16 leading-[1.45] text-[var(--tx2)]">{a.signInBody}</p>
      <form onSubmit={submit} noValidate>
        <Field
          label={a.email}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="next"
          value={email}
          onChange={setEmail}
        />
        <PasswordField
          label={a.password}
          autoComplete="current-password"
          enterKeyHint="go"
          value={pw}
          onChange={setPw}
          error={err}
        />
        <PrimaryButton
          type="submit"
          className="mt-2 w-full"
          disabled={busy || !email.trim() || !pw}
        >
          {busy ? a.busy : a.signIn}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-center text-15 text-[var(--tx2)]">{a.forgot}</p>
    </Page>
  );
}

/** Password and confirmation with the rule; `null` until both are good. */
function usePasswordPair() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [touched, setTouched] = useState(false);
  const weak = touched && pw.length > 0 && !passwordOk(pw);
  const mismatch = touched && pw2.length > 0 && pw !== pw2;
  const fields = (
    <>
      <PasswordField
        label={a.password}
        autoComplete="new-password"
        value={pw}
        onChange={(v) => (setPw(v), setTouched(true))}
        hint={a.passwordRule}
        error={weak ? a.errors.weak_password : ''}
      />
      <PasswordField
        label={a.confirm}
        autoComplete="new-password"
        value={pw2}
        onChange={(v) => (setPw2(v), setTouched(true))}
        error={mismatch ? a.mismatch : ''}
      />
    </>
  );
  return { fields, value: passwordOk(pw) && pw === pw2 ? pw : null };
}

type InviteState =
  | { k: 'loading' }
  | { k: 'gone'; msg: string }
  | { k: 'ready'; email: string; player: PlayerSummary | null };

export function InvitePage({ token }: { token: string }) {
  const rm = useReducedMotion();
  const [st, setSt] = useState<InviteState>({ k: 'loading' });
  const [claim, setClaim] = useState<PlayerSummary | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [look, setLook] = useState({ emoji: EMOJIS[0], color: COLORS[0] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pw = usePasswordPair();
  const [id] = useState(uuid);

  useEffect(() => {
    let live = true;
    ep.invite(token)
      .then((r) => {
        if (!live) return;
        setSt({ k: 'ready', email: r.email, player: r.player });
        setClaim(r.player);
      })
      .catch((e: unknown) => live && setSt({ k: 'gone', msg: authError(e) }));
    return () => {
      live = false;
    };
  }, [token]);

  const { actions } = useApp();

  if (st.k === 'loading')
    return (
      <Page title={a.inviteTitle}>
        <p className="mb-4 text-15 text-[var(--tx2)]">{a.checking}</p>
        <Skeleton rows={3} />
      </Page>
    );
  if (st.k === 'gone')
    return (
      <Page title={a.inviteTitle}>
        <EmptyState icon="⌛" title={st.msg} />
      </Page>
    );

  // The server offers the invite's player, or the player with the invite's email; a name clash reveals nobody.
  const offer = claim && !declined.includes(claim.id) ? claim : null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw.value || busy) return;
    const player =
      offer && claim?.id === offer.id
        ? { id: offer.id }
        : {
            id,
            displayName: tidyName(name),
            ...(first.trim() && { firstName: first.trim() }),
            ...(last.trim() && { lastName: last.trim() }),
            ...look,
          };
    if (!('id' in player && Object.keys(player).length === 1) && !nameKey(name)) return;
    setBusy(true);
    setErr('');
    try {
      const r = await ep.acceptInvite(token, pw.value, player);
      actions.setSession(sessionOf(r.user, r.player));
      actions.navReset();
      actions.say(a.signedIn(r.player.displayName));
    } catch (x) {
      setErr(authError(x));
    } finally {
      setBusy(false);
    }
  };
  const ready = !!pw.value && (!!(offer && claim?.id === offer.id) || !!nameKey(name));
  return (
    <Page title={a.inviteTitle}>
      <p className="mb-6 text-16 text-[var(--tx2)]">{a.inviteBody(st.email)}</p>
      <form onSubmit={submit} noValidate>
        <AnimatePresence mode="wait" initial={false}>
          {offer ? (
            <motion.div
              key={'offer' + offer.id}
              initial={rm ? { opacity: 0 } : { opacity: 0, rotateX: -60 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="glass mb-6 flex flex-col items-center gap-2 p-5 text-center"
            >
              <div className="text-15 font-bold text-[var(--accent)]">{a.isThisYou}</div>
              <Avatar
                p={offer}
                className="grid h-16 w-16 place-items-center rounded-full text-36"
              />
              <div className="disp text-24 font-extrabold">{offer.displayName}</div>
              <div className="text-14 text-[var(--tx2)]">
                {a.games(offer.games, offer.createdByName)}
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <PrimaryButton
                  type="button"
                  className="px-5"
                  onClick={() => (setClaim(offer), setName(''))}
                  aria-pressed={claim?.id === offer.id}
                >
                  {a.yesMe}
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  tone="glass"
                  className="px-5"
                  onClick={() => {
                    setDeclined([...declined, offer.id]);
                    if (claim?.id === offer.id) setClaim(null);
                  }}
                >
                  {a.notMe}
                </PrimaryButton>
              </div>
            </motion.div>
          ) : (
            <motion.fieldset
              key="new"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-2"
            >
              <legend className="disp mb-3 text-20 font-bold">{a.newPlayer}</legend>
              <Field
                label={a.displayName}
                value={name}
                maxLength={NAME_MAX}
                autoCapitalize="words"
                autoComplete="off"
                onChange={setName}
                hint={a.displayHint}
              />
              <Field
                label={a.yourEmail}
                value={st.email}
                onChange={() => {}}
                readOnly
                hint={a.emailFixed}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={a.firstName}
                  value={first}
                  onChange={setFirst}
                  autoComplete="given-name"
                />
                <Field
                  label={a.lastName}
                  value={last}
                  onChange={setLast}
                  autoComplete="family-name"
                />
              </div>
              <LookPicker emoji={look.emoji} color={look.color} onChange={setLook} />
            </motion.fieldset>
          )}
        </AnimatePresence>
        {pw.fields}
        {err && (
          <p role="alert" className="mb-3 text-15 text-[var(--warn)]">
            {err}
          </p>
        )}
        <PrimaryButton type="submit" className="w-full" disabled={!ready || busy}>
          {a.finish}
        </PrimaryButton>
      </form>
    </Page>
  );
}

export function ResetPage({ token }: { token: string }) {
  const { actions } = useApp();
  const [email, setEmail] = useState<string | null>(null);
  const [gone, setGone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pw = usePasswordPair();
  useEffect(() => {
    ep.reset(token)
      .then((r) => setEmail(r.email))
      .catch((e: unknown) => setGone(authError(e)));
  }, [token]);
  if (gone)
    return (
      <Page title={a.resetTitle}>
        <EmptyState icon="⌛" title={gone} />
      </Page>
    );
  if (!email)
    return (
      <Page title={a.resetTitle}>
        <p className="mb-4 text-15 text-[var(--tx2)]">{a.checking}</p>
        <Skeleton rows={2} />
      </Page>
    );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw.value || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await ep.acceptReset(token, pw.value);
      actions.setSession(sessionOf(r.user, r.player));
      actions.navReset();
      actions.say(a.resetDone);
    } catch (x) {
      setErr(authError(x));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page title={a.resetTitle}>
      <p className="mb-6 text-16 text-[var(--tx2)]">{a.resetBody(email)}</p>
      <form onSubmit={submit} noValidate>
        {pw.fields}
        {err && (
          <p role="alert" className="mb-3 text-15 text-[var(--warn)]">
            {err}
          </p>
        )}
        <PrimaryButton type="submit" className="w-full" disabled={!pw.value || busy}>
          {a.resetTitle}
        </PrimaryButton>
      </form>
    </Page>
  );
}
