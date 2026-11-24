import { useMemo, type ReactNode } from 'react';
import { CrownsValue, useCrowns } from '@/components/crowns/table';
import { useWinRateCrowns } from '@/components/crowns/useWinRateCrowns';
import { useFxPrefs } from '@/fx/prefs';
import { pidOf } from '@/people/pid';
import { pickIndex } from '@/progression/banter';
import { archive } from '@/state/archive';
import { signedInAs, useSession } from '@/sync/session';
import { playerFacts } from '@/games/spades/domain/achievements';
import { SEASON_MIN_GAMES } from '@/games/spades/domain/awards';
import { spBanterLog } from '@/games/spades/domain/banter';
import { allFacts } from '@/games/spades/domain/boards';
import { handLines } from '@/games/spades/domain/standings';
import { gameResult, gameTotals } from '@/games/spades/domain/table';
import type { SpGame, SpHand } from '@/games/spades/domain/types';
import { poolFor } from '@/games/spades/strings/banter';

/**
 * Medals, Aaj ka Sitara and the Legend at a Spades scorekeeper's table (REWARDS-PLAN §6.7): the server's board
 * signed in, this device's finished games signed out. A team's two seats share its place.
 */
export function SpCrowns({ g, children }: { g: SpGame | null; children: ReactNode }) {
  const signedIn = !!signedInAs(useSession());
  const seats = useMemo(
    () => (g ? g.players.map((p) => ({ id: p.id, board: pidOf(p), name: p.name })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the seats change only with the players
    [g?.syncId, g?.players],
  );
  const done = g ? g.hands.filter((h) => h.phase === 'done').length : 0;
  const standing = useMemo(() => {
    if (!g || !done) return null;
    const t = gameTotals(g);
    const r = gameResult(g);
    const lead =
      r && r !== 'tie' && r.winner !== 'draw' ? r.winner : t.a.score >= t.b.score ? 'a' : 'b';
    const tie = r !== null && r !== 'tie' ? r.winner === 'draw' : t.a.score === t.b.score;
    const place = new Map<string, number>(),
      won = new Set<string>();
    g.players.forEach((p, k) => {
      const team = k % 2 === 0 ? 'a' : 'b';
      place.set(p.id, tie || team === lead ? 1 : 2);
      if (!tie && team === lead) won.add(p.id);
    });
    return { place, won };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the standing moves only when a hand is done
  }, [g?.syncId, done, g?.status]);
  const crowns = useWinRateCrowns({
    game: 'spades',
    gameId: g?.syncId ?? null,
    signedIn,
    device: g
      ? () =>
          playerFacts(
            allFacts(
              archive
                .spGames()
                .map((r) => r.game)
                .filter((x) => x.syncId !== g.syncId),
            ),
          )
      : null,
    minGames: SEASON_MIN_GAMES,
    seats,
    standing,
  });
  return <CrownsValue value={crowns}>{children}</CrownsValue>;
}

/** The hand's banter line, worded from its pool; null with none, or with "Table banter" off. */
export function useSpBanter(g: SpGame, h: SpHand): string | null {
  const { marks } = useCrowns();
  const [fx] = useFxPrefs();
  const log = useMemo(() => spBanterLog(g, marks), [g, marks]);
  if (!fx.banter) return null;
  const b = log[handLines(g.hands).findIndex((l) => l.index === h.index)];
  if (!b) return null;
  const pool = poolFor(b.kind, b.mark);
  if (!pool.length) return null;
  const name = g.players.find((p) => p.id === b.who)?.name ?? '';
  return pool[pickIndex(`${g.syncId}:${h.index}`, pool.length)](name);
}
