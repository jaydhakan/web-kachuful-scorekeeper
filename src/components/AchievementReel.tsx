import { m, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ACH,
  allAchievements,
  LADDERS,
  pidOf,
  type Earned,
  type Facts,
  type Game,
  type Ladder,
} from '@/domain';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { achievements as names } from '@/strings/achievements';
import { t } from '@/strings';
import { Medal } from './ui/Medal';
import { Edge } from './ui/Edge';
import { PlayerTag } from './ui/PlayerTag';

// Both hooks read every achievement on the device; worked out once per set of facts.
const cache = new WeakMap<Facts, Earned[]>();
const earnedOf = (f: Facts) => {
  let e = cache.get(f);
  if (!e) cache.set(f, (e = allAchievements(f)));
  return e;
};

/** What this game earned: big moments first, then game finish, career and the rest of the round moments. */
export function useGameAchievements(g: Game) {
  const f = useDeviceFacts();
  return useMemo(() => {
    const rank = (code: string) =>
      (ACH.get(code)?.big ? 0 : 2) + (ACH.get(code)?.group === 'round' ? 1 : 0);
    const list = earnedOf(f).filter((e) => e.gameId === g.syncId);
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
          <m.li
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
              className="press glass flex min-h-[6.5rem] w-full flex-col items-start gap-1 p-3 text-left"
            >
              <span aria-hidden className="text-30 leading-none">
                {ACH.get(e.code)?.emoji}
              </span>
              <span className="text-15 font-bold leading-tight">
                {names[e.code]?.name ?? e.code}
              </span>
              <span className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
                {flipped ? names[e.code]?.how : <PlayerTag p={who} name={who.name} s={18} />}
              </span>
            </button>
          </m.li>
        );
      })}
    </ul>
  );
}

export interface LevelUp {
  playerId: string;
  ladder: Ladder;
  before: boolean[];
  after: boolean[];
}

/** Each player's ladders that gained a level in this game: levels held before it started, and after. */
export function useLevelUps(g: Game): LevelUp[] {
  const f = useDeviceFacts();
  return useMemo(() => {
    const all = earnedOf(f);
    const out: LevelUp[] = [];
    for (const id of new Set(g.players.map(pidOf))) {
      const mine = all.filter((e) => e.playerId === id);
      const had = new Set(mine.filter((e) => e.earnedAt < g.createdAt).map((e) => e.code));
      const now = new Set(mine.filter((e) => e.gameId === g.syncId).map((e) => e.code));
      for (const ladder of LADDERS) {
        const before = ladder.codes.map((c) => had.has(c));
        const after = ladder.codes.map((c, k) => before[k] || now.has(c));
        if (after.some((x, k) => x && !before[k]))
          out.push({ playerId: id, ladder, before, after });
      }
    }
    return out;
  }, [f, g.players, g.createdAt, g.syncId]);
}

/** "Level up": one card per player and ladder, the levels gained in this game popping into place. */
export function LevelUps({ g, heading }: { g: Game; heading: string }) {
  const ups = useLevelUps(g);
  const f = useDeviceFacts();
  const rm = useReducedMotion();
  if (!ups.length) return null;
  return (
    <section aria-label={t.winner.levelUp}>
      <h2 className={heading}>{t.winner.levelUp}</h2>
      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {ups.map((u, i) => {
          const who = whoIs(f, u.playerId);
          const top = u.after.lastIndexOf(true);
          const name = t.hub.ach.ladders[u.ladder.id].name;
          return (
            <m.li
              key={u.playerId + u.ladder.id}
              initial={{ opacity: 0, y: rm ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.2 + i * 0.06 }}
              className="glass relative flex min-h-16 items-center gap-3 px-3 py-2"
            >
              <Edge />
              <Medal emoji={ACH.get(u.ladder.codes[top])?.emoji ?? ''} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-15 font-bold leading-tight [overflow-wrap:anywhere]">
                  {who.name} · {name}
                </span>
                <span className="block text-13 text-[var(--tx2)]">
                  {names[u.ladder.codes[top]]?.name}
                </span>
              </span>
              <span
                role="img"
                aria-label={t.winner.levels(
                  u.before.filter(Boolean).length,
                  u.after.filter(Boolean).length,
                  u.after.length,
                )}
                className="flex shrink-0 gap-1"
              >
                {u.after.map((on, k) =>
                  on && !u.before[k] ? (
                    <m.span
                      key={k}
                      initial={rm ? { opacity: 0 } : { scale: 0 }}
                      animate={rm ? { opacity: 1 } : { scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 520,
                        damping: 18,
                        delay: 0.55 + i * 0.06,
                      }}
                      className="h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_8px_color-mix(in_srgb,var(--medal-gold)_70%,transparent)]"
                    />
                  ) : (
                    <span
                      key={k}
                      className={`h-2.5 w-2.5 rounded-full ${on ? 'bg-gold' : 'border border-ov/30'}`}
                    />
                  ),
                )}
              </span>
            </m.li>
          );
        })}
      </ul>
    </section>
  );
}
