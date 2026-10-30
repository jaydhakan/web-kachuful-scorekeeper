import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import type { Direction, Outcome } from '@/domain';
import { trunc } from '@/lib/format';
import { TD, seatPos, type TableSize } from '@/lib/tableGeometry';
import { Icon } from './Icons';
import { EASE, SPRING, SPRING_POP } from './motion';

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
      width={d.W}
      height={d.H}
      aria-hidden
      className="pointer-events-none absolute inset-0"
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
  return (
    <div className="relative mx-auto shrink-0" style={{ width: d.W, height: d.H }} data-table={uid}>
      <div
        className="felt absolute rounded-[50%]"
        style={{
          left: d.W / 2 - (d.rx - 10),
          top: d.cy - (d.ry - 6),
          width: 2 * (d.rx - 10),
          height: 2 * (d.ry - 6),
        }}
      />
      <Arcs sz={size} dir={dir} />
      {center && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center"
          style={
            size === 'mini' ? { top: 'calc(50% - 2px)', flexDirection: 'row', gap: 8 } : undefined
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
              width={d.W}
              height={d.H}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1]"
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
      {seats.map(({ x, y }, k) => {
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
              'aria-label': p ? `Seat ${k + 1}: ${p.name}` : `Seat ${k + 1}`,
              onClick: () => onSeat(k),
              onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSeat(k);
                }
              },
            })}
            className={`absolute z-[2] w-[72px] ${onSeat ? 'cursor-pointer' : ''}`}
            style={{ left: x - 36, top: y - d.R, height: d.R * 2 }}
          >
            <motion.div
              initial={noSeatAnim ? false : { opacity: 0, scale: 0.3, y: dropIdx === k ? -60 : 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={
                dropIdx === k ? SPRING_POP : { ...SPRING, delay: noSeatAnim ? 0 : k * 0.04 }
              }
              className="h-full w-full"
            >
              {p ? (
                <motion.div
                  key={p.emoji + p.color}
                  initial={false}
                  whileTap={onSeat ? { scale: 0.9 } : undefined}
                  transition={SPRING}
                  className={`mx-auto grid place-items-center rounded-full border-2 border-white/20 shadow-[0_6px_16px_rgba(0,0,0,.5)] ${ring}`}
                  style={{
                    width: d.R * 2,
                    height: d.R * 2,
                    background: p.color,
                    fontSize: size === 'full' ? 24 : 18,
                  }}
                >
                  {p.emoji}
                </motion.div>
              ) : (
                <div
                  className={`mx-auto grid place-items-center rounded-full border-2 border-dashed border-white/30 bg-white/[.04] text-13 text-[var(--tx2)] ${ring}`}
                  style={{ width: d.R * 2, height: d.R * 2 }}
                >
                  {k + 1}
                </div>
              )}
              {p && (
                <div
                  className="absolute inset-x-0 text-center text-13 font-bold leading-4 tracking-[0.005em] [text-shadow:0_1px_3px_black]"
                  style={{ top: d.R * 2 + 1 }}
                >
                  {trunc(p.name)}
                </div>
              )}
              {p && dealer === k && (
                <motion.div
                  layoutId={'dealer-' + uid}
                  transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                  className="absolute z-[4] flex items-center justify-center gap-[3px] bg-gold-gradient text-13 font-extrabold text-ink-gold shadow-[0_2px_8px_rgba(0,0,0,.5),0_0_16px_rgba(226,182,83,.55)]"
                  style={
                    chipPill
                      ? { width: 66, height: 20, borderRadius: 10, left: 3, top: -22 }
                      : { width: 22, height: 22, borderRadius: 11, left: 12, top: -7 }
                  }
                >
                  {Icon.deck}
                  {chipPill && 'DEALS'}
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
                      ? { left: '50%', top: -22, translate: '-50% 0' }
                      : {
                          left: `calc(50% + ${size === 'full' ? 10 : 6}px)`,
                          top: size === 'full' ? -8 : -9,
                        }
                  }
                >
                  {firstLabel || '1st'}
                </motion.div>
              )}
              <AnimatePresence>
                {p && bid !== undefined && (
                  <motion.div
                    key={'b' + bid}
                    initial={{ scale: 0.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={SPRING_POP}
                    className="disp absolute z-[3] border-[1.5px] border-[var(--accent)] bg-text-primary text-center font-extrabold text-ink-on-accent shadow-[0_2px_8px_rgba(0,0,0,.5)]"
                    style={
                      big
                        ? {
                            minWidth: 36,
                            height: 36,
                            borderRadius: 18,
                            fontSize: 26,
                            lineHeight: '33px',
                            right: 36 - d.R + 14,
                            bottom: -12,
                          }
                        : {
                            minWidth: 22,
                            height: 22,
                            borderRadius: 11,
                            fontSize: 14,
                            lineHeight: '19px',
                            right: 36 - d.R + (size === 'full' ? 8 : 12),
                            bottom: size === 'full' ? -4 : -6,
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
                  style={{ left: `calc(50% - ${d.R + 6}px)`, bottom: -4 }}
                >
                  {out === 'made' ? '✓' : '✗'}
                </motion.div>
              )}
            </motion.div>
          </div>
        );
      })}
      {children}
    </div>
  );
}
