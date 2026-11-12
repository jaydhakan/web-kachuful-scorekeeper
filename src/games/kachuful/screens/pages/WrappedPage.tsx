import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { wrapped, type Facts, type Wrapped } from '@/games/kachuful/domain';
import { monthLabel, parseDay, shortDay } from '@/lib/dates';
import { sgnN } from '@/lib/format';
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { Chip, ChipRow, EmptyState, Page } from '@/components/ui/Page';
import { Counter } from '@/components/ui/Counter';
import { pct } from '@/components/ui/Stats';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { EASE } from '@/components/ui/motion';
import { TR } from '@/theme/trumps';
import { useApp } from '@/games/kachuful/state/store';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { RemotePending } from '@/components/RemoteGate';
import { t } from '@/strings';
import { icon } from '@/components/ui/IconsMore';
import { PlayerTag } from '@/components/ui/PlayerTag';
import { Avatar } from '@/components/ui/Avatar';

const wr = t.hub.wrapped;

// A slide comes in over this long; the last one then holds for a beat before its value arrives.
const SLIDE = 0.35;
const BEAT = 0.35;
// A flick this fast (px/s) turns the slide even when it travelled less than SWIPE px.
const FLICK = 400;
const SWIPE = 60;
// The entrance curve of DESIGN-SYSTEM.md (Motion).
const SETTLE = [0.22, 1, 0.36, 1] as const;

interface Slide {
  kicker: string;
  /** As a function it is told when to start counting, for a value that arrives after the slide has. */
  big: ReactNode | ((run: boolean) => ReactNode);
  sub?: ReactNode;
  /** A Phosphor illustration, or the player's own avatar emoji for the people slides. */
  emoji: ReactNode;
}

// Slide art: the size of the 72px emoji it replaced.
const ART = 'h-[4.5rem] w-[4.5rem] text-[var(--accent)]';
// The people slides show the player's own face at the same size.
const FACE = 'grid h-24 w-24 place-items-center rounded-full text-52';

function slidesOf(w: Wrapped, f: Facts | null): Slide[] {
  const out: Slide[] = [
    {
      kicker: wr.slides.totals(w.totals.rounds),
      big: <Counter from={0} to={w.totals.points} run />,
      sub: wr.slides.points,
      emoji: icon('cards', ART),
    },
  ];
  if (w.bestMonth)
    out.push({
      kicker: wr.slides.bestMonth,
      big: monthLabel(parseDay(w.bestMonth.month + '-01')),
      sub: sgnN(w.bestMonth.points),
      emoji: icon('calendar', ART),
    });
  if (w.bestDay)
    out.push({
      kicker: wr.slides.bestDay,
      big: shortDay(parseDay(w.bestDay.day)),
      sub: sgnN(w.bestDay.points),
      emoji: icon('sun', ART),
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
      emoji: icon('clover', ART),
    });
  if (w.nemesis)
    out.push({
      kicker: wr.slides.nemesis,
      big: whoIs(f, w.nemesis.playerId).name,
      sub: `${w.nemesis.losses}×`,
      emoji: <Avatar p={whoIs(f, w.nemesis.playerId)} className={FACE} />,
    });
  if (w.partner)
    out.push({
      kicker: wr.slides.partner,
      big: whoIs(f, w.partner.playerId).name,
      sub: t.hub.player.games_(w.partner.games),
      emoji: <Avatar p={whoIs(f, w.partner.playerId)} className={FACE} />,
    });
  if (w.biggestRound)
    out.push({
      kicker: wr.slides.biggest,
      big: sgnN(w.biggestRound.points),
      emoji: icon('bolt', ART),
    });
  out.push({
    kicker: wr.slides.run,
    big: <Counter from={0} to={w.longestRun} run />,
    emoji: icon('fire', ART),
  });
  out.push({
    kicker: wr.slides.achievements,
    big: <Counter from={0} to={w.achievements} run />,
    emoji: icon('medal', ART),
  });
  out.push({
    kicker: wr.slides.rank,
    // The rank climbs the board from last place to the player's own.
    big: (run) =>
      w.rank.rank ? (
        <>
          #<Counter from={w.rank.outOf} to={w.rank.rank} run={run} />
        </>
      ) : (
        '–'
      ),
    sub: w.rank.rank ? `/ ${w.rank.outOf}` : wr.slides.unranked,
    emoji: icon('trophy', ART),
  });
  return out;
}

/** The last slide's value: nothing for a beat after the slide has landed, then it settles in and counts. */
function Finale({ s, rm }: { s: Slide; rm: boolean | null }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), (SLIDE + BEAT) * 1000);
    return () => clearTimeout(id);
  }, []);
  const hidden = rm ? { opacity: 0 } : { opacity: 0, scale: 0.9 };
  return (
    <m.span
      initial={hidden}
      animate={on ? { opacity: 1, scale: 1 } : hidden}
      transition={{ duration: 0.45, ease: SETTLE }}
      className="flex flex-col items-center gap-4"
    >
      <Value s={s} run={on} />
    </m.span>
  );
}

function Value({ s, run }: { s: Slide; run: boolean }) {
  return (
    <>
      <span className="disp gold-text text-52 font-extrabold leading-none [overflow-wrap:anywhere]">
        {typeof s.big === 'function' ? s.big(run) : s.big}
      </span>
      {s.sub && <span className="text-20 text-[var(--tx2)]">{s.sub}</span>}
    </>
  );
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
  // Which way the deck is moving: Next brings a slide in from the right, Previous from the left.
  const [dir, setDir] = useState(1);
  const rm = useReducedMotion();
  const go = (d: number) => {
    setDir(d);
    setI((k) => Math.max(0, Math.min(slides.length - 1, k + d)));
  };
  // The click that ends a swipe is the swipe's, not a tap to advance.
  const swiped = useRef(false);
  const side = (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: 40 * d, scale: 0.96 });
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
                <PlayerTag p={whoIs(f, id)} name={whoIs(f, id).name} />
              </Chip>
            ))}
          </ChipRow>
        )
      }
    >
      {!data && session && who && remote.data == null ? (
        <RemotePending r={remote} rows={3} />
      ) : !s ? (
        <EmptyState icon="gift" title={wr.notEnough} body={wr.notEnoughBody} />
      ) : (
        <div className="flex flex-col items-center">
          <div className="mb-3 flex w-[min(100%,26rem,calc(62svh*9/14))] gap-1" aria-hidden>
            {slides.map((_, k) => (
              <span
                key={k}
                className={`h-1 flex-1 rounded-full ${k <= i ? 'bg-[var(--accent)]' : 'bg-ov/15'}`}
              />
            ))}
          </div>
          <m.button
            type="button"
            onClick={() => (swiped.current ? (swiped.current = false) : go(1))}
            aria-label={wr.tap}
            drag={rm ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            onDragStart={() => (swiped.current = true)}
            onDragEnd={(_e, { offset, velocity }) => {
              // Cleared after the click that follows a release on the card; a release elsewhere sends none.
              setTimeout(() => (swiped.current = false));
              const far = Math.abs(offset.x) > SWIPE;
              const fast = Math.abs(velocity.x) > FLICK && velocity.x * offset.x > 0;
              if (far || fast) go(offset.x < 0 ? 1 : -1);
            }}
            className="glass glass-glow relative grid aspect-[9/14] w-[min(100%,26rem,calc(62svh*9/14))] place-items-center overflow-hidden p-8 text-center"
          >
            <AnimatePresence mode="wait" custom={dir}>
              <m.div
                key={i}
                custom={dir}
                variants={{
                  from: (d: number) => side(d),
                  here: { opacity: 1, x: 0, scale: 1 },
                  to: (d: number) => side(-d),
                }}
                initial="from"
                animate="here"
                exit="to"
                transition={{ duration: SLIDE, ease: EASE }}
                className="flex flex-col items-center gap-4"
                aria-live="polite"
              >
                <m.span
                  aria-hidden
                  className="text-72"
                  animate={rm ? undefined : { y: [0, -10, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {s.emoji}
                </m.span>
                <span className="text-15 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                  {s.kicker}
                </span>
                {i === slides.length - 1 ? <Finale s={s} rm={rm} /> : <Value s={s} run />}
              </m.div>
            </AnimatePresence>
          </m.button>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={!i}
              onClick={() => go(-1)}
              className="press glass min-h-12 rounded-2xl px-5 font-bold disabled:opacity-40"
            >
              {wr.prev}
            </button>
            <button
              type="button"
              disabled={i === slides.length - 1}
              onClick={() => go(1)}
              className="press glass min-h-12 rounded-2xl px-5 font-bold disabled:opacity-40"
            >
              {wr.next}
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}
