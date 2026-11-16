import { gameTotals, type TeamId } from '@/games/spades/domain';
import { spGo } from '@/games/spades/nav';
import { spTable } from '@/games/spades/strings/table';
import { Board } from '@/games/spades/table/sheets/Scoreboard';
import { dayLabel, timeLabel } from '@/lib/dates';
import { EmptyState } from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TEAM_TONE, teamNames } from '../parts';
import { Gate, SpPage } from './parts';
import { gameLine, useSpGames } from './source';

const p = spTable.pages;

/** A game's recap from History: how it ended, both totals and every hand. */
export default function GamePage({ id }: { id: string }) {
  const src = useSpGames();
  const rec = src.recs.find((r) => r.syncId === id);
  const g = rec?.game;
  const at = rec ? (rec.endedAt ?? rec.updatedAt) : 0;
  return (
    <SpPage
      title={p.recap.title}
      eyebrow={rec ? `${dayLabel(at)} · ${timeLabel(at)}` : undefined}
      wide
    >
      <Gate src={src}>
        {() =>
          !g ? (
            <EmptyState icon="search" title={p.recap.missing} />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-18 font-bold" role="status">
                {gameLine(g)}
              </p>
              <dl className="grid grid-cols-2 gap-2">
                {(['a', 'b'] as TeamId[]).map((t) => (
                  <div key={t} className="glass flex flex-col gap-1 px-4 py-3">
                    <dt
                      className={`flex items-center gap-1.5 text-14 font-semibold ${TEAM_TONE[t].text}`}
                    >
                      <span aria-hidden className={`h-2 w-2 rounded-full ${TEAM_TONE[t].dot}`} />
                      {teamNames(g, t)}
                    </dt>
                    <dd className="disp tick text-32 font-extrabold">{gameTotals(g)[t].score}</dd>
                  </div>
                ))}
              </dl>
              <Board g={g} />
              {g.status === 'active' && id === src.current && (
                <PrimaryButton className="self-start px-6" onClick={() => spGo('?keep')}>
                  {p.recap.resume}
                </PrimaryButton>
              )}
            </div>
          )
        }
      </Gate>
    </SpPage>
  );
}
