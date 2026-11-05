import { m } from 'framer-motion';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ACH,
  ACHIEVEMENTS,
  allAchievements,
  LADDER_OF,
  ladderCounts,
  type AchievementDef,
  type AchievementGroup,
  type Earned,
  type Facts,
  type Ladder,
  type LadderId,
} from '@/domain';
import { dayLabel } from '@/lib/dates';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { Chip, ChipRow, Page, Section } from '@/components/ui/Page';
import { Progress } from '@/components/ui/Stats';
import { stagger } from '@/components/ui/stagger';
import { achievements as names } from '@/strings/achievements';
import { useApp } from '@/state/store';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { t } from '@/strings';
import { Icon } from '@/components/ui/Icons';
import { icon } from '@/components/ui/IconsMore';

const a = t.hub.ach;
const GROUPS: AchievementGroup[] = ['round', 'game', 'career', 'daily', 'season'];
const TOTAL = ACHIEVEMENTS.length;
type Counts = Partial<Record<LadderId, number>>;

type Item = { x: AchievementDef; l?: never } | { l: Ladder; x?: never };
/** A group's cards: each ladder of levels takes the place of its first level. */
const cardsOf = (g: AchievementGroup) =>
  ACHIEVEMENTS.filter((x) => x.group === g).flatMap((x): Item[] => {
    const l = LADDER_OF.get(x.code);
    return !l ? [{ x }] : l.codes[0] === x.code ? [{ l }] : [];
  });

/** The whole catalogue: earned ones lit with when and how often, locked ones saying how to earn them. */
export function AchievementsPage({
  id,
  facts,
  extra = [],
}: {
  id?: string;
  facts?: Facts;
  extra?: Earned[];
}) {
  const device = useDeviceFacts();
  const f = facts ?? device;
  const [who, setWho] = useState<string | null>(id ?? null);
  const signedIn = !!useApp().state.session;
  const remote = useRemote(signedIn ? 'ach:all' : null, () => ep.achievements(undefined));
  const all = useMemo(
    () => remote.data?.items ?? [...allAchievements(f), ...extra],
    [f, extra, remote.data],
  );
  const players = useMemo(() => [...new Set(all.map((e) => e.playerId))], [all]);
  const mine = who ? all.filter((e) => e.playerId === who) : all;
  const by = new Map<string, Earned[]>();
  for (const e of mine) by.set(e.code, [...(by.get(e.code) ?? []), e]);
  // Signed in, the device holds only some games, so counts come from the server's totals; the ones it has no
  // total for (crew, points gained, winning run) show their levels without a bar rather than a wrong number.
  const profile = useRemote(signedIn && who ? `p:${who}` : null, (o) => ep.player(who!, o));
  const local = useMemo(() => (who && !signedIn ? ladderCounts(f, who) : null), [f, who, signedIn]);
  const tot = profile.data?.totals;
  const counts: Counts | null = !who
    ? null
    : signedIn
      ? tot
        ? {
            games: tot.gamesEnded,
            rounds: tot.rounds,
            made: tot.made,
            hot: tot.longestHot,
            cold: tot.longestCold,
          }
        : {}
      : local;
  return (
    <Page
      wide
      title={who ? `${a.title} · ${whoIs(f, who).name}` : a.title}
      sub={
        players.length > 0 && (
          <ChipRow label={a.filter}>
            <Chip on={!who} onClick={() => setWho(null)}>
              {a.everyone}
            </Chip>
            {players.slice(0, 16).map((p) => (
              <Chip key={p} on={who === p} onClick={() => setWho(p)}>
                {whoIs(f, p).emoji} {whoIs(f, p).name}
              </Chip>
            ))}
          </ChipRow>
        )
      }
    >
      <Summary have={new Set(by.keys())} everyone={!who} />
      {GROUPS.map((g) => (
        <Section key={g} title={a.groups[g]}>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 land:grid-cols-3 wide:grid-cols-4 [[data-desk]_&]:grid-cols-4">
            {cardsOf(g).map((c, i) =>
              c.l ? (
                <LadderCard
                  key={c.l.id}
                  l={c.l}
                  i={i}
                  by={by}
                  f={f}
                  count={counts?.[c.l.id]}
                  everyone={!who}
                />
              ) : (
                <Card
                  key={c.x.code}
                  x={c.x}
                  i={i}
                  got={by.get(c.x.code) ?? []}
                  f={f}
                  everyone={!who}
                />
              ),
            )}
          </ul>
        </Section>
      ))}
    </Page>
  );
}

/** How much of the catalogue is unlocked, overall and by group; each code counts once. */
function Summary({ have, everyone }: { have: Set<string>; everyone: boolean }) {
  const n = have.size;
  const share = n / TOTAL;
  const R = 26,
    C = 2 * Math.PI * R;
  return (
    <section
      aria-label={a.summary}
      className="glass mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-8"
    >
      <div className="flex items-center gap-4">
        <svg aria-hidden viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-ov/[.1]" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${C * share} ${C}`}
            className="stroke-gold"
          />
        </svg>
        <p className="flex flex-col">
          <span className="disp text-28 font-extrabold leading-none">
            {n} <span className="text-[var(--tx2)]">/ {TOTAL}</span>
          </span>
          <span className="mt-1 text-14 text-[var(--tx2)]">
            {everyone ? a.unlockedBySomeone : a.unlocked(Math.round(share * 100))}
          </span>
        </p>
      </div>
      <ul className="grid flex-1 gap-2">
        {GROUPS.map((g) => {
          const codes = ACHIEVEMENTS.filter((x) => x.group === g);
          const got = codes.filter((x) => have.has(x.code)).length;
          return (
            <li
              key={g}
              aria-label={a.groupCount(a.groups[g], got, codes.length)}
              className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-13"
            >
              <span aria-hidden className="font-bold text-[var(--tx2)]">
                {a.groups[g]}
              </span>
              <Progress v={got} of={codes.length} fill="bg-gold" />
              <span aria-hidden className="min-w-[3.5ch] text-right tabular-nums text-[var(--tx2)]">
                {got}/{codes.length}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The card every achievement sits in: gold outline, ✓ badge and a lit medallion once earned. */
function Shell({
  i,
  earned,
  emoji,
  beside,
  children,
}: {
  i: number;
  earned: boolean;
  emoji: string;
  beside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <m.li
      {...stagger(Math.min(i, 10))}
      className="glass relative flex min-h-[7.5rem] flex-col gap-1 p-3"
    >
      {/* Its own layer: each theme's .glass sets the card's box-shadow. */}
      {earned && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1.5px_var(--gold)]"
        />
      )}
      {earned && (
        <span
          aria-hidden
          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-success text-[var(--on-success)] [&_svg]:h-4 [&_svg]:w-4"
        >
          {Icon.check}
        </span>
      )}
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-28 leading-none ${
            earned
              ? 'bg-gold/[.16] shadow-[0_0_0_1.5px_var(--gold),0_0_18px_color-mix(in_srgb,var(--medal-gold)_45%,transparent)]'
              : 'border border-dashed border-ov/25'
          }`}
        >
          {earned ? emoji : icon('locked', 'h-5 w-5 text-[var(--dis)]')}
        </span>
        {beside}
      </span>
      {children}
    </m.li>
  );
}

const lastOf = (got: Earned[]) => got.reduce((m, e) => Math.max(m, e.earnedAt), 0);

function Footer({ got, f, everyone }: { got: Earned[]; f: Facts; everyone: boolean }) {
  const holders = [...new Set(got.map((e) => whoIs(f, e.playerId).name))];
  return (
    <>
      <span
        className={`mt-auto pt-1 text-13 ${got.length ? 'font-bold text-[var(--accent)]' : 'text-[var(--tx2)]'}`}
      >
        {got.length ? a.earned(dayLabel(lastOf(got))) : a.locked}
      </span>
      {everyone && holders.length > 0 && (
        <span className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
          {a.by(holders.slice(0, 3).join(', ') + (holders.length > 3 ? '…' : ''))}
        </span>
      )}
    </>
  );
}

function Card({
  x,
  i,
  got,
  f,
  everyone,
}: {
  x: AchievementDef;
  i: number;
  got: Earned[];
  f: Facts;
  everyone: boolean;
}) {
  return (
    <Shell
      i={i}
      earned={got.length > 0}
      emoji={x.emoji}
      beside={
        got.length > 1 && (
          <span className="disp text-17 font-extrabold text-[var(--accent)]">×{got.length}</span>
        )
      }
    >
      <span className="mt-1 text-15 font-bold leading-tight">{names[x.code].name}</span>
      <span className="text-13 leading-snug text-[var(--tx2)]">{names[x.code].how}</span>
      <Footer got={got} f={f} everyone={everyone} />
    </Shell>
  );
}

/** Levels of one count as one card: a pip per level, and the way to the next one when the count is known. */
function LadderCard({
  l,
  i,
  by,
  f,
  count,
  everyone,
}: {
  l: Ladder;
  i: number;
  by: Map<string, Earned[]>;
  f: Facts;
  count?: number;
  everyone: boolean;
}) {
  const reached = l.codes.map((c) => (by.get(c)?.length ?? 0) > 0);
  const top = reached.lastIndexOf(true);
  const next = top + 1 < l.codes.length ? top + 1 : -1;
  const s = a.ladders[l.id];
  // The footer speaks for the highest level reached: when it was last earned, and by whom.
  const got = top >= 0 ? (by.get(l.codes[top]) ?? []) : [];
  return (
    <Shell
      i={i}
      earned={top >= 0}
      emoji={ACH.get(l.codes[Math.max(top, 0)])!.emoji}
      beside={
        <span
          role="img"
          aria-label={a.levels(reached.filter(Boolean).length, l.codes.length)}
          className="flex gap-1"
        >
          {reached.map((r, k) => (
            <span
              key={k}
              className={`h-2 w-2 rounded-full ${r ? 'bg-gold' : 'border border-ov/30'}`}
            />
          ))}
        </span>
      }
    >
      <span className="mt-1 text-15 font-bold leading-tight">{s.name}</span>
      <span className="text-13 leading-snug text-[var(--tx2)]">
        {next < 0 ? a.allLevels : a.next(names[l.codes[next]].name, names[l.codes[next]].how)}
      </span>
      {next >= 0 && count != null && (
        <span className="mt-1 flex flex-col gap-1 text-13 text-[var(--tx2)]">
          <Progress v={count} of={l.steps[next]} fill="bg-gold" />
          <span className="tabular-nums">
            {s.count} {Math.min(count, l.steps[next])} / {l.steps[next]}
          </span>
        </span>
      )}
      <Footer got={got} f={f} everyone={everyone} />
    </Shell>
  );
}
