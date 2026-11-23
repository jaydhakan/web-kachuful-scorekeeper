import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EASE, MOMENT_MAX_MS, SPRING } from '@/components/ui/motion';
import { HAPTIC } from '@/fx/feedback';
import { momentRoot, PRIORITY, takeCrownShow, useMoments, type MomentCtx } from '@/fx/moments';
import { crowns as s } from '@/strings/crowns';
import { dropStatus, useNews } from '@/sync/news';
import { crownBanner, type CrownBanner } from './crownBanner';

/** How long the banner stays untouched; inside the queue's ceiling for a Moment. */
export const NEWS_MS = MOMENT_MAX_MS - 200;

/**
 * The server's crown changes and bounties on every other phone at the table (backend-requests §6): "Naya Badshah",
 * "+40 🪙 bounty". A Moment on the page's queue, so it waits while a screen takes a bid or a result
 * and never overlaps another show; the table device already showed its own (`local`), so it skips those. A tap on
 * the banner or Escape closes it; reduced motion shows it still for the same time.
 */
export function CrownNews() {
  const { status } = useNews();
  const q = useMoments();
  const [shown, setShown] = useState<{ key: string; b: CrownBanner; end: () => void } | null>(null);
  const next = status.find((x) => !x.local);
  const key = next && `crowns:news:${next.gameId}:${next.at}`;

  useEffect(() => {
    if (!next || !key) return;
    const b = crownBanner(next);
    if (!b) return dropStatus(next.gameId);
    const big = b.kind === 'gold' && takeCrownShow();
    const play = ({ signal }: MomentCtx) =>
      new Promise<void>((done) => {
        dropStatus(next.gameId);
        const end = () => {
          clearTimeout(t);
          setShown(null);
          done();
        };
        const t = setTimeout(end, NEWS_MS);
        signal.addEventListener('abort', end);
        setShown({ key, b, end });
      });
    const res = q.push({
      id: key,
      tier: 'moment',
      priority: big ? PRIORITY.verdict : PRIORITY.smallUnlock,
      scope: `news:${next.gameId}`,
      // Past tonight's crown shows (§13 rule 4) the banner still comes, but quietly.
      sound: big ? 'crown' : b.kind === 'bounty' ? 'coin' : undefined,
      haptic: big ? HAPTIC.BIG : undefined,
      play,
      reduced: play,
      downgrade: () => dropStatus(next.gameId),
    });
    if (res === 'duplicate') dropStatus(next.gameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per piece of news
  }, [key]);

  useEffect(() => {
    if (!shown) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && shown.end();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [shown]);

  return createPortal(<Banner shown={shown} />, momentRoot());
}

function Banner({ shown }: { shown: { key: string; b: CrownBanner; end: () => void } | null }) {
  const rm = useReducedMotion();
  const b = shown?.b;
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only" data-crown-news-live>
        {b ? [b.headline, ...b.lines].join('. ') : ''}
      </p>
      <AnimatePresence>
        {shown && b && (
          <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--sat)+0.25rem)] z-[66] flex justify-center px-2.5">
            <m.button
              key={shown.key}
              type="button"
              data-crown-news
              aria-label={`${s.dismiss}: ${b.headline}`}
              onClick={shown.end}
              initial={rm ? { opacity: 0 } : { opacity: 0, y: '-130%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                rm
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { opacity: 0, y: '-130%', transition: { duration: 0.24, ease: EASE } }
              }
              transition={rm ? { duration: 0.15 } : SPRING}
              className="mat-toast press pointer-events-auto flex min-h-14 w-full max-w-[30rem] items-center gap-3 rounded-[22px] px-3.5 py-2.5 text-left"
            >
              <span aria-hidden className="shrink-0 text-30 leading-none">
                {b.glyph}
              </span>
              <span aria-hidden className="min-w-0 flex-1">
                <span className="block text-16 font-extrabold [overflow-wrap:anywhere]">
                  {b.headline}
                </span>
                {b.lines.map((l) => (
                  <span key={l} className="block text-14 opacity-80 [overflow-wrap:anywhere]">
                    {l}
                  </span>
                ))}
              </span>
            </m.button>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/** For the lazy mount. */
export default CrownNews;
