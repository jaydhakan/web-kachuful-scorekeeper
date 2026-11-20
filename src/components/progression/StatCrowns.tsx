import { useMemo } from 'react';
import { byCode } from '@/progression/catalogue';
import { monthOf } from '@/progression/zone';
import { statCrowns as s } from '@/strings/statCrowns';
import type { ProgressionEnv } from './env';
import { useSeason } from './useProgressionData';

/**
 * The stat crowns a player holds right now (REWARDS-PLAN §6.2): this month's live season awards, as words under
 * their name. Nothing while loading, on an error, or when they hold none: it's a flourish, never a gap.
 */
export function StatCrowns({ env, playerId }: { env: ProgressionEnv; playerId: string }) {
  const { s: season } = useSeason(env, monthOf(Date.now()), true);
  const held = useMemo(() => {
    if (!season || season === 'loading') return [];
    const defs = byCode(env.prog);
    return season.awards
      .filter((a) => a.playerId === playerId && s.title[a.code])
      .map((a) => ({
        code: a.code,
        title: s.title[a.code],
        what: env.prog.strings.achievements[a.code]?.name ?? a.code,
        emoji: defs.get(a.code)?.emoji ?? '👑',
      }));
  }, [season, env.prog, playerId]);
  if (!held.length) return null;
  return (
    <ul aria-label={s.label} className="flex flex-wrap gap-1.5">
      {held.map((c) => (
        <li
          key={c.code}
          aria-label={s.spoken(c.title, c.what)}
          className="glass flex min-h-8 items-center gap-1 rounded-full px-2.5 text-13 font-bold text-[var(--gold-tx)]"
        >
          <span aria-hidden>{c.emoji}</span>
          <span aria-hidden>{c.title}</span>
        </li>
      ))}
    </ul>
  );
}
