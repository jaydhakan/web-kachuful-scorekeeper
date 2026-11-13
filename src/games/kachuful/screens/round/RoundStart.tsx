import { AnimatePresence, m, useReducedMotion, type MotionStyle } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { dpx, seatPos, toPct } from '@/lib/tableGeometry';
import { totalRounds } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { TR } from '@/theme/trumps';
import { artOrTimeout, artReady } from '@/theme/art';
import { shownTheme } from '@/theme/applyTheme';
import { isThemeId } from '@/theme/themes';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table, TablePin } from '@/components/ui/Table';
import { EASE, REDUCED } from '@/components/ui/motion';
import { t } from '@/strings';

// One column when upright; the title group on the left and the table on the right when short or wide.
const ROOT =
  'scr-bg absolute inset-0 z-[45] cq-size flex cursor-pointer flex-col items-center pt-[calc(3rem+var(--sat))] pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))] focus-visible:rounded-none focus-visible:[outline-offset:-3px] @h-short:pt-[calc(2rem+var(--sat))] pane:grid pane:items-stretch pane:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] pane:grid-rows-[1fr_auto_auto_auto_auto_auto_1fr] pane:justify-items-center pane:gap-x-6 pane:pb-[max(1rem,var(--sab))] pane:pl-[max(var(--sal),calc((100%-72rem)/2))] pane:pr-[max(var(--sar),calc((100%-72rem)/2))] pane:pt-[calc(1rem+var(--sat))]';

// The reveal in ms, in order: overlay fade, "Last round" title, face-down wait, lift, turn, held beat, the line's
// read, the closing line (the card falls to the table in its last SETTLE), and the whole of the reduced-motion hold.
const FADE = 200,
  LAST = 600,
  WAIT = 350,
  LIFT = 120,
  TURN = 450,
  BEAT = 250,
  READ = 300,
  CLOSE = 700,
  SETTLE = 400,
  RM_HOLD = 600;
const TURN_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];
// Stages: 0 reveal, 1 dealer chip passes, 2 cards fly, 3 closing line, 4 card settles, 5 done.
const DONE = 5;

/** The deal animation at the start of a round; one tap skips it. */
export function RoundStart() {
  const { state, actions } = useApp();
  const [seq] = useState(() => state.seq);
  const g = state.game,
    n = g.players.length;
  const rm = useReducedMotion();
  // Reduced motion starts on the closing line: the face, both lines and the new dealer at once.
  const [stage, setStage] = useState(rm ? 3 : 0);
  const [drop, setDrop] = useState({ x: 0, y: 0 });
  // A theme can keep the card face-down longer (--reveal-hold; 0 in most themes). The CSS minifier may rewrite
  // 700ms as .7s, so both units are read.
  const [hold] = useState(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--reveal-hold').trim();
    const n = parseFloat(v) || 0;
    return rm ? 0 : v.endsWith('ms') ? n : n * 1000;
  });
  // The card waits for the theme's deck art (at most 300ms), so its back and face never arrive mid-turn.
  const [theme] = useState(shownTheme);
  const [ready, setReady] = useState(() => !isThemeId(theme) || artReady(theme));
  useEffect(() => {
    if (ready || !isThemeId(theme)) return;
    let on = true;
    void artOrTimeout(theme, 300).then(() => on && setReady(true));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
  const root = useRef<HTMLDivElement>(null),
    box = useRef<HTMLDivElement>(null);
  // Live regions only speak what arrives after they exist, so their text waits for the first commit.
  const [live, setLive] = useState(false);
  // The rest of the app is inert during the deal, so keys only reach the skip control if it holds focus.
  useEffect(() => {
    root.current?.focus({ preventScroll: true });
    setLive(true);
  }, []);
  const r = seq?.round,
    prev = seq?.prev ?? null;
  const needPass = r !== undefined && prev != null && prev !== r.dealerIndex;
  const last = r !== undefined && r.index + 1 === totalRounds(g);
  // The last round is dealt a third slower.
  const fly = last ? 0.69 : 0.52,
    gap = last ? 0.08 : 0.06;
  const liftAt = (last ? LAST : 0) + WAIT + hold,
    lineAt = liftAt + LIFT + TURN + BEAT;
  useEffect(() => {
    if (!ready) return;
    if (stage >= DONE) {
      actions.seqDone();
      return;
    }
    const T = [
      lineAt + READ,
      needPass ? 800 : 120,
      ((n - 1) * gap + fly) * 1000 + 150,
      rm ? RM_HOLD : CLOSE - SETTLE,
      SETTLE,
    ];
    const t = setTimeout(() => {
      // Measured as it leaves, so a rotation mid-deal still sends the card to where the table is now.
      const a = box.current?.getBoundingClientRect(),
        b = root.current?.querySelector('[data-table-center]')?.getBoundingClientRect();
      if (stage === 3 && a && b)
        setDrop({
          x: b.left + b.width / 2 - a.left - a.width / 2,
          y: b.top + b.height / 2 - a.top - a.height / 2,
        });
      setStage(rm ? DONE : stage + 1);
    }, T[stage]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advances only with the stage
  }, [stage, ready]);
  if (!r) return null;
  const th = TR[r.trump];
  const from = toPct('full', seatPos('full', n, r.dealerIndex, g.direction));
  return (
    <m.div
      ref={root}
      role="button"
      tabIndex={0}
      aria-label={t.start.skip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: FADE / 1000 }}
      onClick={() => setStage(DONE)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          setStage(DONE);
        }
      }}
      className={ROOT}
    >
      {last && (
        <span role="status" className="sr-only">
          {live && t.start.lastRound}
        </span>
      )}
      <div className="disp relative text-30 font-extrabold tracking-[-0.035em] @h-short:text-24 pane:[grid-area:2/1]">
        {/* On the last round the title's place says so first, over it, so nothing moves. */}
        <m.div
          initial={last ? { opacity: 0 } : false}
          animate={{ opacity: last && rm ? 0 : 1 }}
          transition={{ delay: LAST / 1000, duration: FADE / 1000 }}
        >
          {t.round.title(r.index + 1)}
        </m.div>
        {last && (
          <m.div
            aria-hidden
            initial={rm ? false : { opacity: 0, scale: 0.96 }}
            animate={rm ? { opacity: 1 } : { opacity: [0, 1, 1, 0], scale: [0.96, 1, 1, 1] }}
            transition={{
              duration: (LAST + FADE) / 1000,
              times: [0, 250 / (LAST + FADE), LAST / (LAST + FADE), 1],
            }}
            className="absolute inset-0 grid place-items-center whitespace-nowrap text-40 @h-short:text-32"
          >
            {t.start.lastRound}
          </m.div>
        )}
      </div>
      {/* At the end the card shrinks onto the table's centre, where the suit already is. */}
      <m.div
        ref={box}
        initial={false}
        animate={
          stage === 4 ? { ...drop, scale: 0.3, opacity: 0 } : { x: 0, y: 0, scale: 1, opacity: 1 }
        }
        transition={{ duration: SETTLE / 1000, ease: TURN_EASE }}
        className="relative my-3 h-[132px] w-24 @h-short:my-2 @h-short:h-[6.25rem] @h-short:w-[4.5rem] @h-tiny:h-20 @h-tiny:w-14 pane:[grid-area:3/1]"
        // The fan, rays and glint start with the line, once the face is showing (index.css reads --reveal-at).
        style={{ perspective: 800, '--reveal-at': `${lineAt}ms` } as MotionStyle}
      >
        {ready && (
          <>
            {/* Gold rays behind the revealed card, painted only by a theme that sets --reveal-rays. */}
            <div aria-hidden className="reveal-halo pointer-events-none absolute" />
            {/* The deal fan (DESIGN-SYSTEM.md, Motion): backs leave the deck behind the face, once; reduced motion hides it. */}
            <div aria-hidden className="deal-fan pointer-events-none absolute inset-0">
              {[0, 1, 2, 3, 4].map((i) => (
                <i
                  key={i}
                  className="card-art bg-card-back shadow-[inset_0_0_0_3px_var(--card-back-edge),0_6px_14px_-4px_color-mix(in_srgb,var(--shade)_50%,transparent)]"
                  style={{ '--i': i } as CSSProperties}
                />
              ))}
            </div>
            <m.div
              initial={rm ? false : { rotateY: 0, scale: 1 }}
              animate={rm ? { rotateY: 180 } : { rotateY: [0, 0, 180], scale: [1, 1.06, 1] }}
              transition={{
                delay: liftAt / 1000,
                duration: (LIFT + TURN) / 1000,
                times: [0, LIFT / (LIFT + TURN), 1],
                ease: ['easeOut', TURN_EASE],
              }}
              className="relative h-full w-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="card-art absolute inset-0 rounded-[14px] border-4 border-[var(--card-back-edge)] bg-card-back [backface-visibility:hidden]" />
              <div
                data-suit={r.trump}
                className={`trump-face absolute inset-0 grid place-items-center rounded-[14px] bg-card-face text-64 @h-short:text-52 @h-tiny:text-36 shadow-[0_0_44px_var(--glow)] [backface-visibility:hidden] ${r.trump === 'spades' || r.trump === 'clubs' ? 'text-card-ink' : 'text-card-red'}`}
                style={{ transform: 'rotateY(180deg)' }}
              >
                <span className="trump-glyph">{th.sym}</span>
                <span aria-hidden className="reveal-glint">
                  <i />
                </span>
              </div>
            </m.div>
          </>
        )}
      </m.div>
      <m.div
        initial={rm ? false : { opacity: 0, y: 6 }}
        animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: rm ? 0 : 6 }}
        transition={
          rm ? { duration: REDUCED } : { delay: lineAt / 1000, duration: 0.3, ease: EASE }
        }
        className="mb-2 px-7 text-center text-17 font-bold text-[var(--accent-tx)] @h-short:mb-1 pane:[grid-area:4/1]"
      >
        {t.start.trumpIs(th.name)}
      </m.div>
      <div className="flex min-h-0 w-full flex-1 flex-col pane:[grid-area:1/2/8/3]">
        <Table
          uid="rs"
          fit
          players={g.players}
          dir={g.direction}
          dealer={stage < 1 ? (prev ?? r.dealerIndex) : r.dealerIndex}
          first={stage >= 2 ? r.firstPlayerIndex : undefined}
          noSeatAnim={false}
          center={<SuitCenter trump={r.trump} cards={r.cards} />}
        >
          {stage === 2 &&
            Array.from({ length: n }, (_, k) => {
              const idx = (r.dealerIndex + 1 + k) % n,
                to = toPct('full', seatPos('full', n, idx, g.direction)),
                rot = ((idx * 47) % 40) - 20,
                delay = k * gap;
              return (
                <TablePin
                  key={k}
                  initial={{ x: `${from.x}%`, y: `${from.y}%` }}
                  animate={{ x: `${to.x}%`, y: `${to.y}%` }}
                  transition={{ duration: fly, delay, ease: EASE }}
                  className="z-[7]"
                >
                  <m.div
                    initial={{ rotate: 0, opacity: 1 }}
                    animate={{ rotate: rot, opacity: [1, 1, 0] }}
                    transition={{
                      default: { duration: fly, delay, ease: EASE },
                      opacity: { duration: fly, delay, times: [0, 0.8, 1] },
                    }}
                    className="card-art absolute left-0 top-0 rounded-[3px] border-[1.5px] border-text-primary bg-card-deal"
                    // Centred on the point the layer is translated to.
                    style={{ width: dpx(16), height: dpx(22), translate: '-50% -50%' }}
                  />
                </TablePin>
              );
            })}
        </Table>
      </div>
      <div
        className="min-h-[70px] px-7 py-3 text-center text-17 leading-[1.45] tracking-[-0.01em] @h-short:min-h-[4.25rem] @h-short:py-1 land:text-15 pane:[grid-area:5/1]"
        aria-live="polite"
      >
        <AnimatePresence>
          {live && stage >= 3 && (
            <m.div initial={rm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="disp face-body text-24 font-bold leading-[1.2] tracking-[-0.02em] @h-short:text-20 land:text-20 [&_[data-n]]:text-32 [&_[data-n]]:leading-none [&_[data-n]]:text-[var(--accent-tx)] @h-short:[&_[data-n]]:text-26 land:[&_[data-n]]:text-26">
                {t.deal.head(g.players[r.dealerIndex].name, r.cards)}
              </div>
              <div className="mt-1">{t.start.firstCard(g.players[r.firstPlayerIndex].name)}</div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
      {/* Both hints are mounted; the pointer type decides which one shows. */}
      <div className="pb-[max(1.75rem,var(--sab))] text-13 text-[var(--tx2)] @h-short:pb-[max(0.75rem,var(--sab))] pane:[grid-area:6/1]">
        <span className="fine:hidden">{t.start.tapToSkip}</span>
        <span className="hidden fine:inline">{t.start.clickToSkip}</span>
      </div>
    </m.div>
  );
}
