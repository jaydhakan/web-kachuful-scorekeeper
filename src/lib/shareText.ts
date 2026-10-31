import { doneRounds, standings, type Game } from '@/domain';
import { fmt } from '@/lib/format';

/** Plain-text scoreboard for messaging apps and the clipboard. */
export function shareText(g: Game): string {
  const rows = standings(g).map((s) => `${s.rank}. ${s.p.emoji} ${s.p.name}  ${fmt(s.t)}`);
  return [`Kachuful · ${doneRounds(g).length} rounds · final scores`, ...rows].join('\n');
}
