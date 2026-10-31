import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ACH,
  allAchievements,
  calendar,
  opponents,
  pointsOverTime,
  profileStats,
  rangeFor,
  type Earned,
  type Facts,
  type Range,
  type Trump,
} from '@/domain';
import { dayLabel } from '@/lib/dates';
import { fmt, sgnN } from '@/lib/format';
import { archive } from '@/state/archive';
import { mergeLocal, people } from '@/state/registry';
import { useApp } from '@/state/store';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { EmptyState, Page, Section } from '@/components/ui/Page';
import {
  Bars,
  Heatmap,
  pct,
  RangeChips,
  Sparkline,
  StatTile,
  TileGrid,
} from '@/components/ui/Stats';
import { Modal } from '@/components/ui/Modal';
import { Sheet } from '@/components/ui/Sheet';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { stagger } from '@/components/ui/stagger';
import { TR } from '@/theme/trumps';
import { achName } from '@/strings/achievements';
import { t } from '@/strings';

const p = t.hub.player;

/** Per-code count and latest date of what a player earned, newest first. */
export function shelf(earned: Earned[]) {
  const m = new Map<string, { code: string; n: number; last: number }>();
  for (const e of earned) {
    const x = m.get(e.code) ?? { code: e.code, n: 0, last: 0 };
    x.n++;
    x.last = Math.max(x.last, e.earnedAt);
    m.set(e.code, x);
  }
  return [...m.values()].sort((a, b) => b.last - a.last);
}

export function PlayerPage({ id, facts }: { id: string; facts?: Facts }) {
  const device = useDeviceFacts();
  const f = facts ?? device;
  const { actions } = useApp();
  const [range, setRange] = useState<Range>(() => rangeFor('all', Date.now()));
  const w = whoIs(f, id);
  const s = useMemo(() => profileStats(f, id, range.from, range.to), [f, id, range]);
  const line = useMemo(() => pointsOverTime(f, id, range.from, range.to), [f, id, range]);
  const earned = useMemo(() => allAchievements(f).filter((e) => e.playerId === id), [f, id]);
  const cal = useMemo(() => calendar(f, id), [f, id]);
  const rivals = useMemo(() => opponents(f, id).slice(0, 5), [f, id]);
  const recent = useMemo(
    () =>
      f.players
        .filter((x) => x.playerId === id)
        .sort((a, b) => (b.endedAt ?? Infinity) - (a.endedAt ?? Infinity))
        .slice(0, 6),
    [f, id],
  );
  const [merge, setMerge] = useState(false);
  const [into, setInto] = useState<string | null>(null);
  const local = archive.get('players', id)?.local;
  const played = f.rounds.some((r) => r.playerId === id);
  const year = new Date().getFullYear();
  const accBars = (
    o: Record<string, { made: number; total: number }>,
    label: (k: string) => React.ReactNode,
  ) =>
    Object.entries(o)
      .sort(([a], [b]) => Number(a) - Number(b) || (a < b ? -1 : 1))
      .map(([k, v]) => ({
        label: label(k),
        value: v.made,
        share: v.made / v.total,
        note: `${pct(v.made / v.total)}`,
      }));
  return (
    <Page
      wide
      label={w.name}
      eyebrow={[w.firstName, w.lastName].filter(Boolean).join(' ') || p.title}
      title={
        <span className="inline-flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-28"
            style={{ background: w.color }}
          >
            {w.emoji}
          </span>
          {w.name}
        </span>
      }
      sub={<RangeChips value={range} onChange={setRange} />}
    >
      {!played ? (
        <EmptyState icon="🃏" title={p.notFound} />
      ) : (
        <>
          <Section title={p.stats}>
            <TileGrid>
              <StatTile
                label={p.avg}
                value={Math.round(s.avgPerRound)}
                sub={`${s.rounds} ${p.rounds.toLowerCase()}`}
              />
              <StatTile label={p.points} value={fmt(s.points)} />
              <StatTile
                label={p.accuracy}
                value={pct(s.accuracy)}
                sub={`${s.made} / ${s.rounds}`}
              />
              <StatTile
                label={p.games}
                value={s.games}
                sub={p.places(s.places[1], s.places[2], s.places[3])}
              />
              <StatTile
                label={p.wins}
                value={s.wins}
                sub={s.gamesEnded ? `${p.winRate} ${pct(s.winRate)}` : undefined}
              />
              <StatTile
                label={p.best}
                value={s.bestRound == null ? '–' : sgnN(s.bestRound)}
                sub={s.worstRound == null ? undefined : `${p.worst} ${sgnN(s.worstRound)}`}
              />
              <StatTile label={p.hot} value={s.longestHot} sub={`${p.cold} ${s.longestCold}`} />
              <StatTile
                label={p.dealer}
                value={s.asDealer.rounds ? pct(s.asDealer.made / s.asDealer.rounds) : '–'}
                sub={`${p.hooked} ${s.hookHits}`}
              />
            </TileGrid>
          </Section>
          {line.length > 1 && (
            <Section title={p.overTime}>
              <div className="glass p-3">
                <Sparkline values={line} label={`${p.overTime}: ${fmt(line.at(-1)!)}`} />
              </div>
            </Section>
          )}
          <div className="grid gap-x-6 [[data-desk]_&]:grid-cols-2">
            <Section title={p.byCards}>
              <div className="glass p-4">
                <Bars label={p.byCards} bars={accBars(s.byCards, (k) => p.cardsN(k))} />
              </div>
            </Section>
            <Section title={p.byTrump}>
              <div className="glass p-4">
                <Bars
                  label={p.byTrump}
                  bars={accBars(
                    s.byTrump as Record<string, { made: number; total: number }>,
                    (k) => (
                      <>
                        <SuitGlyph trump={k as Trump} /> {TR[k as Trump].name}
                      </>
                    ),
                  )}
                />
              </div>
            </Section>
            <Section title={p.bids}>
              <div className="glass p-4">
                <Bars label={p.bids} bars={accBars(s.bidHistogram, (k) => p.bidN(k))} />
              </div>
            </Section>
            <Section title={`${p.calendar} · ${year}`}>
              <div className="glass p-4">
                <Heatmap days={cal} year={year} />
              </div>
            </Section>
          </div>
          <Section
            title={p.shelf}
            aside={
              <button
                type="button"
                onClick={() => actions.open({ screen: 'achievements', params: { id } })}
                className="min-h-11 px-2 text-14 font-bold text-[var(--accent)]"
              >
                {t.hub.common.see}
              </button>
            }
          >
            {earned.length ? (
              <ul className="flex flex-wrap gap-2">
                {shelf(earned).map((x, i) => (
                  <motion.li
                    key={x.code}
                    {...stagger(Math.min(i, 10))}
                    className="glass flex items-center gap-2 px-3 py-2"
                  >
                    <span aria-hidden className="text-22">
                      {ACH.get(x.code)?.emoji}
                    </span>
                    <span className="text-14 font-bold">
                      {achName(x.code)}
                      {x.n > 1 && <span className="ml-1 text-[var(--tx2)]">×{x.n}</span>}
                    </span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-15 text-[var(--tx2)]">{p.noShelf}</p>
            )}
          </Section>
          <div className="grid gap-x-6 [[data-desk]_&]:grid-cols-2">
            <Section title={p.recent}>
              <ul className="flex flex-col gap-2">
                {recent.map((g) => (
                  <li key={g.gameId}>
                    <button
                      type="button"
                      onClick={() => actions.open({ screen: 'game', params: { id: g.gameId } })}
                      className="glass flex min-h-14 w-full items-center gap-3 px-4 text-left"
                    >
                      <span className="disp w-8 text-20 font-extrabold">
                        {g.place ? `#${g.place}` : '…'}
                      </span>
                      <span className="flex-1 text-15">
                        {g.endedAt ? dayLabel(g.endedAt) : t.hub.history.badge.unfinished}
                      </span>
                      <span className="disp text-18 font-extrabold">{fmt(g.points)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title={p.rivals}>
              <ul className="flex flex-col gap-2">
                {rivals.map((o) => {
                  const ow = whoIs(f, o.playerId);
                  return (
                    <li key={o.playerId}>
                      <button
                        type="button"
                        onClick={() =>
                          actions.open({ screen: 'h2h', params: { a: id, b: o.playerId } })
                        }
                        aria-label={`${p.vs}: ${w.name} vs ${ow.name}`}
                        className="glass flex min-h-14 w-full items-center gap-3 px-4 text-left"
                      >
                        <span
                          aria-hidden
                          className="grid h-8 w-8 place-items-center rounded-full text-18"
                          style={{ background: ow.color }}
                        >
                          {ow.emoji}
                        </span>
                        <span className="flex-1 text-16 font-bold [overflow-wrap:anywhere]">
                          {ow.name}
                        </span>
                        <span className="text-14 text-[var(--tx2)]">{p.games_(o.games)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
          {local && (
            <button
              type="button"
              onClick={() => setMerge(true)}
              className="min-h-12 px-2 text-15 font-bold text-[var(--tx2)]"
            >
              {p.merge}
            </button>
          )}
        </>
      )}
      {merge && (
        <Sheet title={p.mergeTitle} onClose={() => setMerge(false)}>
          <ul className="flex flex-col gap-1">
            {people()
              .filter((x) => x.id !== id)
              .map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setInto(x.id)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-left text-17 font-bold"
                  >
                    <span aria-hidden className="text-22">
                      {x.emoji}
                    </span>
                    {x.displayName}
                  </button>
                </li>
              ))}
          </ul>
        </Sheet>
      )}
      <AnimatePresence>
        {into && (
          <Modal
            key="merge"
            text={p.mergeAsk(w.name, whoIs(f, into).name)}
            ok={t.common.done}
            onCancel={() => setInto(null)}
            onOk={() => {
              mergeLocal(id, into);
              setInto(null);
              setMerge(false);
              actions.back();
              actions.say(p.merged);
            }}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}
