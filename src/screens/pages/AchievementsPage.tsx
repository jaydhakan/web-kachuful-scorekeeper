import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ACHIEVEMENTS,
  allAchievements,
  type AchievementDef,
  type AchievementGroup,
  type Earned,
  type Facts,
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
            {ACHIEVEMENTS.filter((x) => x.group === g).map((x, i) => (
              <Card key={x.code} x={x} i={i} got={by.get(x.code) ?? []} f={f} everyone={!who} />
            ))}
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
  const earned = got.length > 0;
  const last = got.reduce((m, e) => Math.max(m, e.earnedAt), 0);
  const holders = [...new Set(got.map((e) => whoIs(f, e.playerId).name))];
  const name = names[x.code].name;
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
          {earned ? x.emoji : icon('locked', 'h-5 w-5 text-[var(--dis)]')}
        </span>
        {got.length > 1 && (
          <span className="disp text-17 font-extrabold text-[var(--accent)]">×{got.length}</span>
        )}
      </span>
      <span className="mt-1 text-15 font-bold leading-tight">{name}</span>
      <span className="text-13 leading-snug text-[var(--tx2)]">{names[x.code].how}</span>
      <span
        className={`mt-auto pt-1 text-13 ${earned ? 'font-bold text-[var(--accent)]' : 'text-[var(--tx2)]'}`}
      >
        {earned ? a.earned(dayLabel(last)) : a.locked}
      </span>
      {everyone && holders.length > 0 && (
        <span className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
          {a.by(holders.slice(0, 3).join(', ') + (holders.length > 3 ? '…' : ''))}
        </span>
      )}
    </m.li>
  );
}
