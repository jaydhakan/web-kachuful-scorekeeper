import { m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { archive, type GameRec } from '@/state/archive';
import { useApp } from '@/state/store';
import { useArchiveVersion } from '@/state/useArchive';
import { resumeElsewhere, type ServerActive } from '@/sync/elsewhere';
import { t } from '@/strings';
import { PRESS } from '@/components/ui/motion';
import { Icon } from './ui/Icons';

// The network half loads only for a signed-in Home.
const loadResume = () => import('@/sync/resume');

/** The server's answer, asked on mount, on coming back online and on return to the app; offline at once. */
function useServerActive(signedIn: boolean): ServerActive {
  const [v, setV] = useState<ServerActive>('unknown');
  useEffect(() => {
    if (!signedIn) return setV('unknown');
    let live = true;
    const ask = () => {
      if (!navigator.onLine) return setV('offline');
      void loadResume()
        .then((r) => r.askActive())
        .then((a) => live && setV(a));
    };
    const off = () => setV('offline');
    const back = () => document.visibilityState === 'visible' && ask();
    ask();
    window.addEventListener('online', ask);
    window.addEventListener('offline', off);
    document.addEventListener('visibilitychange', back);
    return () => {
      live = false;
      window.removeEventListener('online', ask);
      window.removeEventListener('offline', off);
      document.removeEventListener('visibilitychange', back);
    };
  }, [signedIn]);
  return v;
}

/** "Continue round 7 from your other device": an unfinished game of this account, newer than the one here. */
export function ContinueCard({ className = '' }: { className?: string }) {
  const { state, actions } = useApp();
  const me = state.session?.user.id;
  const server = useServerActive(!!me && !state.session?.stale);
  const [busy, setBusy] = useState(false);
  const v = useArchiveVersion();
  const pick = useMemo(
    () => resumeElsewhere(state.game, me, server),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `v` recomputes it when the archive changes
    [state.game, me, server, v],
  );
  if (!pick) return null;
  const take = (rec: GameRec) => {
    archive.put('games', { ...rec, origin: 'local' });
    actions.openGame(rec.game);
  };
  const open = async () => {
    if (!pick.sum) return pick.rec && take(pick.rec);
    setBusy(true);
    try {
      const rec = await (await loadResume()).pullSummary(pick.sum);
      if (rec) take(rec);
      else actions.say(t.hub.sync2.continueFailed);
    } catch {
      actions.say(t.hub.sync2.continueFailed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <m.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={PRESS}
      aria-busy={busy}
      disabled={busy}
      onClick={() => void open()}
      className={`glass flex min-h-14 w-full items-center gap-3 px-4 text-left text-16 font-bold ${className}`}
    >
      <span aria-hidden className="grid text-[var(--accent)]">
        {Icon.resume}
      </span>
      {t.hub.sync2.continueOther(pick.round)}
    </m.button>
  );
}
