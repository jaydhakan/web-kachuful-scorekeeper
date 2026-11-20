import type { GameStatus } from '@/sync/types';
import { crowns as s } from '@/strings/crowns';
import { sikke } from '@/strings/sikke';

export interface CrownBanner {
  glyph: string;
  headline: string;
  lines: string[];
  /** A new Badshah or a Kursi taken is a show with sound (one of tonight's crown shows); the rest is news. */
  kind: 'gold' | 'kursi' | 'news' | 'bounty';
}

const names = (ps: { displayName: string }[]) => ps.map((p) => p.displayName);

/**
 * What the banner says for one game's crown changes and bounties: the biggest change is the headline (a new
 * Badshah, then the Kursi), the rest are lines. A crown nobody holds now (the Sitara after midnight) says nothing.
 */
export function crownBanner(st: GameStatus): CrownBanner | null {
  const held = st.changes.filter((c) => c.to.length);
  const gold = held.find((c) => c.kind === 'medal1');
  const chair = held.find((c) => c.kind === 'kursi');
  const lines: string[] = [];
  if (gold?.from.length) lines.push(s.wasBadshah(names(gold.from)));
  if (chair) {
    const line = s.kursiLine(names(chair.to), names(chair.from));
    lines.push(gold ? `${s.glyph.kursi} ${s.kursiTaken} ${line}` : line);
  }
  // The smaller news, each with its own glyph: it leads the banner when no Badshah or Kursi moved.
  const small: [string, string][] = [];
  for (const c of held)
    if (c.kind === 'medal2' || c.kind === 'medal3')
      small.push([s.glyph[c.kind], s.newMedal(c.kind === 'medal2' ? 2 : 3, names(c.to))]);
    else if (c.kind === 'sitara') small.push([s.glyph.sitara, s.newSitara(names(c.to))]);
    else if (c.kind === 'legend') small.push([s.glyph.legend, s.newLegend(names(c.to))]);
  for (const b of st.bounties)
    small.push([sikke.glyph, s.bounty(b.amount, b.winner.displayName, b.holder.displayName)]);
  lines.push(...small.map(([, t]) => t));
  if (gold)
    return { glyph: s.glyph.medal1, headline: s.newBadshah(names(gold.to)), lines, kind: 'gold' };
  if (chair)
    return {
      glyph: s.glyph.kursi,
      headline: chair.from.length ? s.kursiTaken : s.kursiFirst,
      lines,
      kind: 'kursi',
    };
  const [lead, ...rest] = small;
  if (!lead) return null;
  return {
    glyph: lead[0],
    headline: lead[1],
    lines: rest.map(([, t]) => t),
    kind: held.length ? 'news' : 'bounty',
  };
}
