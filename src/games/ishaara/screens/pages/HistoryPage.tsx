import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Team } from '@/games/ishaara/domain';
import { useIshaaraHistory } from '@/games/ishaara/state/lists';
import type { IshaaraSummaryOut } from '@/games/ishaara/sync/types';
import { ipg } from '@/games/ishaara/strings/pages';
import { authError } from '@/platform/pages/AuthPages';
import { dayKey, dayLabel, timeLabel } from '@/lib/dates';
import {
  AvatarStack,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components/ui/PageParts';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { IshPage, Mark, TEAM_TEXT, TeamName, useHubNav } from './parts';

const h = ipg.history;
const TEAMS: readonly Team[] = ['sun', 'moon'];

/** Finished games, by day, newest first, with "more" paging; offline, the ones kept on this device. */
export function HistoryPage() {
  const hist = useIshaaraHistory('finished');
  const [who, setWho] = useState<string | null>(null);
  // The people who played most, for the filter chips.
  const people = useMemo(() => {
    const n = new Map<string, { id: string; name: string; k: number }>();
    for (const g of hist.items)
      for (const p of g.players) {
        if (!p.playerId) continue;
        const x = n.get(p.playerId) ?? { id: p.playerId, name: p.name, k: 0 };
        x.k++;
        n.set(p.playerId, x);
      }
    return [...n.values()].sort((a, b) => b.k - a.k).slice(0, 12);
  }, [hist.items]);
  const shown = who
    ? hist.items.filter((g) => g.players.some((p) => p.playerId === who))
    : hist.items;
  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: IshaaraSummaryOut[] }[] = [];
    for (const g of shown) {
      const at = g.finishedAt ?? g.updatedAt,
        k = dayKey(at);
      if (out.at(-1)?.key !== k) out.push({ key: k, label: dayLabel(at), rows: [] });
      out.at(-1)!.rows.push(g);
    }
    return out;
  }, [shown]);

  const body = () => {
    if (hist.loading) return <Skeleton rows={5} h={96} />;
    if (!hist.items.length) {
      if (hist.error && !hist.offline)
        return <ErrorState msg={authError(hist.error)} onRetry={hist.reload} />;
      return hist.offline ? (
        <EmptyState icon="offline" title={h.offlineTitle} body={h.offlineBody} />
      ) : (
        <EmptyState card icon="cards" title={h.emptyTitle} body={h.emptyBody} />
      );
    }
    if (!shown.length)
      return (
        <EmptyState
          icon="search"
          title={h.noResults}
          action={
            <PrimaryButton tone="glass" className="px-8" onClick={() => setWho(null)}>
              {h.clear}
            </PrimaryButton>
          }
        />
      );
    return (
      <>
        {groups.map((grp) => (
          <section key={grp.key} className="mb-6">
            {/* The day stays in view while its games scroll under it. */}
            <h2 className="pointer-events-none sticky top-0 z-[1] mb-2.5">
              <span className="glass inline-block !rounded-full px-3 py-1 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
                {grp.label}
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {grp.rows.map((g, i) => (
                <m.li key={g.id} {...stagger(Math.min(i, 8))}>
                  <GameRow g={g} />
                </m.li>
              ))}
            </ul>
          </section>
        ))}
        {hist.error && hist.items.length > 0 && !hist.loadingMore && (
          <p role="alert" className="mb-2 text-center text-15 text-[var(--danger)]">
            {h.moreFailed}
          </p>
        )}
        {hist.hasMore && (
          <div className="flex justify-center">
            <PrimaryButton
              tone="glass"
              className="px-8"
              disabled={hist.loadingMore}
              onClick={hist.more}
            >
              {hist.loadingMore ? h.loadingMore : h.more}
            </PrimaryButton>
          </div>
        )}
      </>
    );
  };

  return (
    <IshPage
      title={h.title}
      sub={
        (hist.offline || people.length > 1) && (
          <div className="flex flex-col gap-2">
            {hist.offline && (
              <p role="status" className="text-13 text-[var(--tx2)]">
                {h.offline}
              </p>
            )}
            {people.length > 1 && (
              <ChipRow label={h.filterPlayer}>
                <Chip on={!who} onClick={() => setWho(null)}>
                  {h.allPlayers}
                </Chip>
                {people.map((p) => (
                  <Chip
                    key={p.id}
                    on={who === p.id}
                    onClick={() => setWho(who === p.id ? null : p.id)}
                  >
                    {p.name}
                  </Chip>
                ))}
              </ChipRow>
            )}
          </div>
        )
      }
    >
      {body()}
    </IshPage>
  );
}

const names = (g: IshaaraSummaryOut, t: Team) =>
  g.players
    .filter((p) => p.team === t)
    .map((p) => p.name)
    .join(', ');

function GameRow({ g }: { g: IshaaraSummaryOut }) {
  const { open } = useHubNav();
  const at = g.finishedAt ?? g.updatedAt;
  const line = ipg.outcome(g.winner, g.endedBy);
  const multi = g.match.game > 1 || g.match.sunWins + g.match.moonWins > 1;
  return (
    <m.button
      type="button"
      whileTap={PRESS}
      onClick={() => open({ page: 'game', id: g.id, summary: g })}
      aria-label={[
        h.rowLabel(`${dayLabel(at)} ${timeLabel(at)}`, line),
        ...TEAMS.map((t) => h.teamLabel(ipg.team[t], names(g, t))),
      ].join('. ')}
      className="glass flex min-h-[4.5rem] w-full flex-col gap-1.5 px-4 py-3 text-left"
    >
      <span className="flex w-full items-center gap-2 text-16 font-bold leading-tight [overflow-wrap:anywhere]">
        {g.winner && g.endedBy !== 'abandoned' && (
          <span className={TEAM_TEXT[g.winner]}>
            <Mark id={g.winner} className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0">{line}</span>
        <span className="ml-auto shrink-0 text-14 font-normal text-[var(--tx2)]">
          {timeLabel(at)}
        </span>
      </span>
      {TEAMS.map((t) => {
        const ps = g.players.filter((p) => p.team === t);
        return (
          <span key={t} className="flex w-full items-start gap-2 text-14 text-[var(--tx2)]">
            <TeamName team={t} />
            <AvatarStack players={ps} s={22} max={5} />
            <span className="min-w-0 [overflow-wrap:anywhere]">{names(g, t)}</span>
          </span>
        );
      })}
      <span className="text-13 text-[var(--tx2)]">
        {multi
          ? ipg.match(g.match.game, g.match.sunWins, g.match.moonWins)
          : h.left(g.wordsLeft.sun, g.wordsLeft.moon)}
      </span>
    </m.button>
  );
}
