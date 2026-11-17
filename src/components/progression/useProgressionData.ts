import { useMemo } from 'react';
import { dayOf } from '@/progression/zone';
import type { Award, Earned, GameId, SeasonResult, StandingRow } from '@/progression/types';
import { ep } from '@/sync/endpoints';
import type { AwardRow, Page } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import type { ProgressionEnv } from './env';

const isFinal = (v: { final: boolean }) => v.final;

/** Cache keys: Kachuful's are the ones it always used, so its cached answers still count. */
const keyOf = (game: GameId, k: string) => (game === 'kachuful' ? k : `${game}:${k}`);

/** The server sends null where the device engine leaves a field out. */
export const unaward = (xs: AwardRow[]): Award[] =>
  xs.map(({ player, gameId, roundIndex, ...x }) => ({
    ...x,
    playerId: player.id,
    ...(gameId != null && { gameId }),
    ...(roundIndex != null && { roundIndex }),
  }));

const unwrap = <T extends { player: { id: string } }>(xs: T[]) =>
  xs.map(({ player, ...x }) => ({ ...x, playerId: player.id }));

/**
 * Everything earned in the game, everyone's: signed in, every page of the server's list (one run is one achievement,
 * so a busy month passes 200 a page), shown from the device until it arrives; signed out, the device's. Null while
 * there is nothing to show yet (a game with no device rules, before the server answers).
 */
export function useEarned(env: ProgressionEnv) {
  const game = env.prog.id;
  const remote = useRemote(env.signedIn ? keyOf(game, 'ach:all') : null, async () => {
    const items: Earned[] = [];
    let cursor: string | null = null;
    do {
      const page: Page<Earned> = await ep.achievements(undefined, cursor, game);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return { items, nextCursor: null };
  });
  const all = remote.data?.items ?? env.device?.earned() ?? (env.signedIn ? null : []);
  return { all, remote };
}

/** One player's ladder counts from the server's ladders endpoint, or the device's signed out. */
export function useLadderCounts(env: ProgressionEnv, playerId: string | null) {
  const game = env.prog.id;
  const remote = useRemote(
    env.signedIn && playerId ? keyOf(game, `ladders:${playerId}`) : null,
    (o) => ep.ladders(game, playerId!, o),
  );
  const local = useMemo(
    () => (playerId && !env.signedIn ? (env.device?.ladderCounts(playerId) ?? null) : null),
    [env.device, env.signedIn, playerId],
  );
  return !playerId ? null : env.signedIn ? (remote.data?.counts ?? {}) : local;
}

export type DayAwards = { awards: Award[]; final: boolean } | 'loading';

/** A day's awards: the server's (Kolkata days) signed in; this device's signed out. */
export function useDaily(env: ProgressionEnv, day: string) {
  const game = env.prog.id;
  // Closed days never change: a cached one is never asked for again.
  const remote = useRemote(
    env.signedIn ? keyOf(game, `daily:${day}`) : null,
    (o) => ep.daily(day, o, game),
    isFinal,
  );
  const d: DayAwards = !env.signedIn
    ? { awards: env.device?.daily(day) ?? [], final: day < dayOf(Date.now()) }
    : remote.data
      ? { awards: unaward(remote.data.awards), final: remote.data.final }
      : 'loading';
  return { d, remote };
}

export type Champ = { season: string; playerId: string | null };

/** The months with a season, newest first, and each closed month's champion. */
export function useSeasons(env: ProgressionEnv, thisMonth: string) {
  const game = env.prog.id;
  const remote = useRemote(env.signedIn ? keyOf(game, 'seasons') : null, (o) =>
    ep.seasons(o, game),
  );
  const local = useMemo(() => env.device?.months() ?? [], [env.device]);
  const months = env.signedIn && remote.data ? remote.data.map((x) => x.season) : local;
  // Closed months only: this month's leader isn't a champion yet.
  const champions: Champ[] = useMemo(() => {
    if (env.signedIn)
      return (remote.data ?? [])
        .filter((x) => x.season < thisMonth)
        .map((x) => ({ season: x.season, playerId: x.champion?.id ?? null }));
    return local
      .filter((m) => m < thisMonth)
      .map((m) => ({
        season: m,
        playerId: env.device!.season(m).standings.find((x) => x.rank === 1)?.playerId ?? null,
      }));
  }, [env.signedIn, env.device, remote.data, local, thisMonth]);
  return { months, champions, remote };
}

/** A month's standings and awards; `R` is the game's row (Kachuful's points rows, or win-rate rows). */
export function useSeason<R extends StandingRow = StandingRow>(
  env: ProgressionEnv,
  month: string,
  enabled: boolean,
) {
  const game = env.prog.id;
  const remote = useRemote(
    env.signedIn && enabled ? keyOf(game, `season:${month}`) : null,
    (o) => ep.season(month, o, game),
    isFinal,
  );
  const s: SeasonResult<R> | 'loading' | null = !enabled
    ? null
    : !env.signedIn
      ? ((env.device?.season(month) as SeasonResult<R> | undefined) ?? {
          season: month,
          standings: [],
          awards: [],
        })
      : remote.data
        ? {
            season: month,
            standings: unwrap<{ player: { id: string } }>(remote.data.standings) as unknown as R[],
            awards: unaward(remote.data.awards),
          }
        : 'loading';
  return { s, remote };
}
