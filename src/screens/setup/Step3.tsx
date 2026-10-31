import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { cycleLen, maxFor, type LengthMode } from '@/domain';
import {
  DEALS_PILL,
  SMALL_CHIP,
  TD,
  angOf,
  chipSide,
  dpx,
  pillChip,
  posAt,
  seatPos,
  smallChipOffset,
  toPct,
} from '@/lib/tableGeometry';
import type { Seat } from '@/state/types';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table, TablePin } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { SetupFrame, TableSlot } from './SetupFrame';
import { useSetup } from './useSetup';
import { useApp } from '@/state/store';
import { t } from '@/strings';
import { AvatarFill } from '@/components/ui/Avatar';

function SpinToken({
  a0,
  a1,
  pill,
  right,
  onDone,
}: {
  a0: number;
  a1: number;
  pill: boolean;
  /** Whether the target seat puts its small chip on the right corner. */
  right: boolean;
  onDone: () => void;
}) {
  const a = useMotionValue(a0);
  const x = useTransform(a, (v) => `${toPct('full', posAt('full', v)).x}%`),
    y = useTransform(a, (v) => `${toPct('full', posAt('full', v)).y}%`);
  useEffect(() => {
    const c = animate(a, a1, { duration: 1.5, ease: [0.12, 0.8, 0.2, 1], onComplete: onDone });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one spin per mount
  }, []);
  return (
    <TablePin style={{ x, y }} className="z-[6]">
      <div
        className="absolute flex items-center justify-center gap-[3px] rounded-full bg-gold-gradient text-13 font-extrabold text-ink-gold shadow-[0_0_24px_rgba(247,231,166,.8)]"
        // Where the seat's own chip sits, so the token settles exactly on it.
        style={
          pill
            ? {
                ...DEALS_PILL,
                left: dpx(3 - 36),
                top: `calc(${dpx(-TD.full.R - 2)} - ${DEALS_PILL.height})`,
              }
            : {
                ...SMALL_CHIP,
                left: dpx(smallChipOffset(TD.full.R, right).x),
                top: dpx(smallChipOffset(TD.full.R, right).y),
              }
        }
      >
        {Icon.deck}
        {pill && t.table.deals}
      </div>
    </TablePin>
  );
}

interface DragState {
  k: number;
  x: number;
  y: number;
  on: boolean;
  timer: ReturnType<typeof setTimeout>;
}

export function Step3() {
  const { su, actions } = useSetup();
  const signedIn = !!useApp().state.session;
  const n = su.n ?? 0,
    seats = su.seats as Seat[],
    m = maxFor(n, su.decks),
    L = cycleLen(m);
  const [spin, setSpin] = useState<{ tgt: number; a0: number; a1: number } | null>(null),
    [ghost, setGhost] = useState<{ x: number; y: number; p: Seat } | null>(null);
  const wrap = useRef<HTMLDivElement>(null),
    drag = useRef<DragState | null>(null),
    suppress = useRef(0);
  const dl = seats[su.dealer],
    fp = seats[(su.dealer + 1) % n];
  const sg = su.dir === 'cw' ? 1 : -1;
  const doSpin = () => {
    const tgt = Math.floor(Math.random() * n),
      a0 = angOf(n, su.dealer, su.dir),
      // Degrees to travel the same way round to the target seat, after two full turns.
      turn = ((((angOf(n, tgt, su.dir) - a0) * sg) % 360) + 360) % 360;
    setSpin({ tgt, a0, a1: a0 + sg * (720 + turn) });
    actions.vib();
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    const s = (e.target as HTMLElement).closest<HTMLElement>('[data-seat]');
    if (!s || spin) return;
    const k = +(s.dataset.seat ?? -1);
    if (!seats[k]) return;
    const st: DragState = {
      k,
      x: e.clientX,
      y: e.clientY,
      on: false,
      timer: setTimeout(() => {
        st.on = true;
        actions.vib();
        const r = wrap.current?.getBoundingClientRect();
        if (r) setGhost({ x: st.x - r.left, y: st.y - r.top, p: seats[k] });
      }, 380),
    };
    drag.current = st;
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const st = drag.current;
    if (!st) return;
    if (!st.on) {
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 10) {
        clearTimeout(st.timer);
        drag.current = null;
      }
      return;
    }
    const r = wrap.current?.getBoundingClientRect();
    if (r) setGhost((gh) => gh && { ...gh, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const st = drag.current;
    if (!st) return;
    clearTimeout(st.timer);
    drag.current = null;
    if (st.on) {
      suppress.current = Date.now();
      setGhost(null);
      const el = document.elementFromPoint(e.clientX, e.clientY),
        s = el?.closest<HTMLElement>('[data-seat]');
      if (s && wrap.current?.contains(s) && +(s.dataset.seat ?? -1) !== st.k) {
        actions.setupSwap(st.k, +(s.dataset.seat ?? -1));
        actions.vib();
      }
    }
  };
  return (
    <SetupFrame
      step={3}
      title={t.setup.step3Title}
      fit
      bar={
        <div className="flex w-full flex-col gap-1.5">
          {signedIn && (
            <p className="text-center text-13 text-[var(--tx2)]">☁️ {t.hub.sync2.countOnline}</p>
          )}
          <PrimaryButton className="w-full" onClick={actions.beginGame}>
            {t.setup.deal}
          </PrimaryButton>
        </div>
      }
      aside={
        <div className="flex flex-col gap-3 @h-[45rem]:gap-1 pane:pt-1">
          <Glass
            glow
            spot={false}
            className="px-4 py-3.5 text-18 leading-[1.5] tracking-[-0.01em] @h-[45rem]:py-1 @h-[45rem]:text-17 @h-[45rem]:leading-[1.3]"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={su.dealer}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="[text-wrap:balance]"
              >
                <div>{t.setup.dealsFirst(dl.name)}</div>
                <div className="@h-[45rem]:hidden">{t.setup.firstCardTo(fp.name)}</div>
                <div className="text-14 text-[var(--tx2)] @h-[45rem]:hidden">
                  {t.setup.roundOne}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-2.5 flex items-center gap-3 @h-[45rem]:mt-0.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={doSpin}
                className="glass inline-flex min-h-12 shrink-0 items-center gap-1.5 !rounded-full px-4 text-16 font-medium @h-[45rem]:min-h-11"
              >
                {t.setup.random}
              </motion.button>
              <span className="text-13 leading-[1.35] text-[var(--tx2)] @h-[45rem]:leading-[1.25]">
                <span className="@h-[45rem]:hidden">{t.setup.dragHint}</span>
                <span className="hidden @h-[45rem]:inline">{t.setup.dragHintShort}</span>
              </span>
            </div>
          </Glass>
          <div>
            <div
              aria-hidden
              className="mb-1 @h-[45rem]:mb-0.5 text-13 font-medium text-[var(--tx2)]"
            >
              {t.setup.gameLength}
            </div>
            <Seg<LengthMode>
              uid="lenseg"
              label={t.setup.gameLength}
              size="sm"
              className="flex w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-1"
              value={su.length}
              onChange={(v) => actions.setupPatch({ length: v })}
              options={t.setup.lengthOptions(L)}
            />
          </div>
        </div>
      }
    >
      <TableSlot
        ref={wrap}
        players={n}
        className="relative touch-none select-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <Table
          uid="su3"
          fit
          n={n}
          dir={su.dir}
          players={seats}
          dealer={spin ? undefined : su.dealer}
          first={spin ? undefined : (su.dealer + 1) % n}
          noSeatAnim={false}
          onSeat={(k) => {
            if (Date.now() - suppress.current > 450 && !spin) actions.setupPatch({ dealer: k });
          }}
          center={<SuitCenter trump="spades" cards={3} />}
        >
          {spin && (
            <SpinToken
              a0={spin.a0}
              a1={spin.a1}
              pill={pillChip('full', n)}
              right={chipSide(toPct('full', seatPos('full', n, spin.tgt, su.dir)), su.dir, n)}
              onDone={() => {
                actions.setupPatch({ dealer: spin.tgt });
                setSpin(null);
                actions.vib();
              }}
            />
          )}
        </Table>
        {ghost && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-[9] grid h-14 w-14 overflow-hidden -translate-x-1/2 -translate-y-1/2 scale-110 place-items-center rounded-full border-2 border-white/40 text-30 shadow-[0_18px_40px_rgba(0,0,0,.6)]"
            style={{ left: ghost.x, top: ghost.y, background: ghost.p.color }}
          >
            <AvatarFill p={ghost.p} />
          </div>
        )}
      </TableSlot>
    </SetupFrame>
  );
}
