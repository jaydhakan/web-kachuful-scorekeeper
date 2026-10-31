import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ACH,
  dailyAwards,
  dayOf,
  monthOf,
  playedMonths,
  season,
  type Award,
  type Facts,
} from '@/domain';
import { dayLabel, monthLabel, parseDay } from '@/lib/dates';
import { fmt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { Chip, ChipRow, EmptyState, Page, Section } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icons';
import { IconButton } from '@/components/ui/IconButton';
import { pct } from '@/components/ui/Stats';
import { SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { BoardList } from './BoardsPage';
import { achName } from '@/strings/achievements';
import { t } from '@/strings';

const aw = t.hub.awards;

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
    <motion.li {...stagger(i)}>
      <button
        type="button"
        onClick={() => actions.open({ screen: 'player', params: { id: a.playerId } })}
        className="glass flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left"
      >
        <span aria-hidden className="text-30">
          {ACH.get(a.code)?.emoji}
        </span>
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
    </motion.li>
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
  const { actions } = useApp();
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
  const [month, setMonth] = useState(thisMonth);
  const today = dayOf(Date.now());
  const d = src.daily(day);
  const s = tab === 'season' ? src.season(month) : null;
  const year = new Date().getFullYear();
  return (
    <Page
      title={aw.title}
      sub={
        <ChipRow label={aw.tabs}>
          <Chip on={tab === 'day'} onClick={() => setTab('day')}>
            ⭐ {aw.today}
          </Chip>
          <Chip on={tab === 'season'} onClick={() => setTab('season')}>
            👑 {aw.season}
          </Chip>
          <Chip onClick={() => actions.open({ screen: 'wrapped', params: { year: String(year) } })}>
            🎁 {aw.wrapped(year)}
          </Chip>
        </ChipRow>
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
          {d === 'loading' ? null : d.awards.length ? (
            <ul className="flex flex-col gap-2" key={day}>
              {d.awards.map((a, i) => (
                <AwardCard key={a.code + a.playerId} a={a} f={src.facts} i={i} />
              ))}
            </ul>
          ) : (
            <EmptyState icon="🌙" title={aw.noneTitle} body={aw.noneBody} />
          )}
        </>
      ) : (
        <>
          <ChipRow label={aw.season}>
            {[...new Set([thisMonth, ...src.months])].slice(0, 12).map((m) => (
              <Chip key={m} on={m === month} onClick={() => setMonth(m)}>
                {monthLabel(parseDay(m + '-01'))}
              </Chip>
            ))}
          </ChipRow>
          {s && s !== 'loading' && (
            <div className="mt-4">
              {month === thisMonth && <p className="mb-3 text-13 text-[var(--tx2)]">{aw.live}</p>}
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
                  <EmptyState icon="📅" title={aw.noSeason} />
                )}
              </Section>
            </div>
          )}
        </>
      )}
    </Page>
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
            {k === 0 && <span className="text-28">👑</span>}
            <span
              className="grid h-12 w-12 place-items-center rounded-full text-26"
              style={{ background: w.color }}
            >
              {w.emoji}
            </span>
            <span className="text-14 font-bold [overflow-wrap:anywhere]">{w.name}</span>
            <motion.span
              initial={rm ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...SPRING_POP, delay: 0.15 * (2 - k) }}
              className={`w-full origin-bottom rounded-t-xl bg-white/[.08] ${['h-20', 'h-14', 'h-10'][k]}`}
            />
          </div>
        );
      })}
    </div>
  );
}
