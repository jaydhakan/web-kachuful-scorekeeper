import { m, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
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
import { Avatar } from '@/components/ui/Avatar';
import { Chip, ChipRow, EmptyState, Section } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { PRESS, SPRING } from '@/components/ui/motion';
import { rankTone } from '@/components/ui/rankTones';
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

const shown = (sort: KtSort, r: KtBoardRow) =>
  sort === 'made' ? kpg.pct(r.madeRate) : String(sort === 'points' ? r.points : r.wins);

/** This device's board over a period, by points, wins or made % (which ranks only players with enough bids). */
export function LeaderboardPage() {
  const src = useKtGames();
  const [period, setPeriod] = useState<KtPeriod>('season');
  const [sort, setSort] = useState<KtSort>('points');
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
  const ranked = rows.filter((r) => r.qualified),
    rest = rows.filter((r) => !r.qualified);
  return (
    <KtPage
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
            <>
              {!ranked.length && (
                <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
                  {b.nobodyRanked(MIN_BIDS)}
                </p>
              )}
              {ranked.length > 0 && (
                <ol className="flex flex-col gap-2">
                  {ranked.map((r, i) => (
                    <Row key={r.playerId} r={r} i={i} sort={sort} w={who(r.playerId)} />
                  ))}
                </ol>
              )}
              {rest.length > 0 && (
                <Section title={b.unranked(MIN_BIDS)} className="mt-6">
                  <ol className="flex flex-col gap-2">
                    {rest.map((r, i) => (
                      <Row
                        key={r.playerId}
                        r={r}
                        i={ranked.length + i}
                        sort={sort}
                        w={who(r.playerId)}
                      />
                    ))}
                  </ol>
                </Section>
              )}
              <p className="mt-4 text-13 text-[var(--tx2)]">{server ? b.online : b.local}</p>
            </>
          )
        }
      </Gate>
    </KtPage>
  );
}

function Row({ r, i, sort, w }: { r: KtBoardRow; i: number; sort: KtSort; w: Who }) {
  const { actions } = useKt();
  const rm = useReducedMotion();
  const value = shown(sort, r);
  return (
    <m.li
      initial={{ opacity: 0, y: rm ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: rm ? 0 : Math.min(i, 12) * 0.02 }}
    >
      <m.button
        type="button"
        whileTap={PRESS}
        onClick={() => actions.openPage({ page: 'player', id: r.playerId })}
        aria-label={b.row(r.rank ? `#${r.rank}` : b.unrankedShort, w.name, value)}
        className="glass relative flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span
          className={`disp w-8 shrink-0 text-center text-22 font-extrabold leading-none ${r.rank ? rankTone(r.rank) : 'text-[var(--tx2)]'}`}
        >
          {r.rank ?? '–'}
        </span>
        <Avatar
          p={w}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-22 ${r.qualified ? '' : 'opacity-60'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-17 font-bold leading-tight [overflow-wrap:anywhere]">
            {w.name}
          </span>
          <span className="mt-0.5 block text-13 text-[var(--tx2)]">
            {r.qualified ? b.sub(r.games, r.handsBid) : b.progress(r.handsBid, MIN_BIDS)}
          </span>
        </span>
        <span
          className={`disp shrink-0 text-24 font-extrabold tabular-nums ${r.qualified ? '' : 'text-[var(--tx2)]'}`}
        >
          {value}
        </span>
      </m.button>
    </m.li>
  );
}
