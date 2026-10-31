import { motion, useReducedMotion } from 'framer-motion';
import { useSyncStatus } from '@/sync/status';
import { t } from '@/strings';

/** Synced, syncing, waiting (offline) or needs attention, as a small mark with its words for screen readers. */
export function SyncDot({ className = '' }: { className?: string }) {
  const s = useSyncStatus();
  const rm = useReducedMotion();
  if (s.phase === 'signedOut') return null;
  const label =
    s.phase === 'attention'
      ? t.hub.sync.attention(s.attention)
      : s.phase === 'syncing'
        ? t.hub.sync.syncing
        : s.waiting
          ? t.hub.sync.waiting(s.waiting)
          : t.hub.sync.synced;
  const tone =
    s.phase === 'attention'
      ? 'bg-[var(--warn)] text-ink-gold'
      : s.waiting || s.phase === 'offline'
        ? 'bg-white/20 text-[var(--tx)]'
        : 'bg-[var(--pos)] text-ink-on-accent';
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-grid h-5 min-w-5 place-items-center rounded-full px-1 text-13 font-extrabold leading-none ${tone} ${className}`}
    >
      {s.phase === 'syncing' ? (
        <motion.span
          aria-hidden
          animate={rm ? undefined : { rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          ↻
        </motion.span>
      ) : s.phase === 'attention' ? (
        '!'
      ) : s.waiting ? (
        s.waiting
      ) : (
        <motion.span aria-hidden initial={rm ? false : { scale: 0 }} animate={{ scale: 1 }}>
          ✓
        </motion.span>
      )}
    </span>
  );
}
