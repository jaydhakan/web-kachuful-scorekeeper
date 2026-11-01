import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import { doneRounds, standings, type Game } from '@/domain';
import { dayKey, dayLabel, timeLabel } from '@/lib/dates';
import { sgnN } from '@/lib/format';
import type { GameRec } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { useApp } from '@/state/store';
import {
  AvatarStack,
  Chip,
  ChipRow,
  EmptyState,
  Page,
  Section,
  Skeleton,
} from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';
import { PRESS } from '@/components/ui/motion';

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
  const recs = useArchive((a) => a.games());
  const loaded = useArchive((a) => a.loaded);
  const [who, setWho] = useState<string | null>(null);
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
  const shown = who
    ? recs.filter((r) => r.game.players.some((p) => nameKey(p.name) === who))
    : recs;
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
        icon="🗂️"
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
        icon="🔍"
        title={h.noResults}
        action={
          <button
            type="button"
            onClick={() => setWho(null)}
            className="press min-h-12 px-3 text-16 font-bold text-[var(--accent)]"
          >
            {h.clear}
          </button>
        }
      />
    );
  else
    body = groups.map((grp) => (
      <Section key={grp.key} title={grp.label}>
        <ul className="flex flex-col gap-2">
          {grp.rows.map((r, i) => (
            <m.li key={r.syncId} {...stagger(Math.min(i, 8))}>
              <GameRow rec={r} current={r.syncId === state.game.syncId} />
            </m.li>
          ))}
        </ul>
      </Section>
    ));

  return (
    <Page
      title={h.title}
      sub={
        people.length > 1 && (
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
        )
      }
    >
      {body}
    </Page>
  );
}

function GameRow({ rec, current }: { rec: GameRec; current: boolean }) {
  const { actions } = useApp();
  const g = rec.game,
    at = rec.endedAt ?? rec.updatedAt;
  const badges: string[] = [];
  if (current) badges.push(h.badge.current);
  else if (g.status !== 'finished') badges.push(h.badge.unfinished);
  if (rec.conflictOf) badges.push(h.badge.conflict);
  if (rec.origin === 'remote') badges.push(h.badge.remote);
  const line = gameLine(g);
  return (
    <m.button
      type="button"
      whileTap={PRESS}
      onClick={() => actions.open({ screen: 'game', params: { id: rec.syncId } })}
      aria-label={h.rowLabel(`${dayLabel(at)} ${timeLabel(at)}`, line)}
      className="glass flex min-h-[4.5rem] w-full flex-col gap-1.5 px-4 py-3 text-left"
    >
      <span className="block w-full text-16 font-bold leading-tight [overflow-wrap:anywhere]">
        {line}
      </span>
      <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
        <AvatarStack players={g.players} s={24} max={6} />
        <span className="text-14 text-[var(--tx2)]">
          {timeLabel(at)} · {h.rounds(doneRounds(g).length)} · {g.players.length} 👤
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
