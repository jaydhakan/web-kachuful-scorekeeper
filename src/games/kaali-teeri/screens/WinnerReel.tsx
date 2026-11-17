import { useMemo } from 'react';
import {
  allAchievements,
  KT_ACHIEVEMENTS,
  KT_LADDERS,
  ktFacts,
} from '@/games/kaali-teeri/domain/achievements';
import { mvpOf } from '@/games/kaali-teeri/domain/stats';
import { end } from '@/games/kaali-teeri/strings/end';
import type { KtGame } from '@/games/kaali-teeri/domain/types';
import { achievements, ladders } from '@/games/kaali-teeri/strings/achievements';
import { pidOf } from '@/people/pid';
import type { CatalogueView } from '@/progression/catalogue';
import { levelUps, reelOrder } from '@/progression/reel';
import { AchievementReel, LevelUps } from '@/components/progression/AchievementReel';
import { t } from '@/strings';
import { useWho } from './pages/parts';
import { useKtGames } from './pages/source';

const CAT: CatalogueView = { catalogue: KT_ACHIEVEMENTS, strings: { achievements, ladders } };
const DEF = new Map(KT_ACHIEVEMENTS.map((a) => [a.code, a]));
const HEADING = 'disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]';

/**
 * What the game just finished earned, worked out from every game on this device (careers need them all): its
 * achievements flipping in, then the ladders that moved up.
 */
export default function WinnerReel({ g, max = 12 }: { g: KtGame; max?: number }) {
  const src = useKtGames();
  // The archive can trail the table by a save; the finished game is always counted.
  const games = useMemo(
    () => (src.games.some((x) => x.syncId === g.syncId) ? src.games : [g, ...src.games]),
    [src.games, g],
  );
  const who = useWho(games);
  const person = (id: string) => {
    const w = who(id);
    return { id, playerId: w.playerId, name: w.name, emoji: w.emoji, color: w.color };
  };
  const earned = useMemo(() => allAchievements(ktFacts(games)), [games]);
  const items = reelOrder(DEF, earned, g.syncId).map((e) => ({ e, who: person(e.playerId) }));
  const ups = levelUps(KT_LADDERS, earned, g.players.map(pidOf), {
    id: g.syncId,
    startedAt: g.createdAt,
  });
  const best = mvpOf(g);
  const mvp = best && { who: person(best.playerId), line: end.winner.mvp(best.n, best.of) };
  // Careers count every game here: wait for the archive rather than reshuffle the cards.
  if (src.status === 'loading') return null;
  return (
    <>
      {(items.length > 0 || mvp) && (
        <>
          <h2 className={HEADING}>{t.hub.game.achievements}</h2>
          <AchievementReel prog={CAT} items={items} max={max} mvp={mvp} />
        </>
      )}
      <LevelUps prog={CAT} ups={ups} person={person} heading={HEADING} />
    </>
  );
}
