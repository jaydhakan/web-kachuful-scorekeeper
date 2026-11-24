import { useMemo, type ReactNode } from 'react';
import { CrownsValue, useCrowns } from '@/components/crowns/table';
import { useWinRateCrowns } from '@/components/crowns/useWinRateCrowns';
import { useFxPrefs } from '@/fx/prefs';
import { pickIndex } from '@/progression/banter';
import { signedInAs, useSession } from '@/sync/session';
import { SEASON_MIN_GAMES } from '@/games/spades/domain/awards';
import { spBanterLog } from '@/games/spades/domain/banter';
import { handLines, totals } from '@/games/spades/domain/standings';
import type { SpGame, SpPublic } from '@/games/spades/domain/types';
import { poolFor } from '@/games/spades/strings/banter';

/** A seat's id at the crowns: its registry player, else the seat (an empty seat holds nothing). */
const seatId = (t: SpPublic, k: number) => t.seats[k]?.who?.playerId ?? `seat:${k}`;

/** The table as the scorekeeper's game shape, enough for the banter's rule table. */
const asGame = (t: SpPublic): SpGame =>
  ({
    syncId: t.id,
    players: t.seats.map((s, k) => ({
      id: seatId(t, k),
      name: s.who?.name ?? '',
      emoji: s.who?.emoji ?? '',
      color: s.who?.color ?? '',
    })),
    hands: t.history,
  }) as unknown as SpGame;

/**
 * Medals, Aaj ka Sitara and the Legend at an online Spades table (REWARDS-PLAN §6.7), from the server's board: the
 * table is the server's, so there is no device board. A team's two seats share its place.
 */
export function OnlineCrowns({ t, children }: { t: SpPublic; children: ReactNode }) {
  const signedIn = !!signedInAs(useSession());
  const key = t.seats.map((s) => s.who?.playerId ?? '').join(',');
  const seats = useMemo(
    () =>
      t.seats.flatMap((s, k) =>
        s.who ? [{ id: seatId(t, k), board: s.who.playerId, name: s.who.name }] : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the seats change only with who sits
    [key],
  );
  const standing = useMemo(() => {
    if (!t.history.length) return null;
    const tt = totals(t.history);
    const lead =
      t.result && t.result.winner !== 'draw'
        ? t.result.winner
        : tt.a.score >= tt.b.score
          ? 'a'
          : 'b';
    const tie = t.result ? t.result.winner === 'draw' : tt.a.score === tt.b.score;
    const place = new Map<string, number>(),
      won = new Set<string>();
    t.seats.forEach((_, k) => {
      const team = k % 2 === 0 ? 'a' : 'b';
      place.set(seatId(t, k), tie || team === lead ? 1 : 2);
      if (!tie && team === lead) won.add(seatId(t, k));
    });
    return { place, won };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the standing moves only when a hand ends
  }, [t.id, t.history.length, t.result, key]);
  const crowns = useWinRateCrowns({
    game: 'spades',
    gameId: t.id,
    signedIn,
    device: null,
    minGames: SEASON_MIN_GAMES,
    seats,
    standing,
  });
  return <CrownsValue value={crowns}>{children}</CrownsValue>;
}

/** The last hand's banter line; null with none, or with "Table banter" off. */
export function useOnlineBanter(t: SpPublic): string | null {
  const { marks } = useCrowns();
  const [fx] = useFxPrefs();
  const g = useMemo(() => asGame(t), [t]);
  const log = useMemo(() => spBanterLog(g, marks), [g, marks]);
  const last = t.history.at(-1);
  if (!fx.banter || !last) return null;
  const b = log[handLines(t.history).findIndex((l) => l.index === last.index)];
  if (!b) return null;
  const pool = poolFor(b.kind, b.mark);
  if (!pool.length) return null;
  const name = g.players.find((p) => p.id === b.who)?.name ?? '';
  return pool[pickIndex(`${t.id}:${last.index}`, pool.length)](name);
}
