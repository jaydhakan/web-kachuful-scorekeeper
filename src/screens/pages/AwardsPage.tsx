import { m, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ACH,
  chase,
  dailyAwards,
  dayOf,
  monthOf,
  playedMonths,
  season,
  type Award,
  type Chase,
  type Facts,
} from '@/domain';
import { dayLabel, monthLabel, parseDay } from '@/lib/dates';
import { fmt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { Chip, ChipRow, EmptyState, Page, Section } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Seg } from '@/components/ui/Seg';
import { pct } from '@/components/ui/Stats';
import { SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { BoardList } from './BoardsPage';
import { achName } from '@/strings/achievements';
import { ep } from '@/sync/endpoints';
import type { AwardRow } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { RemotePending } from '@/components/RemoteGate';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';
import { PODIUM_BG } from '@/components/ui/podium';
import { GoldEdge, Medal } from '@/components/ui/Medal';
import { icon } from '@/components/ui/IconsMore';

const aw = t.hub.awards;
const isFinal = (v: { final: boolean }) => v.final;

const shiftDay = (day: string, d: number) => dayOf(parseDay(day) + d * 864e5 + 12 * 3600e3);

/** An award's value as people read it. */
export function awardValue(a: Award): string {
  if (a.code === 'day_sharp' || a.code === 'season_sharpest') return pct(a.value);
  if (a.code === 'day_bang' || a.code === 'day_ouch' || a.code === 'day_star') return sgnN(a.value);
  if (a.code.startsWith('season_') && a.code !== 'season_iron' && a.code !== 'season_climber')
    return String(Math.round(a.value));
  return fmt(a.value);
}

export function AwardCard({ a, f, i }: { a: Award; f: Facts | null; i: number }) {
  const { actions } = useApp();
  const w = whoIs(f, a.playerId);
  return (
    <m.li {...stagger(i)}>
      <button
        type="button"
        onClick={() => actions.open({ screen: 'player', params: { id: a.playerId } })}
        className="press glass relative flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <GoldEdge />
        <Medal emoji={ACH.get(a.code)?.emoji ?? ''} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-13 font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
            {achName(a.code)}
          </span>
          <span className="block text-17 font-bold [overflow-wrap:anywhere]">
            {w.emoji} {w.name}
          </span>
        </span>
        <span className="disp text-20 font-extrabold">{awardValue(a)}</span>
      </button>
    </m.li>
  );
}

export interface AwardsSource {
  daily: (day: string) => { awards: Award[]; final: boolean } | 'loading';
  season: (month: string) => ReturnType<typeof season> | 'loading';
  months: string[];
  facts: Facts | null;
}

export function AwardsPage({ source }: { source?: AwardsSource }) {
  const f = useDeviceFacts();
  const local: AwardsSource = useMemo(
    () => ({
      daily: (day) => ({ awards: dailyAwards(f, day), final: day < dayOf(Date.now()) }),
      season: (m) => season(f, m),
      months: playedMonths(f),
      facts: f,
    }),
    [f],
  );
  const src = source ?? local;
  const [tab, setTab] = useState<'day' | 'season'>('day');
  const [day, setDay] = useState(() => dayOf(Date.now()));
  const thisMonth = monthOf(Date.now());
  const [picked, setMonth] = useState<string | null>(null);
  const today = dayOf(Date.now());
  // Signed in, the awards are the server's (Kolkata days and months); signed out, this device's.
  const { state } = useApp();
  const signedIn = !!state.session;
  const me = state.session?.player?.id ?? null;
  // Closed days and seasons never change: a cached one is never asked for again.
  const rDay = useRemote(signedIn ? `daily:${day}` : null, (o) => ep.daily(day, o), isFinal);
  const rSeasons = useRemote(signedIn ? 'seasons' : null, (o) => ep.seasons(o));
  const months = signedIn && rSeasons.data ? rSeasons.data.map((x) => x.season) : src.months;
  // Until one is picked, the season shown is this month, or the latest played one while this month has no rounds.
  const month =
    picked ??
    (months.length && !months.includes(thisMonth) ? [...months].sort().reverse()[0] : thisMonth);
  const rSeason = useRemote(
    signedIn && tab === 'season' ? `season:${month}` : null,
    (o) => ep.season(month, o),
    isFinal,
  );
  const unwrap = <T extends { player: { id: string } }>(xs: T[]) =>
    xs.map(({ player, ...x }) => ({ ...x, playerId: player.id }));
  // The server sends null where the device engine leaves a field out.
  const unaward = (xs: AwardRow[]): Award[] =>
    xs.map(({ player, gameId, roundIndex, ...x }) => ({
      ...x,
      playerId: player.id,
      ...(gameId != null && { gameId }),
      ...(roundIndex != null && { roundIndex }),
    }));
  const d = !signedIn
    ? src.daily(day)
    : rDay.data
      ? { awards: unaward(rDay.data.awards), final: rDay.data.final }
      : 'loading';
  const s =
    tab !== 'season'
      ? null
      : !signedIn
        ? src.season(month)
        : rSeason.data
          ? {
              season: month,
              standings: unwrap(rSeason.data.standings),
              awards: unaward(rSeason.data.awards),
            }
          : 'loading';
  const year = new Date().getFullYear();
  // Closed months only: this month's leader isn't a champion yet.
  const champions: Champ[] = useMemo(() => {
    if (signedIn)
      return (rSeasons.data ?? [])
        .filter((x) => x.season < thisMonth)
        .map((x) => ({ season: x.season, playerId: x.champion?.id ?? null }));
    return src.months
      .filter((m) => m < thisMonth)
      .flatMap((m) => {
        const r = src.season(m);
        return r === 'loading'
          ? []
          : [{ season: m, playerId: r.standings.find((x) => x.rank === 1)?.playerId ?? null }];
      });
  }, [signedIn, rSeasons.data, src, thisMonth]);
  const pick = (m: string) => {
    setMonth(m);
    document.getElementById('season-top')?.scrollIntoView({ block: 'start' });
  };
  return (
    <Page
      title={aw.title}
      sub={
        <Seg<'day' | 'season'>
          uid="awards-tab"
          label={aw.tabs}
          value={tab}
          onChange={setTab}
          options={[
            {
              v: 'day',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {icon('star')} {aw.today}
                </span>
              ),
            },
            {
              v: 'season',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {icon('crown')} {aw.season}
                </span>
              ),
            },
          ]}
        />
      }
    >
      {tab === 'day' ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <IconButton label={aw.prevDay} onClick={() => setDay(shiftDay(day, -1))}>
              {Icon.back}
            </IconButton>
            <div className="text-center">
              <div aria-live="polite" className="disp text-22 font-bold">
                {dayLabel(parseDay(day))}
              </div>
              {d !== 'loading' && !d.final && day === today && (
                <div className="text-13 text-[var(--tx2)]">{aw.provisional}</div>
              )}
            </div>
            {day < today ? (
              <IconButton label={aw.nextDay} onClick={() => setDay(shiftDay(day, 1))}>
                <span className="rotate-180">{Icon.back}</span>
              </IconButton>
            ) : (
              <span className="w-12" />
            )}
          </div>
          {d === 'loading' ? (
            <RemotePending r={rDay} rows={3} />
          ) : d.awards.length ? (
            <ul className="flex flex-col gap-2" key={day}>
              {d.awards.map((a, i) => (
                <AwardCard key={a.code + a.playerId} a={a} f={src.facts} i={i} />
              ))}
            </ul>
          ) : (
            <EmptyState icon="moon" title={aw.noneTitle} body={aw.noneBody} />
          )}
        </>
      ) : (
        <>
          <span id="season-top" className="block scroll-mt-4" />
          <ChipRow label={aw.season}>
            {[...new Set([thisMonth, ...months])].slice(0, 12).map((m) => (
              <Chip key={m} on={m === month} onClick={() => setMonth(m)}>
                {monthLabel(parseDay(m + '-01'))}
              </Chip>
            ))}
          </ChipRow>
          {s === 'loading' && (
            <div className="mt-4">
              <RemotePending r={rSeason} />
            </div>
          )}
          {s && s !== 'loading' && (
            <div className="mt-4">
              {month === thisMonth && <p className="mb-3 text-13 text-[var(--tx2)]">{aw.live}</p>}
              {month === thisMonth && me && <ChaseLine c={chase(s.standings, me)} />}
              <Podium s={s} f={src.facts} />
              {s.awards.length > 0 && (
                <ul className="mb-6 flex flex-col gap-2">
                  {s.awards.map((a, i) => (
                    <AwardCard key={a.code + a.playerId} a={a} f={src.facts} i={i} />
                  ))}
                </ul>
              )}
              <Section title={aw.standings}>
                {s.standings.length ? (
                  <BoardList
                    data={{ rows: s.standings, minRounds: 50, facts: src.facts }}
                    metric="avgPerRound"
                  />
                ) : (
                  <EmptyState icon="calendar" title={aw.noSeason} />
                )}
              </Section>
            </div>
          )}
          <PastChampions items={champions} f={src.facts} onPick={pick} />
        </>
      )}
      <Explore year={year} />
    </Page>
  );
}

type Champ = { season: string; playerId: string | null };

/** Every closed month's champion as a wall of gold medals, newest first; a tap opens that month. */
function PastChampions({
  items,
  f,
  onPick,
}: {
  items: Champ[];
  f: Facts | null;
  onPick: (month: string) => void;
}) {
  if (!items.length) return null;
  const titles = new Map<string, number>();
  for (const c of items) if (c.playerId) titles.set(c.playerId, (titles.get(c.playerId) ?? 0) + 1);
  const [lead, n] = [...titles].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  return (
    <Section title={aw.champions} className="mt-2">
      {lead && n >= 2 && (
        <p className="mb-3 flex items-center gap-2 text-15 font-bold">
          <span aria-hidden className="text-gold">
            {icon('crown', 'h-5 w-5')}
          </span>
          {aw.mostTitles(whoIs(f, lead).name, n)}
        </p>
      )}
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {[...items]
          .sort((a, b) => (a.season < b.season ? 1 : -1))
          .map((c, i) => {
            const w = c.playerId ? whoIs(f, c.playerId) : null;
            const label = monthLabel(parseDay(c.season + '-01'));
            return (
              <m.li key={c.season} {...stagger(Math.min(i, 10))}>
                <button
                  type="button"
                  onClick={() => onPick(c.season)}
                  className="press glass relative flex min-h-[8.5rem] w-full flex-col items-center gap-1.5 px-2 py-3 text-center"
                >
                  {w && <GoldEdge />}
                  <span className="text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">
                    {label}
                  </span>
                  {w ? (
                    <Avatar
                      p={w}
                      className="grid h-12 w-12 place-items-center rounded-full text-26 shadow-[0_0_0_2px_var(--gold),0_0_18px_color-mix(in_srgb,var(--medal-gold)_45%,transparent)]"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="h-12 w-12 rounded-full border border-dashed border-ov/25"
                    />
                  )}
                  <span
                    className={`text-14 font-bold leading-tight [overflow-wrap:anywhere] ${w ? '' : 'text-[var(--tx2)]'}`}
                  >
                    {w ? w.name : aw.noChampion}
                  </span>
                </button>
              </m.li>
            );
          })}
      </ul>
    </Section>
  );
}

/** Where I stand this month, and the next thing to chase. */
function ChaseLine({ c }: { c: Chase }) {
  const ch = aw.chase;
  const g = (n: number) => n.toFixed(1);
  const text =
    c.kind === 'top'
      ? ch.top(g(c.ahead))
      : c.kind === 'tied'
        ? ch.tied(c.rank)
        : c.kind === 'behind'
          ? ch.behind(c.rank, c.target, g(c.gap))
          : c.kind === 'unranked'
            ? ch.unranked(c.need)
            : ch.absent;
  return (
    <p className="glass mb-4 flex items-center gap-3 px-4 py-3 text-15 font-bold">
      <span aria-hidden className="grid h-6 w-6 shrink-0 text-gold">
        {c.kind === 'top' ? icon('crown', 'h-6 w-6') : icon('target', 'h-6 w-6')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{ch.label}: </span>
        {text}
      </span>
    </p>
  );
}

/** The screens that grew out of awards, as plain links: they open somewhere else, so they don't pose as tabs. */
function Explore({ year }: { year: number }) {
  const { state, actions } = useApp();
  const me = state.session?.player?.id;
  const links = [
    {
      key: 'ach',
      ic: icon('trophy'),
      title: aw.exploreAch,
      sub: me ? aw.exploreAchMine : aw.exploreAchAll,
      go: () => actions.open({ screen: 'achievements', params: me ? { id: me } : undefined }),
    },
    {
      key: 'wrapped',
      ic: icon('gift'),
      title: aw.wrapped(year),
      sub: aw.exploreWrapped,
      go: () => actions.open({ screen: 'wrapped', params: { year: String(year) } }),
    },
    ...(state.session
      ? [
          {
            key: 'activity',
            ic: icon('news'),
            title: t.hub.nav.activity,
            sub: aw.exploreActivity,
            go: () => actions.open({ screen: 'activity' }),
          },
        ]
      : []),
  ];
  return (
    <Section title={aw.explore}>
      <nav aria-label={aw.explore} className="glass overflow-hidden">
        {links.map((l, k) => (
          <button
            key={l.key}
            type="button"
            onClick={l.go}
            className="press relative flex min-h-16 w-full items-center gap-3.5 px-4 py-2 text-left"
          >
            {k > 0 && <span aria-hidden className="absolute left-14 right-0 top-0 h-px bg-ov/10" />}
            <span
              aria-hidden
              className="grid h-6 w-6 shrink-0 place-items-center text-[var(--accent)]"
            >
              {l.ic}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-16 font-bold">{l.title}</span>
              <span className="block text-13 text-[var(--tx2)]">{l.sub}</span>
            </span>
            <span aria-hidden className="text-[var(--dis)]">
              {Icon.chev}
            </span>
          </button>
        ))}
      </nav>
    </Section>
  );
}

/** The month's top three on rising steps, with confetti-free celebration under reduced motion. */
function Podium({ s, f }: { s: ReturnType<typeof season>; f: Facts | null }) {
  const rm = useReducedMotion();
  const top = s.standings.filter((r) => r.qualified && r.rank && r.rank <= 3).slice(0, 3);
  if (!top.length) return null;
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return (
    <div aria-hidden className="mb-6 flex items-end justify-center gap-3">
      {order.map((r) => {
        const w = whoIs(f, r.playerId),
          k = top.indexOf(r);
        return (
          <div key={r.playerId} className="flex w-24 flex-col items-center gap-1 text-center">
            {k === 0 && <span className="text-gold">{icon('crown', 'h-7 w-7')}</span>}
            <Avatar p={w} className="grid h-12 w-12 place-items-center rounded-full text-26" />
            <span className="text-14 font-bold [overflow-wrap:anywhere]">{w.name}</span>
            <m.span
              initial={rm ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...SPRING_POP, delay: 0.15 * (2 - k) }}
              className={`disp grid w-full origin-bottom place-items-start justify-center rounded-t-xl pt-1 text-24 font-extrabold text-ink-podium ${PODIUM_BG[r.rank as 1 | 2 | 3]} ${['h-20', 'h-14', 'h-10'][k]}`}
            >
              {r.rank}
            </m.span>
          </div>
        );
      })}
    </div>
  );
}
