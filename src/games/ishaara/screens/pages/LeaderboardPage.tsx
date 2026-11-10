import { m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { ISHAARA_SORTS, MIN_GAMES, type IshaaraSort } from '@/games/ishaara/domain';
import { useIshaaraLeaderboard } from '@/games/ishaara/state/lists';
import type { IshaaraLeaderboardRow, IshaaraPeriod } from '@/games/ishaara/sync/types';
import { ipg } from '@/games/ishaara/strings/pages';
import { RemoteGate } from '@/components/RemoteGate';
import { Avatar } from '@/components/ui/Avatar';
import { Chip, ChipRow, EmptyState, Section } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { PRESS, SPRING } from '@/components/ui/motion';
import { rankTone } from '@/components/ui/rankTones';
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

const shown = (sort: IshaaraSort, r: IshaaraLeaderboardRow) =>
  sort === 'rate' ? ipg.pct(r.winRate) : String(sort === 'wins' ? r.wins : r.wordsFound);

/** The server's board over a period, by wins, win % (ranked from MIN_GAMES games) or words found. */
export function LeaderboardPage() {
  const [period, setPeriod] = useState<IshaaraPeriod>('season');
  const [sort, setSort] = useState<IshaaraSort>('wins');
  const r = useIshaaraLeaderboard(period, sort);
  return (
    <IshPage
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
          const ranked = data.rows.filter((x) => x.rank !== null),
            rest = data.rows.filter((x) => x.rank === null);
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
          return (
            <>
              {!ranked.length && (
                <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
                  {b.nobodyRanked(MIN_GAMES)}
                </p>
              )}
              {ranked.length > 0 && (
                <ol className="flex flex-col gap-2">
                  {ranked.map((x, i) => (
                    <Row key={x.player.id} r={x} i={i} sort={sort} />
                  ))}
                </ol>
              )}
              {rest.length > 0 && (
                <Section title={b.unranked(MIN_GAMES)} className="mt-6">
                  <ol className="flex flex-col gap-2">
                    {rest.map((x, i) => (
                      <Row key={x.player.id} r={x} i={ranked.length + i} sort={sort} />
                    ))}
                  </ol>
                </Section>
              )}
            </>
          );
        }}
      </RemoteGate>
    </IshPage>
  );
}

function Row({ r, i, sort }: { r: IshaaraLeaderboardRow; i: number; sort: IshaaraSort }) {
  const { open } = useHubNav();
  const rm = useReducedMotion();
  const w = whoOf(r.player);
  const value = shown(sort, r);
  const ranked = r.rank !== null;
  return (
    <m.li
      initial={{ opacity: 0, y: rm ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: rm ? 0 : Math.min(i, 12) * 0.02 }}
    >
      <m.button
        type="button"
        whileTap={PRESS}
        onClick={() => open({ page: 'player', who: w })}
        aria-label={b.row(ranked ? `#${r.rank}` : b.unrankedShort, w.name, value)}
        className="glass relative flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span
          className={`disp w-8 shrink-0 text-center text-22 font-extrabold leading-none ${ranked ? rankTone(r.rank!) : 'text-[var(--tx2)]'}`}
        >
          {r.rank ?? '–'}
        </span>
        <Avatar
          p={w}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-22 ${ranked ? '' : 'opacity-60'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-17 font-bold leading-tight [overflow-wrap:anywhere]">
            {w.name}
          </span>
          <span className="mt-0.5 block text-13 text-[var(--tx2)]">
            {ranked ? b.sub(r.games, r.wins) : b.progress(r.games, MIN_GAMES)}
          </span>
        </span>
        <span
          className={`disp shrink-0 text-24 font-extrabold tabular-nums ${ranked ? '' : 'text-[var(--tx2)]'}`}
        >
          {value}
        </span>
      </m.button>
    </m.li>
  );
}
