import { useMemo, type ReactNode } from 'react';
import { BanterLine } from '@/components/crowns/BanterLine';
import { CrownsValue, useCrowns } from '@/components/crowns/table';
import { useWinRateCrowns } from '@/components/crowns/useWinRateCrowns';
import { useFxPrefs } from '@/fx/prefs';
import { pidOf } from '@/people/pid';
import { pickIndex } from '@/progression/banter';
import { signedInAs, useSession } from '@/sync/session';
import { SEASON_MIN_GAMES } from '@/games/ishaara/domain/awards';
import { ishBanterLog, turnsOf } from '@/games/ishaara/domain/banter';
import type { IshaaraPublic, Team } from '@/games/ishaara/domain/types';
import { poolFor } from '@/games/ishaara/strings/banter';

/**
 * Medals, Aaj ka Sitara and the Legend at an Ishaara table (REWARDS-PLAN §6.7), from the server's board (Ishaara is
 * signed in only). A team's seats share its place: the winner's, else whoever has found more as it stands.
 */
export function IshCrowns({ g, children }: { g: IshaaraPublic; children: ReactNode }) {
  const signedIn = !!signedInAs(useSession());
  const key = (g.players ?? []).map((p) => p.id).join(',');
  const seats = useMemo(
    () => (g.players ?? []).map((p) => ({ id: p.id, board: pidOf(p), name: p.name })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the seats change only with who sits
    [key],
  );
  const found =
    (g.revealed ?? []).filter((x) => x === 'sun').length -
    (g.revealed ?? []).filter((x) => x === 'moon').length;
  const standing = useMemo(() => {
    const lead: Team | null = g.winner ?? (found > 0 ? 'sun' : found < 0 ? 'moon' : null);
    const place = new Map<string, number>(),
      won = new Set<string>();
    for (const p of g.players ?? []) {
      place.set(p.id, !lead || p.team === lead ? 1 : 2);
      if (lead && p.team === lead) won.add(p.id);
    }
    return { place, won };
  }, [g.players, g.winner, found]);
  const crowns = useWinRateCrowns({
    game: 'ishaara',
    gameId: g.id,
    signedIn,
    device: null,
    minGames: SEASON_MIN_GAMES,
    seats,
    standing,
  });
  return <CrownsValue value={crowns}>{children}</CrownsValue>;
}

/** The last finished turn's banter line under the turn banner; nothing with none, or with "Table banter" off. */
export function TurnBanter({ g }: { g: IshaaraPublic }) {
  const { marks } = useCrowns();
  const [fx] = useFxPrefs();
  const log = useMemo(() => ishBanterLog(g, marks), [g, marks]);
  const turns = turnsOf(g.log ?? []).length;
  // The turn in play is still running: its line waits until the next clue (or the game's end).
  const i = g.status === 'finished' ? turns - 1 : turns - 2;
  const b = fx.banter && i >= 0 ? log[i] : null;
  const pool = b ? poolFor(b.kind, b.mark) : [];
  if (!b || !pool.length) return null;
  const name = g.players.find((p) => p.id === b.who)?.name ?? '';
  const text = pool[pickIndex(`${g.id}:${i}`, pool.length)](name);
  return <BanterLine key={i} text={text} show anim className="mt-1 text-center text-14" />;
}
