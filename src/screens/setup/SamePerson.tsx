import { m, useReducedMotion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { emailKey, emailOk, nameKey, suggestName } from '@/domain';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { PlayerSummary } from '@/sync/types';
import { livePlayers, people, rememberSame, type Person } from '@/state/registry';
import { useApp } from '@/state/store';
import { Avatar } from '@/components/ui/Avatar';
import { EASE } from '@/components/ui/motion';
import { t } from '@/strings';

const x = t.hub.sync2;

/** The optional first and last name a new player can be given at setup. */
export type FullName = { firstName?: string; lastName?: string };

/** "Is this Riya?": only ever shown when name and email both belong to that player. */
export function SameCard({
  match,
  onYes,
  onNo,
  className = '',
}: {
  match: Pick<
    PlayerSummary,
    'displayName' | 'emoji' | 'color' | 'photoUrl' | 'games' | 'createdByName'
  >;
  onYes: () => void;
  onNo: () => void;
  className?: string;
}) {
  const ask = x.isThis(match.displayName);
  const rm = useReducedMotion();
  return (
    <m.div
      role="group"
      aria-label={ask}
      initial={rm ? { opacity: 0 } : { opacity: 0, rotateX: -70, y: -6 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={`glass flex flex-wrap items-center gap-3 p-3 ${className}`}
    >
      <Avatar
        p={match}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-24"
      />
      <span className="min-w-0 flex-1 basis-40">
        <span className="block text-16 font-bold">{ask}</span>
        <span className="block text-13 text-[var(--tx2)]">
          {t.hub.auth.games(match.games, match.createdByName || '—')}
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onYes}
          className="press min-h-11 rounded-xl bg-[var(--accent)] px-3 text-14 font-bold text-ink-on-accent"
        >
          {x.yes}
        </button>
        <button
          type="button"
          onClick={onNo}
          className="press glass min-h-11 rounded-xl px-3 text-14 font-bold"
        >
          {x.recheck}
        </button>
      </span>
    </m.div>
  );
}

export type NewPlayerCheck =
  | { kind: 'ok' }
  | { kind: 'match'; player: PlayerSummary }
  | { kind: 'emailErr' | 'nameTaken'; msg: string };

/**
 * A new player's name and email, checked with the server (HANDOFF §5.7). Offline, `ok`: the player is created
 * later and a clash lands in the inbox.
 */
export async function checkNewPlayer(
  name: string,
  email: string,
  taken: string[],
): Promise<NewPlayerCheck> {
  if (!emailOk(email)) return { kind: 'emailErr', msg: x.emailInvalid };
  if (taken.includes(emailKey(email))) return { kind: 'emailErr', msg: x.emailAtTable };
  try {
    const r = await ep.checkPlayer(name, emailKey(email));
    if (r.status === 'match') return { kind: 'match', player: r.player };
    if (r.status === 'email_taken') return { kind: 'emailErr', msg: x.emailTaken };
    if (r.status === 'name_taken') return { kind: 'nameTaken', msg: x.nameTaken(name) };
    return { kind: 'ok' };
  } catch (e) {
    if (e instanceof ApiError && e.offline) return { kind: 'ok' };
    if (e instanceof ApiError && e.retryAfter)
      return { kind: 'emailErr', msg: t.hub.auth.wait(e.retryAfter) };
    return { kind: 'emailErr', msg: t.hub.auth.errors.server };
  }
}

/**
 * Signed in, someone outside this account's circle is added by name and email, checked with the server
 * (HANDOFF §5.7). Both matching one player asks "Is this Riya?"; a taken name or email reveals nobody and asks for
 * another; offline, the player is created later and a clash lands in the inbox.
 */
export function EmailStep({
  name,
  taken,
  onDone,
  onSame,
  onRename,
  initialEmail = '',
  className = '',
}: {
  name: string;
  /** Emails already at this table. */
  taken: string[];
  /** A new player with this email, and their full name when given. */
  onDone: (email: string, names: FullName) => void;
  /** The server's player with this name and email. */
  onSame: (p: PlayerSummary) => void;
  /** The name is someone else's: ask again with this free one (and the email typed so far). */
  onRename: (name: string, email: string) => void;
  initialEmail?: string;
  className?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [err, setErr] = useState('');
  const [match, setMatch] = useState<PlayerSummary | null>(null);
  const [nameTaken, setNameTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const { actions } = useApp();
  const names: FullName = {
    ...(first.trim() && { firstName: first.trim() }),
    ...(last.trim() && { lastName: last.trim() }),
  };
  const other = suggestName(name, new Set(livePlayers().map((p) => p.nameKey)));
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setNameTaken(false);
    const r = await checkNewPlayer(name, email, taken);
    setBusy(false);
    if (r.kind === 'match') setMatch(r.player);
    else if (r.kind === 'ok') onDone(emailKey(email), names);
    else {
      setNameTaken(r.kind === 'nameTaken');
      setErr(r.msg);
    }
  };
  if (match)
    return (
      <SameCard
        className={className}
        match={match}
        onYes={() => {
          rememberSame(match.id);
          actions.vib();
          onSame(match);
        }}
        onNo={() => (setMatch(null), setErr(x.recheckHint))}
      />
    );
  return (
    <form onSubmit={submit} className={`flex flex-col gap-1.5 ${className}`} noValidate>
      <label htmlFor={'em-' + name} className="text-14 font-bold text-[var(--tx2)]">
        {x.emailFor(name)}
      </label>
      <div className="flex gap-2">
        <input
          id={'em-' + name}
          type="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          value={email}
          onChange={(e) => (setEmail(e.target.value), setErr(''), setNameTaken(false))}
          aria-invalid={!!err}
          aria-describedby={'em-' + name + '-h'}
          placeholder={x.emailPlaceholder}
          className="h-12 min-w-0 flex-1 rounded-2xl mat-inp px-4 text-17 outline-none placeholder:text-[var(--ph)]"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="press min-h-12 rounded-2xl bg-[var(--accent)] px-4 text-16 font-bold text-ink-on-accent disabled:opacity-50"
        >
          {t.setup.add}
        </button>
      </div>
      <p
        id={'em-' + name + '-h'}
        role={err ? 'alert' : undefined}
        className={`text-13 ${err ? 'text-[var(--warn)]' : 'text-[var(--tx2)]'}`}
      >
        {err || x.emailHint}
      </p>
      {full ? (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [t.hub.auth.firstName, first, setFirst, 'first'],
              [t.hub.auth.lastName, last, setLast, 'last'],
            ] as const
          ).map(([label, v, set, k]) => (
            <label
              key={k}
              className="flex min-w-0 flex-col gap-1 text-13 font-bold text-[var(--tx2)]"
            >
              {label}
              <input
                value={v}
                onChange={(e) => set(e.target.value)}
                autoComplete="off"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 min-w-0 rounded-2xl mat-inp px-4 text-17 font-normal text-[var(--tx)] outline-none"
              />
            </label>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFull(true)}
          className="press min-h-11 self-start rounded-xl px-1 text-14 font-bold text-[var(--accent)]"
        >
          {x.addFullName}
        </button>
      )}
      {nameTaken && (
        <button
          type="button"
          onClick={() => onRename(other, email)}
          className="press glass min-h-11 self-start rounded-xl px-3 text-14 font-bold"
        >
          {x.useSuggestion(other)}
        </button>
      )}
    </form>
  );
}

/** The registry row for a player the server matched, so the seat takes their id and look. */
export const personFor = (p: PlayerSummary): Person =>
  people().find((k) => k.id === p.id) ?? {
    ...p,
    nameKey: nameKey(p.displayName),
    local: false,
    games: p.games,
    lastPlayedAt: p.lastPlayedAt,
  };
