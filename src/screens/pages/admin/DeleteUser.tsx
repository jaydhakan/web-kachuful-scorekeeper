import { useEffect, useState, type FormEvent } from 'react';
import { ep } from '@/sync/endpoints';
import type { DeletionPreview } from '@/sync/types';
import { ErrorState, Skeleton } from '@/components/ui/Page';
import { Field } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { authError } from '../AuthPages';
import { ad, adminError } from './shared';

export type DeleteKind = 'games' | 'account';

/**
 * Clearing someone's games, or deleting the account: it says exactly what goes and what stays, and the email has
 * to be typed before the button works.
 */
export function DeleteUser({
  kind,
  userId,
  email,
  onClose,
  onDone,
}: {
  kind: DeleteKind;
  userId: string;
  email: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [p, setP] = useState<DeletionPreview | Error | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = () => {
    setP(null);
    ep.deletionPreview(userId).then(setP, (e: unknown) =>
      setP(e instanceof Error ? e : new Error(String(e))),
    );
  };
  useEffect(load, [userId]);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  const run = async (e: FormEvent) => {
    e.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setErr('');
    try {
      if (kind === 'games') onDone(ad.cleared((await ep.clearUserGames(userId)).games));
      else {
        await ep.deleteUser(userId);
        onDone(ad.deleted(email));
      }
    } catch (x) {
      setErr(adminError(x));
      setBusy(false);
    }
  };
  let body;
  if (p instanceof Error) body = <ErrorState msg={authError(p)} onRetry={load} />;
  else if (!p) body = <Skeleton rows={3} />;
  else {
    const goes = [
      ad.gamesN(p.games, p.rounds),
      p.otherPlayers > 0 && ad.othersLose(p.otherPlayers),
      ...(kind === 'account'
        ? [
            ad.account,
            p.sessions > 0 && ad.sessionsN(p.sessions),
            p.invites > 0 && ad.invitesN(p.invites),
            p.hasPhoto && ad.photo,
            !p.playerInOthersGames && ad.playerGoes,
          ]
        : []),
    ].filter((x): x is string => !!x);
    const stays =
      kind === 'games' ? [ad.accountStays] : p.playerInOthersGames ? [ad.playerStays] : [];
    body = (
      <form onSubmit={run} noValidate>
        <h3 className="mb-1.5 text-14 font-bold text-[var(--neg)]">{ad.goes}</h3>
        <ul className="mb-4 flex list-disc flex-col gap-1 pl-5 text-15">
          {goes.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        {stays.length > 0 && (
          <>
            <h3 className="mb-1.5 text-14 font-bold text-[var(--tx2)]">{ad.stays}</h3>
            <ul className="mb-4 flex list-disc flex-col gap-1 pl-5 text-15 text-[var(--tx2)]">
              {stays.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mb-4 text-15 font-bold text-[var(--neg)]">{ad.hard}</p>
        <Field
          label={ad.confirmLabel}
          hint={ad.typeToConfirm(email)}
          type="email"
          inputMode="email"
          autoCapitalize="off"
          autoComplete="off"
          value={typed}
          onChange={setTyped}
          error={err}
        />
        <PrimaryButton type="submit" tone="danger" className="w-full" disabled={!matches || busy}>
          {kind === 'games' ? ad.clearGames : ad.deleteUser}
        </PrimaryButton>
      </form>
    );
  }
  return (
    <Sheet
      title={kind === 'games' ? ad.clearTitle(email) : ad.deleteTitle(email)}
      onClose={onClose}
    >
      {body}
    </Sheet>
  );
}
