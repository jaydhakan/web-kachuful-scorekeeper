import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { EASE, SPRING } from '@/components/ui/motion';
import { HAPTIC } from '@/fx/feedback';
import { momentRoot, PRIORITY, useMoments, type MomentCtx } from '@/fx/moments';
import { milestones as ms } from '@/strings/milestones';
import { wardrobe as w } from '@/strings/wardrobe';
import { ep } from '@/sync/endpoints';
import { dropGift, dropMilestone, useRewardNews } from '@/sync/rewardNews';
import type { Gift, MilestoneOut } from '@/sync/types';
import { itemOf } from '@/wardrobe/catalog';
import { StageBustLazy } from '@/wardrobe/StageBustLazy';

/** How long a milestone or a gift owns the screen untouched (REWARDS-PLAN §12: 2s). */
export const SHOW_MS = 2000;

interface Shown {
  key: string;
  body: ReactNode;
  said: string;
  end: () => void;
}

/**
 * A first, a group milestone (a stamp) or a gift being opened (the receiver's bust wearing it), for the whole site.
 * Each is a Moment on the page's queue, so it waits for a pause; a tap or Escape skips, reduced motion shows it still.
 */
export function RewardNews() {
  const { gifts, milestones } = useRewardNews();
  const q = useMoments();
  const [shown, setShown] = useState<Shown | null>(null);
  const mNext = milestones[0];
  const gNext = gifts[0];
  const key = mNext ? `milestone:${mNext.key}` : gNext ? `gift:${gNext.id}` : null;

  useEffect(() => {
    if (!key) return;
    const drop = () => (mNext ? dropMilestone(mNext.key) : gNext && dropGift(gNext.id));
    const view = mNext ? milestoneView(mNext) : gNext ? giftView(gNext) : null;
    if (!view) return void drop();
    const play = ({ signal }: MomentCtx) =>
      new Promise<void>((done) => {
        drop();
        // The gift is marked opened once it's been on a screen; a failure leaves it for the next table.
        if (!mNext && gNext) void ep.openGift(gNext.id).catch(() => undefined);
        const end = () => {
          clearTimeout(t);
          setShown(null);
          done();
        };
        const t = setTimeout(end, SHOW_MS);
        signal.addEventListener('abort', end);
        setShown({ key, ...view, end });
      });
    const res = q.push({
      id: key,
      tier: 'moment',
      priority: PRIORITY.bigUnlock,
      scope: `rewards:${key}`,
      sound: mNext ? 'bell' : 'ghungroo',
      haptic: mNext ? HAPTIC.BIG : HAPTIC.BEAT,
      play,
      reduced: play,
      downgrade: drop,
    });
    if (res === 'duplicate') drop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per piece of news
  }, [key]);

  useEffect(() => {
    if (!shown) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && shown.end();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [shown]);

  return createPortal(<Card shown={shown} />, momentRoot());
}

function milestoneView(x: MilestoneOut): Omit<Shown, 'key' | 'end'> | null {
  const l = ms.line(x.key, x.n);
  if (!l) return null;
  const who = ms.who(x.players.map((p) => p.displayName));
  return {
    said: [l.line, who].filter(Boolean).join('. '),
    body: (
      <>
        <span aria-hidden data-milestone-stamp className="text-[56px] leading-none">
          {l.glyph}
        </span>
        <span className="text-22 font-extrabold [overflow-wrap:anywhere]">{l.line}</span>
        {who && <span className="text-14 opacity-80">{who}</span>}
      </>
    ),
  };
}

function giftView(g: Gift): Omit<Shown, 'key' | 'end'> | null {
  const item = itemOf(g.item.id);
  if (!item) return null;
  const name = w.name(item.id);
  const p = { ...g.to, id: g.to.id, playerId: g.to.id };
  return {
    said: `${ms.gift.headline(g.to.displayName)} ${ms.gift.from(name, g.from.displayName)}`,
    body: (
      <>
        <span className="text-18 font-extrabold">{ms.gift.headline(g.to.displayName)}</span>
        <StageBustLazy
          p={p}
          look={{ ...(g.to.look ?? {}), [item.slot]: { id: item.id, v: g.item.v } }}
          size={150}
        />
        <span className="text-16">{ms.gift.from(name, g.from.displayName)}</span>
      </>
    ),
  };
}

function Card({ shown }: { shown: Shown | null }) {
  const rm = useReducedMotion();
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {shown?.said ?? ''}
      </p>
      <AnimatePresence>
        {shown && (
          <div className="pointer-events-none fixed inset-0 z-[66] grid place-items-center px-4">
            <m.button
              key={shown.key}
              type="button"
              data-reward-news
              aria-label={`${ms.dismiss}: ${shown.said}`}
              onClick={shown.end}
              initial={rm ? { opacity: 0 } : { opacity: 0, scale: 1.4, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={
                rm
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: EASE } }
              }
              transition={rm ? { duration: 0.15 } : SPRING}
              className="mat-toast press pointer-events-auto flex w-full max-w-[22rem] flex-col items-center gap-3 rounded-[28px] px-5 py-6 text-center"
            >
              {shown.body}
            </m.button>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default RewardNews;
