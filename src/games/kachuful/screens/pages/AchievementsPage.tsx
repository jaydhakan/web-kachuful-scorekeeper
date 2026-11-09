import { m } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ACH,
  ACHIEVEMENTS,
  allAchievements,
  LADDER_OF,
  type AchievementDef,
  type AchievementGroup,
  type Earned,
  type Facts,
  type Ladder,
} from '@/games/kachuful/domain';
import { dayLabel } from '@/lib/dates';
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { Chip, ChipRow, Page, Section } from '@/components/ui/Page';
import { Progress, ProgressRing } from '@/components/ui/Stats';
import { Medal } from '@/components/ui/Medal';
import { Edge } from '@/components/ui/Edge';
import { stagger } from '@/components/ui/stagger';
import { achievements as names } from '@/games/kachuful/strings/achievements';
import { useApp } from '@/games/kachuful/state/store';
import { loadAchSeen, saveAchSeen } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { useLadderCounts } from '@/games/kachuful/components/useLadderCounts';
import { t } from '@/strings';
import { Icon } from '@/components/ui/Icons';
import { PlayerTag } from '@/components/ui/PlayerTag';

const a = t.hub.ach;
const GROUPS: AchievementGroup[] = ['round', 'game', 'career', 'daily', 'season'];
const TOTAL = ACHIEVEMENTS.length;

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
  // Every page: one made-3-in-a-row is one achievement, so a busy month passes the server's 200 per page.
  const remote = useRemote(signedIn ? 'ach:all' : null, async () => {
    const items: Earned[] = [];
    let cursor: string | null = null;
    do {
      const page = await ep.achievements(undefined, cursor);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return { items, nextCursor: null };
  });
  const all = useMemo(
    () => remote.data?.items ?? [...allAchievements(f), ...extra],
    [f, extra, remote.data],
  );
  const players = useMemo(() => [...new Set(all.map((e) => e.playerId))], [all]);
  // Unknown counts (crew, points gained, winning run when signed in) show their levels without a bar.
  const { counts, profile } = useLadderCounts(who, f);
  const mine = !who ? all : (profile.data?.achievements ?? all.filter((e) => e.playerId === who));
  const by = new Map<string, Earned[]>();
  for (const e of mine) by.set(e.code, [...(by.get(e.code) ?? []), e]);
  // When this screen was last opened for each player, read once per visit: what came after it is "new".
  const seen = useRef(new Map<string, number | null>());
  if (who && !seen.current.has(who)) seen.current.set(who, loadAchSeen(who));
  const since = who ? seen.current.get(who) : null;
  const fresh = new Set(
    since == null ? [] : mine.filter((e) => e.earnedAt > since).map((e) => e.code),
  );
  useEffect(() => {
    if (who) saveAchSeen(who, Date.now());
  }, [who]);
  // Who holds each code, for rarity.
  const holders = useMemo(() => {
    const h = new Map<string, Set<string>>();
    for (const e of all) h.set(e.code, (h.get(e.code) ?? new Set()).add(e.playerId));
    return h;
  }, [all]);
  const rarity = (code: string) =>
    who && players.length > 1 ? { n: holders.get(code)?.size ?? 0, of: players.length } : null;
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
                <PlayerTag p={whoIs(f, p)} name={whoIs(f, p).name} />
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
                  fresh={c.l.codes.some((x) => fresh.has(x))}
                  rarity={rarity}
                />
              ) : (
                <Card
                  key={c.x.code}
                  x={c.x}
                  i={i}
                  got={by.get(c.x.code) ?? []}
                  f={f}
                  everyone={!who}
                  fresh={fresh.has(c.x.code)}
                  rare={rarity(c.x.code)}
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
  return (
    <section
      aria-label={a.summary}
      className="glass mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-8"
    >
      <div className="flex items-center gap-4">
        <ProgressRing share={share} />
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
  fresh,
  title,
  beside,
  children,
}: {
  i: number;
  earned: boolean;
  emoji: string;
  fresh: boolean;
  title: string;
  beside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <m.li
      {...stagger(Math.min(i, 10))}
      className="glass relative flex min-h-[7.5rem] flex-col gap-1 p-3"
    >
      {earned && <Edge />}
      {earned && (
        <span
          aria-hidden
          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-success text-[var(--on-success)] [&_svg]:h-4 [&_svg]:w-4"
        >
          {Icon.check}
        </span>
      )}
      <span className="flex items-center gap-2">
        {/* One pass of light across a medal earned since the last visit. */}
        <Medal emoji={emoji} won={earned} shine={fresh} delay={0.35 + Math.min(i, 10) * 0.04} />
        {beside}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-15 font-bold leading-tight">
        {title}
        {fresh && (
          <span className="rounded-full bg-gold px-1.5 text-13 leading-5 text-ink-gold">
            {a.fresh}
          </span>
        )}
      </span>
      {children}
    </m.li>
  );
}

const lastOf = (got: Earned[]) => got.reduce((m, e) => Math.max(m, e.earnedAt), 0);

type Rarity = { n: number; of: number } | null;

function Footer({
  got,
  f,
  everyone,
  rare,
}: {
  got: Earned[];
  f: Facts;
  everyone: boolean;
  rare?: Rarity;
}) {
  const holders = [...new Set(got.map((e) => whoIs(f, e.playerId).name))];
  return (
    <>
      {got.length > 0 && rare && rare.n > 0 && (
        <span className="flex items-center gap-1.5 pt-1 text-13 text-[var(--tx2)]">
          {rare.of >= 4 && rare.n / rare.of <= 0.25 && (
            <span className="rounded-full bg-gold px-1.5 font-bold leading-5 text-ink-gold">
              {a.rare}
            </span>
          )}
          {a.holders(rare.n, rare.of)}
        </span>
      )}
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
  fresh,
  rare,
}: {
  x: AchievementDef;
  i: number;
  got: Earned[];
  f: Facts;
  everyone: boolean;
  fresh: boolean;
  rare: Rarity;
}) {
  return (
    <Shell
      i={i}
      earned={got.length > 0}
      emoji={x.emoji}
      fresh={fresh}
      title={names[x.code].name}
      beside={
        got.length > 1 && (
          <span className="disp text-17 font-extrabold text-[var(--accent)]">×{got.length}</span>
        )
      }
    >
      <span className="text-13 leading-snug text-[var(--tx2)]">{names[x.code].how}</span>
      <Footer got={got} f={f} everyone={everyone} rare={rare} />
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
  fresh,
  rarity,
}: {
  l: Ladder;
  i: number;
  by: Map<string, Earned[]>;
  f: Facts;
  count?: number;
  everyone: boolean;
  fresh: boolean;
  rarity: (code: string) => Rarity;
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
      fresh={fresh}
      title={s.name}
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
      <Footer got={got} f={f} everyone={everyone} rare={top >= 0 ? rarity(l.codes[top]) : null} />
    </Shell>
  );
}
