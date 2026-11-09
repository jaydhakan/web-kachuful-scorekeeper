import { doneHands, result, slots, standings, team, totals } from './scoring';
import { pidOf } from '../../../people/pid';
import type { KtGame, KtHand, KtLength, Player, Suit, Sweep } from './types';

/** A player across games: their registry id, else their name (as Kachuful keys them). */
export const playerKey = (p: Player): string => pidOf(p);

const ended = (g: KtGame) => g.status === 'finished';

/** The kt_hands row of each done hand, with players by key. */
export interface KtHandRow {
  handIndex: number;
  dealerId: string;
  bidderId: string;
  bid: number;
  forced: boolean;
  trump: Suit;
  partnerIds: string[];
  slots: Record<string, number>;
  teamPoints: number;
  made: boolean;
  sweep: Sweep;
  doneAt: number | null;
}

export function handRows(g: KtGame): KtHandRow[] {
  const key = Object.fromEntries(g.players.map((p) => [p.id, playerKey(p)]));
  return doneHands(g).map((h) => {
    const res = result(h, g.rules)!;
    const s = slots(h);
    return {
      handIndex: h.index,
      dealerId: playerKey(g.players[h.dealerIndex]),
      bidderId: key[h.bidder!],
      bid: h.bid!,
      forced: h.calls.some((c) => 'forced' in c),
      trump: h.trump!,
      partnerIds: team(h)
        .slice(1)
        .map((id) => key[id]),
      slots: Object.fromEntries(Object.entries(s).map(([id, v]) => [key[id], v])),
      teamPoints: h.teamPoints!,
      made: res.made,
      sweep: res.sweep,
      doneAt: h.doneAt ?? null,
    };
  });
}

/** What one player did in one hand, the unit every count below is built from. */
interface Part {
  bidder: boolean;
  partner: boolean;
  onTeam: boolean;
  made: boolean;
  bid: number;
  slots: number;
  swept: boolean;
  mates: string[];
}

function part(g: KtGame, h: KtHand, id: string): Part {
  const res = result(h, g.rules)!;
  const tm = team(h),
    s = slots(h);
  const onTeam = tm.includes(id);
  const key = (pid: string) => playerKey(g.players.find((p) => p.id === pid)!);
  return {
    bidder: h.bidder === id,
    partner: onTeam && h.bidder !== id,
    onTeam,
    made: res.made,
    bid: h.bid!,
    slots: s[id] ?? 0,
    swept: res.sweep === (onTeam ? 'bidders' : 'defenders'),
    mates: onTeam ? tm.filter((x) => x !== id).map(key) : [],
  };
}

/** The kt_game_players rows; places only once the game has ended. */
export function gamePlayerRows(g: KtGame) {
  const st = standings(g);
  const t = totals(g);
  const hs = doneHands(g);
  return g.players.map((p) => {
    const parts = hs.map((h) => part(g, h, p.id));
    const place = ended(g) ? st.find((s) => s.p.id === p.id)!.rank : null;
    return {
      playerId: playerKey(p),
      points: t[p.id],
      place,
      won: place === 1,
      handsBid: parts.filter((x) => x.bidder).length,
      bidsMade: parts.filter((x) => x.bidder && x.made).length,
      timesPartner: parts.filter((x) => x.partner).length,
      partnerMade: parts.filter((x) => x.partner && x.made).length,
      doubleSlots: parts.filter((x) => x.slots >= 2).length,
      sweeps: parts.filter((x) => x.swept).length,
    };
  });
}

export interface KtSummary {
  kind: 'kaali-teeri';
  status: KtGame['status'];
  hands: number;
  length: KtLength;
  players: {
    playerId: string | null;
    name: string;
    emoji: string;
    color: string;
    points: number;
    place: number | null;
  }[];
}

export function summary(g: KtGame): KtSummary {
  const st = standings(g);
  return {
    kind: 'kaali-teeri',
    status: g.status,
    hands: doneHands(g).length,
    length: g.rules.length,
    players: g.players.map((p) => {
      const s = st.find((x) => x.p.id === p.id)!;
      return {
        playerId: p.playerId ?? null,
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        points: s.t,
        place: ended(g) ? s.rank : null,
      };
    }),
  };
}

export interface KtPlayerStats {
  games: number;
  wins: number;
  winRate: number | null;
  avgPlace: number | null;
  points: number;
  bestGame: { gameId: string; points: number } | null;
  handsBid: number;
  bidsMade: number;
  madeRate: number | null;
  avgBid: number | null;
  highestMade: number | null;
  handsLost: number;
  sweeps: number;
  timesPartner: number;
  partnerMade: number;
  partnerWinRate: number | null;
  doubleSlots: number;
  mostPartner: { playerId: string; hands: number; made: number } | null;
  madeStreak: { current: number; best: number };
}

const rate = (a: number, b: number) => (b ? a / b : null);
/** Play order: games by start, then id; hands by index. */
const byPlay = (games: KtGame[]) =>
  [...games].sort((a, b) => a.createdAt - b.createdAt || a.syncId.localeCompare(b.syncId));
const seatOf = (g: KtGame, key: string) => g.players.find((p) => playerKey(p) === key);

/** One player's §6 stats over a set of games. Wins, places and best game count ended games only. */
export function playerStats(games: KtGame[], key: string): KtPlayerStats {
  const parts: Part[] = [];
  const places: number[] = [];
  let count = 0,
    points = 0,
    best: KtPlayerStats['bestGame'] = null;
  for (const g of byPlay(games)) {
    const me = seatOf(g, key);
    const hs = doneHands(g);
    if (!me || !hs.length) continue;
    count++;
    const t = totals(g)[me.id];
    points += t;
    parts.push(...hs.map((h) => part(g, h, me.id)));
    if (ended(g)) {
      places.push(standings(g).find((s) => s.p.id === me.id)!.rank);
      if (!best || t > best.points) best = { gameId: g.syncId, points: t };
    }
  }
  const bids = parts.filter((x) => x.bidder);
  const made = bids.filter((x) => x.made);
  const partner = parts.filter((x) => x.partner);
  const wins = places.filter((p) => p === 1).length;

  const mates = new Map<string, { hands: number; made: number }>();
  for (const x of parts)
    for (const m of x.mates) {
      const e = mates.get(m) ?? { hands: 0, made: 0 };
      mates.set(m, { hands: e.hands + 1, made: e.made + Number(x.made) });
    }
  const top = [...mates].sort(
    ([ka, a], [kb, b]) => b.hands - a.hands || b.made - a.made || ka.localeCompare(kb),
  )[0];

  let current = 0,
    longest = 0;
  for (const x of bids) {
    current = x.made ? current + 1 : 0;
    longest = Math.max(longest, current);
  }

  return {
    games: count,
    wins,
    winRate: rate(wins, places.length),
    avgPlace: rate(
      places.reduce((a, b) => a + b, 0),
      places.length,
    ),
    points,
    bestGame: best,
    handsBid: bids.length,
    bidsMade: made.length,
    madeRate: rate(made.length, bids.length),
    avgBid: rate(
      bids.reduce((a, x) => a + x.bid, 0),
      bids.length,
    ),
    highestMade: made.length ? Math.max(...made.map((x) => x.bid)) : null,
    handsLost: bids.length - made.length,
    sweeps: parts.filter((x) => x.swept).length,
    timesPartner: partner.length,
    partnerMade: partner.filter((x) => x.made).length,
    partnerWinRate: rate(partner.filter((x) => x.made).length, partner.length),
    doubleSlots: parts.filter((x) => x.slots >= 2).length,
    mostPartner: top ? { playerId: top[0], ...top[1] } : null,
    madeStreak: { current, best: longest },
  };
}

export interface KtHeadToHead {
  /** Games both sat in with a hand played. */
  games: number;
  /** Ended games only: who placed better. */
  aAhead: number;
  bAhead: number;
  level: number;
  /** Hands on the same bidding team. */
  together: number;
  togetherMade: number;
  /** Hands one bid while the other defended. */
  aBidAgainstB: number;
  aMadeAgainstB: number;
  bBidAgainstA: number;
  bMadeAgainstA: number;
}

export function headToHead(games: KtGame[], a: string, b: string): KtHeadToHead {
  const o: KtHeadToHead = {
    games: 0,
    aAhead: 0,
    bAhead: 0,
    level: 0,
    together: 0,
    togetherMade: 0,
    aBidAgainstB: 0,
    aMadeAgainstB: 0,
    bBidAgainstA: 0,
    bMadeAgainstA: 0,
  };
  for (const g of games) {
    const pa = seatOf(g, a),
      pb = seatOf(g, b);
    const hs = doneHands(g);
    if (!pa || !pb || !hs.length) continue;
    o.games++;
    if (ended(g)) {
      const st = standings(g);
      const ra = st.find((s) => s.p.id === pa.id)!.rank,
        rb = st.find((s) => s.p.id === pb.id)!.rank;
      if (ra < rb) o.aAhead++;
      else if (rb < ra) o.bAhead++;
      else o.level++;
    }
    // Together is checked first, so a bidder's opponent here is always defending.
    for (const h of hs) {
      const tm = team(h),
        made = result(h, g.rules)!.made;
      if (tm.includes(pa.id) && tm.includes(pb.id)) {
        o.together++;
        o.togetherMade += Number(made);
      } else if (h.bidder === pa.id) {
        o.aBidAgainstB++;
        o.aMadeAgainstB += Number(made);
      } else if (h.bidder === pb.id) {
        o.bBidAgainstA++;
        o.bMadeAgainstA += Number(made);
      }
    }
  }
  return o;
}
