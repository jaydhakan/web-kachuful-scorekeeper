import { useMemo, type ReactNode } from 'react';
import { CrownsValue, useCrowns } from '@/components/crowns/table';
import { useWinRateCrowns } from '@/components/crowns/useWinRateCrowns';
import { useFxPrefs } from '@/fx/prefs';
import { pidOf } from '@/people/pid';
import { pickIndex } from '@/progression/banter';
import { archive } from '@/state/archive';
import { signedInAs, useSession } from '@/sync/session';
import { doneHands, standings, type KtGame, type KtHand } from '@/games/kaali-teeri/domain';
import { playerGames } from '@/games/kaali-teeri/domain/achievements';
import { SEASON_MIN_GAMES } from '@/games/kaali-teeri/domain/awards';
import { ktBanterLog } from '@/games/kaali-teeri/domain/banter';
import { factsOf } from '@/games/kaali-teeri/progression';
import { poolFor } from '@/games/kaali-teeri/strings/banter';

/**
 * The month's medals, Aaj ka Sitara and the Legend at a Kaali Teeri table (REWARDS-PLAN §6.7), for every screen
 * under it: the server's board signed in, this device's finished games signed out. The game at the table is left out.
 */
export function KtCrowns({ g, children }: { g: KtGame | null; children: ReactNode }) {
  const signedIn = !!signedInAs(useSession());
  const seats = useMemo(
    () => (g ? g.players.map((p) => ({ id: p.id, board: pidOf(p), name: p.name })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the seats change only with the players
    [g?.syncId, g?.players],
  );
  const hands = g ? doneHands(g).length : 0;
  const standing = useMemo(() => {
    if (!g || !hands) return null;
    const st = standings(g);
    return {
      place: new Map(st.map((x) => [x.p.id, x.rank])),
      won: new Set(st.filter((x) => x.rank === 1).map((x) => x.p.id)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the standing moves only when a hand is done
  }, [g?.syncId, hands, g?.status]);
  const crowns = useWinRateCrowns({
    game: 'kaali-teeri',
    gameId: g?.syncId ?? null,
    signedIn,
    device: g
      ? () =>
          playerGames(
            factsOf(
              archive
                .ktGames()
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
export function useKtBanter(g: KtGame, h: KtHand): string | null {
  const { marks } = useCrowns();
  const [fx] = useFxPrefs();
  const log = useMemo(() => ktBanterLog(g, marks), [g, marks]);
  if (!fx.banter) return null;
  const b = log[doneHands(g).indexOf(h)];
  if (!b) return null;
  const pool = poolFor(b.kind, b.mark);
  if (!pool.length) return null;
  const name = (id?: string) => g.players.find((p) => p.id === id)?.name ?? '';
  return pool[pickIndex(`${g.syncId}:${h.index}`, pool.length)](name(b.who), name(b.other));
}
