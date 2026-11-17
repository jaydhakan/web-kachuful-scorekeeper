import { m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import type { LevelUp } from '@/progression/reel';
import { byCode, type CatalogueView } from '@/progression/catalogue';
import type { Earned } from '@/progression/types';
import { t } from '@/strings';
import { Medal } from '@/components/ui/Medal';
import { Edge } from '@/components/ui/Edge';
import { PlayerTag } from '@/components/ui/PlayerTag';
import type { Person } from './env';

export type ReelItem = { e: Earned; who: Person };
/** The player of the game (WOW-MOMENTS-PLAN A4): the reel's first card, gold, with the stat they owned. */
export type ReelMvp = { who: Person; line: string };

/**
 * A finished game's achievements as cards flipping in one by one (order them with `reelOrder`); a tap turns a card
 * over to say how it was earned.
 */
export function AchievementReel({
  prog,
  items: all,
  max = 12,
  mvp,
}: {
  prog: CatalogueView;
  items: ReelItem[];
  max?: number;
  mvp?: ReelMvp | null;
}) {
  const items = all.slice(0, max);
  const rm = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length && !mvp) return null;
  const lead = mvp ? 1 : 0;
  const names = prog.strings.achievements;
  return (
    <ul
      aria-label={t.hub.game.achievements}
      className="grid grid-cols-2 gap-2.5 [perspective:900px] md:grid-cols-3 wide:grid-cols-3"
    >
      {mvp && (
        <m.li
          data-mvp
          initial={rm ? { opacity: 0 } : { opacity: 0, rotateY: -100 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.2 }}
          className="col-span-2 md:col-span-1 wide:col-span-1"
        >
          <div className="glass relative flex min-h-[6.5rem] w-full flex-col items-start gap-1 overflow-hidden p-3">
            <Edge tone="gold" />
            <span className="mono-label text-12 text-[var(--gold-tx)]">{t.hub.game.mvp}</span>
            <PlayerTag p={mvp.who} name={mvp.who.name} s={22} />
            <span className="text-13 text-[var(--tx2)]">{mvp.line}</span>
          </div>
        </m.li>
      )}
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
              delay: (rm ? 0.03 : 0.12) * (i + lead) + 0.2,
            }}
          >
            <button
              type="button"
              aria-expanded={flipped}
              onClick={() => setOpen(flipped ? null : k)}
              className="press glass flex min-h-[6.5rem] w-full flex-col items-start gap-1 p-3 text-left"
            >
              <span aria-hidden className="text-30 leading-none">
                {byCode(prog).get(e.code)?.emoji}
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

/** "Level up": one card per player and ladder (from `levelUps`), the levels gained in the game popping into place. */
export function LevelUps({
  prog,
  ups,
  person,
  heading,
}: {
  prog: CatalogueView;
  ups: LevelUp[];
  person: (id: string) => Person;
  heading: string;
}) {
  const rm = useReducedMotion();
  if (!ups.length) return null;
  const codes = byCode(prog);
  return (
    <section aria-label={t.winner.levelUp}>
      <h2 className={heading}>{t.winner.levelUp}</h2>
      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {ups.map((u, i) => {
          const who = person(u.playerId);
          const top = u.after.lastIndexOf(true);
          const name = prog.strings.ladders[u.ladder.id].name;
          return (
            <m.li
              key={u.playerId + u.ladder.id}
              initial={{ opacity: 0, y: rm ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.2 + i * 0.06 }}
              className="glass relative flex min-h-16 items-center gap-3 px-3 py-2"
            >
              <Edge />
              <Medal emoji={codes.get(u.ladder.codes[top])?.emoji ?? ''} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-15 font-bold leading-tight [overflow-wrap:anywhere]">
                  {who.name} · {name}
                </span>
                <span className="block text-13 text-[var(--tx2)]">
                  {prog.strings.achievements[u.ladder.codes[top]]?.name}
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
