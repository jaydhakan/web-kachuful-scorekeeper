import { sgnN } from '@/lib/format';
import type { Activity, CrownKind } from '@/sync/types';
import { crowns } from '@/strings/crowns';
import { medals } from '@/strings/medals';
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

const ids = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const CROWNS: readonly string[] = ['medal1', 'medal2', 'medal3', 'kursi', 'sitara', 'legend'];

/** A crown that changed hands (`data: {crown, from, to}`, ids): its glyph and line, names from `nameOf`. */
export function crownLine(a: Activity, nameOf: (id: string) => string): [string, string] {
  const toIds = ids(a.data.to);
  const n = toIds.length;
  const to = both(toIds.map(nameOf)) || (a.player?.displayName ?? '');
  const from = both(ids(a.data.from).map(nameOf));
  const c = ac.crown;
  const kind = a.data.crown;
  if (typeof kind !== 'string' || !CROWNS.includes(kind)) return [crowns.glyph.medal1, c.other(to)];
  const k = kind as CrownKind;
  const line =
    k === 'kursi'
      ? c.kursi(to, from)
      : k === 'sitara'
        ? c.sitara(to, n)
        : k === 'legend'
          ? c.legend(to, n)
          : c.medal(to, medals.title[k === 'medal1' ? 1 : k === 'medal2' ? 2 : 3], n);
  return [crowns.glyph[k], line];
}

/** A night that closed (`data: {nightId, games, winner}`): its line, and its id to open. */
export function nightLine(a: Activity, nameOf: (id: string) => string) {
  const games = typeof a.data.games === 'number' ? a.data.games : 0;
  const winner = typeof a.data.winner === 'string' ? nameOf(a.data.winner) : '';
  const id = typeof a.data.nightId === 'string' ? a.data.nightId : null;
  return { text: ac.night(games, winner), id };
}
