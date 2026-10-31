import { motion, useReducedMotion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { emailKey, emailOk, nameKey } from '@/domain';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { PlayerSummary } from '@/sync/types';
import { archive } from '@/state/archive';
import { people, type Person } from '@/state/registry';
import { EASE } from '@/components/ui/motion';
import { t } from '@/strings';

const x = t.hub.sync2;

/**
 * Signed in, a typed name that is already a server player needs a yes or no: is it the same person? A yes is
 * remembered for this scorer and name, so it is asked once.
 */
export function serverMatch(name: string): Person | undefined {
  const k = nameKey(name);
  if (!k || archive.get('cache', 'same:' + k)) return undefined;
  return people().find((p) => !p.local && p.nameKey === k);
}
export const rememberSame = (name: string, id: string) =>
  archive.put('cache', { key: 'same:' + nameKey(name), value: id, fetchedAt: Date.now() });
/** A name confirmed earlier: the player it was matched to. */
export const knownSame = (name: string): Person | undefined => {
  const id = archive.get('cache', 'same:' + nameKey(name))?.value;
  return typeof id === 'string' ? people().find((p) => p.id === id) : undefined;
};

export function SameCard({
  match,
  suggestion,
  onYes,
  onNo,
  className = '',
  byEmail,
}: {
  match: Pick<Person, 'displayName' | 'emoji' | 'color' | 'games'> & {
    createdByName?: string | null;
  };
  /** The other choice: a free name to use instead, or (by email) "Recheck the email". */
  suggestion: string;
  onYes: () => void;
  onNo: () => void;
  className?: string;
  /** The email (not the name) belongs to this player. */
  byEmail?: boolean;
}) {
  const ask = byEmail ? x.sameEmail(match.displayName) : x.sameAsk(match.displayName);
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
      <span
        aria-hidden
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-24"
        style={{ background: match.color }}
      >
        {match.emoji}
      </span>
      <span className="min-w-0 flex-1 basis-40">
        <span className="block text-16 font-bold">{ask}</span>
        <span className="block text-13 text-[var(--tx2)]">
          {t.hub.auth.games(match.games, match.createdByName ?? '—')}
        </span>
      </span>
      <span className="flex gap-2">
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
          {byEmail ? suggestion : x.useSuggestion(suggestion)}
        </button>
      </span>
    </motion.div>
  );
}

/**
 * A new player's email, signed in: checked with the server as it is typed. An email that belongs to someone asks
 * whether it's the same person; yes uses that player, otherwise the email must be rechecked.
 */
export function EmailStep({
  name,
  taken,
  onDone,
  onSame,
  className = '',
}: {
  name: string;
  /** Emails already at this table. */
  taken: string[];
  onDone: (email: string) => void;
  onSame: (p: PlayerSummary) => void;
  className?: string;
}) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [owner, setOwner] = useState<PlayerSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!emailOk(email)) return setErr(x.emailInvalid);
    if (taken.includes(emailKey(email))) return setErr(x.emailAtTable);
    setBusy(true);
    try {
      const r = await ep.checkPlayer({ email: emailKey(email) });
      if (!r.available && r.field === 'email') setOwner(r.existing);
      else onDone(emailKey(email));
    } catch (x2) {
      // Offline: the server checks it when the player uploads; a clash then lands in the inbox.
      if (x2 instanceof ApiError && x2.offline) onDone(emailKey(email));
      else setErr(t.hub.auth.errors.server);
    } finally {
      setBusy(false);
    }
  };
  if (owner)
    return (
      <SameCard
        byEmail
        className={className}
        match={owner}
        suggestion={x.recheck}
        onYes={() => onSame(owner)}
        onNo={() => (setOwner(null), setErr(x.recheckHint))}
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
          onChange={(e) => (setEmail(e.target.value), setErr(''))}
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
    </form>
  );
}
