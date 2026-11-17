import { useMemo } from 'react';
import type { SeasonResult, StandingRow, WinRateRow } from '@/progression/types';
import { RankBoard, type BoardEntry } from '@/components/ui/RankBoard';
import { pct } from '@/components/ui/Stats';
import { t } from '@/strings';
import { progression as ps } from '@/strings/progression';
import { useProgressionEnv } from './env';

const b = t.hub.leaderboard;
const w = ps.winRate;
const gap = (d: number) => pct(d);

/** A month ranked on win rate, as every game but Kachuful ranks it: rows only, the podium is above. */
export function WinRateStandings({ s }: { s: SeasonResult<StandingRow> }) {
  const { prog, person, me, openPlayer } = useProgressionEnv();
  const need = prog.seasonMin;
  const entries = useMemo<BoardEntry[]>(
    () =>
      (s.standings as WinRateRow[]).map((r) => ({
        id: r.playerId,
        who: person(r.playerId),
        rank: r.qualified ? r.rank : null,
        n: r.value,
        sub: w.sub(r.wins, r.games),
        progress: r.qualified
          ? undefined
          : { v: r.games, of: need, label: w.progress(r.games, need) },
      })),
    [s, person, need],
  );
  return (
    <RankBoard
      entries={entries}
      show={pct}
      gap={gap}
      you={me}
      podium={false}
      onOpen={openPlayer}
      label={b.row}
      unrankedShort={b.unrankedShort}
      unrankedTitle={w.unranked(need)}
      note={
        !s.standings.some((r) => r.qualified) && (
          <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
            {w.nobodyRanked(need)}
          </p>
        )
      }
    />
  );
}
