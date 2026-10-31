import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { emailKey, emailOk, nameKey } from '@/domain';
import { canShareLink, copyText, shareLink } from '@/lib/clip';
import { agoTxt } from '@/lib/format';
import { useApp } from '@/state/store';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { AdminUserRow, Player } from '@/sync/types';
import { Chip, ChipRow, EmptyState, ErrorState, Page, Skeleton } from '@/components/ui/Page';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { StatTile, TileGrid } from '@/components/ui/Stats';
import { stagger } from '@/components/ui/stagger';
import { authError } from './AuthPages';
import { t } from '@/strings';

const ad = t.hub.admin;

const adminError = (e: unknown) =>
  e instanceof ApiError && ad.errors[e.code] ? ad.errors[e.code] : authError(e);

/** A link to hand over: copy, or the system share sheet. */
function LinkBox({ url, note }: { url: string; note: string }) {
  const { actions } = useApp();
  return (
    <div className="glass flex flex-col gap-3 p-4">
      <p className="text-15 text-[var(--tx2)]">{note}</p>
      <code className="block select-all break-all rounded-xl bg-black/30 p-3 text-14">{url}</code>
      <div className="flex gap-2">
        <PrimaryButton
          className="flex-1"
          onClick={async () => actions.say((await copyText(url)) ? ad.copied : url)}
        >
          {ad.copy}
        </PrimaryButton>
        {canShareLink() && (
          <PrimaryButton tone="glass" className="px-5" onClick={() => void shareLink(url)}>
            {ad.share}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

export function AdminPage() {
  const { state } = useApp();
  const [tab, setTab] = useState<'users' | 'players' | 'overview'>('users');
  if (state.session?.user.role !== 'admin')
    return (
      <Page title={ad.title}>
        <EmptyState icon="🔒" title={t.hub.auth.errors.server} />
      </Page>
    );
  return (
    <Page
      title={ad.title}
      sub={
        <ChipRow label={ad.tabs}>
          <Chip on={tab === 'users'} onClick={() => setTab('users')}>
            {ad.users}
          </Chip>
          <Chip on={tab === 'players'} onClick={() => setTab('players')}>
            {ad.players}
          </Chip>
          <Chip on={tab === 'overview'} onClick={() => setTab('overview')}>
            {ad.overview}
          </Chip>
        </ChipRow>
      }
    >
      {tab === 'users' ? <Users /> : tab === 'players' ? <Players /> : <Overview />}
    </Page>
  );
}

/** Loads with retry; `null` while loading, an Error after a failure. */
function useLoad<T>(f: () => Promise<T>) {
  const [v, setV] = useState<T | null | Error>(null);
  const load = useCallback(() => {
    setV(null);
    f().then(setV, (e: unknown) => setV(e instanceof Error ? e : new Error(String(e))));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the loader is fixed per screen
  }, []);
  useEffect(load, [load]);
  return [v, load] as const;
}

function Users() {
  const { actions } = useApp();
  const [rows, reload] = useLoad(ep.adminUsers);
  const [players] = useLoad(() => ep.players().then((p) => p.items.filter((x) => !x.mergedInto)));
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [pid, setPid] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; note: string } | null>(null);
  const [err, setErr] = useState('');
  const [off, setOff] = useState<AdminUserRow | null>(null);
  if (rows instanceof Error) return <ErrorState msg={authError(rows)} onRetry={reload} />;
  if (!rows) return <Skeleton rows={4} />;
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const r = await ep.invitePerson(email.trim(), pid ?? undefined);
      setLink({ url: r.inviteUrl, note: ad.linkReady });
      reload();
    } catch (x) {
      setErr(adminError(x));
    }
  };
  const act = async (f: () => Promise<unknown>) => {
    try {
      await f();
      reload();
    } catch (x) {
      actions.say(adminError(x));
    }
  };
  return (
    <>
      <PrimaryButton
        className="mb-5 w-full"
        onClick={() => (setInvite(true), setLink(null), setEmail(''), setPid(null))}
      >
        ✉️ {ad.invite}
      </PrimaryButton>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <motion.li
            key={r.user?.id ?? 'invite:' + r.invite?.email}
            {...stagger(Math.min(i, 10))}
            className="glass flex flex-col gap-2 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
                style={{ background: r.player?.color ?? 'transparent' }}
              >
                {r.player?.emoji ?? '✉️'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-16 font-bold [overflow-wrap:anywhere]">
                  {r.user?.email ?? r.invite?.email}
                </span>
                <span className="block text-13 text-[var(--tx2)]">
                  {r.player?.displayName ? `${r.player.displayName} · ` : ''}
                  {r.user?.role === 'admin' ? '🛡️ admin · ' : ''}
                  {r.invite
                    ? ad.pendingInvite(new Date(r.invite.expiresAt).toLocaleDateString())
                    : !r.active
                      ? ad.inactive
                      : r.lastSeenAt
                        ? ad.lastSeen(agoTxt(r.lastSeenAt))
                        : ad.never}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {r.invite && (
                <>
                  {/* Links are kept only as hashes: a fresh one replaces the pending invite. */}
                  <button
                    type="button"
                    className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
                    onClick={() =>
                      act(async () => {
                        const x = await ep.invitePerson(r.invite!.email, r.player?.id);
                        setLink({ url: x.inviteUrl, note: ad.linkReady });
                      })
                    }
                  >
                    {ad.newLink}
                  </button>
                  <button
                    type="button"
                    className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
                    onClick={() => act(() => ep.revokeInvite(r.invite!.email))}
                  >
                    {ad.revoke}
                  </button>
                </>
              )}
              {r.user && (
                <>
                  <button
                    type="button"
                    className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
                    onClick={() =>
                      act(async () => {
                        const x = await ep.resetLink(r.user!.id);
                        setLink({ url: x.resetUrl, note: ad.resetReady });
                      })
                    }
                  >
                    {ad.resetLink}
                  </button>
                  <button
                    type="button"
                    className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
                    onClick={() =>
                      r.active ? setOff(r) : act(() => ep.setActive(r.user!.id, true))
                    }
                  >
                    {r.active ? ad.deactivate : ad.activate}
                  </button>
                </>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
      {invite && (
        <Sheet title={ad.inviteTitle} onClose={() => setInvite(false)}>
          {link ? (
            <LinkBox {...link} />
          ) : (
            <form onSubmit={send} noValidate>
              <Field
                label={ad.inviteEmail}
                type="email"
                inputMode="email"
                autoCapitalize="off"
                value={email}
                onChange={setEmail}
                error={err}
              />
              <fieldset className="mb-4">
                <legend className="mb-1.5 text-14 font-bold text-[var(--tx2)]">
                  {ad.invitePlayer}
                </legend>
                <ChipRow label={ad.invitePlayer}>
                  <Chip on={!pid} onClick={() => setPid(null)}>
                    {ad.noPlayer}
                  </Chip>
                  {players instanceof Array &&
                    players
                      .filter((p) => !p.linkedUserId)
                      .map((p) => (
                        <Chip key={p.id} on={pid === p.id} onClick={() => setPid(p.id)}>
                          {p.emoji} {p.displayName}
                        </Chip>
                      ))}
                </ChipRow>
              </fieldset>
              <PrimaryButton type="submit" className="w-full" disabled={!email.includes('@')}>
                {ad.createLink}
              </PrimaryButton>
            </form>
          )}
        </Sheet>
      )}
      {link && !invite && (
        <Sheet title={ad.resetLink} onClose={() => setLink(null)}>
          <LinkBox {...link} />
        </Sheet>
      )}
      <AnimatePresence>
        {off && (
          <Modal
            key="off"
            text={ad.deactivateAsk(off.user!.email)}
            ok={ad.deactivate}
            danger
            onCancel={() => setOff(null)}
            onOk={() => {
              const id = off.user!.id;
              setOff(null);
              void act(() => ep.setActive(id, false));
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Players() {
  const { actions } = useApp();
  const [list, reload] = useLoad(() =>
    ep.players().then((p) => p.items.filter((x) => !x.mergedInto)),
  );
  const [q, setQ] = useState('');
  const [from, setFrom] = useState<Player | null>(null);
  const [into, setInto] = useState<{ p: Player; games: number } | null>(null);
  const [mail, setMail] = useState<{ p: Player; v: string; err: string } | null>(null);
  if (list instanceof Error) return <ErrorState msg={authError(list)} onRetry={reload} />;
  if (!list) return <Skeleton rows={5} />;
  const k = nameKey(q);
  const shown = k ? list.filter((p) => nameKey(p.displayName).includes(k)) : list;
  const pickInto = async (p: Player) => {
    const games = await ep
      .playerGames(from!.id)
      .then((r) => r.items.length)
      .catch(() => 0);
    setInto({ p, games });
  };
  return (
    <>
      <Field label={t.hub.people.search} type="search" value={q} onChange={setQ} />
      <ul className="flex flex-col gap-2">
        {shown.map((p) => (
          <li key={p.id} className="glass flex min-h-14 items-center gap-3 px-4 py-2">
            <span aria-hidden className="text-22">
              {p.emoji}
            </span>
            <span className="min-w-0 flex-1 text-16 font-bold [overflow-wrap:anywhere]">
              {p.displayName}
              <span className="block text-13 font-medium text-[var(--tx2)]">
                {p.email ?? ad.noEmail}
              </span>
              {p.linkedUserId && (
                <span className="ml-2 text-13 font-medium text-[var(--tx2)]">· {ad.linked}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setMail({ p, v: p.email ?? '', err: '' })}
              className="min-h-11 rounded-xl px-3 text-14 font-bold text-[var(--accent)]"
            >
              {ad.email}
            </button>
            <button
              type="button"
              onClick={() => setFrom(p)}
              className="min-h-11 rounded-xl px-3 text-14 font-bold text-[var(--accent)]"
            >
              {ad.merge}
            </button>
          </li>
        ))}
      </ul>
      {mail && (
        <Sheet title={`${ad.email} · ${mail.p.displayName}`} onClose={() => setMail(null)}>
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailOk(mail.v)) return setMail({ ...mail, err: t.hub.sync2.emailInvalid });
              try {
                await ep.patchPlayer(mail.p.id, { email: emailKey(mail.v) });
                setMail(null);
                actions.say(t.hub.account.saved);
                reload();
              } catch (x) {
                setMail({ ...mail, err: adminError(x) });
              }
            }}
          >
            <Field
              label={ad.email}
              type="email"
              inputMode="email"
              autoCapitalize="off"
              value={mail.v}
              onChange={(v) => setMail({ ...mail, v, err: '' })}
              error={mail.err}
              hint={t.hub.sync2.emailHint}
            />
            <PrimaryButton type="submit" className="w-full">
              {t.common.save}
            </PrimaryButton>
          </form>
        </Sheet>
      )}
      {from && !into && (
        <Sheet title={`${ad.merge} ${from.displayName}`} onClose={() => setFrom(null)}>
          <ul className="flex flex-col gap-1">
            {list
              .filter((p) => p.id !== from.id)
              .map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void pickInto(p)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-left text-17 font-bold"
                  >
                    <span aria-hidden>{p.emoji}</span>
                    {p.displayName}
                  </button>
                </li>
              ))}
          </ul>
        </Sheet>
      )}
      <AnimatePresence>
        {from && into && (
          <Modal
            key="merge"
            text={ad.mergeAsk(from.displayName, into.p.displayName, into.games)}
            ok={ad.merge.replace('…', '')}
            danger
            onCancel={() => (setInto(null), setFrom(null))}
            onOk={async () => {
              const a = from.id,
                b = into.p.id;
              setInto(null);
              setFrom(null);
              try {
                await ep.merge(a, b);
                actions.say(ad.merged);
                reload();
              } catch (x) {
                actions.say(adminError(x));
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Overview() {
  const [o, reload] = useLoad(ep.overview);
  if (o instanceof Error) return <ErrorState msg={authError(o)} onRetry={reload} />;
  if (!o) return <Skeleton rows={2} h={88} />;
  const c = ad.counts;
  return (
    <TileGrid>
      <StatTile label={c.users} value={o.users} />
      <StatTile label={c.players} value={o.players} />
      <StatTile label={c.games} value={o.games} />
      <StatTile label={c.rounds} value={o.rounds} />
      <StatTile label={c.backup} value={o.lastBackupAt ? agoTxt(o.lastBackupAt) : ad.noBackup} />
    </TileGrid>
  );
}
