import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { cardsOf, GROUPS } from '@/progression/cards';
import { byCode } from '@/progression/catalogue';
import type { AchievementDef, Earned, Ladder } from '@/progression/types';
import { dayLabel } from '@/lib/dates';
import { Chip, ChipRow, PageFrame, Section } from '@/components/ui/PageParts';
import { Progress, ProgressRing } from '@/components/ui/Stats';
import { Medal, STAMP_LANDS } from '@/components/ui/Medal';
import { Edge } from '@/components/ui/Edge';
import { stagger } from '@/components/ui/stagger';
import { Icon } from '@/components/ui/Icons';
import { PlayerTag } from '@/components/ui/PlayerTag';
import { RemotePending } from '@/components/RemoteGate';
import { loadAchSeen, saveAchSeen } from '@/state/persistence';
import type { Remote } from '@/sync/useRemote';
import { t } from '@/strings';
import { progression as ps } from '@/strings/progression';
import { useProgressionEnv } from './env';

const a = t.hub.ach;
// New medals stamp one after another; past the fifth they land together, so a big haul doesn't keep anyone waiting.
const STAMP_GAP = 0.12;
const STAMP_CAP = 5;

/**
 * A game's whole catalogue: earned ones lit with when and how often, locked ones saying how to earn them. `all` is
 * everyone's (null until there is something to show, with `remote` saying why); `mine` is the shown player's.
 */
export function AchievementsView({
  all,
  remote,
  mine,
  who,
  onWho,
  counts,
}: {
  all: Earned[] | null;
  remote?: Remote<unknown>;
  mine: Earned[];
  who: string | null;
  onWho: (id: string | null) => void;
  /** The shown player's ladder counts; a count left out shows its levels without a bar. */
  counts: Record<string, number> | null;
}) {
  const { prog, person, onBack } = useProgressionEnv();
  const list = useMemo(() => all ?? [], [all]);
  const players = useMemo(() => [...new Set(list.map((e) => e.playerId))], [list]);
  const by = new Map<string, Earned[]>();
  for (const e of mine) by.set(e.code, [...(by.get(e.code) ?? []), e]);
  // When this screen was last opened for each player, read once per visit: what came after it is "new".
  const seen = useRef(new Map<string, number | null>());
  if (who && !seen.current.has(who)) seen.current.set(who, loadAchSeen(who, prog.id));
  const since = who ? seen.current.get(who) : null;
  const fresh = new Set(
    since == null ? [] : mine.filter((e) => e.earnedAt > since).map((e) => e.code),
  );
  useEffect(() => {
    if (who) saveAchSeen(who, Date.now(), prog.id);
  }, [who, prog.id]);
  // Who holds each code, for rarity.
  const holders = useMemo(() => {
    const h = new Map<string, Set<string>>();
    for (const e of list) h.set(e.code, (h.get(e.code) ?? new Set()).add(e.playerId));
    return h;
  }, [list]);
  const rarity = (code: string) =>
    who && players.length > 1 ? { n: holders.get(code)?.size ?? 0, of: players.length } : null;
  // Each new tile's place among the new ones, in reading order: the stagger of their stamps.
  let newest = 0;
  const turn = (isFresh: boolean) => (isFresh ? newest++ : -1);
  return (
    <PageFrame
      onBack={onBack}
      wide
      title={who ? `${a.title} · ${person(who).name}` : a.title}
      sub={
        players.length > 0 && (
          <ChipRow label={a.filter}>
            <Chip on={!who} onClick={() => onWho(null)}>
              {a.everyone}
            </Chip>
            {players.slice(0, 16).map((p) => (
              <Chip key={p} on={who === p} onClick={() => onWho(p)}>
                <PlayerTag p={person(p)} name={person(p).name} />
              </Chip>
            ))}
          </ChipRow>
        )
      }
    >
      {all == null && remote ? (
        <RemotePending r={remote} />
      ) : (
        <>
          <Summary have={new Set(by.keys())} everyone={!who} />
          {GROUPS.map((g) => {
            const cards = cardsOf(prog.catalogue, prog.ladders, g);
            return (
              cards.length > 0 && (
                <Section key={g} title={prog.strings.groups[g]}>
                  <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 land:grid-cols-3 wide:grid-cols-4 [[data-desk]_&]:grid-cols-4">
                    {cards.map((c, i) =>
                      c.l ? (
                        <LadderCard
                          key={c.l.id}
                          l={c.l}
                          i={i}
                          by={by}
                          count={counts?.[c.l.id]}
                          everyone={!who}
                          fresh={turn(c.l.codes.some((x) => fresh.has(x)))}
                          rarity={rarity}
                        />
                      ) : (
                        <Card
                          key={c.x.code}
                          x={c.x}
                          i={i}
                          got={by.get(c.x.code) ?? []}
                          everyone={!who}
                          fresh={turn(fresh.has(c.x.code))}
                          rare={rarity(c.x.code)}
                        />
                      ),
                    )}
                  </ul>
                </Section>
              )
            );
          })}
        </>
      )}
    </PageFrame>
  );
}

/** How much of the catalogue is unlocked, overall and by group; each code counts once. */
function Summary({ have, everyone }: { have: Set<string>; everyone: boolean }) {
  const { prog } = useProgressionEnv();
  const total = prog.catalogue.length;
  const n = have.size;
  const share = total ? n / total : 0;
  return (
    <section
      aria-label={a.summary}
      className="glass mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-8"
    >
      <div className="flex items-center gap-4">
        <ProgressRing share={share} />
        <p className="flex flex-col">
          <span className="disp text-28 font-extrabold leading-none">
            {n} <span className="text-[var(--tx2)]">/ {total}</span>
          </span>
          <span className="mt-1 text-14 text-[var(--tx2)]">
            {everyone ? a.unlockedBySomeone : a.unlocked(Math.round(share * 100))}
          </span>
        </p>
      </div>
      <ul className="grid flex-1 gap-2">
        {GROUPS.map((g) => {
          const codes = prog.catalogue.filter((x) => x.group === g);
          if (!codes.length) return null;
          const got = codes.filter((x) => have.has(x.code)).length;
          const name = prog.strings.groups[g];
          return (
            <li
              key={g}
              aria-label={a.groupCount(name, got, codes.length)}
              className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-13"
            >
              <span aria-hidden className="font-bold text-[var(--tx2)]">
                {name}
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
  /** Its place among the tiles earned since the last visit, or -1 when it isn't one. */
  fresh: number;
  title: ReactNode;
  beside?: ReactNode;
  children: ReactNode;
}) {
  const rm = useReducedMotion();
  const isNew = fresh >= 0;
  // After the tile itself has come up.
  const wait = 0.35 + Math.min(fresh, STAMP_CAP) * STAMP_GAP;
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
        {/* A medal earned since the last visit turns over and stamps into place, then light crosses it once. */}
        <Medal emoji={emoji} won={earned} shine={isNew} stamp={isNew} delay={wait} />
        {beside}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-15 font-bold leading-tight">
        {title}
        {isNew && (
          <m.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: rm ? 0 : wait + STAMP_LANDS }}
            className="rounded-full bg-gold px-1.5 text-13 leading-5 text-ink-gold"
          >
            {a.fresh}
          </m.span>
        )}
      </span>
      {children}
    </m.li>
  );
}

const lastOf = (got: Earned[]) => got.reduce((m, e) => Math.max(m, e.earnedAt), 0);

type Rarity = { n: number; of: number } | null;

function Footer({ got, everyone, rare }: { got: Earned[]; everyone: boolean; rare?: Rarity }) {
  const { person } = useProgressionEnv();
  const holders = [...new Set(got.map((e) => person(e.playerId).name))];
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
        className={`mt-auto pt-1 text-13 ${got.length ? 'font-bold text-[var(--accent-tx)]' : 'text-[var(--tx2)]'}`}
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

/** A "shame" achievement's name carries a small 🙃: funny, never mean. */
const Named = ({ x, name }: { x: AchievementDef; name: string }) => (
  <>
    {name}
    {x.shame && (
      <span role="img" aria-label={ps.shame} className="text-13">
        🙃
      </span>
    )}
  </>
);

function Card({
  x,
  i,
  got,
  everyone,
  fresh,
  rare,
}: {
  x: AchievementDef;
  i: number;
  got: Earned[];
  everyone: boolean;
  fresh: number;
  rare: Rarity;
}) {
  const { prog } = useProgressionEnv();
  const s = prog.strings.achievements[x.code];
  return (
    <Shell
      i={i}
      earned={got.length > 0}
      emoji={x.emoji}
      fresh={fresh}
      title={<Named x={x} name={s.name} />}
      beside={
        got.length > 1 && (
          <span className="disp text-17 font-extrabold text-[var(--accent-tx)]">×{got.length}</span>
        )
      }
    >
      <span className="text-13 leading-snug text-[var(--tx2)]">{s.how}</span>
      <Footer got={got} everyone={everyone} rare={rare} />
    </Shell>
  );
}

/** Levels of one count as one card: a pip per level, and the way to the next one when the count is known. */
function LadderCard({
  l,
  i,
  by,
  count,
  everyone,
  fresh,
  rarity,
}: {
  l: Ladder;
  i: number;
  by: Map<string, Earned[]>;
  count?: number;
  everyone: boolean;
  fresh: number;
  rarity: (code: string) => Rarity;
}) {
  const { prog } = useProgressionEnv();
  const names = prog.strings.achievements;
  const reached = l.codes.map((c) => (by.get(c)?.length ?? 0) > 0);
  const top = reached.lastIndexOf(true);
  const next = top + 1 < l.codes.length ? top + 1 : -1;
  const s = prog.strings.ladders[l.id];
  // The footer speaks for the highest level reached: when it was last earned, and by whom.
  const got = top >= 0 ? (by.get(l.codes[top]) ?? []) : [];
  return (
    <Shell
      i={i}
      earned={top >= 0}
      emoji={byCode(prog).get(l.codes[Math.max(top, 0)])!.emoji}
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
      <Footer got={got} everyone={everyone} rare={top >= 0 ? rarity(l.codes[top]) : null} />
    </Shell>
  );
}
