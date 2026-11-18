import { useMemo } from 'react';
import { AchievementReel, LevelUps, type ReelItem } from '@/components/progression/AchievementReel';
import type { Person } from '@/components/progression/env';
import { byCode } from '@/progression/catalogue';
import { levelUps, reelOrder } from '@/progression/reel';
import { allAchievements, gameAchievements } from '@/games/spades/domain/achievements';
import type { SpGame } from '@/games/spades/domain/types';
import { progression } from '@/games/spades/progression';
import { mvpOf } from '@/games/spades/domain/mvp';
import { mvpText } from '@/games/spades/strings/achievements';
import { t } from '@/strings';

const HEADING = 'disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]';

/**
 * A finished game's winner-screen reel: what it earned, big ones first, and (with `device`, the games on this phone
 * when signed out) the careers and ladders it moved. Signed in or online, the game's own achievements only: this
 * phone doesn't hold everyone's career.
 */
export default function SpReel({
  game,
  device,
  person,
}: {
  game: SpGame;
  device?: readonly SpGame[];
  person: (id: string) => Person;
}) {
  const earned = useMemo(
    () => (device ? allAchievements(device) : gameAchievements(game)),
    [device, game],
  );
  const items: ReelItem[] = useMemo(
    () =>
      reelOrder(byCode(progression), earned, game.syncId).map((e) => ({
        e,
        who: person(e.playerId),
      })),
    [earned, game.syncId, person],
  );
  const ups = useMemo(
    () =>
      device
        ? levelUps(
            progression.ladders,
            earned,
            new Set(earned.filter((e) => e.gameId === game.syncId).map((e) => e.playerId)),
            { id: game.syncId, startedAt: game.createdAt },
          )
        : [],
    [device, earned, game.syncId, game.createdAt],
  );
  const best = useMemo(() => mvpOf(game), [game]);
  const mvp = best && {
    who: person(best.playerId),
    title: mvpText.title,
    line: mvpText.line(best.kind, best.n),
  };
  if (!items.length && !ups.length && !mvp) return null;
  return (
    <div className="w-full text-left">
      {(items.length > 0 || mvp) && (
        <>
          <h2 className={HEADING}>{t.hub.game.achievements}</h2>
          <AchievementReel prog={progression} items={items} mvp={mvp} />
        </>
      )}
      <LevelUps prog={progression} ups={ups} person={person} heading={HEADING} />
    </div>
  );
}
