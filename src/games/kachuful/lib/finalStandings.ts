import { doneRounds, standings, type Game } from '@/games/kachuful/domain';
import type { PodiumStanding } from '@/components/ui/Podium';
import type { ShareCard } from '@/lib/shareImage';

/** The game's standings in the shape the shared podium and share card draw. */
export const finalStandings = (g: Game): PodiumStanding[] =>
  standings(g).map((s) => ({ ...s.p, rank: s.rank, total: s.t }));

/** Kachuful's final-scores card. */
export const shareCard = (g: Game): ShareCard => ({
  title: 'Kachuful',
  subtitle: `${doneRounds(g).length} rounds · final scores`,
  standings: finalStandings(g),
});
