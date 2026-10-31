import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState, type ReactNode } from 'react';
import { wrapped, type Facts, type Wrapped } from '@/domain';
import { monthLabel, parseDay, shortDay } from '@/lib/dates';
import { fmt, sgnN } from '@/lib/format';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { Chip, ChipRow, EmptyState, Page } from '@/components/ui/Page';
import { Counter } from '@/components/ui/Counter';
import { pct } from '@/components/ui/Stats';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { EASE } from '@/components/ui/motion';
import { TR } from '@/theme/trumps';
import { useApp } from '@/state/store';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { t } from '@/strings';

const wr = t.hub.wrapped;

interface Slide {
  kicker: string;
  big: ReactNode;
  sub?: ReactNode;
  emoji: string;
}

function slidesOf(w: Wrapped, f: Facts | null): Slide[] {
  const out: Slide[] = [
    {
      kicker: wr.slides.totals(w.totals.rounds),
      big: <Counter from={0} to={w.totals.points} run />,
      sub: wr.slides.points(fmt(w.totals.points)),
      emoji: '🃏',
    },
  ];
  if (w.bestMonth)
    out.push({
      kicker: wr.slides.bestMonth,
      big: monthLabel(parseDay(w.bestMonth.month + '-01')),
      sub: sgnN(w.bestMonth.points),
      emoji: '📅',
    });
  if (w.bestDay)
    out.push({
      kicker: wr.slides.bestDay,
      big: shortDay(parseDay(w.bestDay.day)),
      sub: sgnN(w.bestDay.points),
      emoji: '☀️',
    });
  if (w.favouriteTrump)
    out.push({
      kicker: wr.slides.trump,
      big: (
        <>
          <SuitGlyph trump={w.favouriteTrump.trump} /> {TR[w.favouriteTrump.trump].name}
        </>
      ),
      sub: pct(w.favouriteTrump.accuracy),
      emoji: '🍀',
    });
  if (w.nemesis)
    out.push({
      kicker: wr.slides.nemesis,
      big: whoIs(f, w.nemesis.playerId).name,
      sub: `${w.nemesis.losses}×`,
      emoji: whoIs(f, w.nemesis.playerId).emoji,
    });
  if (w.partner)
    out.push({
      kicker: wr.slides.partner,
      big: whoIs(f, w.partner.playerId).name,
      sub: t.hub.player.games_(w.partner.games),
      emoji: whoIs(f, w.partner.playerId).emoji,
    });
  if (w.biggestRound)
    out.push({ kicker: wr.slides.biggest, big: sgnN(w.biggestRound.points), emoji: '💥' });
  out.push({ kicker: wr.slides.run, big: <Counter from={0} to={w.longestRun} run />, emoji: '🔥' });
  out.push({
    kicker: wr.slides.achievements,
    big: <Counter from={0} to={w.achievements} run />,
    emoji: '🏅',
  });
  out.push({
    kicker: wr.slides.rank,
    big: w.rank.rank ? `#${w.rank.rank}` : '–',
    sub: w.rank.rank ? `/ ${w.rank.outOf}` : wr.slides.unranked,
    emoji: '🏆',
  });
  return out;
}

export function WrappedPage({
  year,
  playerId,
  data,
  facts,
}: {
  year: number;
  playerId?: string;
  data?: Wrapped;
  facts?: Facts;
}) {
  const device = useDeviceFacts();
  const f = facts ?? device;
  const ids = useMemo(() => [...new Set(f.rounds.map((r) => r.playerId))], [f]);
  const session = useApp().state.session;
  const [who, setWho] = useState(playerId ?? session?.player?.id ?? ids[0] ?? null);
  const remote = useRemote(session && who ? `wr:${year}:${who}` : null, (o) =>
    ep.wrapped(year, who!, o),
  );
  const w = useMemo(
    () =>
      data ?? (remote.data as Wrapped | null) ?? (who && !session ? wrapped(f, who, year) : null),
    [data, f, who, year, remote.data, session],
  );
  const slides = w && w.totals.rounds ? slidesOf(w, f) : [];
  const [i, setI] = useState(0);
  const rm = useReducedMotion();
  const go = (d: number) => setI((k) => Math.max(0, Math.min(slides.length - 1, k + d)));
  const s = slides[i];
  return (
    <Page
      title={wr.title(year)}
      sub={
        !data &&
        ids.length > 1 && (
          <ChipRow label={t.hub.awards.pickPlayer}>
            {ids.map((id) => (
              <Chip key={id} on={who === id} onClick={() => (setWho(id), setI(0))}>
                {whoIs(f, id).emoji} {whoIs(f, id).name}
              </Chip>
            ))}
          </ChipRow>
        )
      }
    >
      {!s ? (
        <EmptyState icon="🎁" title={wr.notEnough} body={wr.notEnoughBody} />
      ) : (
        <div className="flex flex-col items-center">
          <div className="mb-3 flex w-[min(100%,26rem,calc(62svh*9/14))] gap-1" aria-hidden>
            {slides.map((_, k) => (
              <span
                key={k}
                className={`h-1 flex-1 rounded-full ${k <= i ? 'bg-[var(--accent)]' : 'bg-white/15'}`}
              />
            ))}
          </div>
          <motion.button
            type="button"
            onClick={() => go(1)}
            aria-label={wr.tap}
            drag={rm ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_e, inf) => (inf.offset.x < -60 ? go(1) : inf.offset.x > 60 && go(-1))}
            className="glass glass-glow relative grid aspect-[9/14] w-[min(100%,26rem,calc(62svh*9/14))] place-items-center overflow-hidden p-8 text-center"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={rm ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={rm ? { opacity: 0 } : { opacity: 0, x: -40, scale: 0.96 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex flex-col items-center gap-4"
                aria-live="polite"
              >
                <motion.span
                  aria-hidden
                  className="text-72"
                  animate={rm ? undefined : { y: [0, -10, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {s.emoji}
                </motion.span>
                <span className="text-15 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                  {s.kicker}
                </span>
                <span className="disp gold-text text-52 font-extrabold leading-none [overflow-wrap:anywhere]">
                  {s.big}
                </span>
                {s.sub && <span className="text-20 text-[var(--tx2)]">{s.sub}</span>}
              </motion.div>
            </AnimatePresence>
          </motion.button>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={!i}
              onClick={() => go(-1)}
              className="glass min-h-12 rounded-2xl px-5 font-bold disabled:opacity-40"
            >
              {wr.prev}
            </button>
            <button
              type="button"
              disabled={i === slides.length - 1}
              onClick={() => go(1)}
              className="glass min-h-12 rounded-2xl px-5 font-bold disabled:opacity-40"
            >
              {wr.next}
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}
