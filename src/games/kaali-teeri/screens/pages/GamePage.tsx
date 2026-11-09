import { doneHands, playerKey, standings, type KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kpg } from '@/games/kaali-teeri/strings/pages';
import { finalStandings } from '@/games/kaali-teeri/lib/share';
import { ScoreTable } from '@/games/kaali-teeri/sheets/Scoreboard';
import { dayLabel, timeLabel } from '@/lib/dates';
import { fmt } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Section } from '@/components/ui/PageParts';
import { Podium } from '@/components/ui/Podium';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RankMark } from '@/components/ui/RankMark';
import { Gate, gameLine, KtPage } from './parts';
import { useKtGames } from './source';

const gt = kpg.game;

/** One game: when, how it stands, the podium once it's over, and every hand. Opened from History or a player. */
export function GamePage({ id }: { id: string }) {
  const src = useKtGames();
  const g = src.recs.find((r) => r.syncId === id)?.game;
  if (src.status !== 'ready' || !g)
    return (
      <KtPage title={gt.title}>
        <Gate src={src}>
          {() => <EmptyState icon="linkBreak" title={gt.notFound} body={gt.notFoundBody} />}
        </Gate>
      </KtPage>
    );
  return <GameBody g={g} current={src.current === id} />;
}

function GameBody({ g, current }: { g: KtGame; current: boolean }) {
  const { actions } = useKt();
  const fin = g.status === 'finished',
    at = fin ? (g.finishedAt ?? g.updatedAt) : g.createdAt;
  const r = g.rules;
  const line = gameLine(g);
  return (
    <KtPage
      wide
      label={line}
      eyebrow={`${fin ? gt.finishedOn(dayLabel(at)) : gt.startedOn(dayLabel(at))} · ${timeLabel(at)}`}
      title={line}
    >
      <p className="mb-4 text-14 text-[var(--tx2)]">
        {gt.rules(r.decks, r.minBid, r.partners, r.length === 'to1000')}
      </p>
      {!fin && (
        <div className="mb-5 flex flex-wrap gap-3">
          {current ? (
            <PrimaryButton className="px-7" onClick={actions.resume}>
              {gt.resume}
            </PrimaryButton>
          ) : (
            <PrimaryButton className="px-7" onClick={() => actions.openGame(g)}>
              {gt.continue}
            </PrimaryButton>
          )}
        </div>
      )}
      {fin && (
        <div className="mb-6">
          <Podium standings={finalStandings(g)} />
        </div>
      )}
      <Section title={gt.standings}>
        <ol className="glass flex flex-col divide-y divide-ov/[.06] px-2">
          {standings(g).map((s) => (
            <li key={s.p.id}>
              <button
                type="button"
                aria-label={gt.openPlayer(s.p.name)}
                onClick={() => actions.openPage({ page: 'player', id: playerKey(s.p) })}
                className="press flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left"
              >
                <RankMark rank={s.rank} final={fin} />
                <Avatar
                  p={s.p}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-20"
                />
                <span className="min-w-0 flex-1 text-17 font-bold [overflow-wrap:anywhere]">
                  {s.p.name}
                </span>
                <span className="disp text-22 font-extrabold">{gt.points(fmt(s.t))}</span>
              </button>
            </li>
          ))}
        </ol>
      </Section>
      <Section title={gt.hands}>
        {doneHands(g).length ? (
          <div className="rounded-2xl bg-sheet p-2">
            <ScoreTable g={g} />
          </div>
        ) : (
          <p className="text-16 text-[var(--tx2)]">{kpg.line.noHands}</p>
        )}
      </Section>
    </KtPage>
  );
}
