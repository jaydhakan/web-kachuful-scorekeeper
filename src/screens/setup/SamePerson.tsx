import { motion, useReducedMotion } from 'framer-motion';
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
    <motion.div
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
          className="min-h-11 rounded-xl bg-[var(--accent)] px-3 text-14 font-bold text-ink-on-accent"
        >
          {x.yes}
        </button>
        <button
          type="button"
          onClick={onNo}
          className="glass min-h-11 rounded-xl px-3 text-14 font-bold"
        >
          {x.recheck}
        </button>
      </span>
    </motion.div>
  );
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
  /** A new player with this email. */
  onDone: (email: string) => void;
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
  const { actions } = useApp();
  const other = suggestName(name, new Set(livePlayers().map((p) => p.nameKey)));
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!emailOk(email)) return setErr(x.emailInvalid);
    if (taken.includes(emailKey(email))) return setErr(x.emailAtTable);
    setBusy(true);
    setNameTaken(false);
    try {
      const r = await ep.checkPlayer(name, emailKey(email));
      if (r.status === 'match') setMatch(r.player);
      else if (r.status === 'email_taken') setErr(x.emailTaken);
      else if (r.status === 'name_taken') {
        setNameTaken(true);
        setErr(x.nameTaken(name));
      } else onDone(emailKey(email));
    } catch (x2) {
      if (x2 instanceof ApiError && x2.offline) onDone(emailKey(email));
      else if (x2 instanceof ApiError && x2.retryAfter) setErr(t.hub.auth.wait(x2.retryAfter));
      else setErr(t.hub.auth.errors.server);
    } finally {
      setBusy(false);
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
          className="h-12 min-w-0 flex-1 rounded-2xl bg-white/[.07] px-4 text-17 outline-none placeholder:text-[var(--ph)] focus:shadow-[0_0_0_3px_var(--glow),inset_0_0_0_1px_var(--accent)]"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="min-h-12 rounded-2xl bg-[var(--accent)] px-4 text-16 font-bold text-ink-on-accent disabled:opacity-50"
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
      {nameTaken && (
        <button
          type="button"
          onClick={() => onRename(other, email)}
          className="glass min-h-11 self-start rounded-xl px-3 text-14 font-bold"
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
