import { m } from 'framer-motion';
import { useMemo } from 'react';
import type { IshaaraPublic } from '@/games/ishaara/domain';
import { progression } from '@/games/ishaara/progression';
import { table as s } from '@/games/ishaara/strings/table';
import { byCode } from '@/progression/catalogue';
import { reelOrder } from '@/progression/reel';
import type { Earned } from '@/progression/types';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { AchievementReel, type ReelItem } from '@/components/progression/AchievementReel';
import { personOf, type Person } from '@/components/progression/env';
import { stagger } from '@/components/ui/stagger';

const w = s.win;

/**
 * One game's rows from the server's list, newest first: pages until they are older than the game, so a game just
 * finished takes one request.
 */
async function gameEarned(g: IshaaraPublic): Promise<Earned[]> {
  const out: Earned[] = [];
  let cursor: string | null = null;
  do {
    const page = await ep.achievements(undefined, cursor, 'ishaara');
    out.push(...page.items.filter((e) => e.gameId === g.id));
    const last = page.items.at(-1);
    cursor = last && last.earnedAt >= g.createdAt ? page.nextCursor : null;
  } while (cursor);
  return out.sort((a, b) => a.earnedAt - b.earnedAt);
}

/** What the finished game earned, as the winner screen's reel: the server's rows, read once it has stored them. */
export function GameReel({ game }: { game: IshaaraPublic }) {
  // An abandoned game earns nothing, so there is nothing to ask for.
  const r = useRemote(game.endedBy === 'abandoned' ? null : `ishaara:reel:${game.id}`, () =>
    gameEarned(game),
  );
  const items = useMemo<ReelItem[]>(() => {
    const seat = (id: string): Person => {
      const p = game.players.find((x) => x.playerId === id);
      return p ? { id, name: p.name, emoji: p.emoji, color: p.color } : personOf(id);
    };
    return reelOrder(byCode(progression), r.data ?? [], game.id).map((e) => ({
      e,
      who: seat(e.playerId),
    }));
  }, [r.data, game]);
  let body;
  if (!r.data && r.loading)
    body = (
      <p role="status" className="glass px-4 py-4 text-16 text-[var(--tx2)]">
        {w.achievementsLoading}
      </p>
    );
  else if (!r.data && r.error)
    body = (
      <div className="glass flex items-center gap-3 px-4 py-3">
        <p className="flex-1 text-15 text-[var(--tx2)]">{w.achievementsFailed}</p>
        <button
          type="button"
          onClick={r.reload}
          className="press min-h-11 rounded-xl px-3 text-15 font-bold text-[var(--accent-tx)]"
        >
          {w.retry}
        </button>
      </div>
    );
  // Nothing earned (an older game, say) takes no room.
  else if (!items.length) return null;
  else body = <AchievementReel prog={progression} items={items} max={12} />;
  return (
    <m.section {...stagger(1)} aria-labelledby="ish-ach" className="mt-6">
      <h2 id="ish-ach" className="mono-label mb-2 text-13 text-[var(--accent-tx)]">
        {w.achievements}
      </h2>
      {body}
    </m.section>
  );
}
