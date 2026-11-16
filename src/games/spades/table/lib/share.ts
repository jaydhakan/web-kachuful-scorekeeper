import { gameTotals, handLines, seatsOf, type SpGame, type TeamId } from '@/games/spades/domain';
import { spTable as s } from '@/games/spades/strings/table';
import type { ShareCard } from '@/lib/shareImage';

const teamLine = (g: SpGame, t: TeamId) => {
  const [x, y] = seatsOf(t);
  return s.pair(g.players[x].name, g.players[y].name);
};

/** Teams best first; equal scores share first place. */
function ranked(g: SpGame): { t: TeamId; score: number; rank: number }[] {
  const tot = gameTotals(g);
  const rows = (['a', 'b'] as const)
    .map((t) => ({ t, score: tot[t].score }))
    .sort((p, q) => q.score - p.score);
  return rows.map((r, i) => ({ ...r, rank: i && r.score === rows[0].score ? 1 : i + 1 }));
}

const subtitle = (g: SpGame) => s.share.subtitle(handLines(g.hands).length, g.status !== 'active');

/** The scores card: each player with their team's score, partners sharing a place. */
export const shareCard = (g: SpGame): ShareCard => ({
  title: s.game,
  subtitle: subtitle(g),
  standings: ranked(g).flatMap((r) =>
    seatsOf(r.t).map((k) => {
      const p = g.players[k];
      return { rank: r.rank, name: p.name, emoji: p.emoji, color: p.color, total: r.score };
    }),
  ),
});

/** Plain-text scores for messaging apps and the clipboard. */
export const shareText = (g: SpGame): string =>
  [
    `${s.game} · ${subtitle(g)}`,
    ...ranked(g).map((r) => s.share.line(teamLine(g, r.t), r.score)),
  ].join('\n');
