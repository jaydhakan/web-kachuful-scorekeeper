import { motion, useAnimationFrame, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { curRound, doneRounds, standings } from '@/domain';
import { agoTxt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { DESTS, destRoute } from '@/components/hubNav';
import { TodayStrip } from '@/components/TodayStrip';
import { AccountChip } from '@/components/AccountChip';
import { ContinueCard } from '@/components/ContinueCard';
import { t } from '@/strings';

const SUITS = ['♠', '♦', '♣', '♥'] as const;

// One column is centred at 40rem; the two-pane layouts are centred at 72rem, like Scaffold's.
const ROOT =
  'absolute inset-0 cq-size flex flex-col pt-[var(--sat)] pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))] pane:grid pane:grid-rows-[minmax(0,1fr)_auto] pane:pl-[max(var(--sal),calc((100%-72rem)/2))] pane:pr-[max(var(--sar),calc((100%-72rem)/2))] land:grid-cols-[minmax(0,1fr)_clamp(17rem,44vw,23rem)] wide:grid-cols-[minmax(0,1.15fr)_minmax(20rem,26rem)]';

export function Home() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    ld = standings(g)[0];
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const orbit = useRef<HTMLDivElement>(null);
  // Orbit radii follow the box, which is sized by the layout; the frame loop reads this, never the DOM.
  const size = useRef({ w: 320, h: 200 });
  const rm = useReducedMotion();
  const still = useRef(false);
  useEffect(() => {
    const el = orbit.current;
    if (!el) return;
    const measure = () => {
      size.current = { w: el.clientWidth, h: el.clientHeight };
      // Reduced motion stops the loop after one pass; a new size needs one more.
      still.current = false;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useAnimationFrame((t) => {
    // Reduced motion places the suits once and then leaves the frame loop idle.
    if (rm && still.current) return;
    still.current = !!rm;
    const { w, h } = size.current;
    els.current.forEach((el, i) => {
      if (!el) return;
      const a = rm ? (i * Math.PI) / 2 : (t / 9000) * Math.PI * 2 + (i * Math.PI) / 2;
      const front = Math.sin(a) > 0;
      el.style.transform = `translate3d(${Math.cos(a) * w * 0.43}px, ${Math.sin(a) * h * 0.41}px, 0) scale(${0.85 + 0.25 * Math.sin(a)})`;
      // Stacking only changes twice a lap; writing it every frame would restack every frame.
      if (el.dataset.front !== String(front)) {
        el.dataset.front = String(front);
        el.style.opacity = front ? '1' : '0.5';
        el.style.zIndex = front ? '3' : '0';
      }
    });
  });
  const fin = g.status === 'finished';
  const demo = g.id === 'demo';
  return (
    <div className={ROOT}>
      <AccountChip className="absolute right-[max(1rem,var(--sar))] top-[calc(var(--sat)+0.75rem)] z-10 pane:left-[max(1rem,var(--sal))] pane:right-auto" />
      {/* The scroll fallback only matters on the smallest phones; in two panes the grid takes over (contents). */}
      <div
        tabIndex={0}
        role="region"
        aria-label={t.appName}
        className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 pane:contents"
      >
        <div className="m-auto flex w-full flex-col items-center gap-[clamp(1rem,4.5svh,2rem)] py-2 pane:contents">
          <div className="@container flex w-full justify-center pane:h-full pane:cq-size pane:items-center pane:px-5 pane:[grid-area:1/1/3/2]">
            <motion.div
              ref={orbit}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE }}
              className="relative aspect-[8/5] w-[min(100%,20rem)] @h-short:w-[min(100%,17.5rem)] md:w-[min(100%,28rem)] land:w-[min(100cqw,160cqh,26rem)] wide:w-[min(100cqw,160cqh,32rem)]"
            >
              {SUITS.map((s, i) => (
                <span
                  key={s}
                  aria-hidden
                  ref={(e) => {
                    els.current[i] = e;
                  }}
                  className={`absolute left-1/2 top-1/2 -ml-4 -mt-4 grid h-8 w-8 place-items-center text-30 [text-shadow:0_0_14px_var(--glow)] md:-ml-5 md:-mt-5 md:h-10 md:w-10 md:text-40 wide:-ml-5 wide:-mt-5 wide:h-10 wide:w-10 wide:text-40 ${s === '♦' || s === '♥' ? 'text-suit-red' : 'text-suit-black'}`}
                  style={{ willChange: 'transform' }}
                >
                  {s}
                </span>
              ))}
              <div className="absolute inset-0 grid place-content-center text-center">
                <h1 className="disp gold-text text-72 font-extrabold leading-none tracking-[-0.055em] @h-short:text-64 md:text-96 land:text-52 land:@[24rem]:text-72 wide:text-96">
                  {t.appName}
                </h1>
                <p className="mt-2 text-16 tracking-[0.02em] text-[var(--tx2)] md:text-18 wide:text-18">
                  {t.tagline}
                </p>
              </div>
            </motion.div>
          </div>
          <div className="scroll-thin flex w-full flex-col items-center gap-[clamp(1rem,4.5svh,2rem)] pane:max-h-full pane:min-h-0 pane:self-center land:overflow-y-auto land:overflow-x-hidden pane:px-5 pane:py-2 land:gap-0 pane:[grid-area:1/2]">
            <motion.div {...stagger(1, 0.25)} className="w-full md:max-w-[26rem]">
              <Glass
                glow
                onClick={actions.resume}
                // The pane scrolls and would clip the glow into a visible box, so on land it is dropped.
                className="w-full cursor-pointer p-5 text-left @h-short:p-4 land:p-3 land:![box-shadow:inset_0_1px_0_rgb(255_255_255/0.1)]"
              >
                {demo ? (
                  <>
                    <span className="rounded-md bg-[var(--gold)] px-2 py-0.5 text-13 font-bold uppercase tracking-[0.12em] text-ink-gold">
                      {t.home.demoBadge}
                    </span>
                    <div className="disp mt-2 text-24 font-bold tracking-[-0.025em] @h-short:text-22 land:text-20">
                      {t.home.demoTitle}
                    </div>
                    <div className="mt-1 text-16 leading-[1.4] text-[var(--tx2)]">
                      {t.home.demoBody}
                    </div>
                  </>
                ) : (
                  <div className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                    {fin ? t.home.finished : t.home.resume}
                  </div>
                )}
                {demo ? null : fin ? (
                  <>
                    <div className="disp mt-1 text-24 font-bold tracking-[-0.025em] @h-short:text-22 land:text-20">
                      {t.home.wonWith(ld.p.name, sgnN(ld.t))}
                    </div>
                    <div className="mt-1 text-16 text-[var(--tx2)] land:text-15">
                      {t.home.roundsPlayed(doneRounds(g).length)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="disp mt-1 text-24 font-bold tracking-[-0.025em] @h-short:text-22 land:text-20">
                      {t.home.roundLine(r.index + 1, r.cards, r.trump)}
                    </div>
                    <div className="mt-1.5 text-16 land:text-15">
                      {t.home.dealing(g.players[r.dealerIndex].name)}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-16 land:text-15">
                      <Dot p={ld.p} />
                      <span>{t.home.leads(ld.p.name, sgnN(ld.t))}</span>
                    </div>
                  </>
                )}
                {!demo && (
                  <div className="mt-2 text-13 text-[var(--tx2)]">
                    {t.home.saved(agoTxt(g.updatedAt))}
                  </div>
                )}
              </Glass>
            </motion.div>
            <ContinueCard className="md:max-w-[26rem]" />
            <TodayStrip className="md:max-w-[26rem] @h-short:hidden land:hidden" />
            {/* One row of small tiles: where to go, and the rules, without pushing New Game off a small phone. */}
            <motion.nav
              {...stagger(2, 0.28)}
              aria-label={t.hub.nav.label}
              className="grid w-full auto-cols-fr grid-flow-col gap-2 md:max-w-[26rem] land:mt-2"
            >
              {[
                ...DESTS.map((d) => ({
                  key: d.screen,
                  emoji: d.emoji,
                  label: d.label,
                  go: () => actions.open(destRoute(d)),
                })),
                {
                  key: 'rules',
                  emoji: '📖',
                  label: t.home.howToPlay,
                  go: () => actions.openSheet({ type: 'rules' }),
                },
              ].map((d) => (
                <motion.button
                  key={d.key}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={d.go}
                  className="glass flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 !rounded-2xl px-1 text-13 font-bold leading-tight"
                >
                  <span aria-hidden className="text-20 leading-none">
                    {d.emoji}
                  </span>
                  {d.label}
                </motion.button>
              ))}
            </motion.nav>
          </div>
        </div>
      </div>
      <div className="chrome-bot flex min-h-[96px] items-center px-5 pb-[max(18px,var(--sab))] pt-[18px] pane:[grid-area:2/2]">
        <PrimaryButton className="w-full md:mx-auto md:max-w-[26rem]" onClick={actions.startSetup}>
          {t.home.newGame}
        </PrimaryButton>
      </div>
    </div>
  );
}
