import { useState, type FormEvent } from 'react';
import type { Seated } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { canShareLink, copyText, shareLink } from '@/lib/clip';
import { emailOk } from '@/people';
import { archive } from '@/state/archive';
import { resolveId } from '@/state/registry';
import { ep } from '@/sync/endpoints';
import { Field } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';

const x = s.invite;

/**
 * Invites someone seated without an account, through the app's one invite flow (an admin creates the link and
 * hands it over); anyone else is told to ask the admin.
 */
export function InviteSheet({
  p,
  admin,
  onClose,
}: {
  p: Seated;
  admin: boolean;
  onClose: () => void;
}) {
  const known = p.playerId ? archive.get('players', resolveId(p.playerId))?.email : null;
  const [email, setEmail] = useState(known ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailOk(email) || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await ep.invitePerson(email.trim(), p.playerId ? resolveId(p.playerId) : undefined);
      setUrl(r.inviteUrl);
    } catch {
      setErr(x.failed);
    }
    setBusy(false);
  };
  return (
    <Sheet title={x.title(p.name)} onClose={onClose}>
      {!admin ? (
        <p className="pb-4 text-17 leading-snug text-[var(--tx2)]">{x.adminOnly(p.name)}</p>
      ) : url ? (
        <div className="glass flex flex-col gap-3 p-4">
          <p className="text-15 text-[var(--tx2)]">{x.ready}</p>
          <code className="block select-all break-all rounded-xl bg-shade/30 p-3 text-14">
            {url}
          </code>
          <div className="flex gap-2">
            <PrimaryButton className="flex-1" onClick={async () => setCopied(await copyText(url))}>
              {copied ? x.copied : x.copy}
            </PrimaryButton>
            {canShareLink() && (
              <PrimaryButton tone="glass" className="px-5" onClick={() => void shareLink(url)}>
                {x.share}
              </PrimaryButton>
            )}
          </div>
          <p role="status" className="sr-only">
            {copied ? x.copied : ''}
          </p>
        </div>
      ) : (
        <form onSubmit={send} noValidate className="flex flex-col gap-3 pb-2">
          <p className="text-16 leading-snug text-[var(--tx2)]">{x.body(p.name)}</p>
          <Field
            label={x.email}
            type="email"
            inputMode="email"
            autoCapitalize="off"
            autoComplete="off"
            value={email}
            onChange={setEmail}
            error={err}
          />
          <PrimaryButton
            type="submit"
            className="w-full"
            disabled={!emailOk(email) || busy}
            aria-busy={busy || undefined}
          >
            {busy ? x.creating : x.create}
          </PrimaryButton>
        </form>
      )}
    </Sheet>
  );
}
