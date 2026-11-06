import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import { doneRounds, rangeFor, standings, type Game, type Range } from '@/domain';
import { dayKey, dayLabel, timeLabel } from '@/lib/dates';
import { sgnN } from '@/lib/format';
import { inHistory, scoredHere, type GameRec } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { useApp } from '@/state/store';
import { AvatarStack, Chip, ChipRow, EmptyState, Page, Skeleton } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RangePick } from '@/components/ui/Stats';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';
import { PRESS } from '@/components/ui/motion';
import { Icon } from '@/components/ui/Icons';
import { Avatar } from '@/components/ui/Avatar';

const h = t.hub.history;

/** One line about how a game stands: who won, who tied, or who leads. */
export function gameLine(g: Game): string {
  const st = standings(g),
    top = st.filter((s) => s.rank === 1);
  if (!doneRounds(g).length) return t.hub.game.noRounds;
  if (g.status !== 'finished') return h.leads(top[0].p.name, sgnN(top[0].t));
  const pts = sgnN(top[0].t),
    names = top.map((s) => s.p.name);
  if (top.length === 1) return h.won(names[0], pts);
  // Past three names the line stops being readable; the count says it.
  if (top.length > 3) return h.tiedMany(top.length, pts);
  return h.tied(
    names.length === 2 ? names.join(' & ') : `${names[0]}, ${names[1]} & ${names[2]}`,
    pts,
  );
}

const nameKey = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export function HistoryPage() {
  const { state, actions } = useApp();
  const user = state.session?.user ?? null;
  const all = useArchive((a) => a.games());
  const recs = useMemo(() => all.filter((r) => inHistory(r, user)), [all, user]);
  const [scope, setScope] = useState<'all' | 'scored' | 'played'>('all');
  const theirs = recs.some((r) => !scoredHere(r, user?.id ?? null));
  const loaded = useArchive((a) => a.loaded);
  const [who, setWho] = useState<string | null>(null);
  const allTime = () => rangeFor('all', Date.now());
  const [range, setRange] = useState<Range>(allTime);
  // The people who played most, for the filter chips.
  const people = useMemo(() => {
    const n = new Map<string, { name: string; n: number }>();
    for (const r of recs)
      for (const p of r.game.players) {
        const k = nameKey(p.name),
          e = n.get(k);
        n.set(k, { name: e?.name ?? p.name, n: (e?.n ?? 0) + 1 });
      }
    return [...n.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  }, [recs]);
  // A game counts on the day it's listed under, so the range never hides a row inside it.
  const shown = recs.filter((r) => {
    const at = r.endedAt ?? r.updatedAt;
    if (range.kind !== 'all' && (at < range.from || at >= range.to)) return false;
    if (scope !== 'all' && scoredHere(r, user?.id ?? null) !== (scope === 'scored')) return false;
    return !who || r.game.players.some((p) => nameKey(p.name) === who);
  });
  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: GameRec[] }[] = [];
    for (const r of shown) {
      const at = r.endedAt ?? r.updatedAt,
        k = dayKey(at);
      if (out.at(-1)?.key !== k) out.push({ key: k, label: dayLabel(at), rows: [] });
      out.at(-1)!.rows.push(r);
    }
    return out;
  }, [shown]);

  let body;
  if (!loaded) body = <Skeleton rows={5} h={76} />;
  else if (!recs.length)
    body = (
      <EmptyState
        card
        icon="folder"
        title={h.emptyTitle}
        body={h.emptyBody}
        action={
          <PrimaryButton className="w-56" onClick={actions.startSetup}>
            {h.newGame}
          </PrimaryButton>
        }
      />
    );
  else if (!shown.length)
    body = (
      <EmptyState
        icon="search"
        title={h.noResults}
        action={
          <button
            type="button"
            onClick={() => (setWho(null), setRange(allTime()), setScope('all'))}
            className="press min-h-12 px-3 text-16 font-bold text-[var(--accent)]"
          >
            {h.clear}
          </button>
        }
      />
    );
  else
    body = groups.map((grp) => (
      <section key={grp.key} className="mb-6">
        {/* The day stays in view while its games scroll under it; the next day pushes it away. */}
        <h2 className="pointer-events-none sticky top-0 z-[1] mb-2.5">
          <span className="glass inline-block !rounded-full px-3 py-1 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
            {grp.label}
          </span>
        </h2>
        <ul className="flex flex-col gap-2">
          {grp.rows.map((r, i) => (
            <m.li key={r.syncId} {...stagger(Math.min(i, 8))}>
              <GameRow rec={r} current={r.syncId === state.game.syncId} />
            </m.li>
          ))}
        </ul>
      </section>
    ));

  return (
    <Page
      title={h.title}
      sub={
        recs.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex">
              <RangePick value={range} onChange={setRange} />
            </div>
            {theirs && (
              <ChipRow label={h.scope.label}>
                {(['all', 'scored', 'played'] as const).map((k) => (
                  <Chip key={k} on={scope === k} onClick={() => setScope(k)}>
                    {h.scope[k]}
                  </Chip>
                ))}
              </ChipRow>
            )}
            {people.length > 1 && (
              <ChipRow label={h.filterPlayer}>
                <Chip on={!who} onClick={() => setWho(null)}>
                  {h.allPlayers}
                </Chip>
                {people.map(([k, v]) => (
                  <Chip key={k} on={who === k} onClick={() => setWho(who === k ? null : k)}>
                    {v.name}
                  </Chip>
                ))}
              </ChipRow>
            )}
          </div>
        )
      }
    >
      {body}
    </Page>
  );
}

function GameRow({ rec, current }: { rec: GameRec; current: boolean }) {
  const { state, actions } = useApp();
  const signedIn = !!state.session;
  const g = rec.game,
    at = rec.endedAt ?? rec.updatedAt;
  const badges: string[] = [];
  if (current) badges.push(h.badge.current);
  else if (g.status !== 'finished') badges.push(h.badge.unfinished);
  if (rec.conflictOf) badges.push(h.badge.conflict);
  // Only the exceptions: a synced game is the normal case and needs no badge.
  if (signedIn && rec.origin === 'local' && !rec.account) badges.push(h.badge.onlyHere);
  else if (signedIn && rec.origin === 'local' && rec.syncedRev !== g.rev)
    badges.push(h.badge.unsynced);
  const line = gameLine(g);
  const by = !scoredHere(rec, state.session?.user.id ?? null) && rec.owner ? rec.owner.name : null;
  const top = standings(g).filter((s) => s.rank === 1);
  const winner = g.status === 'finished' && top.length === 1 ? top[0].p : null;
  return (
    <m.button
      type="button"
      whileTap={PRESS}
      onClick={() => actions.open({ screen: 'game', params: { id: rec.syncId } })}
      aria-label={h.rowLabel(`${dayLabel(at)} ${timeLabel(at)}`, line)}
      className="glass flex min-h-[4.5rem] w-full flex-col gap-1.5 px-4 py-3 text-left"
    >
      <span className="flex w-full items-center gap-2 text-16 font-bold leading-tight [overflow-wrap:anywhere]">
        {winner && (
          <Avatar
            p={winner}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-16"
          />
        )}
        <span className="min-w-0">{line}</span>
      </span>
      <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
        <AvatarStack players={g.players} s={24} max={6} />
        <span className="text-14 text-[var(--tx2)]">
          {timeLabel(at)} · {h.rounds(doneRounds(g).length)} · {g.players.length} {Icon.userInline}
          {by && ` · ${h.scoredBy(by)}`}
        </span>
        {badges.length > 0 && (
          <span className="ml-auto flex flex-wrap justify-end gap-1.5">
            {badges.map((b) => (
              <span
                key={b}
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-13 font-bold ${b === h.badge.current ? 'bg-[var(--accent)] text-ink-on-accent' : 'bg-ov/[.08] text-[var(--tx2)]'}`}
              >
                {b}
              </span>
            ))}
          </span>
        )}
      </span>
    </m.button>
  );
}
