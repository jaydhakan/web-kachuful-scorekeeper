import { doneHands, standings, type KtGame } from '@/games/kaali-teeri/domain';
import type { PodiumStanding } from '@/components/ui/Podium';
import type { ShareCard } from '@/lib/shareImage';
import { fmt } from '@/lib/format';
import { end } from '@/games/kaali-teeri/strings/end';

/** The game's standings in the shape the shared podium and share card draw; ties share the place. */
export const finalStandings = (g: KtGame): PodiumStanding[] =>
  standings(g).map((s) => ({ ...s.p, rank: s.rank, total: s.t }));

const subtitle = (g: KtGame) => end.share.subtitle(doneHands(g).length, g.status === 'finished');

/** Kaali Teeri's scores card. */
export const shareCard = (g: KtGame): ShareCard => ({
  title: end.game,
  subtitle: subtitle(g),
  standings: finalStandings(g),
});

/** Plain-text scoreboard for messaging apps and the clipboard. */
export function shareText(g: KtGame): string {
  const rows = standings(g).map((s) => `${s.rank}. ${s.p.emoji} ${s.p.name}  ${fmt(s.t)}`);
  return [`${end.game} · ${subtitle(g)}`, ...rows].join('\n');
}
