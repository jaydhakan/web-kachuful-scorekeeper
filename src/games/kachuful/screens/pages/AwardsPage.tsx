import { chase, seasonMetric, type BoardRow, type Chase } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { useDeviceFacts } from '@/games/kachuful/state/useFacts';
import { useProgressionEnv } from '@/games/kachuful/components/useProgressionEnv';
import { ProgressionScope } from '@/components/progression/env';
import { AwardsPage as SharedAwards, type AwardsSlots } from '@/components/progression/AwardsPage';
import { icon } from '@/components/ui/IconsMore';
import { BoardList, fmtGap } from './LeaderboardPage';
import { t } from '@/strings';

const aw = t.hub.awards;

/** Kachuful's awards: the shared page, with its accuracy standings, where-you-stand line and Wrapped. */
export function AwardsPage() {
  const f = useDeviceFacts();
  const env = useProgressionEnv(f);
  const { actions } = useApp();
  const year = new Date().getFullYear();
  const slots: AwardsSlots<BoardRow> = {
    chase: (s, me) => <ChaseLine c={chase(s.standings, me)} />,
    standings: (s) => (
      <BoardList
        data={{ rows: s.standings, minRounds: 50, facts: f }}
        metric={seasonMetric(s.standings)}
        podium={false}
      />
    ),
    links: [
      {
        key: 'wrapped',
        ic: icon('gift'),
        title: aw.wrapped(year),
        sub: aw.exploreWrapped,
        go: () => actions.open({ screen: 'wrapped', params: { year: String(year) } }),
      },
    ],
  };
  return (
    <ProgressionScope env={env}>
      <SharedAwards slots={slots} />
    </ProgressionScope>
  );
}

/** Where I stand this month, and the next thing to chase. */
function ChaseLine({ c }: { c: Chase }) {
  const ch = aw.chase;
  const g = (n: number) => fmtGap('accuracy', n);
  const text =
    c.kind === 'top'
      ? c.level
        ? ch.topLevel
        : ch.top(g(c.ahead))
      : c.kind === 'tied'
        ? ch.tied(c.rank)
        : c.kind === 'behind'
          ? c.level
            ? ch.behindLevel(c.rank, c.target)
            : ch.behind(c.rank, c.target, g(c.gap))
          : c.kind === 'unranked'
            ? ch.unranked(c.need)
            : ch.absent;
  return (
    <p className="glass mb-4 flex items-center gap-3 px-4 py-3 text-15 font-bold">
      <span aria-hidden className="grid h-6 w-6 shrink-0 text-[var(--gold-tx)]">
        {c.kind === 'top' ? icon('crown', 'h-6 w-6') : icon('target', 'h-6 w-6')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{ch.label}: </span>
        {text}
      </span>
    </p>
  );
}
