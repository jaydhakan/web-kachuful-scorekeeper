import { AnimatePresence, m } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { agoTxt } from '@/lib/format';
import { useApp } from '@/state/store';
import { ep } from '@/sync/endpoints';
import type { AdminUserRow } from '@/sync/types';
import { Chip, ChipRow, EmptyState, ErrorState, Section, Skeleton } from '@/components/ui/Page';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { stagger } from '@/components/ui/stagger';
import { icon } from '@/components/ui/IconsMore';
import { authError } from '../AuthPages';
import { ad, adminError, allPlayers, Chevron, LinkBox, useLoad } from './shared';
import { PlayerTag } from '@/components/ui/PlayerTag';
import { Avatar } from '@/components/ui/Avatar';
import { DeleteUser, type DeleteKind } from './DeleteUser';

const keyOf = (r: AdminUserRow) => r.user?.id ?? 'invite:' + r.invite?.email;
const emailOf = (r: AdminUserRow) => r.user?.email ?? r.invite?.email ?? '';

const status = (r: AdminUserRow) =>
  r.invite
    ? ad.pendingInvite(new Date(r.invite.expiresAt).toLocaleDateString())
    : !r.active
      ? ad.inactive
      : r.lastSeenAt
        ? ad.lastSeen(agoTxt(r.lastSeenAt))
        : ad.never;

function Row({ r, i, onOpen }: { r: AdminUserRow; i: number; onOpen: () => void }) {
  return (
    <m.li {...stagger(Math.min(i, 10))}>
      <button
        type="button"
        onClick={onOpen}
        className="press glass flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left"
      >
        {r.player ? (
          <Avatar p={r.player} />
        ) : (
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full">
            {icon('envelope')}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-16 font-bold [overflow-wrap:anywhere]">{emailOf(r)}</span>
          <span className="block text-13 text-[var(--tx2)]">
            {r.player?.displayName ? `${r.player.displayName} · ` : ''}
            {r.user?.role === 'admin' && (
              <>
                {icon('shield')} {ad.adminTag}{' '}
              </>
            )}
            {status(r)}
          </span>
        </span>
        <Chevron />
      </button>
    </m.li>
  );
}

/** Accounts and invites, grouped; a row opens its actions, so the list itself stays quiet. */
export function People() {
  const { actions } = useApp();
  const [rows, reload] = useLoad(ep.adminUsers);
  const [players] = useLoad(allPlayers);
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [pid, setPid] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; note: string } | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<AdminUserRow | null>(null);
  const [off, setOff] = useState<AdminUserRow | null>(null);
  const [kill, setKill] = useState<{ kind: DeleteKind; r: AdminUserRow } | null>(null);
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
  const groups: [string, AdminUserRow[]][] = [
    [ad.pending, rows.filter((r) => r.invite)],
    [ad.active, rows.filter((r) => !r.invite && r.active)],
    [ad.switchedOff, rows.filter((r) => !r.invite && !r.active)],
  ];
  let i = 0;
  return (
    <>
      <PrimaryButton
        className="mb-5 w-full"
        onClick={() => (setInvite(true), setLink(null), setEmail(''), setPid(null))}
      >
        {icon('envelope')} {ad.invite}
      </PrimaryButton>
      {rows.length === 0 ? (
        <EmptyState icon="cards" title={ad.noPeople} />
      ) : (
        groups.map(
          ([title, list]) =>
            list.length > 0 && (
              <Section
                key={title}
                title={title}
                aside={<span className="text-13 text-[var(--tx2)]">{list.length}</span>}
              >
                <ul className="flex flex-col gap-2">
                  {list.map((r) => (
                    <Row key={keyOf(r)} r={r} i={i++} onOpen={() => setOpen(r)} />
                  ))}
                </ul>
              </Section>
            ),
        )
      )}
      {open && !link && (
        <Sheet title={emailOf(open)} onClose={() => setOpen(null)}>
          <p className="mb-4 text-15 text-[var(--tx2)]">
            {open.player?.displayName ? `${open.player.displayName} · ` : ''}
            {status(open)}
          </p>
          <div className="flex flex-col gap-2">
            {open.invite && (
              <>
                {/* Links are kept only as hashes: a fresh one replaces the pending invite. */}
                <PrimaryButton
                  onClick={() =>
                    act(async () => {
                      const x = await ep.invitePerson(open.invite!.email, open.player?.id);
                      setLink({ url: x.inviteUrl, note: ad.linkReady });
                    })
                  }
                >
                  {ad.newLink}
                </PrimaryButton>
                <PrimaryButton
                  tone="glass"
                  onClick={() =>
                    void act(() => ep.revokeInvite(open.invite!.email)).then(() => setOpen(null))
                  }
                >
                  {ad.revoke}
                </PrimaryButton>
              </>
            )}
            {open.user && (
              <>
                <PrimaryButton
                  onClick={() =>
                    act(async () => {
                      const x = await ep.resetLink(open.user!.id);
                      setLink({ url: x.resetUrl, note: ad.resetReady });
                    })
                  }
                >
                  {ad.resetLink}
                </PrimaryButton>
                <PrimaryButton
                  tone="glass"
                  onClick={() =>
                    open.active
                      ? (setOff(open), setOpen(null))
                      : void act(() => ep.setActive(open.user!.id, true)).then(() => setOpen(null))
                  }
                >
                  {open.active ? ad.deactivate : ad.activate}
                </PrimaryButton>
                {open.user.role !== 'admin' && (
                  <section aria-label={ad.danger} className="mt-4 flex flex-col gap-2">
                    <h3 className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--neg)]">
                      {ad.danger}
                    </h3>
                    <PrimaryButton
                      tone="glass"
                      onClick={() => (setKill({ kind: 'games', r: open }), setOpen(null))}
                    >
                      {ad.clearGames}
                    </PrimaryButton>
                    <PrimaryButton
                      tone="danger"
                      onClick={() => (setKill({ kind: 'account', r: open }), setOpen(null))}
                    >
                      {ad.deleteUser}
                    </PrimaryButton>
                  </section>
                )}
              </>
            )}
          </div>
        </Sheet>
      )}
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
                          <PlayerTag p={p} name={p.displayName} />
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
        <Sheet
          title={link.note === ad.resetReady ? ad.resetLink : ad.newLink}
          onClose={() => (setLink(null), setOpen(null))}
        >
          <LinkBox {...link} />
        </Sheet>
      )}
      {kill?.r.user && (
        <DeleteUser
          kind={kill.kind}
          userId={kill.r.user.id}
          email={kill.r.user.email}
          onClose={() => setKill(null)}
          onDone={(msg) => {
            setKill(null);
            actions.say(msg);
            reload();
          }}
        />
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
