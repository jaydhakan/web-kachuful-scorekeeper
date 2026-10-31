import { motion } from 'framer-motion';
import { useApp } from '@/state/store';
import { SyncDot } from './SyncDot';
import { t } from '@/strings';

/** Top corner of Home: the account (with its sync state) or Sign in. */
export function AccountChip({ className = '' }: { className?: string }) {
  const { state, actions } = useApp();
  const s = state.session;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={() => actions.open({ screen: s ? 'account' : 'signin' })}
      aria-label={s ? t.hub.nav.account : t.hub.nav.signIn}
      className={`glass relative inline-flex min-h-11 items-center gap-2 !rounded-full pl-1.5 pr-3.5 text-15 font-bold ${className}`}
    >
      {s ? (
        <>
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full text-18"
            style={{ background: s.player?.color ?? 'transparent' }}
          >
            {s.player?.emoji ?? '👤'}
          </span>
          <span aria-hidden>{s.player?.displayName ?? t.hub.nav.account}</span>
          <SyncDot className="absolute -right-1 -top-1" />
        </>
      ) : (
        <span className="pl-2">{t.hub.nav.signIn}</span>
      )}
    </motion.button>
  );
}
