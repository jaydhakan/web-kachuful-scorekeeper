import { useCallback, useMemo } from 'react';
import type { Person } from '@/components/progression/env';
import { tableAsGame } from '@/games/spades/domain/achievements';
import type { SpPublic } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import SpReel from './SpReel';

/** An online table's reel: the game's own achievements, the people as they sat (or sat in for a hand). */
export default function OnlineReel({ table }: { table: SpPublic }) {
  const game = useMemo(() => tableAsGame(table), [table]);
  const person = useCallback(
    (id: string): Person => {
      const who = table.seats.find((x) => x.who?.playerId === id)?.who;
      return who
        ? { id, name: who.name, emoji: who.emoji, color: who.color, photoUrl: who.photoUrl }
        : { id, name: s.pops.someone, emoji: '🙂', color: 'var(--tx2)' };
    },
    [table.seats],
  );
  return <SpReel game={game} person={person} />;
}
