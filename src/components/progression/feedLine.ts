import { sgnN } from '@/lib/format';
import type { Activity } from '@/sync/types';
import { t } from '@/strings';
import { progression as ps } from '@/strings/progression';

const ac = t.hub.activity;
const f = ps.feed;

/** Each game's summary as the feed sends it, loosely: only what the line reads. */
interface Loose {
  kind?: string;
  players?: { name: string; place?: number | null; points?: number; team?: 'a' | 'b' }[];
  seats?: ({ name: string } | null)[];
  scores?: { a: number; b: number };
  result?: { winner?: string } | null;
  winner?: 'sun' | 'moon' | null;
}

const both = (names: (string | undefined)[]) => names.filter(Boolean).join(' & ');

/**
 * A finished game's line in the feed, in its own kind's terms: Kachuful and Kaali Teeri by place, Spades by team
 * (table mode by each player's team, an online table by seat), Ishaara by the winning team.
 */
export function finishedLine(a: Activity): string {
  const g = a.game as unknown as Loose | null;
  if (!g) return ac.finished('', '');
  if (a.gameKind === 'ishaara') return g.winner ? f.teamWon(f.ishaaraTeam[g.winner]) : f.ended;
  if (a.gameKind === 'spades') {
    const w = g.result?.winner;
    if (w === 'draw') return f.drawn;
    if (w !== 'a' && w !== 'b') return f.ended;
    const names =
      g.kind === 'spades-online'
        ? both((g.seats ?? []).filter((_, i) => (i % 2 === 0) === (w === 'a')).map((s) => s?.name))
        : both((g.players ?? []).filter((p) => p.team === w).map((p) => p.name));
    const score = g.scores ? `${g.scores[w]}–${g.scores[w === 'a' ? 'b' : 'a']}` : '';
    return ac.finished(names, score);
  }
  const top = g.players?.find((p) => p.place === 1);
  return top ? ac.finished(top.name, top.points == null ? '' : sgnN(top.points)) : f.ended;
}
