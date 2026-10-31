import { motion, useReducedMotion } from 'framer-motion';
import { nameKey } from '@/domain';
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
}: {
  match: Person;
  suggestion: string;
  onYes: () => void;
  onNo: () => void;
  className?: string;
}) {
  const rm = useReducedMotion();
  return (
    <motion.div
      role="group"
      aria-label={x.sameAsk(match.displayName)}
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
        <span className="block text-16 font-bold">{x.sameAsk(match.displayName)}</span>
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
          {x.useSuggestion(suggestion)}
        </button>
      </span>
    </motion.div>
  );
}
