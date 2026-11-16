import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { aheadOf, podiumSplit } from '@/lib/boardPodium';
import { saveBoardTop, wasBoardTop } from '@/state/persistence';
import { t } from '@/strings';
import { palette, seatColor, themeConfetti } from '@/theme/palette';
import { Avatar, AvatarFill, type Face } from './Avatar';
import { DeltaIntro, Progress, RankDelta } from './boardParts';
import { Counter } from './Counter';
import { Edge } from './Edge';
import { EASE, PRESS, REDUCED, SPRING } from './motion';
import { Section } from './PageParts';
import {
  BOARD_GAP_MS,
  LAND_AFTER_MS,
  LAND_MS,
  revealPlan,
  RISE_EASE,
  STEP_MS,
  type Place,
  type RevealPlan,
} from './podiumReveal';
import { PODIUM_BG, rankTone } from './rankTones';

const Confetti = lazy(() => import('./Confetti').then((x) => ({ default: x.Confetti })));

const b = t.hub.leaderboard;
/** Unranked rows shown before "Show all"; ranked rows are never folded. */
const UNRANKED_FOLD = 10;

/** One player on a board, in the shape every game's leaderboard shares. */
export interface BoardEntry {
  id: string;
  who: Face & { name: string };
  /** Null until they have played enough to be ranked. */
  rank: number | null;
  /** The exact value they are ranked on; the board's `show` writes it. */
  n: number;
  /** What to write when the value is not a number to show, such as a rate with nothing to be a rate of. */
  blank?: string;
  sub: string;
  delta?: number | null;
  /** Not ranked yet: how far along they are. */
  progress?: { v: number; of: number; label: string };
  badge?: ReactNode;
}

interface RankBoardProps {
  /** Best first, the unranked last. */
  entries: BoardEntry[];
  /** A value as people read it. Give a stable function: the podium counts up through it. */
  show: (n: number) => string;
  /** The distance between two values, for "3 behind Asha" on your own row; left out, the row says nothing. */
  gap?: (d: number) => string;
  you?: string | null;
  onOpen: (id: string) => void;
  /** A row's accessible name. */
  label: (rank: string, name: string, value: string) => string;
  unrankedShort: string;
  unrankedTitle: string;
  /** Shown above the list, such as why nobody is ranked. */
  note?: ReactNode;
  /** False keeps everyone in rows: a board inside another page, where a podium would shout. */
  podium?: boolean;
  /** Names this board and its filters. Given, taking first place here is celebrated once, not on every visit. */
  celebrate?: string;
}

const placeName = (k: Place) =>
  k === 1 ? t.winner.first : k === 2 ? t.winner.second : t.winner.third;
const rankName = (e: BoardEntry, unranked: string) => (e.rank ? `#${e.rank}` : unranked);

/**
 * A leaderboard: the top three on a podium, everyone else in rows, the not-yet-ranked under their own heading, and
 * the signed-in player's row pinned in view. The first board of a visit is revealed third place first; a board that
 * follows a filter change is simply there.
 */
export function RankBoard({
  entries,
  show,
  gap,
  you,
  onOpen,
  label,
  unrankedShort,
  unrankedTitle,
  note,
  podium = true,
  celebrate,
}: RankBoardProps) {
  const rm = useReducedMotion();
  const intro = useContext(DeltaIntro);
  // Read at mount: only the first board of a visit is staged.
  const [play] = useState(() => !intro?.done && !rm);
  useEffect(() => {
    if (intro) intro.done = true;
  }, [intro]);
  const [unfolded, setUnfolded] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const ranked = useMemo(() => entries.filter((e) => e.rank != null), [entries]);
  const unranked = useMemo(() => entries.filter((e) => e.rank == null), [entries]);
  const { stand, rest } = useMemo(
    () => (podium ? podiumSplit(ranked) : { stand: [], rest: ranked }),
    [podium, ranked],
  );
  const plan = useMemo(
    () =>
      revealPlan(
        stand.map((e) => e.rank ?? 0),
        BOARD_GAP_MS,
      ),
    [stand],
  );
  // The rows wait for the winner to land, so the eye is on the podium while it builds.
  const rowsAt =
    play && stand.length
      ? (Math.max(0, ...Object.values(plan.step).map((x) => x ?? 0)) + LAND_AFTER_MS) / 1000
      : 0;
  // The count-up and sheen belong to the reveal; once it has run, a changed value is simply written.
  const [staged, setStaged] = useState(play);
  useEffect(() => {
    if (!staged) return;
    const tm = setTimeout(() => setStaged(false), plan.done + 400);
    return () => clearTimeout(tm);
  }, [staged, plan.done]);

  const written = (e: BoardEntry) => e.blank ?? show(e.n);
  const folded = !unfolded && unranked.length > UNRANKED_FOLD;
  // Your own row stays in view when folded, so the pinned row still has something to pin.
  const shown = folded ? unranked.filter((e, i) => i < UNRANKED_FOLD || e.id === you) : unranked;

  const chase = (e: BoardEntry) => {
    if (!gap || e.id !== you) return undefined;
    const a = aheadOf(ranked, ranked.indexOf(e));
    if (!a) return undefined;
    const d = gap(Math.abs(a.n - e.n));
    // A gap that rounds away still has someone ahead of you.
    return d === gap(0) ? b.justBehind(a.who.name) : b.behind(d, a.who.name);
  };

  const mine = !!you && stand.some((e) => e.rank === 1 && e.id === you);
  const [took, setTook] = useState(false);
  const [party, setParty] = useState(false);
  // The board this mount has celebrated: a re-run of the effect (React's strict mode) must not read its own write.
  const freshFor = useRef<string | null>(null);
  useEffect(() => {
    if (!celebrate || !you) return;
    const key = `${celebrate}:${you}`;
    const fresh = mine && (freshFor.current === key || !wasBoardTop(key));
    saveBoardTop(key, mine);
    if (!fresh) return;
    freshFor.current = key;
    setTook(true);
    if (rm) return;
    const tm = setTimeout(() => setParty(true), play ? plan.name : 0);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the reveal's timing is read once, when first place is taken
  }, [celebrate, you, mine]);

  const row = (e: BoardEntry, i: number) => (
    <Row
      key={e.id}
      e={e}
      i={i}
      value={written(e)}
      name={label(rankName(e, unrankedShort), e.who.name, written(e))}
      you={e.id === you}
      chase={chase(e)}
      at={rowsAt}
      onOpen={onOpen}
    />
  );
  const below = rest.length + unranked.length > 0;
  return (
    <div
      ref={box}
      className={
        stand.length && below
          ? 'pane:grid pane:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] pane:items-start pane:gap-6 rail:gap-8'
          : stand.length
            ? ''
            : 'max-w-[44rem]'
      }
    >
      {stand.length > 0 && (
        <BoardPodium
          stand={stand}
          show={show}
          you={you}
          onOpen={onOpen}
          name={(e) => label(rankName(e, unrankedShort), e.who.name, written(e))}
          plan={play ? plan : null}
          staged={staged}
        />
      )}
      {(below || note) && (
        // One fade for the whole column, so a heading never stands alone while its rows wait for the podium.
        <m.div
          className="min-w-0"
          initial={rowsAt ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: rowsAt }}
        >
          {note}
          {rest.length > 0 && (
            <ol className="flex flex-col gap-2">
              <AnimatePresence>{rest.map(row)}</AnimatePresence>
            </ol>
          )}
          {unranked.length > 0 && (
            <Section title={unrankedTitle} className={ranked.length ? 'mt-6' : ''}>
              <ol className="flex flex-col gap-2">
                <AnimatePresence>{shown.map((e, i) => row(e, rest.length + i))}</AnimatePresence>
              </ol>
              {folded && (
                <button
                  type="button"
                  onClick={() => setUnfolded(true)}
                  className="press glass mt-4 min-h-12 w-full rounded-2xl font-bold"
                >
                  {b.showAllUnranked(unranked.length)}
                </button>
              )}
            </Section>
          )}
        </m.div>
      )}
      <p role="status" className="sr-only">
        {took ? b.tookTop : ''}
      </p>
      {party && (
        <Suspense fallback={null}>
          <div className="pointer-events-none fixed inset-0 z-[55]">
            <Confetti
              colors={themeConfetti() ?? [...stand.map((e) => e.who.color), palette['gold-light']]}
              origin={box.current?.querySelector('[data-confetti-origin]')}
              onDone={() => setParty(false)}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}

// Sizes in rem through --av, so a tied step can shrink its avatars and large text still scales them. A phone on its
// side gets a short podium that scrolls with the list; a tall wide screen pins a large one beside it.
const STEP = {
  1: {
    av: '[--av:4.5rem] land:[--av:3.25rem] rail:[--av:6rem]',
    h: 'h-28 land:h-[5.5rem] rail:h-40',
    place: 'text-40 land:text-30 rail:text-56',
    val: 'text-20 land:text-17 rail:text-26',
    ring: 'border-gold shadow-[0_0_28px_color-mix(in_srgb,var(--medal-gold)_60%,transparent)]',
    order: 'order-2',
  },
  2: {
    av: '[--av:3.5rem] land:[--av:2.75rem] rail:[--av:4.5rem]',
    h: 'h-[5.25rem] land:h-[4.25rem] rail:h-[7.5rem]',
    place: 'text-32 land:text-24 rail:text-44',
    val: 'text-17 land:text-15 rail:text-22',
    ring: 'border-rank-silver',
    order: 'order-1',
  },
  3: {
    av: '[--av:3.5rem] land:[--av:2.75rem] rail:[--av:4.5rem]',
    h: 'h-[4.75rem] land:h-[3.5rem] rail:h-24',
    place: 'text-32 land:text-24 rail:text-44',
    val: 'text-17 land:text-15 rail:text-22',
    ring: 'border-rank-bronze',
    order: 'order-3',
  },
} as const;
const STEP_SHADOW = 'shadow-[0_20px_50px_-16px_color-mix(in_srgb,var(--shade)_70%,transparent)]';
const SHEEN =
  'bg-[linear-gradient(105deg,transparent_30%,color-mix(in_srgb,var(--medal-gold-hi)_75%,transparent)_50%,transparent_70%)]';

/**
 * The board's top three as steps (2nd, 1st, 3rd on screen; 1st, 2nd, 3rd to a keyboard and a screen reader), each
 * player a button to their page; each step reads its place large and the value it ranks on beneath. A place nobody holds has no step.
 */
function BoardPodium({
  stand,
  show,
  you,
  onOpen,
  name,
  plan,
  staged,
}: {
  stand: BoardEntry[];
  show: (n: number) => string;
  you?: string | null;
  onOpen: (id: string) => void;
  name: (e: BoardEntry) => string;
  /** Null: everything in place. */
  plan: RevealPlan | null;
  staged: boolean;
}) {
  const step = (k: Place) => {
    const tied = stand.filter((e) => e.rank === k);
    if (!tied.length) return null;
    const s = STEP[k];
    const at = plan?.step[k] == null ? null : plan.step[k] / 1000;
    const lands = at == null ? 0 : at + LAND_AFTER_MS / 1000;
    const w = `calc(var(--av) * ${tied.length > 2 ? 0.62 : tied.length > 1 ? 0.82 : 1})`;
    return (
      <li
        key={k}
        // A shared step is as many players wide, so nobody's name is squeezed.
        style={{ flexGrow: tied.length }}
        className={`flex min-w-0 max-w-[14rem] basis-0 flex-col items-center justify-end ${s.order} ${s.av}`}
      >
        <div className="mb-2 flex w-full items-end justify-center gap-1.5">
          {tied.map((e, i) => (
            <m.button
              key={e.id}
              type="button"
              whileTap={PRESS}
              onClick={() => onOpen(e.id)}
              aria-label={name(e)}
              initial={at == null ? false : { y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: LAND_MS / 1000, ease: RISE_EASE, delay: lands + i * 0.05 }}
              className="flex min-h-11 min-w-0 flex-1 flex-col items-center rounded-2xl text-center"
            >
              <span
                aria-hidden
                data-confetti-origin={k === 1 && i === 0 ? '' : undefined}
                className={`relative grid shrink-0 place-items-center rounded-full border-2 ${s.ring} ${
                  e.id === you ? 'outline outline-2 outline-offset-2 outline-[var(--accent)]' : ''
                }`}
                style={{
                  background: seatColor(e.who.color),
                  width: w,
                  height: w,
                  fontSize: `calc(${w} * 0.56)`,
                }}
              >
                <AvatarFill p={e.who} />
              </span>
              <span className="mt-1.5 max-w-full text-13 font-bold leading-tight [overflow-wrap:anywhere] rail:text-15">
                {e.who.name}
              </span>
              {e.id === you && (
                <span className="text-13 font-bold leading-tight text-[var(--accent-tx)]">
                  {b.you}
                </span>
              )}
              <RankDelta d={e.delta ?? null} i={3 - k} />
            </m.button>
          ))}
        </div>
        <m.div
          data-step={k}
          initial={at == null ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: at ?? 0 }}
          className={`w-full overflow-hidden rounded-t-2xl ${STEP_SHADOW} ${s.h}`}
        >
          {/* The step slides up inside a box of its final size, so its value is never squashed. */}
          <m.div
            initial={at == null ? false : { y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: STEP_MS / 1000, ease: RISE_EASE, delay: at ?? 0 }}
            className={`relative flex h-full w-full flex-col items-center overflow-hidden rounded-t-2xl px-1 pt-2.5 text-ink-podium land:pt-1.5 rail:pt-4 ${PODIUM_BG[k]}`}
          >
            {/* The place is the step's headline, as on a game's winner podium; the value it ranks on sits under it. */}
            <span className={`disp font-extrabold leading-none ${s.place}`}>{placeName(k)}</span>
            <span className={`disp tick mt-1 font-extrabold leading-none opacity-80 ${s.val}`}>
              <Counter
                from={staged ? 0 : tied[0].n}
                to={tied[0].n}
                run={staged}
                delay={lands}
                duration={0.5}
                format={show}
              />
            </span>
            {k === 1 && at != null && (
              <m.span
                aria-hidden
                className={`pointer-events-none absolute inset-0 ${SHEEN}`}
                initial={{ x: '-110%' }}
                animate={{ x: '110%' }}
                transition={{ duration: 0.9, ease: EASE, delay: lands + LAND_MS / 1000 + 0.1 }}
              />
            )}
          </m.div>
        </m.div>
      </li>
    );
  };
  return (
    <ol
      data-board-podium
      aria-label={b.podium}
      className="mx-auto mb-4 flex w-full max-w-[30rem] items-end justify-center gap-2 border-b border-ov/[.14] pt-2 pane:mb-0 wide:sticky wide:top-0 rail:gap-3"
    >
      {([1, 2, 3] as const).map(step)}
    </ol>
  );
}

function Row({
  e,
  i,
  value,
  name,
  you,
  chase,
  at,
  onOpen,
}: {
  e: BoardEntry;
  i: number;
  value: string;
  name: string;
  you: boolean;
  chase?: string;
  /** Seconds the first rows wait, while a podium above them is revealed. */
  at: number;
  onOpen: (id: string) => void;
}) {
  const rm = useReducedMotion();
  const intro = useContext(DeltaIntro);
  // Read at mount: the first board of a visit rises in row by row; a row that joins after a filter change only fades.
  const [first] = useState(() => !intro?.done && !rm);
  const dim = e.rank == null;
  return (
    <m.li
      layout={rm ? false : 'position'}
      initial={first ? { opacity: 0, y: 8 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: REDUCED } }}
      // The stagger belongs to the entrance only: a re-rank slides at once.
      transition={{
        layout: SPRING,
        default: first ? { ...SPRING, delay: at + Math.min(i, 12) * 0.02 } : { duration: REDUCED },
      }}
      // The pinned row floats over the list: a shadow lifts it off the row beneath, and a solid backing keeps that
      // row from showing through a translucent card.
      className={
        you
          ? 'sticky bottom-2 top-2 z-10 rounded-[var(--r-card,22px)] bg-surface-solid shadow-[0_10px_28px_-6px_var(--drop)]'
          : ''
      }
    >
      <m.button
        type="button"
        whileTap={PRESS}
        onClick={() => onOpen(e.id)}
        aria-label={name}
        className="glass relative flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left"
      >
        {you && <Edge tone="accent" />}
        {/* The movement sits under the rank, so rows without one don't leave a gap before the avatar. */}
        <span className="flex w-8 shrink-0 flex-col items-center">
          {e.rank != null && e.rank <= 3 ? (
            // In rows (no podium, or a place too crowded for a step) the top three keep their medal.
            <span
              className={`disp grid h-8 w-8 place-items-center rounded-full text-17 font-extrabold leading-none text-ink-podium ${PODIUM_BG[e.rank as Place]}`}
            >
              {e.rank}
            </span>
          ) : (
            <span
              className={`disp text-22 font-extrabold leading-none ${e.rank ? rankTone(e.rank) : 'text-[var(--tx2)]'}`}
            >
              {e.rank ?? '–'}
            </span>
          )}
          <RankDelta d={e.delta ?? null} i={i} />
        </span>
        <Avatar
          p={e.who}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-22 ${dim ? 'opacity-60' : ''}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-17 font-bold leading-tight [overflow-wrap:anywhere]">
            {e.who.name}
            {you && (
              <span className="ml-1.5 text-13 font-bold text-[var(--accent-tx)]">{b.you}</span>
            )}
            {e.badge}
          </span>
          <span className="mt-0.5 block text-13 text-[var(--tx2)]">{e.sub}</span>
          {chase && (
            <span className="mt-0.5 block text-13 font-bold text-[var(--accent-tx)]">{chase}</span>
          )}
          {e.progress && (
            <span className="mt-1 flex items-center gap-2 text-13 text-[var(--tx2)]">
              <Progress v={e.progress.v} of={e.progress.of} />
              <span className="shrink-0">{e.progress.label}</span>
            </span>
          )}
        </span>
        <span
          className={`disp tick shrink-0 text-24 font-extrabold ${dim ? 'text-[var(--tx2)]' : ''}`}
        >
          {value}
        </span>
      </m.button>
    </m.li>
  );
}
