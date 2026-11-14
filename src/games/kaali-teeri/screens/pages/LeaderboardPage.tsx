import { useCallback, useMemo, useState } from 'react';
import {
  ktLeaderboard,
  MIN_BIDS,
  PERIODS,
  periodRange,
  SORTS,
  type KtBoardRow,
  type KtPeriod,
  type KtSort,
} from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { useKtLeaderboard } from '@/games/kaali-teeri/sync/boards';
import type { KtLeaderboardRow } from '@/games/kaali-teeri/sync/types';
import { kpg } from '@/games/kaali-teeri/strings/pages';
import { DeltaIntro } from '@/components/ui/boardParts';
import { Chip, ChipRow, EmptyState } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { RankBoard, type BoardEntry } from '@/components/ui/RankBoard';
import { signedInAs, useSession } from '@/sync/session';
import { Gate, KtPage, NoGames, useWho, type Who } from './parts';
import { useKtGames } from './source';

const b = kpg.board;

/**
 * The server's rows in the board's own shape. Made % keeps the device's rule (enough bids to rank), so a board reads
 * the same signed in or out; ties on the value share a rank.
 */
function fromServer(rows: KtLeaderboardRow[], sort: KtSort): KtBoardRow[] {
  const out = rows.map((r) => ({
    playerId: r.player.id,
    games: r.games,
    wins: r.wins,
    points: r.points,
    handsBid: r.handsBid,
    bidsMade: r.bidsMade,
    madeRate: r.madeRate,
    value: r.value,
    qualified: sort !== 'made' || r.handsBid >= MIN_BIDS,
    rank: null as number | null,
  }));
  const ranked = out.filter((r) => r.qualified);
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    r.rank = prev && prev.value === r.value ? prev.rank : i + 1;
  });
  return [...ranked, ...out.filter((r) => !r.qualified)];
}

/** What a sort ranks on, and how that value (or the distance between two) is written. */
const valueOf = (sort: KtSort, r: KtBoardRow) =>
  sort === 'made' ? (r.madeRate ?? 0) : sort === 'points' ? r.points : r.wins;
const write = (sort: KtSort, v: number) => (sort === 'made' ? kpg.pct(v) : String(Math.round(v)));

/** This device's board over a period, by points, wins or made % (which ranks only players with enough bids). */
export function LeaderboardPage() {
  const src = useKtGames();
  const [period, setPeriod] = useState<KtPeriod>('season');
  const [sort, setSort] = useState<KtSort>('points');
  const { actions } = useKt();
  const me = signedInAs(useSession())?.player?.id;
  const [intro] = useState(() => ({ done: false }));
  const show = useCallback((v: number) => write(sort, v), [sort]);
  const remote = useKtLeaderboard(period, sort);
  const server = remote.online && remote.data ? remote.data : null;
  const local = useMemo(
    () => ktLeaderboard(src.games, { ...periodRange(period, Date.now()), sort }),
    [src.games, period, sort],
  );
  const rows = useMemo(
    () => (server ? fromServer(server.rows, sort) : local),
    [server, sort, local],
  );
  const seen = useWho(src.games);
  // Signed in, a player may never have sat at this device's table: the server's row carries who they are.
  const who = (id: string): Who => {
    const p = server?.rows.find((r) => r.player.id === id)?.player;
    return p
      ? { id, playerId: p.id, name: p.displayName, emoji: p.emoji, color: p.color }
      : seen(id);
  };
  const entries: BoardEntry[] = rows.map((r) => ({
    id: r.playerId,
    who: who(r.playerId),
    rank: r.qualified ? r.rank : null,
    n: valueOf(sort, r),
    blank: sort === 'made' && r.madeRate == null ? kpg.pct(null) : undefined,
    sub: b.sub(r.games, r.handsBid),
    progress: r.qualified
      ? undefined
      : { v: r.handsBid, of: MIN_BIDS, label: b.progress(r.handsBid, MIN_BIDS) },
  }));
  // A seat on this device is keyed by its own id; the registry player behind it is who is signed in.
  const you = entries.find((e) => e.id === me || (!!me && e.who.playerId === me))?.id;
  return (
    <KtPage
      wide
      title={b.title}
      sub={
        <div className="flex flex-col gap-2">
          <ChipRow label={b.period}>
            {PERIODS.map((p) => (
              <Chip key={p} on={period === p} onClick={() => setPeriod(p)}>
                {b.periods[p]}
              </Chip>
            ))}
          </ChipRow>
          <Seg<KtSort>
            uid="kt-board-sort"
            label={b.sort}
            value={sort}
            onChange={setSort}
            className="self-start"
            options={SORTS.map((v) => ({ v, label: b.sorts[v] }))}
          />
        </div>
      }
    >
      <Gate src={src} rows={5}>
        {() =>
          !src.games.length && !server ? (
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
            <DeltaIntro.Provider value={intro}>
              <RankBoard
                entries={entries}
                show={show}
                gap={show}
                you={you}
                celebrate={`kaali-teeri:${server ? 'global' : 'device'}:${sort}:${period}`}
                onOpen={(id) => actions.openPage({ page: 'player', id })}
                label={b.row}
                unrankedShort={b.unrankedShort}
                unrankedTitle={b.unranked(MIN_BIDS)}
                note={
                  !rows.some((r) => r.qualified) && (
                    <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
                      {b.nobodyRanked(MIN_BIDS)}
                    </p>
                  )
                }
              />
              <p className="mt-4 text-13 text-[var(--tx2)]">{server ? b.online : b.local}</p>
            </DeltaIntro.Provider>
          )
        }
      </Gate>
    </KtPage>
  );
}
