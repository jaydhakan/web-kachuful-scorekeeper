import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { useMemo, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { Direction, Outcome } from '@/domain';
import { trunc } from '@/lib/format';
import { DEALS_PILL, TD, dpx, seatPos, toPct, type TableSize } from '@/lib/tableGeometry';
import { Icon } from './Icons';
import { EASE, SPRING, SPRING_POP } from './motion';
import { t } from '@/strings';

export interface TablePlayer {
  id?: string;
  name: string;
  emoji: string;
  color: string;
}

interface TableProps {
  uid: string;
  size?: TableSize;
  players?: (TablePlayer | null)[];
  n?: number | null;
  dir?: Direction;
  dealer?: number;
  first?: number;
  firstLabel?: string;
  cur?: number;
  warn?: number;
  hl?: number;
  bids?: Record<string, number>;
  res?: Record<string, Outcome>;
  big?: boolean;
  /** Fill the slot it sits in (a definite-height parent) instead of keeping the fixed design size. */
  fit?: boolean;
  center?: ReactNode;
  arrowFrom?: number;
  arrowTo?: number;
  onSeat?: (k: number) => void;
  dropIdx?: number | null;
  noSeatAnim?: boolean;
  children?: ReactNode;
}

function Arcs({ sz, dir }: { sz: TableSize; dir: Direction }) {
  const d = TD[sz],
    rx = sz === 'full' ? d.rx - 52 : d.rx - 60,
    ry = sz === 'full' ? d.ry - 40 : d.ry - 30;
  const pt = (a: number) => [d.W / 2 + rx * Math.cos(a), d.cy + ry * Math.sin(a)];
  const items = [];
  for (let k = 0; k < 4; k++) {
    const a0 = ((k * 90 + 14) * Math.PI) / 180,
      a1 = ((k * 90 + 66) * Math.PI) / 180;
    let p = '';
    for (let s = 0; s <= 10; s++) {
      const [x, y] = pt(a0 + ((a1 - a0) * s) / 10);
      p += (s ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    const [ex, ey] = pt(a1),
      [bx, by] = pt(a1 - 0.05),
      ang = Math.atan2(ey - by, ex - bx),
      L = 7;
    const tri = [
      [ex + Math.cos(ang) * L, ey + Math.sin(ang) * L],
      [ex + Math.cos(ang + 2.5) * L * 0.9, ey + Math.sin(ang + 2.5) * L * 0.9],
      [ex + Math.cos(ang - 2.5) * L * 0.9, ey + Math.sin(ang - 2.5) * L * 0.9],
    ]
      .map((q) => q.map((v) => v.toFixed(1)).join(','))
      .join(' ');
    items.push(
      <g key={k}>
        <path
          d={p}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity=".5"
          strokeWidth="2"
          strokeDasharray="3 6"
          strokeLinecap="round"
        />
        <polygon points={tri} fill="var(--accent)" fillOpacity=".7" />
      </g>,
    );
  }
  return (
    <motion.svg
      viewBox={`0 0 ${d.W} ${d.H}`}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      initial={false}
      animate={{ scaleX: dir === 'cw' ? 1 : -1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
    >
      {items}
    </motion.svg>
  );
}

export function Table({
  uid,
  size = 'full',
  players = [],
  n,
  dir = 'cw',
  dealer,
  first,
  firstLabel,
  cur,
  warn,
  hl,
  bids,
  res,
  big,
  fit,
  center,
  arrowFrom,
  arrowTo,
  onSeat,
  dropIdx,
  noSeatAnim,
  children,
}: TableProps) {
  const d = TD[size],
    N = n || players.length;
  const chipPill = size === 'full';
  const seats = useMemo(
    () => Array.from({ length: N }, (_, k) => seatPos(size, N, k, dir)),
    [size, N, dir],
  );
  const felt = {
    left: toPct(size, { x: d.W / 2 - (d.rx - 10), y: d.cy - (d.ry - 6) }),
    w: (2 * (d.rx - 10) * 100) / d.W,
    h: (2 * (d.ry - 6) * 100) / d.H,
  };
  const box = (
    <div
      className={`table-box @container relative ${fit ? 'table-fit' : 'mx-auto shrink-0'}`}
      style={{ '--tw': d.W, '--th': d.H } as CSSProperties}
      data-table={uid}
    >
      <div
        className="felt absolute rounded-[50%]"
        style={{
          left: `${felt.left.x}%`,
          top: `${felt.left.y}%`,
          width: `${felt.w}%`,
          height: `${felt.h}%`,
        }}
      />
      <Arcs sz={size} dir={dir} />
      {center && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center"
          style={
            size === 'mini'
              ? { top: `calc(50% - ${dpx(2)})`, flexDirection: 'row', gap: dpx(8) }
              : undefined
          }
        >
          {center}
        </div>
      )}
      {arrowFrom != null &&
        arrowTo != null &&
        (() => {
          const a = seats[arrowFrom] ?? seatPos(size, N, arrowFrom, dir),
            b = seats[arrowTo] ?? seatPos(size, N, arrowTo, dir),
            mx = (a.x + b.x) / 2 + (d.W / 2 - (a.x + b.x) / 2) * 0.5,
            my = (a.y + b.y) / 2 + (d.cy - (a.y + b.y) / 2) * 0.5;
          return (
            <svg
              viewBox={`0 0 ${d.W} ${d.H}`}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
            >
              <defs>
                <marker
                  id={'ah' + uid}
                  markerWidth="8"
                  markerHeight="8"
                  refX="5"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0 0L8 4L0 8z" fill="var(--accent)" />
                </marker>
              </defs>
              <motion.path
                key={arrowFrom + '-' + arrowTo}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
                d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeDasharray="6 5"
                markerEnd={`url(#ah${uid})`}
                opacity=".9"
              />
            </svg>
          );
        })()}
      {seats.map((seat, k) => {
        const at = toPct(size, seat),
          av = dpx(d.R * 2);
        // Tappable seats keep a 44px box whatever the scale, with the avatar centred in it.
        const boxH = onSeat ? `max(44px, ${av})` : av;
        const p = players[k];
        const ring =
          cur === k ? 'ring-pulse' : warn === k ? 'warn-pulse' : hl === k ? 'ring-pulse' : '';
        const bid = p?.id !== undefined ? bids?.[p.id] : undefined;
        const out = p?.id !== undefined ? res?.[p.id] : undefined;
        return (
          <div
            key={k}
            data-seat={k}
            {...(onSeat && {
              role: 'button',
              tabIndex: 0,
              'aria-label': p ? undefined : t.table.seat(k + 1),
              onClick: () => onSeat(k),
              onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSeat(k);
                }
              },
            })}
            className={`absolute z-[2] ${onSeat ? 'cursor-pointer' : ''}`}
            style={{
              left: `calc(${at.x}% - ${dpx(36)})`,
              top: `calc(${at.y}% - ${boxH} / 2)`,
              width: dpx(72),
              height: boxH,
            }}
          >
            <motion.div
              initial={noSeatAnim ? false : { opacity: 0, scale: 0.3, y: dropIdx === k ? -60 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={
                dropIdx === k ? SPRING_POP : { ...SPRING, delay: noSeatAnim ? 0 : k * 0.04 }
              }
              className="relative w-full"
              style={{ height: av, marginTop: onSeat ? `max(0px, calc((44px - ${av}) / 2))` : 0 }}
            >
              {p ? (
                <motion.div
                  key={p.emoji + p.color}
                  initial={false}
                  whileTap={onSeat ? { scale: 0.9 } : undefined}
                  transition={SPRING}
                  className={`mx-auto grid place-items-center rounded-full border-2 border-white/20 shadow-[0_6px_16px_rgba(0,0,0,.5)] ${ring}`}
                  style={{
                    width: av,
                    height: av,
                    background: p.color,
                    fontSize: `max(0.8125rem, ${dpx(size === 'full' ? 24 : 18)})`,
                  }}
                >
                  {p.emoji}
                </motion.div>
              ) : (
                <div
                  className={`mx-auto grid place-items-center rounded-full border-2 border-dashed border-white/30 bg-white/[.04] text-13 text-[var(--tx2)] ${ring}`}
                  style={{ width: av, height: av }}
                >
                  {k + 1}
                </div>
              )}
              {p && (
                <div
                  data-seat-name
                  className="absolute inset-x-0 text-center text-13 font-bold leading-4 tracking-[0.005em] [text-shadow:0_1px_3px_black]"
                  style={{ top: 'calc(100% + 1px)' }}
                >
                  {trunc(p.name)}
                </div>
              )}
              {p && dealer === k && (
                <motion.div
                  layoutId={'dealer-' + uid}
                  transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                  className="absolute z-[4] flex items-center justify-center gap-[3px] rounded-full bg-gold-gradient text-13 font-extrabold text-ink-gold shadow-[0_2px_8px_rgba(0,0,0,.5),0_0_16px_rgba(226,182,83,.55)]"
                  style={
                    chipPill
                      ? {
                          ...DEALS_PILL,
                          left: dpx(3),
                          top: `calc(-1 * ${DEALS_PILL.height} - ${dpx(2)})`,
                        }
                      : {
                          width: `max(1.125rem, ${dpx(22)})`,
                          height: `max(1.125rem, ${dpx(22)})`,
                          left: dpx(12),
                          top: dpx(-7),
                        }
                  }
                >
                  {Icon.deck}
                  {chipPill && t.table.deals}
                </motion.div>
              )}
              {p && first === k && (
                <motion.div
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING_POP}
                  className="absolute z-[3] h-[18px] whitespace-nowrap rounded-[9px] bg-[var(--accent)] px-1.5 text-13 font-extrabold leading-[18px] text-ink-on-accent"
                  style={
                    firstLabel && size === 'full'
                      ? { left: '50%', top: dpx(-22), translate: '-50% 0' }
                      : {
                          left: `calc(50% + ${dpx(size === 'full' ? 10 : 6)})`,
                          top: dpx(size === 'full' ? -8 : -9),
                        }
                  }
                >
                  {firstLabel || t.table.first}
                </motion.div>
              )}
              <AnimatePresence>
                {p && bid !== undefined && (
                  // Centred on the avatar's right edge: clear of the name below and the dealer pill above.
                  <motion.div
                    key={'b' + bid}
                    data-seat-bid
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={SPRING_POP}
                    className="disp absolute z-[3] border-[1.5px] border-[var(--accent)] bg-text-primary text-center font-extrabold text-ink-on-accent shadow-[0_2px_8px_rgba(0,0,0,.5)]"
                    style={
                      big
                        ? {
                            minWidth: dpx(32),
                            height: dpx(32),
                            borderRadius: dpx(16),
                            fontSize: `max(0.8125rem, ${dpx(22)})`,
                            lineHeight: dpx(29),
                            left: `calc(50% + ${dpx(d.R - 16)})`,
                            top: dpx(d.R - 16),
                          }
                        : {
                            minWidth: dpx(22),
                            height: dpx(22),
                            borderRadius: dpx(11),
                            fontSize: `max(0.8125rem, ${dpx(14)})`,
                            lineHeight: dpx(19),
                            left: `calc(50% + ${dpx(d.R - 11)})`,
                            top: dpx(d.R - 11),
                          }
                    }
                  >
                    {bid}
                  </motion.div>
                )}
              </AnimatePresence>
              {p && out && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_POP}
                  className={`absolute z-[3] grid h-5 w-5 place-items-center rounded-full text-13 font-extrabold text-ink-on-accent ${out === 'made' ? 'bg-[var(--pos)]' : 'bg-[var(--neg)]'}`}
                  style={{ left: `calc(50% - ${dpx(d.R + 6)})`, bottom: dpx(-4) }}
                >
                  {out === 'made' ? t.table.made : t.table.missed}
                </motion.div>
              )}
            </motion.div>
          </div>
        );
      })}
      {children}
    </div>
  );
  return fit ? (
    <div className="cq-size grid h-full min-h-0 w-full place-items-center">{box}</div>
  ) : (
    box
  );
}

/** Full-table layer for something that moves between seats: translate it by `x`/`y` in percent, no measuring. */
export const TablePin = ({ className = '', ...rest }: HTMLMotionProps<'div'>) => (
  <motion.div
    aria-hidden
    className={`pointer-events-none absolute inset-0 ${className}`}
    {...rest}
  />
);
