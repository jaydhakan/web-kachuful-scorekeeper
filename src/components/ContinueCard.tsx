import { motion } from 'framer-motion';
import { curRound } from '@/domain';
import { archive } from '@/state/archive';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { continueElsewhere } from '@/sync/engine';
import { t } from '@/strings';

/** "Continue round 7 from your other device": an unfinished game of this account, newer than the one here. */
export function ContinueCard({ className = '' }: { className?: string }) {
  const { state, actions } = useApp();
  const signedIn = !!state.session;
  const rec = useArchive(() => (signedIn ? continueElsewhere(state.game) : null));
  if (!rec) return null;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        archive.put('games', { ...rec, origin: 'local' });
        actions.openGame(rec.game);
      }}
      className={`glass flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold ${className}`}
    >
      <span aria-hidden className="text-22">
        🔄
      </span>
      {t.hub.sync2.continueOther(curRound(rec.game).index + 1)}
    </motion.button>
  );
}
