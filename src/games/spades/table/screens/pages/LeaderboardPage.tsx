import { useCallback, useMemo, useState } from 'react';
import { spTable } from '@/games/spades/strings/table';
import {
  MIN_RATED_GAMES,
  SP_PERIODS,
  SP_SORTS,
  spLeaderboard,
  type SpPeriod,
  type SpSort,
} from '@/games/spades/domain/boards';
import { useSpLeaderboard } from '@/games/spades/table/sync/boards';
import { useSp } from '@/games/spades/table/state/store';
import { signedInAs, useSession } from '@/sync/session';
import { Avatar } from '@/components/ui/Avatar';
import { Chip, ChipRow, EmptyState, Skeleton } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RankBoard, type BoardEntry } from '@/components/ui/RankBoard';
import { Seg } from '@/components/ui/Seg';
import { Gate, NoGames, SpPage } from './parts';
import { SeasonNews } from '@/components/progression/SeasonNews';
import { useSpProgressionEnv } from './ProgressionPages';
import { useSpGames, useWho, type Who } from './source';

const b = spTable.pages.board;

interface Row {
  id: string;
  who: Who;
  rank: number | null;
  value: number;
  games: number;
  bids: number;
}

const write = (sort: SpSort, v: number) => (sort === 'wins' ? String(Math.round(v)) : b.pct(v));

/** Players ranked by wins, win % (from three games) or bids made; signed in from the server, else this phone's games. */
export default function LeaderboardPage() {
  const src = useSpGames();
  const { actions } = useSp();
  const env = useSpProgressionEnv(src);
  const [period, setPeriod] = useState<SpPeriod>('season');
  const [sort, setSort] = useState<SpSort>('wins');
  const me = signedInAs(useSession())?.player?.id;
  const remote = useSpLeaderboard(period, sort);
  const server = remote.online && remote.data ? remote.data : null;
  const local = useMemo(
    () => spLeaderboard(src.games, { period, sort }),
    [src.games, period, sort],
  );
  const seen = useWho(src.games);
  const rows: Row[] = server
    ? server.rows.map((r) => ({
        id: r.player.id,
        who: {
          id: r.player.id,
          playerId: r.player.id,
          name: r.player.displayName,
          emoji: r.player.emoji,
          color: r.player.color,
        },
        rank: r.rank,
        value: r.value,
        games: r.games,
        bids: r.bids,
      }))
    : local.rows.map((r) => ({
        id: r.player,
        who: seen(r.player),
        rank: r.rank,
        value: r.value,
        games: r.totals.games,
        bids: r.totals.bids,
      }));
  const pairs = server
    ? server.pairs.map((x) => ({
        a: x.a.displayName,
        b: x.b.displayName,
        ea: x.a,
        eb: x.b,
        wins: x.wins,
        games: x.games,
      }))
    : local.pairs.map((x) => {
        const [wa, wb] = [seen(x.a), seen(x.b)];
        return { a: wa.name, b: wb.name, ea: wa, eb: wb, wins: x.wins, games: x.games };
      });
  const show = useCallback((n: number) => write(sort, n), [sort]);
  const entries: BoardEntry[] = rows.map((r) => ({
    id: r.id,
    who: r.who,
    rank: r.rank,
    n: r.value,
    sub: b.sub(r.games, r.bids),
    progress:
      sort === 'rate' && r.rank === null
        ? { v: r.games, of: MIN_RATED_GAMES, label: b.progress(r.games, MIN_RATED_GAMES) }
        : undefined,
  }));
  const you = entries.find((e) => e.id === me || (!!me && e.who.playerId === me))?.id;
  const waiting = remote.online && !remote.data && remote.loading;
  const failed = remote.online && !remote.data && !!remote.error;
  return (
    <SpPage
      wide
      title={b.title}
      sub={
        <div className="flex flex-col gap-2">
          <ChipRow label={b.period}>
            {SP_PERIODS.map((k) => (
              <Chip key={k} on={period === k} onClick={() => setPeriod(k)}>
                {b.periods[k]}
              </Chip>
            ))}
          </ChipRow>
          <Seg<SpSort>
            uid="sp-board-sort"
            label={b.sort}
            value={sort}
            onChange={setSort}
            className="self-start"
            options={SP_SORTS.map((k) => ({ v: k, label: b.sorts[k] }))}
          />
        </div>
      }
    >
      <SeasonNews env={env} onOpen={() => actions.openPage({ page: 'awards' })} />
      <Gate src={src}>
        {() =>
          waiting ? (
            <div role="status" aria-label={b.loading}>
              <Skeleton rows={5} h={64} />
            </div>
          ) : !src.games.length && !server ? (
            <NoGames title={b.emptyTitle} body={b.emptyBody} />
          ) : !rows.length ? (
            <EmptyState
              icon="cards"
              title={b.noResults}
              body={b.noResultsBody}
              action={
                period !== 'all' && (
                  <PrimaryButton tone="glass" className="px-8" onClick={() => setPeriod('all')}>
                    {b.showAll}
                  </PrimaryButton>
                )
              }
            />
          ) : (
            <>
              {failed && (
                <p role="alert" className="glass mb-4 p-3 text-14 text-[var(--warn)]">
                  {b.failed}
                </p>
              )}
              <RankBoard
                entries={entries}
                show={show}
                you={you}
                celebrate={`spades:${server ? 'global' : 'device'}:${sort}:${period}`}
                onOpen={(id) => actions.openPage({ page: 'player', id })}
                label={b.row}
                unrankedShort={b.unrankedShort}
                unrankedTitle={b.unranked(MIN_RATED_GAMES)}
              />
              {pairs.length > 0 && (
                <section aria-labelledby="sp-pairs" className="mt-6">
                  <h2 id="sp-pairs" className="disp mb-2 text-20 font-bold">
                    {b.pairs}
                  </h2>
                  <ol className="flex flex-col gap-2">
                    {pairs.slice(0, 10).map((x) => (
                      <li
                        key={`${x.a}-${x.b}`}
                        className="glass flex min-h-14 items-center gap-3 px-3 py-2"
                      >
                        <span className="flex -space-x-2" aria-hidden>
                          <Avatar
                            p={x.ea}
                            className="grid h-8 w-8 place-items-center rounded-full text-16"
                          />
                          <Avatar
                            p={x.eb}
                            className="grid h-8 w-8 place-items-center rounded-full text-16"
                          />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="min-w-0 [overflow-wrap:anywhere] text-16 font-bold">
                            {spTable.pair(x.a, x.b)}
                          </span>
                          <span className="text-13 text-[var(--tx2)]">
                            {b.pairLine(x.wins, x.games)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              <p className="mt-4 text-13 text-[var(--tx2)]">{server ? b.online : b.local}</p>
            </>
          )
        }
      </Gate>
    </SpPage>
  );
}
