import { useEffect, useMemo, useState } from 'react';
import { doneRounds, gameStats, type Game } from '@/games/kachuful/domain';
import { sgnN } from '@/lib/format';
import { useApp } from '@/games/kachuful/state/store';
import { ApiError } from '@/sync/api';
import { fromWire } from '@/games/kachuful/sync/engine';
import { ep } from '@/sync/endpoints';
import type { Achievement } from '@/sync/types';
import { EmptyState, Page, Section, Skeleton } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { BoardTable } from '@/games/kachuful/sheets/BoardBody';
import { ChartLegend, ScoreChart } from '@/games/kachuful/screens/desk/ScoreChart';
import { achName } from '@/games/kachuful/strings/achievements';
import { ACH } from '@/games/kachuful/domain';
import { t } from '@/strings';
import { icon } from '@/components/ui/IconsMore';
import { gameLine } from './HistoryPage';
import { LiveStandings, withPhotos } from './LivePage';

export { LivePage } from './LivePage';

const lv = t.hub.live;

/** 404 is an unknown link, 410 one turned off (or its game deleted). */
const goneOrMissing = (e: unknown): { k: 'revoked' | 'missing' | 'offline' } =>
  e instanceof ApiError && e.offline
    ? { k: 'offline' }
    : { k: e instanceof ApiError && e.status === 410 ? 'revoked' : 'missing' };

function OpenApp() {
  const { actions } = useApp();
  return (
    <PrimaryButton className="mt-6 w-full" onClick={() => actions.navReset()}>
      {lv.open}
    </PrimaryButton>
  );
}

export function RecapPage({ token }: { token: string }) {
  const [st, setSt] = useState<
    | { k: 'loading' | 'revoked' | 'missing' | 'offline' }
    | { k: 'on'; game: Game; ach: Achievement[] }
  >({ k: 'loading' });
  useEffect(() => {
    ep.recap(token).then(
      (r) => setSt({ k: 'on', game: withPhotos(fromWire(r.game), r.summary), ach: r.achievements }),
      (e: unknown) => setSt(goneOrMissing(e)),
    );
  }, [token]);
  const g = st.k === 'on' ? st.game : null;
  const S = useMemo(() => (g && doneRounds(g).length ? gameStats(g) : null), [g]);
  if (st.k !== 'on' || !g)
    return (
      <Page title={t.hub.recap.title}>
        {st.k === 'loading' ? (
          <Skeleton rows={5} />
        ) : (
          <EmptyState
            icon={st.k === 'revoked' ? 'locked' : st.k === 'offline' ? 'offline' : 'linkBreak'}
            title={
              st.k === 'revoked'
                ? t.hub.recap.revoked
                : st.k === 'offline'
                  ? t.hub.recap.offline
                  : t.hub.recap.notFound
            }
            action={<OpenApp />}
          />
        )}
      </Page>
    );
  const done = doneRounds(g);
  const names = new Map(g.players.map((p) => [p.playerId, p]));
  return (
    <Page wide title={gameLine(g)} eyebrow={t.hub.recap.title}>
      <Section title={t.hub.game.standings}>
        <LiveStandings g={g} />
      </Section>
      {S && (
        <Section title={t.hub.recap.highlights}>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 wide:grid-cols-3">
            {(
              [
                [icon('target'), t.winner.sharp, S.sharp.p.name, t.winner.exactBids(S.sharp.exact)],
                [icon('bolt'), t.winner.big, S.big.p.name, sgnN(S.big.best)],
                [
                  icon('fire'),
                  t.winner.streak,
                  S.streak.p.name,
                  t.winner.exactInRow(S.streak.maxRun),
                ],
              ] as const
            ).map(([ic, title, who, v]) => (
              <li key={title} className="glass p-3">
                <div className="text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">
                  {ic} {title}
                </div>
                <div className="text-16 font-bold">{who}</div>
                <div className="text-14 text-[var(--tx2)]">{v}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {done.length > 1 && (
        <Section title={t.hub.game.chart}>
          <div className="glass flex flex-col gap-3 p-4">
            <div className="h-56">
              <ScoreChart g={g} rounds={done} />
            </div>
            <ChartLegend g={g} />
          </div>
        </Section>
      )}
      {st.ach.length > 0 && (
        <Section title={t.hub.game.achievements}>
          <ul className="flex flex-wrap gap-2">
            {st.ach.map((a) => (
              <li key={a.id} className="glass flex items-center gap-2 px-3 py-2 text-14 font-bold">
                <span aria-hidden>{ACH.get(a.code)?.emoji}</span>
                {names.get(a.playerId)?.name} · {achName(a.code)}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={t.hub.game.rounds}>
        <div className="rounded-2xl bg-sheet p-2">
          <BoardTable g={g} />
        </div>
      </Section>
      <OpenApp />
    </Page>
  );
}
