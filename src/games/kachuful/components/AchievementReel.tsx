import { useMemo } from 'react';
import {
  ACH,
  ACHIEVEMENTS,
  allAchievements,
  LADDERS,
  pidOf,
  type Earned,
  type Facts,
  type Game,
} from '@/games/kachuful/domain';
import { levelUps, reelOrder, type LevelUp as KitLevelUp } from '@/progression/reel';
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { achievements } from '@/games/kachuful/strings/achievements';
import type { CatalogueView } from '@/progression/catalogue';
import { t } from '@/strings';
import {
  AchievementReel as SharedReel,
  LevelUps as SharedLevelUps,
} from '@/components/progression/AchievementReel';

// The catalogue alone, not the whole progression: the large screen loads the winner with its first screens.
const CAT: CatalogueView = {
  catalogue: ACHIEVEMENTS,
  strings: { achievements, ladders: t.hub.ach.ladders },
};

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
  return useMemo(
    () => reelOrder(ACH, earnedOf(f), g.syncId).map((e) => ({ e, who: whoIs(f, e.playerId) })),
    [f, g.syncId],
  );
}

/** Cards flipping in one by one; a tap turns a card over to say how it was earned. */
export function AchievementReel({ g, max = 12 }: { g: Game; max?: number }) {
  return <SharedReel prog={CAT} items={useGameAchievements(g)} max={max} />;
}

export type LevelUp = KitLevelUp<(typeof LADDERS)[number]>;

/** Each player's ladders that gained a level in this game: levels held before it started, and after. */
export function useLevelUps(g: Game): LevelUp[] {
  const f = useDeviceFacts();
  return useMemo(
    () =>
      levelUps(LADDERS, earnedOf(f), g.players.map(pidOf), {
        id: g.syncId,
        startedAt: g.createdAt,
      }),
    [f, g.players, g.createdAt, g.syncId],
  );
}

/** "Level up": one card per player and ladder, the levels gained in this game popping into place. */
export function LevelUps({ g, heading }: { g: Game; heading: string }) {
  const ups = useLevelUps(g);
  const f = useDeviceFacts();
  return <SharedLevelUps prog={CAT} ups={ups} person={(id) => whoIs(f, id)} heading={heading} />;
}
