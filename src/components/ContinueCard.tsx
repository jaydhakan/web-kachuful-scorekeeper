import { m } from 'framer-motion';
import { curRound } from '@/domain';
import { archive } from '@/state/archive';
import { useApp } from '@/state/store';
import { useArchive } from '@/state/useArchive';
import { continueElsewhere } from '@/sync/elsewhere';
import { t } from '@/strings';
import { PRESS } from '@/components/ui/motion';
import { Icon } from './ui/Icons';

/** "Continue round 7 from your other device": an unfinished game of this account, newer than the one here. */
export function ContinueCard({ className = '' }: { className?: string }) {
  const { state, actions } = useApp();
  const me = state.session?.user.id;
  const rec = useArchive(() => continueElsewhere(state.game, me));
  if (!rec) return null;
  return (
    <m.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={PRESS}
      onClick={() => {
        archive.put('games', { ...rec, origin: 'local' });
        actions.openGame(rec.game);
      }}
      className={`glass flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold ${className}`}
    >
      <span aria-hidden className="grid text-[var(--accent)]">
        {Icon.resume}
      </span>
      {t.hub.sync2.continueOther(curRound(rec.game).index + 1)}
    </m.button>
  );
}
