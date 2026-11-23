import { m } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { byCode } from '@/progression/catalogue';
import type { GameProgression } from '@/progression/registry';
import type { Award, SeasonResult, StandingRow } from '@/progression/types';
import { dayOf, monthOf } from '@/progression/zone';
import { dayLabel, monthLabel, parseDay } from '@/lib/dates';
import { fmt } from '@/lib/format';
import { Chip, ChipRow, EmptyState, PageFrame, Section } from '@/components/ui/PageParts';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { Seg } from '@/components/ui/Seg';
import { pct } from '@/components/ui/Stats';
import { stagger } from '@/components/ui/stagger';
import { RemotePending } from '@/components/RemoteGate';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';
import { Medal } from '@/components/ui/Medal';
import { Edge } from '@/components/ui/Edge';
import { icon } from '@/components/ui/IconsMore';
import { PlayerTag } from '@/components/ui/PlayerTag';
import { useProgressionEnv } from './env';
import { useDaily, useSeason, useSeasons, type Champ } from './useProgressionData';
import { fx } from '@/strings/fx';
import { SeasonPodium } from './SeasonPodium';
import { WinRateStandings } from './WinRateStandings';
import { saveSeasonShown, wasSeasonShown } from '@/state/persistence';

const aw = t.hub.awards;

const shiftDay = (day: string, d: number) => dayOf(parseDay(day) + d * 864e5 + 12 * 3600e3);

const PLACES = new Set(['season_champion', 'season_runner_up', 'season_third']);

/** An award's value as people read it: the game's own way, else a win rate for a place, else the number. */
export const awardValue = (prog: GameProgression, a: Award, season?: SeasonResult): string =>
  prog.awardValue?.(a, season) ??
  (prog.standings === 'winRate' && PLACES.has(a.code) ? pct(a.value) : fmt(a.value));

/** `season`: the month a season award belongs to, whose standings say how its value reads. */
export function AwardCard({ a, i, season }: { a: Award; i: number; season?: SeasonResult }) {
  const { prog, person, openPlayer } = useProgressionEnv();
  const w = person(a.playerId);
  return (
    <m.li {...stagger(i)}>
      <button
        type="button"
        onClick={() => openPlayer(a.playerId)}
        className="press glass relative flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <Edge />
        <Medal emoji={byCode(prog).get(a.code)?.emoji ?? ''} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-13 font-bold uppercase tracking-[0.08em] text-[var(--accent-tx)]">
            {prog.strings.achievements[a.code]?.name ?? a.code}
          </span>
          <span className="block text-17 font-bold [overflow-wrap:anywhere]">
            <PlayerTag p={w} name={w.name} />
          </span>
        </span>
        <span className="disp text-20 font-extrabold">{awardValue(prog, a, season)}</span>
      </button>
    </m.li>
  );
}

export interface ExploreLink {
  key: string;
  ic: ReactNode;
  title: string;
  sub: string;
  go: () => void;
}

/** What a game adds to the shared Awards page. */
export interface AwardsSlots<R extends StandingRow> {
  /** This month, signed in: where I stand, above the podium. */
  chase?: (s: SeasonResult<R>, me: string) => ReactNode;
  /** The month's full standings; left out, the win-rate board. */
  standings?: (s: SeasonResult<R>) => ReactNode;
  /** Links under Explore after Achievements (Kachuful's Wrapped). */
  links?: ExploreLink[];
}

/**
 * A game's awards: each day's (step back through days), and each month's season with its podium, awards and
 * standings, then the wall of past champions. Inside the game's `ProgressionScope`.
 */
export function AwardsPage<R extends StandingRow = StandingRow>({
  slots = {},
}: {
  slots?: AwardsSlots<R>;
}) {
  const env = useProgressionEnv();
  const { prog, me } = env;
  const [tab, setTab] = useState<'day' | 'season'>('day');
  const [day, setDay] = useState(() => dayOf(Date.now()));
  const thisMonth = monthOf(Date.now());
  const [picked, setMonth] = useState<string | null>(null);
  const today = dayOf(Date.now());
  const { d, remote: rDay } = useDaily(env, day);
  const { months, champions } = useSeasons(env, thisMonth);
  // Until one is picked, the season shown is this month, or the latest played one while this month has no play.
  const month =
    picked ??
    (months.length && !months.includes(thisMonth) ? [...months].sort().reverse()[0] : thisMonth);
  const { s, remote: rSeason } = useSeason<R>(env, month, tab === 'season');
  // The newest closed season, the first time this device sees it: the page opens on it and plays the ceremony.
  const [ceremony, setCeremony] = useState<{ key: number; month: string } | null>(null);
  const newest = champions.reduce<string | null>(
    (m, c) => (c.playerId && (!m || c.season > m) ? c.season : m),
    null,
  );
  useEffect(() => {
    if (!newest || wasSeasonShown(prog.id, newest)) return;
    saveSeasonShown(prog.id, newest);
    setTab('season');
    setMonth(newest);
    setCeremony({ key: 1, month: newest });
  }, [newest, prog.id]);
  const pick = (m: string) => {
    setMonth(m);
    document.getElementById('season-top')?.scrollIntoView({ block: 'start' });
  };
  return (
    <PageFrame
      onBack={env.onBack}
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
                <AwardCard key={a.code + a.playerId} a={a} i={i} />
              ))}
            </ul>
          ) : (
            <EmptyState icon="moon" title={aw.noneTitle} body={prog.strings.dayEmpty} />
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
              {month === thisMonth && me && slots.chase?.(s, me)}
              <SeasonPodium
                key={ceremony?.month === month ? ceremony.key : 0}
                s={s}
                ceremony={
                  ceremony?.month === month
                    ? { key: ceremony.key, title: fx.ceremony(monthLabel(parseDay(month + '-01'))) }
                    : null
                }
              />
              {month < thisMonth && s.standings.some((r) => r.qualified && r.rank === 1) && (
                <div className="-mt-3 mb-5 flex justify-center">
                  <button
                    type="button"
                    data-replay-season
                    onClick={() => setCeremony((c) => ({ key: (c?.key ?? 0) + 1, month }))}
                    className="press min-h-11 px-4 text-15 font-semibold text-[var(--accent-tx)] underline decoration-ov/25 underline-offset-[5px]"
                  >
                    {fx.replay}
                  </button>
                </div>
              )}
              {s.awards.length > 0 && (
                <ul className="mb-6 flex flex-col gap-2">
                  {s.awards.map((a, i) => (
                    <AwardCard key={a.code + a.playerId} a={a} i={i} season={s} />
                  ))}
                </ul>
              )}
              <Section title={aw.standings}>
                {!s.standings.length ? (
                  <EmptyState icon="calendar" title={prog.strings.seasonEmpty} />
                ) : slots.standings ? (
                  slots.standings(s)
                ) : (
                  <WinRateStandings s={s} />
                )}
              </Section>
            </div>
          )}
          <PastChampions items={champions} onPick={pick} />
        </>
      )}
      <Explore links={slots.links ?? []} />
    </PageFrame>
  );
}

/** Every closed month's champion as a wall of gold medals, newest first; a tap opens that month. */
function PastChampions({ items, onPick }: { items: Champ[]; onPick: (month: string) => void }) {
  const { person } = useProgressionEnv();
  if (!items.length) return null;
  const titles = new Map<string, number>();
  for (const c of items) if (c.playerId) titles.set(c.playerId, (titles.get(c.playerId) ?? 0) + 1);
  const [lead, n] = [...titles].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  return (
    <Section title={aw.champions} className="mt-2">
      {lead && n >= 2 && (
        <p className="mb-3 flex items-center gap-2 text-15 font-bold">
          <span aria-hidden className="text-[var(--gold-tx)]">
            {icon('crown', 'h-5 w-5')}
          </span>
          {aw.mostTitles(person(lead).name, n)}
        </p>
      )}
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {[...items]
          .sort((a, b) => (a.season < b.season ? 1 : -1))
          .map((c, i) => {
            const w = c.playerId ? person(c.playerId) : null;
            const label = monthLabel(parseDay(c.season + '-01'));
            return (
              <m.li key={c.season} {...stagger(Math.min(i, 10))}>
                <button
                  type="button"
                  onClick={() => onPick(c.season)}
                  className="press glass relative flex min-h-[8.5rem] w-full flex-col items-center gap-1.5 px-2 py-3 text-center"
                >
                  {w && <Edge />}
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

/** The screens that grew out of awards, as plain links: they open somewhere else, so they don't pose as tabs. */
function Explore({ links: more }: { links: ExploreLink[] }) {
  const { me, openAchievements, openActivity } = useProgressionEnv();
  const links: ExploreLink[] = [
    {
      key: 'ach',
      ic: icon('trophy'),
      title: aw.exploreAch,
      sub: me ? aw.exploreAchMine : aw.exploreAchAll,
      go: () => openAchievements(me ?? undefined),
    },
    ...more,
    ...(openActivity
      ? [
          {
            key: 'activity',
            ic: icon('news'),
            title: t.hub.nav.activity,
            sub: aw.exploreActivity,
            go: openActivity,
          },
        ]
      : []),
  ];
  return (
    <Section title={aw.explore} className="mt-8">
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
              className="grid h-6 w-6 shrink-0 place-items-center text-[var(--accent-tx)]"
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
