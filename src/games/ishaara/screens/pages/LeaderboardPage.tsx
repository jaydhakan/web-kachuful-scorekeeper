import { useCallback, useState } from 'react';
import { ISHAARA_SORTS, MIN_GAMES, type IshaaraSort } from '@/games/ishaara/domain';
import { useIshaaraLeaderboard } from '@/games/ishaara/state/lists';
import type { IshaaraLeaderboardRow, IshaaraPeriod } from '@/games/ishaara/sync/types';
import { ipg } from '@/games/ishaara/strings/pages';
import { RemoteGate } from '@/components/RemoteGate';
import { DeltaIntro } from '@/components/ui/boardParts';
import { Chip, ChipRow, EmptyState } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { RankBoard, type BoardEntry } from '@/components/ui/RankBoard';
import { signedInAs, useSession } from '@/sync/session';
import { IshPage, useHubNav, type Who } from './parts';

const b = ipg.board;
const PERIODS: readonly IshaaraPeriod[] = ['today', 'week', 'season', 'all'];

export const whoOf = (p: IshaaraLeaderboardRow['player']): Who => ({
  id: p.id,
  name: p.displayName,
  emoji: p.emoji,
  color: p.color,
  photoUrl: p.photoUrl,
});

/** What a sort ranks on, and how that value (or the distance between two) is written. */
const valueOf = (sort: IshaaraSort, r: IshaaraLeaderboardRow) =>
  sort === 'rate' ? r.winRate : sort === 'wins' ? r.wins : r.wordsFound;
const write = (sort: IshaaraSort, v: number) =>
  sort === 'rate' ? ipg.pct(v) : String(Math.round(v));

/** The server's board over a period, by wins, win % (ranked from MIN_GAMES games) or words found. */
export function LeaderboardPage() {
  const [period, setPeriod] = useState<IshaaraPeriod>('season');
  const [sort, setSort] = useState<IshaaraSort>('wins');
  const r = useIshaaraLeaderboard(period, sort);
  const { open } = useHubNav();
  const you = signedInAs(useSession())?.player?.id;
  const [intro] = useState(() => ({ done: false }));
  const show = useCallback((v: number) => write(sort, v), [sort]);
  return (
    <IshPage
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
          <Seg<IshaaraSort>
            uid="ish-board-sort"
            label={b.sort}
            value={sort}
            onChange={setSort}
            className="self-start"
            options={ISHAARA_SORTS.map((v) => ({ v, label: b.sorts[v] }))}
          />
        </div>
      }
    >
      <RemoteGate r={r}>
        {(data) => {
          if (!data.rows.length)
            return (
              <EmptyState
                card
                icon="trophy"
                title={b.emptyTitle}
                body={b.emptyBody}
                action={
                  period !== 'all' && (
                    <PrimaryButton tone="glass" className="px-8" onClick={() => setPeriod('all')}>
                      {b.showAll}
                    </PrimaryButton>
                  )
                }
              />
            );
          const entries: BoardEntry[] = data.rows.map((x) => ({
            id: x.player.id,
            who: whoOf(x.player),
            rank: x.rank,
            n: valueOf(sort, x),
            sub: b.sub(x.games, x.wins),
            progress:
              x.rank === null
                ? { v: x.games, of: MIN_GAMES, label: b.progress(x.games, MIN_GAMES) }
                : undefined,
          }));
          return (
            <DeltaIntro.Provider value={intro}>
              <RankBoard
                entries={entries}
                show={show}
                gap={show}
                you={you}
                celebrate={`ishaara:${sort}:${period}`}
                onOpen={(id) => {
                  const p = data.rows.find((x) => x.player.id === id)?.player;
                  if (p) open({ page: 'player', who: whoOf(p) });
                }}
                label={b.row}
                unrankedShort={b.unrankedShort}
                unrankedTitle={b.unranked(MIN_GAMES)}
                note={
                  !data.rows.some((x) => x.rank !== null) && (
                    <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
                      {b.nobodyRanked(MIN_GAMES)}
                    </p>
                  )
                }
              />
            </DeltaIntro.Provider>
          );
        }}
      </RemoteGate>
    </IshPage>
  );
}
