import { AnimatePresence, m } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ACH,
  ACHIEVEMENTS,
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
import { mayEdit, mergeLocal, people, resolveId } from '@/state/registry';
import { useArchive } from '@/state/useArchive';
import { useApp } from '@/state/store';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Page, Section } from '@/components/ui/Page';
import {
  Bars,
  Heatmap,
  pct,
  ProgressRing,
  RangePick,
  Sparkline,
  StatTile,
  TileGrid,
} from '@/components/ui/Stats';
import { Modal } from '@/components/ui/Modal';
import { Seg } from '@/components/ui/Seg';
import { Icon } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { stagger } from '@/components/ui/stagger';
import { TR } from '@/theme/trumps';
import { achName } from '@/strings/achievements';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { t } from '@/strings';

const p = t.hub.player;
// Fewer rounds than this behind a bar and its percentage is mostly luck.
const FEW = 5;
type Tab = 'cards' | 'bids' | 'trump' | 'calendar';
const BAR_LABEL = { cards: p.byCards, bids: p.bids, trump: p.byTrump };

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
  const { state } = useApp();
  const signedIn = !!state.session;
  const year = new Date().getFullYear();
  // Signed in, the numbers are the server's (every game everyone scored); signed out, this device's.
  const rStats = useRemote(signedIn ? `ps:${id}:${range.from}:${range.to}` : null, (o) =>
    ep.playerStats(id, range.from, range.to === Infinity ? Date.now() + 864e5 : range.to, o),
  );
  const rProfile = useRemote(signedIn ? `p:${id}` : null, (o) => ep.player(id, o));
  const rCal = useRemote(signedIn ? `cal:${id}:${year}` : null, (o) => ep.calendar(id, year, o));
  const rGames = useRemote(signedIn ? `pg:${id}` : null, () => ep.playerGames(id));
  const localStats = useMemo(() => profileStats(f, id, range.from, range.to), [f, id, range]);
  const s = rStats.data ?? localStats;
  const line = useMemo(() => pointsOverTime(f, id, range.from, range.to), [f, id, range]);
  const localEarned = useMemo(() => allAchievements(f).filter((e) => e.playerId === id), [f, id]);
  const earned: Earned[] = rProfile.data?.achievements ?? localEarned;
  const unlocked = useMemo(() => new Set(earned.map((e) => e.code)).size, [earned]);
  const localCal = useMemo(() => calendar(f, id), [f, id]);
  const cal = rCal.data?.days ?? localCal;
  // Signed in, who they play with comes from the server's list of their games, not just this device's.
  const rivals = useMemo(() => {
    if (!rGames.data) return opponents(f, id).slice(0, 5);
    const n = new Map<string, number>();
    for (const g of rGames.data.items)
      for (const x of g.players)
        if (x.playerId !== id) n.set(x.playerId, (n.get(x.playerId) ?? 0) + 1);
    return [...n]
      .map(([playerId, games]) => ({ playerId, games }))
      .sort((a, b) => b.games - a.games || (a.playerId < b.playerId ? -1 : 1))
      .slice(0, 5);
  }, [f, id, rGames.data]);
  const recent = useMemo(
    () =>
      rGames.data
        ? rGames.data.items.slice(0, 6).map((g) => {
            const me = g.players.find((x) => x.playerId === id);
            return {
              gameId: g.id,
              place: me?.place ?? null,
              points: me?.points ?? 0,
              endedAt: g.endedAt,
            };
          })
        : f.players
            .filter((x) => x.playerId === id)
            .sort((a, b) => (b.endedAt ?? Infinity) - (a.endedAt ?? Infinity))
            .slice(0, 6),
    [f, id, rGames.data],
  );
  const rank = rProfile.data?.rank;
  const [merge, setMerge] = useState(false);
  const [more, setMore] = useState(false);
  const [tab, setTab] = useState<Tab>('cards');
  const [into, setInto] = useState<string | null>(null);
  const local = archive.get('players', id)?.local && !signedIn;
  // Signed in, the admin, the player's creator and the player may change the photo.
  const reg = useArchive((a) => (signedIn ? a.get('players', resolveId(id)) : undefined));
  const aliases = (
    rProfile.data?.player.aliases?.map((x) => x.displayName) ??
    reg?.aliases ??
    []
  ).filter((x) => x !== w.name);
  const played = s.rounds > 0 || f.rounds.some((r) => r.playerId === id);
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
        note: `${pct(v.made / v.total)} · ${v.made}/${v.total}`,
        low: v.total < FEW,
      }));
  const bars =
    tab === 'cards'
      ? accBars(s.byCards, (k) => p.cardsN(k))
      : tab === 'bids'
        ? accBars(s.bidHistogram, (k) => p.bidN(k))
        : tab === 'trump'
          ? accBars(s.byTrump as Record<string, { made: number; total: number }>, (k) => (
              <>
                <SuitGlyph trump={k as Trump} /> {TR[k as Trump].name}
              </>
            ))
          : [];
  return (
    <Page
      wide
      label={w.name}
      eyebrow={
        [
          [w.firstName, w.lastName].filter(Boolean).join(' '),
          rank?.global ? p.rank(rank.global, rank.outOf) : '',
          aliases.length ? p.alsoPlaysAs(aliases) : '',
        ]
          .filter(Boolean)
          .join(' · ') || p.title
      }
      title={
        <span className="inline-flex items-center gap-3">
          <Avatar
            p={{ ...w, photoUrl: rProfile.data?.player.photoUrl }}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-28"
          />
          {w.name}
        </span>
      }
      sub={
        <div className="flex">
          <RangePick value={range} onChange={setRange} />
        </div>
      }
    >
      {reg && mayEdit(reg, state.session?.user) && (
        <PhotoPicker p={{ ...w, displayName: w.name }} className="mb-5" />
      )}
      {!played ? (
        <EmptyState icon="cards" title={p.notFound} />
      ) : (
        <>
          <Section title={p.stats}>
            <TileGrid>
              <StatTile
                label={p.avg}
                short={p.avgShort}
                value={Math.round(s.avgPerRound)}
                sub={`${s.rounds} ${p.rounds.toLowerCase()}`}
              />
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
            </TileGrid>
            <AnimatePresence initial={false}>
              {more && (
                <m.div
                  key="more"
                  id="more-stats"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2"
                >
                  <TileGrid>
                    <StatTile label={p.points} value={fmt(s.points)} />
                    <StatTile
                      label={p.best}
                      value={s.bestRound == null ? '–' : sgnN(s.bestRound)}
                      sub={s.worstRound == null ? undefined : `${p.worst} ${sgnN(s.worstRound)}`}
                    />
                    <StatTile
                      label={p.hot}
                      value={s.longestHot}
                      sub={`${p.cold} ${s.longestCold}`}
                    />
                    <StatTile
                      label={p.dealer}
                      value={s.asDealer.rounds ? pct(s.asDealer.made / s.asDealer.rounds) : '–'}
                      sub={`${p.hooked} ${s.hookHits}`}
                    />
                  </TileGrid>
                </m.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              aria-expanded={more}
              aria-controls="more-stats"
              onClick={() => setMore(!more)}
              className="press mt-1 flex min-h-11 items-center gap-1.5 px-1 text-14 font-bold text-[var(--accent)]"
            >
              {more ? p.fewerStats : p.moreStats}
              <span
                aria-hidden
                className={`transition-transform ${more ? '-rotate-90' : 'rotate-90'}`}
              >
                {Icon.chev}
              </span>
            </button>
          </Section>
          {line.length > 1 && (
            <Section title={p.overTime}>
              <div className="glass p-3">
                <Sparkline values={line} label={`${p.overTime}: ${fmt(line.at(-1)!)}`} />
              </div>
            </Section>
          )}
          <Section title={p.breakdown}>
            <div className="glass flex flex-col gap-4 p-4">
              <Seg<Tab>
                uid="breakdown"
                label={p.breakdown}
                value={tab}
                onChange={setTab}
                options={(['cards', 'bids', 'trump', 'calendar'] as Tab[]).map((v) => ({
                  v,
                  label: p.tabs[v],
                }))}
              />
              <div role="tabpanel" aria-label={p.tabs[tab]}>
                {tab === 'calendar' ? (
                  <Heatmap days={cal} year={year} />
                ) : (
                  <Bars label={BAR_LABEL[tab]} bars={bars} />
                )}
              </div>
              {tab !== 'calendar' && bars.some((b) => b.low) && (
                <p className="text-13 text-[var(--tx2)]">{p.fewRounds(FEW)}</p>
              )}
            </div>
          </Section>
          <Section
            title={p.shelf}
            aside={
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-13 font-bold tabular-nums text-[var(--tx2)]">
                  <ProgressRing share={unlocked / ACHIEVEMENTS.length} className="h-6 w-6" />
                  <span className="sr-only">{t.hub.ach.summary}: </span>
                  {unlocked} / {ACHIEVEMENTS.length}
                </span>
                <button
                  type="button"
                  onClick={() => actions.open({ screen: 'achievements', params: { id } })}
                  className="press min-h-11 px-2 text-14 font-bold text-[var(--accent)]"
                >
                  {t.hub.common.see}
                </button>
              </span>
            }
          >
            {earned.length ? (
              <ul className="flex flex-wrap gap-2">
                {shelf(earned).map((x, i) => (
                  <m.li
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
                  </m.li>
                ))}
              </ul>
            ) : (
              <p className="text-15 text-[var(--tx2)]">{p.noShelf}</p>
            )}
          </Section>
          <div className="grid grid-cols-1 gap-x-6 [[data-desk]_&]:grid-cols-2">
            <Section title={p.recent}>
              <ul className="flex flex-col gap-2">
                {recent.map((g) => (
                  <li key={g.gameId}>
                    <button
                      type="button"
                      onClick={() => actions.open({ screen: 'game', params: { id: g.gameId } })}
                      className="press glass flex min-h-14 w-full items-center gap-3 px-4 text-left"
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
                        className="press glass flex min-h-14 w-full items-center gap-3 px-4 text-left"
                      >
                        <Avatar
                          p={ow}
                          className="grid h-8 w-8 place-items-center rounded-full text-18"
                        />
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
              className="press min-h-12 px-2 text-15 font-bold text-[var(--tx2)]"
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
                    className="press flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-left text-17 font-bold"
                  >
                    <Avatar p={x} />
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
