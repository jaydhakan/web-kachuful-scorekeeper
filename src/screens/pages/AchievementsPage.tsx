import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ACHIEVEMENTS,
  allAchievements,
  type AchievementGroup,
  type Earned,
  type Facts,
} from '@/domain';
import { dayLabel } from '@/lib/dates';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { Chip, ChipRow, Page, Section } from '@/components/ui/Page';
import { stagger } from '@/components/ui/stagger';
import { achievements as names } from '@/strings/achievements';
import { t } from '@/strings';

const a = t.hub.ach;
const GROUPS: AchievementGroup[] = ['round', 'game', 'career', 'daily', 'season'];

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
  const all = useMemo(() => [...allAchievements(f), ...extra], [f, extra]);
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
      {GROUPS.map((g) => (
        <Section key={g} title={a.groups[g]}>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 land:grid-cols-3 wide:grid-cols-4 [[data-desk]_&]:grid-cols-4">
            {ACHIEVEMENTS.filter((x) => x.group === g).map((x, i) => {
              const got = by.get(x.code) ?? [];
              const last = got.reduce((m, e) => Math.max(m, e.earnedAt), 0);
              const holders = [...new Set(got.map((e) => whoIs(f, e.playerId).name))];
              return (
                <motion.li
                  key={x.code}
                  {...stagger(Math.min(i, 10))}
                  className={`glass flex min-h-[7.5rem] flex-col gap-1 p-3 ${got.length ? '' : 'opacity-70'}`}
                >
                  <span
                    aria-hidden
                    className={`text-32 leading-none ${got.length ? '' : 'grayscale'}`}
                  >
                    {got.length ? x.emoji : '🔒'}
                  </span>
                  <span className="text-15 font-bold leading-tight">{names[x.code].name}</span>
                  <span className="text-13 leading-snug text-[var(--tx2)]">
                    {names[x.code].how}
                  </span>
                  <span className="mt-auto text-13 font-bold text-[var(--accent)]">
                    {got.length ? a.earned(got.length, dayLabel(last)) : a.locked}
                  </span>
                  {!who && holders.length > 0 && (
                    <span className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
                      {a.by(holders.slice(0, 3).join(', ') + (holders.length > 3 ? '…' : ''))}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </Section>
      ))}
    </Page>
  );
}
