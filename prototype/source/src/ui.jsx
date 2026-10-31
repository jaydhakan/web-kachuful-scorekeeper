import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll, useDragControls, animate, useReducedMotion } from 'framer-motion';
import { TR, trunc } from './logic.js';

export const EASE = [0.32, 0.72, 0, 1];
export const SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };        // critically damped default
export const SPRING_POP = { type: 'spring', stiffness: 520, damping: 24, mass: 0.8 };    // only for momentum / confirmation
export const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 30 };

export const Icon = {
  menu: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  back: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>,
  board: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 20V11M12 20V4M19 20v-6" /></svg>,
  close: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  edit: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>,
  lock: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>,
  share: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" /></svg>,
  deck: <svg viewBox="0 0 24 24" className="h-3 w-3"><rect x="3" y="6" width="12" height="15" rx="2" fill="none" stroke="#3a2808" strokeWidth="2.6" /><rect x="9" y="3" width="12" height="15" rx="2" fill="#3a2808" /></svg>,
};

/* ---------- Glass card with spotlight hover ---------- */
export function Glass({ className = '', glow, spot = true, onClick, children, style, as = 'div', ...rest }) {
  const ref = useRef(null);
  const move = (e) => {
    if (!spot || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', e.clientX - r.left + 'px');
    ref.current.style.setProperty('--my', e.clientY - r.top + 'px');
  };
  const Tag = motion[as] || motion.div;
  return (
    <Tag ref={ref} onPointerMove={move} onClick={onClick} style={style}
      whileTap={onClick ? { scale: 0.975 } : undefined} transition={SPRING}
      className={`glass ${glow ? 'glass-glow' : ''} ${spot ? 'spot' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- Primary button: magnetic on mouse, instant press ---------- */
export function PrimaryButton({ children, onClick, disabled, className = '', tone = 'accent', ...rest }) {
  const x = useSpring(0, { stiffness: 300, damping: 24 }), y = useSpring(0, { stiffness: 300, damping: 24 });
  const ref = useRef(null);
  const rm = useReducedMotion();
  const move = (e) => {
    if (rm || disabled || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    x.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 14);
    y.set(((e.clientY - (r.top + r.height / 2)) / r.height) * 10);
  };
  const leave = () => { x.set(0); y.set(0); };
  const base = tone === 'accent'
    ? 'bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_58%,#000))] text-[#06120D] shadow-[0_14px_36px_-10px_var(--accent),inset_0_1px_0_rgba(255,255,255,.35)]'
    : tone === 'danger' ? 'bg-[rgba(255,92,108,.16)] text-[var(--neg)]' : 'glass text-[var(--tx)]';
  return (
    <motion.button ref={ref} onPointerMove={move} onPointerLeave={leave} onClick={onClick} disabled={disabled}
      style={{ x, y }} whileTap={disabled ? undefined : { scale: 0.96 }} transition={SPRING}
      className={`flex h-[60px] items-center justify-center gap-2 rounded-[20px] text-[18px] font-bold tracking-[-0.01em] transition-[background,color,box-shadow] duration-300 ease-apple disabled:cursor-default ${disabled ? 'bg-white/[.06] text-[var(--dis)] shadow-none' : base} ${className}`} {...rest}>
      {children}
    </motion.button>
  );
}

export function IconButton({ children, onClick, label, className = '' }) {
  return (
    <motion.button aria-label={label} onClick={onClick} whileTap={{ scale: 0.88 }} whileHover={{ backgroundColor: 'rgba(255,255,255,.08)' }} transition={SPRING}
      className={`grid h-12 w-12 place-items-center rounded-2xl ${className}`}>{children}</motion.button>
  );
}

/* ---------- Segmented control with a sliding thumb ---------- */
export function Seg({ uid, value, options, onChange, size = 'md', className = '' }) {
  return (
    <div className={`relative inline-flex rounded-2xl bg-white/[.06] p-[3px] ${className}`}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <motion.button key={o.v} onPointerDown={() => onChange(o.v)} whileTap={{ scale: 0.95 }} transition={SPRING}
            className={`relative z-10 flex items-center justify-center rounded-[13px] px-3.5 font-bold tracking-[-0.005em] ${size === 'sm' ? 'h-[42px] min-w-[48px] text-[15px]' : 'h-11 min-w-[56px] text-[16px]'} ${on ? (o.tone === 'pos' ? 'text-[#06120D]' : o.tone === 'neg' ? 'text-[#2a0509]' : 'text-[#06120D]') : 'text-[var(--tx2)]'}`}>
            {on && (
              <motion.span layoutId={uid} transition={SPRING}
                className="absolute inset-0 -z-10 rounded-[13px]"
                style={{ background: o.tone === 'pos' ? 'var(--pos)' : o.tone === 'neg' ? 'var(--neg)' : 'var(--accent)', boxShadow: '0 6px 18px -6px rgba(0,0,0,.6)' }} />
            )}
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ---------- Count-up number ---------- */
export const fmt = (v) => (v < 0 ? '−' + Math.abs(v) : String(v));
export function Counter({ from, to, run, duration = 0.6 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!run) { el.textContent = fmt(from); return; }
    const c = animate(from, to, { duration, ease: EASE, onUpdate: (v) => { el.textContent = fmt(Math.round(v)); } });
    return () => c.stop();
  }, [run, from, to, duration]);
  return <span ref={ref}>{fmt(from)}</span>;
}

/* ---------- Scaffold: translucent chrome over a scrolling body, collapsing large title ---------- */
export function Scaffold({ left, right, navTitle, title, children, bar, className = '', scrollRef }) {
  const inner = useRef(null);
  const ref = scrollRef || inner;
  const { scrollY } = useScroll({ container: ref });
  const navO = useTransform(scrollY, [24, 64], [0, 1]);
  const topBg = useTransform(scrollY, [0, 40], [0, 1]);
  const lgO = useTransform(scrollY, [0, 56], [1, 0]);
  const lgY = useTransform(scrollY, [0, 80], [0, -14]);
  const lgS = useTransform(scrollY, [0, 80], [1, 0.94]);
  const rm = useReducedMotion();
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div ref={ref} className="no-scroll absolute inset-0 overflow-y-auto overscroll-contain px-5 pb-[120px] pt-[64px]">
        {title && (
          <motion.h1 style={rm ? undefined : { opacity: lgO, y: lgY, scale: lgS, transformOrigin: '0 50%' }}
            className="disp mb-3 mt-1 text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em] [text-wrap:balance]">{title}</motion.h1>
        )}
        {children}
      </div>
      <motion.div style={{ opacity: topBg }} className="chrome-top pointer-events-none absolute inset-x-0 top-0 z-10 h-[88px]" />
      <div className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between px-2">
        <div className="w-12">{left}</div>
        <motion.span style={{ opacity: title ? navO : 1 }} className="disp text-[19px] font-bold tracking-[-0.02em]">{navTitle}</motion.span>
        <div className="flex w-12 justify-end">{right}</div>
      </div>
      {bar && (
        <div className="chrome-bot absolute inset-x-0 bottom-0 z-20 flex min-h-[96px] items-center gap-3 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-[18px]">{bar}</div>
      )}
    </div>
  );
}

/* ---------- Sheet with velocity-projected dismissal ---------- */
export function Sheet({ title, onClose, full, children }) {
  const controls = useDragControls();
  return (
    <div className="absolute inset-0 z-[60]">
      <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} onClick={onClose} />
      <motion.div drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 0.6 }}
        onDragEnd={(e, i) => { if (i.offset.y + i.velocity.y * 0.25 > 150) onClose(); }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 38 }}
        className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-[#0B1F17]/95 shadow-[0_-24px_80px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.08)] [backdrop-filter:blur(30px)_saturate(160%)] ${full ? 'top-9' : 'max-h-[90%]'}`}>
        <div onPointerDown={(e) => controls.start(e)} className="shrink-0 cursor-grab touch-none px-5 pb-1.5 pt-2.5">
          <div className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-white/25" />
          <div className="flex items-center justify-between">
            <h2 className="disp text-[26px] font-extrabold tracking-[-0.03em]">{title}</h2>
            <IconButton label="Close" onClick={onClose} className="-mr-2">{Icon.close}</IconButton>
          </div>
        </div>
        <div className="no-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-2">{children}</div>
      </motion.div>
    </div>
  );
}

export function Modal({ text, ok, danger, onOk, onCancel }) {
  return (
    <div className="absolute inset-0 z-[65] grid place-items-center p-7">
      <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={SPRING_POP}
        className="glass relative w-full max-w-[340px] !rounded-[28px] !bg-[#0B1F17]/95 p-6">
        <p className="mb-5 text-[19px] font-medium leading-snug tracking-[-0.012em]">{text}</p>
        <div className="flex gap-2.5">
          <PrimaryButton tone="glass" onClick={onCancel} className="!h-[52px] flex-1 !text-[16px]">Cancel</PrimaryButton>
          <PrimaryButton tone={danger ? 'danger' : 'accent'} onClick={onOk} className="!h-[52px] flex-1 !text-[16px]">{ok}</PrimaryButton>
        </div>
      </motion.div>
    </div>
  );
}

export function Toast({ toast, onUndo }) {
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[112px] z-[66] flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={SPRING}
            className="glass pointer-events-auto flex min-h-12 items-center gap-3 !rounded-full !bg-[#1B3A2D]/90 py-1.5 pl-5 pr-2 text-[16px] font-medium">
            <span className="whitespace-nowrap">{toast.msg}</span>
            {toast.undo && <button onClick={onUndo} className="min-h-11 rounded-full px-3.5 font-extrabold text-[var(--accent)]">Undo</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Banner({ text }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div key={text} initial={{ opacity: 0, y: -24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} transition={SPRING}
          className="glass glass-glow disp pointer-events-none absolute inset-x-5 top-[68px] z-[50] !rounded-[20px] p-3 text-center text-[20px] font-extrabold tracking-[-0.02em]">{text}</motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Confetti (canvas, avatar colours) ---------- */
export function Confetti({ colors, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, p = c.parentElement, w = p.clientWidth, h = p.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr; c.height = h * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    const P = Array.from({ length: 150 }, () => ({ x: w / 2 + (Math.random() - 0.5) * 80, y: h * 0.3, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 3, r: Math.random() * 6 + 3, c: colors[(Math.random() * colors.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 }));
    const t0 = performance.now(); let raf;
    const f = (t) => {
      const k = (t - t0) / 2500;
      if (k >= 1) { onDone && onDone(); return; }
      x.clearRect(0, 0, w, h);
      P.forEach((q) => { q.vy += 0.35; q.x += q.vx; q.y += q.vy; q.vx *= 0.99; q.a += q.va; x.save(); x.globalAlpha = Math.min(1, (1 - k) * 2); x.translate(q.x, q.y); x.rotate(q.a); x.fillStyle = q.c; x.fillRect(-q.r, -q.r / 2, q.r * 2, q.r); x.restore(); });
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-[55]" />;
}

/* ---------- Round table ---------- */
export const TD = { full: { W: 340, H: 300, cy: 150, R: 22, rx: 134, ry: 104 }, mini: { W: 320, H: 170, cy: 82, R: 16, rx: 128, ry: 56 } };
export function posAt(sz, ang) {
  const d = TD[sz], a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: d.W / 2 + d.rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3), y: d.cy + d.ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / 3) };
}
export const angOf = (n, k, dir) => 90 + (dir === 'cw' ? 1 : -1) * (k * 360) / n;
export const seatPos = (sz, n, k, dir) => posAt(sz, angOf(n, k, dir));

function Arcs({ sz, dir }) {
  const d = TD[sz], rx = sz === 'full' ? d.rx - 52 : d.rx - 60, ry = sz === 'full' ? d.ry - 40 : d.ry - 30;
  const pt = (a) => [d.W / 2 + rx * Math.cos(a), d.cy + ry * Math.sin(a)];
  const items = [];
  for (let k = 0; k < 4; k++) {
    const a0 = ((k * 90 + 14) * Math.PI) / 180, a1 = ((k * 90 + 66) * Math.PI) / 180;
    let p = '';
    for (let s = 0; s <= 10; s++) { const [x, y] = pt(a0 + ((a1 - a0) * s) / 10); p += (s ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    const [ex, ey] = pt(a1), [bx, by] = pt(a1 - 0.05), ang = Math.atan2(ey - by, ex - bx), L = 7;
    const tri = [[ex + Math.cos(ang) * L, ey + Math.sin(ang) * L], [ex + Math.cos(ang + 2.5) * L * 0.9, ey + Math.sin(ang + 2.5) * L * 0.9], [ex + Math.cos(ang - 2.5) * L * 0.9, ey + Math.sin(ang - 2.5) * L * 0.9]].map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ');
    items.push(<g key={k}><path d={p} fill="none" stroke="var(--accent)" strokeOpacity=".5" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" /><polygon points={tri} fill="var(--accent)" fillOpacity=".7" /></g>);
  }
  return <motion.svg width={d.W} height={d.H} className="pointer-events-none absolute inset-0" initial={false} animate={{ scaleX: dir === 'cw' ? 1 : -1 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}>{items}</motion.svg>;
}

export function Table({ uid, size = 'full', players = [], n, dir = 'cw', dealer, first, firstLabel, cur, warn, hl, bids, res, big, center, arrowFrom, arrowTo, onSeat, dropIdx, noSeatAnim, children, overDealer }) {
  const d = TD[size], N = n || players.length;
  const chipPill = size === 'full';
  return (
    <div className="relative mx-auto shrink-0" style={{ width: d.W, height: d.H }} data-table={uid}>
      <div className="felt absolute rounded-[50%]" style={{ left: d.W / 2 - (d.rx - 10), top: d.cy - (d.ry - 6), width: 2 * (d.rx - 10), height: 2 * (d.ry - 6) }} />
      <Arcs sz={size} dir={dir} />
      {center && <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center" style={size === 'mini' ? { top: 'calc(50% - 2px)', flexDirection: 'row', gap: 8 } : undefined}>{center}</div>}
      {arrowFrom != null && arrowTo != null && (() => {
        const a = seatPos(size, N, arrowFrom, dir), b = seatPos(size, N, arrowTo, dir), mx = (a.x + b.x) / 2 + (d.W / 2 - (a.x + b.x) / 2) * 0.5, my = (a.y + b.y) / 2 + (d.cy - (a.y + b.y) / 2) * 0.5;
        return (
          <svg width={d.W} height={d.H} className="pointer-events-none absolute inset-0 z-[1]">
            <defs><marker id={'ah' + uid} markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--accent)" /></marker></defs>
            <motion.path key={arrowFrom + '-' + arrowTo} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: EASE }} d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`} fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray="6 5" markerEnd={`url(#ah${uid})`} opacity=".9" />
          </svg>
        );
      })()}
      {Array.from({ length: N }, (_, k) => {
        const p = players[k], { x, y } = seatPos(size, N, k, dir);
        const ring = cur === k ? 'ring-pulse' : warn === k ? 'warn-pulse' : hl === k ? 'ring-pulse' : '';
        return (
          <div key={k} data-seat={k} onClick={onSeat ? () => onSeat(k) : undefined} className={`absolute z-[2] w-[72px] ${onSeat ? 'cursor-pointer' : ''}`} style={{ left: x - 36, top: y - d.R, height: d.R * 2 }}>
            <motion.div initial={noSeatAnim ? false : { opacity: 0, scale: 0.3, y: dropIdx === k ? -60 : 0 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={dropIdx === k ? SPRING_POP : { ...SPRING, delay: noSeatAnim ? 0 : k * 0.04 }} className="h-full w-full">
              {p ? (
                <motion.div key={p.emoji + p.color} initial={false} whileTap={onSeat ? { scale: 0.9 } : undefined} transition={SPRING}
                  className={`mx-auto grid place-items-center rounded-full border-2 border-white/20 shadow-[0_6px_16px_rgba(0,0,0,.5)] ${ring}`}
                  style={{ width: d.R * 2, height: d.R * 2, background: p.color, fontSize: size === 'full' ? 24 : 18 }}>{p.emoji}</motion.div>
              ) : (
                <div className={`mx-auto grid place-items-center rounded-full border-2 border-dashed border-white/30 bg-white/[.04] text-[13px] text-[var(--tx2)] ${ring}`} style={{ width: d.R * 2, height: d.R * 2 }}>{k + 1}</div>
              )}
              {p && <div className="absolute inset-x-0 text-center text-[13px] font-bold leading-4 tracking-[0.005em] [text-shadow:0_1px_3px_#000]" style={{ top: d.R * 2 + 1 }}>{trunc(p.name)}</div>}
              {p && dealer === k && (
                <motion.div layoutId={'dealer-' + uid} transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                  className="absolute z-[4] flex items-center justify-center gap-[3px] bg-[linear-gradient(135deg,#F7E7A6,#D4A23A_55%,#A8761E)] text-[13px] font-extrabold text-[#3a2808] shadow-[0_2px_8px_rgba(0,0,0,.5),0_0_16px_rgba(226,182,83,.55)]"
                  style={chipPill ? { width: 66, height: 20, borderRadius: 10, left: 3, top: -22 } : { width: 22, height: 22, borderRadius: 11, left: 12, top: -7 }}>
                  {Icon.deck}{chipPill && 'DEALS'}
                </motion.div>
              )}
              {p && first === k && (
                <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_POP}
                  className="absolute z-[3] h-[18px] whitespace-nowrap rounded-[9px] bg-[var(--accent)] px-1.5 text-[13px] font-extrabold leading-[18px] text-[#06120D]"
                  style={firstLabel && size === 'full' ? { left: '50%', top: -22, translate: '-50% 0' } : { left: `calc(50% + ${size === 'full' ? 10 : 6}px)`, top: size === 'full' ? -8 : -9 }}>{firstLabel || '1st'}</motion.div>
              )}
              <AnimatePresence>
                {p && bids && bids[p.id] !== undefined && (
                  <motion.div key={'b' + bids[p.id]} initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={SPRING_POP}
                    className="disp absolute z-[3] border-[1.5px] border-[var(--accent)] bg-[#F5F1E8] text-center font-extrabold text-[#06120D] shadow-[0_2px_8px_rgba(0,0,0,.5)]"
                    style={big ? { minWidth: 36, height: 36, borderRadius: 18, fontSize: 26, lineHeight: '33px', right: 36 - d.R + 14, bottom: -12 } : { minWidth: 22, height: 22, borderRadius: 11, fontSize: 14, lineHeight: '19px', right: 36 - d.R + (size === 'full' ? 8 : 12), bottom: size === 'full' ? -4 : -6 }}>{bids[p.id]}</motion.div>
                )}
              </AnimatePresence>
              {p && res && res[p.id] && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_POP} className={`absolute z-[3] grid h-5 w-5 place-items-center rounded-full text-[13px] font-extrabold text-[#06120D] ${res[p.id] === 'made' ? 'bg-[var(--pos)]' : 'bg-[var(--neg)]'}`} style={{ left: `calc(50% - ${d.R + 6}px)`, bottom: -4 }}>{res[p.id] === 'made' ? '✓' : '✗'}</motion.div>
              )}
            </motion.div>
          </div>
        );
      })}
      {children}
    </div>
  );
}

export const SuitCenter = ({ trump, cards, big }) => (
  <>
    <div className={`leading-none ${big ? 'suit-glow text-[96px]' : 'text-[34px]'}`} style={{ color: TR[trump].col, textShadow: big ? undefined : '0 0 18px var(--accent)' }}>{TR[trump].sym}</div>
    <div className={`${big ? 'text-[14px] text-[var(--tx)]' : 'text-[13px] text-[var(--tx2)]'} font-medium tracking-[0.01em] whitespace-nowrap`}>{big ? <><b>{TR[trump].name}</b> · {cards} cards</> : `${cards} cards`}</div>
  </>
);
