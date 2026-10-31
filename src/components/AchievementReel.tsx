import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ACH, allAchievements, type Game } from '@/domain';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { achievements as names } from '@/strings/achievements';
import { t } from '@/strings';

/** What this game earned: big moments first, then game finish, career and the rest of the round moments. */
export function useGameAchievements(g: Game) {
  const f = useDeviceFacts();
  return useMemo(() => {
    const rank = (code: string) =>
      (ACH.get(code)?.big ? 0 : 2) + (ACH.get(code)?.group === 'round' ? 1 : 0);
    const list = allAchievements(f).filter((e) => e.gameId === g.syncId);
    // One card per player and code: a run reached twice in a game shows once.
    const seen = new Set<string>();
    return list
      .filter((e) => {
        const k = e.playerId + e.code;
        return !seen.has(k) && seen.add(k);
      })
      .sort((a, b) => rank(a.code) - rank(b.code) || a.earnedAt - b.earnedAt)
      .map((e) => ({ e, who: whoIs(f, e.playerId) }));
  }, [f, g.syncId]);
}

/** Cards flipping in one by one; a tap turns a card over to say how it was earned. */
export function AchievementReel({ g, max = 12 }: { g: Game; max?: number }) {
  const items = useGameAchievements(g).slice(0, max);
  const rm = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return null;
  return (
    <ul
      aria-label={t.hub.game.achievements}
      className="grid grid-cols-2 gap-2.5 [perspective:900px] md:grid-cols-3 wide:grid-cols-3"
    >
      {items.map(({ e, who }, i) => {
        const k = e.playerId + e.code,
          flipped = open === k;
        return (
          <motion.li
            key={k}
            initial={rm ? { opacity: 0 } : { opacity: 0, rotateY: -100 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{
              type: 'spring',
              stiffness: 240,
              damping: 22,
              delay: (rm ? 0.03 : 0.12) * i + 0.2,
            }}
          >
            <button
              type="button"
              aria-expanded={flipped}
              onClick={() => setOpen(flipped ? null : k)}
              className="glass flex min-h-[6.5rem] w-full flex-col items-start gap-1 p-3 text-left"
            >
              <span aria-hidden className="text-30 leading-none">
                {ACH.get(e.code)?.emoji}
              </span>
              <span className="text-15 font-bold leading-tight">
                {names[e.code]?.name ?? e.code}
              </span>
              <span className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
                {flipped ? names[e.code]?.how : `${who.emoji} ${who.name}`}
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
