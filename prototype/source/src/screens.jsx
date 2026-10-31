import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useAnimationFrame, useReducedMotion } from 'framer-motion';
import { TR, EMOJIS, MOREMOJI, COLORS, TRUMPS, maxFor, cycleLen, curRound, bidOrder, forbiddenFor, sumBids, pts, totals, standings, streaks, doneRounds, roundAt, resultsState, gameStats, sgnN, trunc, agoTxt, LS } from './logic.js';
import { useApp } from './ctx.js';
import { Glass, PrimaryButton, IconButton, Seg, Counter, fmt, Scaffold, Sheet, Table, SuitCenter, Icon, EASE, SPRING, SPRING_POP, SPRING_SOFT, posAt, seatPos, angOf } from './ui.jsx';

const suit = (t) => <span style={{ color: TR[t].col }}>{TR[t].sym}</span>;
const Dot = ({ p, s = 28 }) => <span className="inline-grid shrink-0 place-items-center rounded-full" style={{ width: s, height: s, background: p.color, fontSize: s * 0.57 }}>{p.emoji}</span>;
const word = (g) => (g.direction === 'cw' ? 'left' : 'right');
const stagger = (i, base = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { ...SPRING_SOFT, delay: base + i * 0.05 } });
const shakeKF = { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.3 } };

/* ===================== HOME ===================== */
export function Home() {
  const A = useApp(), g = A.game, r = curRound(g), ld = standings(g)[0];
  const els = useRef([]);
  const rm = useReducedMotion();
  useAnimationFrame((t) => {
    els.current.forEach((el, i) => {
      if (!el) return;
      const a = rm ? i * Math.PI / 2 : (t / 9000) * Math.PI * 2 + (i * Math.PI) / 2;
      el.style.transform = `translate3d(${Math.cos(a) * 138}px, ${Math.sin(a) * 82}px, 0) scale(${0.85 + 0.25 * Math.sin(a)})`;
      el.style.opacity = Math.sin(a) > 0 ? 1 : 0.5; el.style.zIndex = Math.sin(a) > 0 ? 3 : 0;
    });
  });
  const fin = g.status === 'finished';
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-5">
        <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, ease: EASE }} className="relative h-[200px] w-[320px] max-w-full">
          {['♠', '♦', '♣', '♥'].map((s, i) => (
            <span key={s} ref={(e) => (els.current[i] = e)} className="absolute left-1/2 top-1/2 -ml-4 -mt-4 grid h-8 w-8 place-items-center text-[30px] [text-shadow:0_0_14px_var(--glow)]" style={{ color: s === '♦' || s === '♥' ? '#FF5A5A' : '#E8EEF8', willChange: 'transform' }}>{s}</span>
          ))}
          <div className="absolute inset-0 grid place-content-center text-center">
            <h1 className="disp gold-text text-[72px] font-extrabold leading-none tracking-[-0.055em]">Kachuful</h1>
            <p className="mt-2 text-[16px] tracking-[0.02em] text-[var(--tx2)]">Judgement scorekeeper</p>
          </div>
        </motion.div>
        <motion.div {...stagger(1, 0.25)} className="w-full">
          <Glass glow onClick={A.resume} className="w-full cursor-pointer p-5 text-left">
            <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">{fin ? 'Game finished' : 'Resume game'}</div>
            {fin ? (
              <><div className="disp mt-1 text-[24px] font-bold tracking-[-0.025em]">{ld.p.name} won with {sgnN(ld.t)}</div><div className="mt-1 text-[16px] text-[var(--tx2)]">{doneRounds(g).length} rounds played</div></>
            ) : (
              <><div className="disp mt-1 text-[24px] font-bold tracking-[-0.025em]">Round {r.index + 1} · {r.cards} cards · {suit(r.trump)} {TR[r.trump].name}</div>
                <div className="mt-1.5 text-[16px]">{g.players[r.dealerIndex].name} is dealing</div>
                <div className="mt-1.5 flex items-center gap-2 text-[16px]"><Dot p={ld.p} /><span>{ld.p.name} leads · {sgnN(ld.t)}</span></div></>
            )}
            <div className="mt-2 text-[13px] text-[var(--tx2)]">Saved {agoTxt(g.updatedAt)}</div>
          </Glass>
        </motion.div>
        <motion.button {...stagger(2, 0.3)} whileTap={{ scale: 0.95 }} onClick={() => A.setSheet({ type: 'rules' })} className="min-h-12 px-3 text-[16px] font-medium text-[var(--tx2)] underline decoration-white/25 underline-offset-[5px]">How to play</motion.button>
      </div>
      <div className="chrome-bot flex min-h-[96px] items-center px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-[18px]">
        <PrimaryButton className="w-full" onClick={() => (g.status === 'active' ? A.ask('Start a new game? Your current game will be lost.', 'Start new', A.startSetup, true) : A.startSetup())}>New Game</PrimaryButton>
      </div>
    </div>
  );
}

/* ===================== SETUP ===================== */
const Dots = ({ step }) => (
  <div className="flex items-center gap-2">{[1, 2, 3].map((i) => <motion.i key={i} animate={{ width: i === step ? 24 : 8, backgroundColor: i === step ? 'var(--accent)' : 'rgba(255,255,255,.22)' }} transition={SPRING} className="block h-2 rounded-full" />)}</div>
);
export function Setup() {
  const A = useApp(), su = A.su;
  if (!su) return null;
  const back = () => { if (su.step === 1) A.go('home', -1); else A.setSu({ ...su, step: su.step - 1 }); };
  const bk = <IconButton label="Back" onClick={back}>{Icon.back}</IconButton>;
  const S = su.step === 1 ? <Step1 /> : su.step === 2 ? <Step2 /> : <Step3 />;
  return <>{S}</>;
  function _() { return bk; }
}
function useSetup() { const A = useApp(); return [A.su, (f) => A.setSu((s) => ({ ...s, ...(typeof f === 'function' ? f(s) : f) })), A]; }
const SetupFrame = ({ step, title, bar, children, scrollRef }) => {
  const [su, upd, A] = useSetup();
  const back = () => { if (step === 1) A.go('home', -1); else upd({ step: step - 1 }); };
  return <Scaffold scrollRef={scrollRef} left={<IconButton label="Back" onClick={back}>{Icon.back}</IconButton>} navTitle={<Dots step={step} />} title={title} bar={bar}>{children}</Scaffold>;
};
const infoLine = (n) => (n ? `Max ${maxFor(n)} cards · 3 → ${maxFor(n)} → 3, repeating` : 'Pick the number of players to see the table');

function Step1() {
  const [su, upd, A] = useSetup();
  const lg = su.lg;
  return (
    <SetupFrame step={1} title="How many players?" bar={<PrimaryButton className="w-full" disabled={!su.n} onClick={() => upd({ step: 2, seats: Array(su.n).fill(null) })}>Next</PrimaryButton>}>
      {lg && (
        <motion.button {...stagger(0)} whileTap={{ scale: 0.96 }} onClick={() => upd({ n: lg.names.length, dir: lg.direction || 'cw', seats: lg.names.map((nm, i) => ({ name: nm, emoji: lg.emojis[i] || EMOJIS[i], color: lg.colors[i] || COLORS[i] })), dealer: 0, step: 3 })}
          className="glass mb-3 inline-flex min-h-12 items-center gap-2 !rounded-full px-4 text-[16px] font-medium shadow-[0_0_24px_-6px_var(--accent)]">↺ Use last group: {lg.names.slice(0, 3).join(', ')}{lg.names.length > 3 ? ` +${lg.names.length - 3}` : ''}</motion.button>
      )}
      <div className="my-2 flex justify-center gap-2.5">
        {[3, 4, 5, 6, 7].map((n, i) => (
          <motion.button key={n} {...stagger(i, 0.05)} whileTap={{ scale: 0.92 }} onClick={() => { upd({ n }); A.vib(); }}
            className={`disp relative grid h-16 w-16 max-w-[calc((100%-40px)/5)] flex-1 place-items-center rounded-[22px] text-[30px] font-extrabold tracking-[-0.03em] ${su.n === n ? 'text-[#06120D]' : 'glass'}`}>
            {su.n === n && <motion.span layoutId="nsel" transition={SPRING_POP} className="absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_58%,#000))] shadow-[0_0_0_4px_var(--glow),0_12px_32px_-8px_var(--accent)]" />}
            <span className="relative">{n}</span>
          </motion.button>
        ))}
      </div>
      <div className="h-[300px]">
        <AnimatePresence mode="wait">
          {su.n ? (
            <motion.div key={su.n} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3, ease: EASE }}>
              <Table uid="su1" n={su.n} dir={su.dir} center={<div className="text-[13px] text-[var(--tx2)]">{su.n} seats</div>} />
            </motion.div>
          ) : (
            <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-[130px] text-center text-[13px] text-[var(--tx2)]">Tap a number above</motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center">
        <Seg uid="dirseg" size="sm" value={su.dir} onChange={(v) => upd({ dir: v })} options={[{ v: 'cw', label: '⟳ Clockwise' }, { v: 'ccw', label: '⟲ Anticlockwise' }]} />
      </div>
      <p className="mt-3 text-center text-[14px] tracking-[0.005em] text-[var(--tx2)]">{infoLine(su.n)}</p>
    </SetupFrame>
  );
}

function Step2() {
  const [su, upd, A] = useSetup();
  const [name, setName] = useState(''), [err, setErr] = useState(''), [drop, setDrop] = useState(null);
  const inp = useRef(null);
  const n = su.n, seats = su.seats;
  const tgt = seats.findIndex((s) => !s), filled = seats.filter(Boolean).length;
  const w = su.dir === 'cw' ? 'left' : 'right';
  const prompt = (() => {
    if (tgt < 0) return 'Everyone is seated';
    if (tgt === 0) return "Who's dealing first?";
    const pv = seats[(tgt - 1 + n) % n], pn = pv ? pv.name : 'the player before';
    return seats.filter((x) => !x).length === 1 && tgt === n - 1 ? `And finally, on ${pn}'s ${w}?` : `Who's sitting on ${pn}'s ${w}?`;
  })();
  const recent = LS.get('kachuful.recentNames', []).filter((x) => !seats.some((s) => s && s.name.toLowerCase() === x.toLowerCase())).slice(0, 10);
  useEffect(() => { const t = setTimeout(() => inp.current && inp.current.focus(), 350); return () => clearTimeout(t); }, [tgt]);
  const add = (raw) => {
    const nm = (raw || '').trim().replace(/\s+/g, ' ');
    if (!nm || tgt < 0) return;
    const ex = seats.find((s) => s && s.name.toLowerCase() === nm.toLowerCase());
    if (ex) { setErr(`${ex.name} is already at the table.`); A.vib(); return; }
    const next = seats.slice(); next[tgt] = { name: nm.charAt(0).toUpperCase() + nm.slice(1), emoji: EMOJIS[tgt], color: COLORS[tgt] };
    setDrop(tgt); setName(''); setErr(''); upd({ seats: next }); A.vib();
  };
  return (
    <SetupFrame step={2} title="Seat the table" bar={<PrimaryButton className="w-full" disabled={tgt >= 0} onClick={() => upd({ step: 3, dealer: 0 })}>Next</PrimaryButton>}>
      <div className="h-[300px]">
        <Table uid="su2" n={n} dir={su.dir} players={seats} dealer={seats[0] ? 0 : undefined} first={seats[1] ? 1 : undefined} hl={tgt >= 0 ? tgt : undefined} dropIdx={drop} noSeatAnim={filled > 0}
          arrowFrom={tgt > 0 && seats[tgt - 1] ? tgt - 1 : undefined} arrowTo={tgt > 0 && seats[tgt - 1] ? tgt : undefined}
          onSeat={(k) => seats[k] && A.setSheet({ type: 'seat', k })} center={<div className="text-[13px] text-[var(--tx2)]">{filled} of {n} seated</div>} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={prompt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }} className="mt-4 min-h-8 text-[21px] font-bold tracking-[-0.02em]">{prompt}</motion.div>
      </AnimatePresence>
      {tgt >= 0 && (
        <div className="mt-2.5 flex gap-2">
          <input ref={inp} id="nm" value={name} maxLength={14} autoComplete="off" placeholder="Type a name" onChange={(e) => { setName(e.target.value); setErr(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(name); } }}
            className={`h-14 min-w-0 flex-1 rounded-2xl bg-white/[.07] px-4 text-[18px] tracking-[-0.01em] outline-none transition-shadow duration-300 placeholder:text-[var(--dis)] focus:shadow-[0_0_0_3px_var(--glow),inset_0_0_0_1px_var(--accent)] ${err ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`} />
          <PrimaryButton onClick={() => add(name)} className="!h-14 w-24 !text-[16px]">Add</PrimaryButton>
        </div>
      )}
      <div className="min-h-[22px] pt-2 text-[14px] font-medium text-[var(--warn)]">{err}</div>
      <div className="flex flex-wrap gap-2">
        {tgt >= 0 && recent.map((r, i) => <motion.button key={r} {...stagger(i)} whileTap={{ scale: 0.94 }} onClick={() => add(r)} className="glass min-h-12 !rounded-full px-4 text-[16px] font-medium">{r}</motion.button>)}
      </div>
    </SetupFrame>
  );
}

function SpinToken({ a0, a1, onDone }) {
  const a = useMotionValue(a0);
  const x = useTransform(a, (v) => posAt('full', v).x - 33), y = useTransform(a, (v) => posAt('full', v).y - 44);
  useEffect(() => { const c = animate(a, a1, { duration: 1.5, ease: [0.12, 0.8, 0.2, 1], onComplete: onDone }); return () => c.stop(); }, []);
  return <motion.div style={{ x, y }} className="absolute left-0 top-0 z-[6] flex h-5 w-[66px] items-center justify-center gap-[3px] rounded-[10px] bg-[linear-gradient(135deg,#F7E7A6,#D4A23A_55%,#A8761E)] text-[13px] font-extrabold text-[#3a2808] shadow-[0_0_24px_rgba(247,231,166,.8)]">{Icon.deck}DEALS</motion.div>;
}

function Step3() {
  const [su, upd, A] = useSetup();
  const n = su.n, seats = su.seats, m = maxFor(n), L = cycleLen(m);
  const [spin, setSpin] = useState(null), [openLen, setOpenLen] = useState(false), [ghost, setGhost] = useState(null);
  const wrap = useRef(null), drag = useRef(null), suppress = useRef(0);
  const dl = seats[su.dealer], fp = seats[(su.dealer + 1) % n];
  const lenLabel = su.length === 'endless' ? 'Endless' : su.length === '1cycle' ? `1 cycle · ${L} rounds` : `2 cycles · ${2 * L} rounds`;
  const sg = su.dir === 'cw' ? 1 : -1;
  const doSpin = () => { const tgt = Math.floor(Math.random() * n), dk = (tgt - su.dealer + n) % n, a0 = 90 + (sg * su.dealer * 360) / n; setSpin({ tgt, a0, a1: a0 + sg * (720 + (dk * 360) / n) }); A.vib(); };
  const down = (e) => {
    const s = e.target.closest('[data-seat]'); if (!s || spin) return; const k = +s.dataset.seat; if (!seats[k]) return;
    const st = { k, x: e.clientX, y: e.clientY, on: false }; st.timer = setTimeout(() => { st.on = true; A.vib(); const r = wrap.current.getBoundingClientRect(); setGhost({ x: st.x - r.left, y: st.y - r.top, p: seats[k] }); }, 380); drag.current = st;
  };
  const move = (e) => {
    const st = drag.current; if (!st) return;
    if (!st.on) { if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 10) { clearTimeout(st.timer); drag.current = null; } return; }
    const r = wrap.current.getBoundingClientRect(); setGhost((gh) => gh && { ...gh, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const up = (e) => {
    const st = drag.current; if (!st) return; clearTimeout(st.timer); drag.current = null;
    if (st.on) {
      suppress.current = Date.now(); setGhost(null);
      const el = document.elementFromPoint(e.clientX, e.clientY), s = el && el.closest('[data-seat]');
      if (s && wrap.current.contains(s) && +s.dataset.seat !== st.k) {
        const j = +s.dataset.seat, ns = seats.slice(); [ns[st.k], ns[j]] = [ns[j], ns[st.k]];
        upd({ seats: ns, dealer: ns.indexOf(seats[su.dealer]) }); A.vib();
      }
    }
  };
  return (
    <SetupFrame step={3} title="Ready to deal" bar={<PrimaryButton className="w-full" onClick={() => A.beginGame(su)}>Deal!</PrimaryButton>}>
      <div ref={wrap} className="relative h-[300px] touch-none select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Table uid="su3" n={n} dir={su.dir} players={seats} dealer={spin ? undefined : su.dealer} first={spin ? undefined : (su.dealer + 1) % n} noSeatAnim={false}
          onSeat={(k) => { if (Date.now() - suppress.current > 450 && !spin) upd({ dealer: k }); }} center={<SuitCenter trump="spades" cards={3} />}>
          {spin && <SpinToken a0={spin.a0} a1={spin.a1} onDone={() => { upd({ dealer: spin.tgt }); setSpin(null); A.vib(); }} />}
        </Table>
        {ghost && <div className="pointer-events-none absolute z-[9] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 scale-110 place-items-center rounded-full border-2 border-white/40 text-[30px] shadow-[0_18px_40px_rgba(0,0,0,.6)]" style={{ left: ghost.x, top: ghost.y, background: ghost.p.color }}>{ghost.p.emoji}</div>}
      </div>
      <Glass glow spot={false} className="mt-3 px-4 py-3.5 text-[18px] leading-[1.7] tracking-[-0.01em]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={su.dealer} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
            👑 <b>{dl.name}</b> deals first<br />🃏 3 cards each<br />👉 First card to <b>{fp.name}</b><br />♠ Spades are trump
          </motion.div>
        </AnimatePresence>
      </Glass>
      <div className="mt-3 flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.94 }} onClick={doSpin} className="glass inline-flex min-h-12 shrink-0 items-center gap-1.5 !rounded-full px-4 text-[16px] font-medium">🎲 Random</motion.button>
        <span className="text-[13px] leading-[1.35] text-[var(--tx2)]">Tap a seat to move the dealer. Press and hold, then drag, to swap seats.</span>
      </div>
      <Glass spot={false} className="mt-3 px-4">
        <button onClick={() => setOpenLen(!openLen)} className="flex min-h-14 w-full items-center justify-between text-[18px] font-bold tracking-[-0.015em]">Game length<span className="text-[13px] font-medium text-[var(--tx2)]">{lenLabel} {openLen ? '▴' : '▾'}</span></button>
        <AnimatePresence initial={false}>
          {openLen && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="pb-4">
              <Seg uid="lenseg" size="sm" className="w-full [&>button]:flex-1" value={su.length} onChange={(v) => upd({ length: v })} options={[{ v: 'endless', label: 'Endless' }, { v: '1cycle', label: `1 cycle · ${L}` }, { v: '2cycles', label: `2 cycles · ${2 * L}` }]} />
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>
    </SetupFrame>
  );
}

/* ===================== ROUND CHROME ===================== */
function RoundFrame({ r, title, bar, children, navLeft, scrollRef }) {
  const A = useApp();
  return (
    <Scaffold scrollRef={scrollRef} title={title} navTitle={`Round ${r.index + 1}`} bar={bar}
      left={navLeft || <IconButton label="Menu" onClick={() => A.setSheet({ type: 'menu' })}>{Icon.menu}</IconButton>}
      right={<IconButton label="Scoreboard" onClick={() => A.setSheet({ type: 'board' })}>{Icon.board}</IconButton>}>{children}</Scaffold>
  );
}
const dealLine = (g, r) => {
  const prev = r.index > 0 ? roundAt(g, r.index - 1).cards : 0, ar = r.cards > prev ? '↑' : r.cards < prev ? '↓' : '→';
  return <>👑 <b>{g.players[r.dealerIndex].name}</b> deals <b>{r.cards}</b> cards each · first card to <b>{g.players[r.firstPlayerIndex].name}</b> · {suit(r.trump)} {TR[r.trump].name} trump <b className="text-[var(--accent)]">{ar}</b></>;
};

/* ===================== BIDDING ===================== */
export function Bidding() {
  const A = useApp(), g = A.game, r = curRound(g), n = g.players.length, od = bidOrder(g, r);
  const bi = Math.min(g.ui.bidIdx, n - 1), pI = od[bi], p = g.players[pI], isD = pI === r.dealerIndex;
  const allBid = g.players.every((q) => r.bids[q.id] !== undefined), forb = isD ? forbiddenFor(g, r) : null, hookWarn = g.ui.hookWarn;
  const sum = sumBids(r), cnt = Object.keys(r.bids).length, diff = sum - r.cards;
  const [shake, setShake] = useState(null);
  const dealer = g.players[r.dealerIndex];
  const cap = hookWarn && isD ? <span className="text-[var(--warn)]">Your earlier bid isn’t allowed any more. Pick again.</span> : isD ? 'Dealer — bids last' : bi === 0 ? 'Bids 1st · gets the first card' : `Bids ${bi + 1} of ${n}`;
  const pick = (v) => { const res = A.bid(v); if (res === 'locked') { setShake(v); setTimeout(() => setShake(null), 320); } };
  return (
    <RoundFrame r={r} bar={allBid && !hookWarn ? <PrimaryButton className="w-full" onClick={() => A.phase('playing')}>Start playing</PrimaryButton> : <PrimaryButton className="w-full" disabled>{cnt} of {n} bids in</PrimaryButton>}>
      <Glass glow spot={false} className="p-2 pb-2.5">
        <Table uid="bid" size="mini" players={g.players} dir={g.direction} dealer={r.dealerIndex} first={r.firstPlayerIndex} bids={r.bids} cur={pI} warn={hookWarn && r.bids[dealer.id] === undefined ? r.dealerIndex : undefined} onSeat={A.pickSeat} noSeatAnim center={<SuitCenter trump={r.trump} cards={r.cards} />} />
        <p className="px-2 pb-0.5 pt-2.5 text-center text-[16px] leading-[1.38] tracking-[-0.01em]">{dealLine(g, r)}</p>
      </Glass>
      <div className="relative my-4 h-[104px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={pI} initial={{ opacity: 0, x: 44, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -44, scale: 0.97 }} transition={{ duration: 0.28, ease: EASE }} className="absolute inset-0">
            <Glass spot={false} className="flex h-full items-center gap-4 px-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-white/20 text-[36px] shadow-[0_8px_22px_rgba(0,0,0,.5)]" style={{ background: p.color }}>{p.emoji}</div>
              <div className="min-w-0">
                <div className="disp truncate text-[26px] font-extrabold leading-[1.05] tracking-[-0.035em]">{p.name}</div>
                <div className="mt-1 text-[16px] text-[var(--tx2)]">{cap}</div>
                {isD && forb != null && !hookWarn && <div className="text-[14px] text-[var(--warn)]">Can’t bid {forb} — total would equal {r.cards} cards</div>}
              </div>
            </Glass>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-6 justify-items-center gap-1.5">
        {Array.from({ length: r.cards + 1 }, (_, v) => {
          const lock = isD && forb === v, sel = r.bids[p.id] === v;
          return (
            <motion.button key={v} aria-label={lock ? `Locked ${v}` : `Bid ${v}`} animate={shake === v ? shakeKF : { x: 0 }} whileTap={{ scale: 0.9 }} onPointerDown={(e) => { if (!lock) e.currentTarget.dataset.d = 1; }} onClick={() => pick(v)}
              className={`disp relative grid aspect-square w-full max-w-14 place-items-center rounded-[18px] text-[22px] font-bold tracking-[-0.02em] ${lock ? 'border border-dashed border-white/20 bg-white/[.03] text-[var(--dis)]' : sel ? 'text-[#06120D]' : 'glass'}`}>
              {sel && <motion.span layoutId="pillsel" transition={SPRING_POP} className="absolute inset-0 rounded-[18px] bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_58%,#000))] shadow-[0_0_0_3px_var(--glow),0_10px_26px_-6px_var(--accent)]" />}
              <span className={`relative ${lock ? 'line-through' : ''}`}>{v}</span>
              {lock && <span className="absolute right-1 top-1 text-[var(--warn)]">{Icon.lock}</span>}
            </motion.button>
          );
        })}
      </div>
      <Glass spot={false} className="mt-4 px-3.5 py-3">
        <div className="flex justify-between text-[16px] font-bold tracking-[-0.01em]"><span>Bids {sum} / {r.cards} cards</span><span className={diff === 0 ? 'text-[var(--pos)]' : 'text-[var(--warn)]'}>{diff < 0 ? `Under by ${-diff}` : diff > 0 ? `Over by ${diff}` : 'Exactly level'}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.08]"><motion.div className="h-full origin-left rounded-full" animate={{ scaleX: Math.min(1, sum / r.cards), backgroundColor: diff > 0 ? '#FFB547' : '#7FB3FF' }} style={{ background: diff > 0 ? 'var(--warn)' : 'var(--accent)' }} transition={SPRING} /></div>
      </Glass>
    </RoundFrame>
  );
}

/* ===================== PLAY ===================== */
export function Play() {
  const A = useApp(), g = A.game, r = curRound(g), sum = sumBids(r);
  return (
    <RoundFrame r={r} bar={<><motion.button whileTap={{ scale: 0.92 }} onClick={() => A.phase('bidding', -1)} aria-label="Edit bids" className="glass grid h-[60px] w-[60px] shrink-0 place-items-center !rounded-[20px]">{Icon.edit}</motion.button><PrimaryButton className="flex-1" onClick={() => A.phase('results')}>Enter results</PrimaryButton></>}>
      <div className="-mx-5 mt-2 h-[300px]">
        <Table uid="play" players={g.players} dir={g.direction} dealer={r.dealerIndex} first={r.firstPlayerIndex} firstLabel="Leads first" bids={r.bids} big noSeatAnim center={<SuitCenter trump={r.trump} cards={r.cards} big />} />
      </div>
      <motion.p {...stagger(0, 0.1)} className="mt-6 text-center text-[19px] leading-[1.4] tracking-[-0.015em]"><b>Bids {sum}</b> · Cards {r.cards} — <span className="text-[var(--warn)]">someone will miss!</span></motion.p>
      <p className="mt-2 text-center text-[13px] text-[var(--tx2)]">{g.players[r.firstPlayerIndex].name} leads the first trick</p>
    </RoundFrame>
  );
}

/* ===================== RESULTS ===================== */
export function Results() {
  const A = useApp(), g = A.game, r = curRound(g), st = resultsState(g, r), od = bidOrder(g, r);
  return (
    <RoundFrame r={r} title="Who made their bid?" navLeft={<IconButton label="Back" onClick={() => A.phase('playing', -1)}>{Icon.back}</IconButton>}
      bar={<PrimaryButton className="w-full" disabled={!st.ok} onClick={A.confirmRound}>Confirm round</PrimaryButton>}>
      <div className="mb-3 flex min-h-12 items-center justify-between px-1">
        <span className="text-[16px] font-medium">Enter exact tricks</span>
        <motion.button role="switch" aria-checked={st.exact} aria-label="Enter exact tricks" onClick={A.toggleExact} whileTap={{ scale: 0.94 }} className={`relative h-[30px] w-[52px] rounded-full transition-colors duration-300 ease-apple ${st.exact ? 'bg-[var(--accent)]' : 'bg-white/[.14]'}`}>
          <motion.span animate={{ x: st.exact ? 22 : 0 }} transition={SPRING_POP} className="absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-[#F5F1E8] shadow-[0_2px_6px_rgba(0,0,0,.4)]" />
        </motion.button>
      </div>
      {od.map((i, k) => {
        const p = g.players[i], b = r.bids[p.id], res = r.results[p.id], pv = pts(r, p.id);
        return (
          <motion.div key={p.id} {...stagger(k)} className="mb-2">
            <Glass spot={false} className="flex min-h-16 items-center gap-2.5 px-2.5 py-2">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white/20 text-[24px]" style={{ background: p.color }}>{p.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[18px] font-bold tracking-[-0.015em]">{p.name}</div>
                <div className="whitespace-nowrap text-[13px] font-medium text-[var(--tx2)]">Bid {b}{pv != null && <> · <b className={pv > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}>{sgnN(pv)}</b></>}</div>
              </div>
              {st.exact ? (
                <div className="flex items-center">
                  <motion.button whileTap={{ scale: 0.88 }} aria-label="Fewer tricks" onClick={() => A.setTricks(p.id, -1)} className="h-11 w-11 rounded-xl bg-white/[.07] text-[24px] font-bold">−</motion.button>
                  <output className="disp w-[34px] text-center text-[24px] font-extrabold">{r.tricks[p.id]}</output>
                  <motion.button whileTap={{ scale: 0.88 }} aria-label="More tricks" onClick={() => A.setTricks(p.id, 1)} className="h-11 w-11 rounded-xl bg-white/[.07] text-[24px] font-bold">+</motion.button>
                </div>
              ) : (
                <Seg uid={'seg' + p.id} size="sm" value={res} onChange={(v) => A.setResult(p.id, v)} options={[{ v: 'made', label: '✓ Made', tone: 'pos' }, { v: 'missed', label: '✗ Missed', tone: 'neg' }]} />
              )}
            </Glass>
          </motion.div>
        );
      })}
      <div className="min-h-6 px-1 pt-1 text-[14px] font-medium leading-[1.35] text-[var(--warn)]">{st.msg}</div>
      {st.exact && <div className="px-1 text-[13px] text-[var(--tx2)]">Total tricks: {Object.values(r.tricks).reduce((a, b) => a + b, 0)} of {r.cards}</div>}
    </RoundFrame>
  );
}

/* ===================== SUMMARY ===================== */
function Spark({ color }) {
  return <>{Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, d = 26 + (i % 3) * 8; return <motion.i key={i} initial={{ x: 0, y: 0, scale: 1, opacity: 1 }} animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0, opacity: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} className="pointer-events-none absolute right-24 top-1/2 h-1.5 w-1.5 rounded-full" style={{ background: i % 3 === 0 ? '#F7E7A6' : color }} />; })}</>;
}
export function Summary() {
  const A = useApp(), g = A.game, r = curRound(g), anim = A.sumAnim;
  const prevR = useMemo(() => doneRounds(g).filter((x) => x !== r), []), prev = useMemo(() => standings(g, prevR), []), cur = standings(g);
  const pt = useMemo(() => totals(g, prevR), []), ct = totals(g), sk = streaks(g);
  const [stage, setStage] = useState(anim ? 0 : 5);
  const rm = useReducedMotion();
  useEffect(() => {
    if (!anim) return;
    const T = rm ? [60, 120, 180, 240, 300] : [350, 1000, 1850, 2450, 3300];
    const ts = T.map((t, i) => setTimeout(() => setStage(i + 1), t));
    const done = setTimeout(() => A.setSumAnim(false), T[4] + 100);
    return () => { ts.forEach(clearTimeout); clearTimeout(done); };
  }, []);
  const list = stage >= 3 ? cur : prev;
  const changed = prev[0].p.id !== cur[0].p.id || doneRounds(g).length === 1;
  const nr = roundAt(g, r.index + 1), nD = g.players[nr.dealerIndex];
  const tag = nr.cards === g.maxCards ? 'Peak round!' : nr.cards === 3 ? 'Back to 3' : null;
  return (
    <RoundFrame r={r} title={`After Round ${r.index + 1}`} bar={<><PrimaryButton tone="glass" className="px-5" onClick={() => A.ask('End the game and crown the winner?', 'End game', A.finishGame, true)}>End game</PrimaryButton><PrimaryButton className="flex-1" onClick={A.nextRound}>Next round</PrimaryButton></>}>
      <div className="relative">
        {list.map((x) => {
          const id = x.p.id, d = r.results[id] ? pts(r, id) : 0, rank = x.rank, lead = stage >= 4 && x.rank === 1;
          return (
            <motion.div layout="position" key={id} transition={{ type: 'spring', stiffness: 260, damping: 30 }} animate={stage === 1 && d < 0 ? shakeKF : undefined} className="mb-2">
              <Glass spot={false} className={`relative flex min-h-16 items-center gap-2.5 overflow-hidden px-3 py-2.5 ${lead ? 'ring-1 ring-[rgba(226,182,83,.55)]' : ''}`}>
                <div className="disp w-[30px] shrink-0 text-center text-[22px] font-extrabold" style={{ color: rank === 1 ? '#E2B653' : rank === 2 ? '#C9D3DD' : rank === 3 ? '#D08A5B' : 'var(--tx)' }}>{rank}</div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/20 text-[22px]" style={{ background: x.p.color }}>{x.p.emoji}</div>
                <div className="min-w-0 flex-1 truncate text-[18px] font-bold tracking-[-0.015em]">{x.p.name}{sk[id] >= 3 && <span className="ml-1.5 text-[16px]">🔥{sk[id]}</span>}</div>
                <AnimatePresence>
                  {stage >= 1 && <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_POP} className={`min-w-[46px] rounded-xl px-2 py-0.5 text-center text-[15px] font-extrabold ${d > 0 ? 'bg-[rgba(74,222,128,.16)] text-[var(--pos)]' : d < 0 ? 'bg-[rgba(255,92,108,.16)] text-[var(--neg)]' : 'bg-white/[.08] text-[var(--tx2)]'}`}>{sgnN(d)}</motion.span>}
                </AnimatePresence>
                {stage === 1 && d > 0 && !rm && <Spark color="#4ADE80" />}
                <div className="disp min-w-[70px] text-right text-[28px] font-extrabold tracking-[-0.03em]"><Counter from={anim ? pt[id] : ct[id]} to={ct[id]} run={anim && stage >= 2} /></div>
                {lead && (
                  <>
                    <motion.span initial={changed && anim ? { y: -60, opacity: 0, rotate: -16 } : false} animate={{ y: 0, opacity: 1, rotate: -16 }} transition={SPRING_POP} className="absolute left-3.5 -top-0.5 text-[20px]">👑</motion.span>
                    {changed && anim && !rm && <motion.span aria-hidden initial={{ x: '-120%' }} animate={{ x: '120%' }} transition={{ duration: 0.8, ease: EASE }} className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(247,231,166,.4)_50%,transparent_70%)]" />}
                  </>
                )}
              </Glass>
            </motion.div>
          );
        })}
      </div>
      <Glass glow spot={false} className="mt-3.5 p-3">
        <div className="flex items-center justify-between text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]"><span>Next up</span>{tag && <span className="rounded-[10px] bg-[var(--gold)] px-2.5 py-0.5 text-[13px] normal-case tracking-normal text-[#3a2808]">{tag}</span>}</div>
        <Table uid="sum" size="mini" players={g.players} dir={g.direction} dealer={stage >= 5 ? nr.dealerIndex : r.dealerIndex} first={nr.firstPlayerIndex} noSeatAnim center={<SuitCenter trump={nr.trump} cards={nr.cards} />} />
        <p className="pt-1.5 text-center text-[16px] leading-[1.45] tracking-[-0.01em]">Round {nr.index + 1} · <b>{nr.cards} cards</b> · {suit(nr.trump)} {TR[nr.trump].name}<br />👑 <b>{nD.name}</b> deals · first card to <b>{g.players[nr.firstPlayerIndex].name}</b></p>
      </Glass>
    </RoundFrame>
  );
}

/* ===================== WINNER ===================== */
const StatCard = ({ ic, t, p, s, i }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...SPRING_SOFT, delay: (i % 2) * 0.06 }}>
    <Glass className="h-full p-3"><div className="text-[13px] font-bold text-[var(--tx2)]">{ic} {t}</div><div className="disp mt-1 flex items-center gap-1.5 text-[20px] font-extrabold tracking-[-0.025em]"><Dot p={p} s={24} /> {p.name}</div><div className="text-[13px] text-[var(--tx2)]">{s}</div></Glass>
  </motion.div>
);
export function Winner() {
  const A = useApp(), g = A.game, st = standings(g), S = gameStats(g);
  const col = (k) => {
    const m = st.filter((x) => x.rank === k), h = k === 1 ? 128 : k === 2 ? 96 : 76;
    return (
      <div key={k} className="flex max-w-[120px] flex-1 flex-col items-center justify-end">
        <div className="mb-1.5 flex flex-wrap justify-center gap-1.5">
          {m.map((x, i) => <motion.div key={x.p.id} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...SPRING_POP, delay: 0.9 + (3 - k) * 0.12 + i * 0.05 }} className="flex max-w-[70px] flex-col items-center text-[13px] font-bold"><span className={`grid place-items-center rounded-full border-2 ${k === 1 ? 'h-16 w-16 border-[#E2B653] text-[36px] shadow-[0_0_28px_rgba(226,182,83,.6)]' : 'h-[52px] w-[52px] border-white/25 text-[28px]'}`} style={{ background: x.p.color }}>{x.p.emoji}</span>{trunc(x.p.name)}</motion.div>)}
        </div>
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, ease: EASE, delay: (3 - k) * 0.15 }} style={{ height: h, originY: 1, opacity: m.length ? 1 : 0.25, background: k === 1 ? 'linear-gradient(#F7E7A6,#A8761E)' : k === 2 ? 'linear-gradient(#DDE5EC,#8793A0)' : 'linear-gradient(#E3A57E,#8F5A38)' }} className="disp flex w-full flex-col items-center rounded-t-2xl pt-2 text-[32px] font-extrabold text-[#2b2110] shadow-[0_20px_50px_-16px_rgba(0,0,0,.7)]">
          {k === 1 ? '1st' : k === 2 ? '2nd' : '3rd'}<small className="font-sans text-[13px] font-bold">{m.length ? sgnN(m[0].t) : '—'}</small>
        </motion.div>
      </div>
    );
  };
  return (
    <Scaffold left={<IconButton label="Home" onClick={() => A.go('home', -1)}>{Icon.back}</IconButton>} navTitle="Final scores"
      bar={<><PrimaryButton tone="glass" className="gap-2 px-5" onClick={() => A.setSheet({ type: 'share' })}>{Icon.share} Share</PrimaryButton><PrimaryButton className="flex-1" onClick={A.rematch}>Rematch</PrimaryButton></>}>
      <motion.span initial={{ y: -140, scale: 0.5, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ ...SPRING_POP, delay: 0.5 }} className="block text-center text-[52px]">🏆</motion.span>
      <div className="mb-4 mt-2 flex min-h-[240px] items-end justify-center gap-2">{[2, 1, 3].map(col)}</div>
      {st.map((x, i) => (
        <motion.div key={x.p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...SPRING_SOFT, delay: i * 0.03 }} className="mb-2">
          <Glass spot={false} className="flex min-h-14 items-center gap-2.5 px-3 py-2"><div className="disp w-[30px] text-center text-[22px] font-extrabold" style={{ color: x.rank === 1 ? '#E2B653' : x.rank === 2 ? '#C9D3DD' : x.rank === 3 ? '#D08A5B' : 'var(--tx)' }}>{x.rank}</div><Dot p={x.p} s={40} /><div className="flex-1 truncate text-[18px] font-bold tracking-[-0.015em]">{x.p.name}</div><div className={`disp text-[26px] font-extrabold tracking-[-0.03em] ${x.t < 0 ? 'text-[var(--neg)]' : ''}`}>{fmt(x.t)}</div></Glass>
        </motion.div>
      ))}
      <h2 className="disp mb-2 mt-6 text-[22px] font-extrabold tracking-[-0.03em]">Game highlights</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard i={0} ic="🎯" t="Sharpshooter" p={S.sharp.p} s={`${S.sharp.exact} exact bids`} />
        <StatCard i={1} ic="💥" t="Big round" p={S.big.p} s={`${sgnN(S.big.best)} in one round`} />
        <StatCard i={2} ic="🔥" t="Hot streak" p={S.streak.p} s={`${S.streak.maxRun} exact in a row`} />
        <StatCard i={3} ic="🪝" t="Hook victim" p={S.hook.p} s={S.hook.hook ? `blocked ${S.hook.hook}× as dealer` : 'nobody got hooked'} />
        <StatCard i={4} ic="😬" t="Ouch" p={S.ouch.p} s={`${sgnN(S.ouch.worst)} in one round`} />
      </div>
      <div className="mt-4 flex justify-center"><button onClick={() => A.go('home', -1)} className="min-h-12 px-4 text-[16px] font-medium text-[var(--tx2)] underline decoration-white/25 underline-offset-[5px]">Home</button></div>
    </Scaffold>
  );
}

/* ===================== ROUND START ===================== */
export function RoundStart() {
  const A = useApp(), [S0] = useState(A.seq), { round: r, prev, after } = S0, g = A.game, n = g.players.length, th = TR[r.trump];
  const [stage, setStage] = useState(0);
  const needPass = prev != null && prev !== r.dealerIndex;
  const dealMs = (n - 1) * 60 + 520 + 150;
  const finish = () => { A.setSeq(null); after && after(); };
  useEffect(() => {
    if (stage >= 4) { finish(); return; }
    const T = [820, needPass ? 800 : 120, dealMs, 700];
    const t = setTimeout(() => setStage((s) => s + 1), T[stage]);
    return () => clearTimeout(t);
  }, [stage]);
  const from = seatPos('full', n, r.dealerIndex, g.direction);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setStage(4)} className="scr-bg absolute inset-0 z-[45] flex cursor-pointer flex-col items-center pt-12">
      <div className="disp text-[30px] font-extrabold tracking-[-0.035em]">Round {r.index + 1}</div>
      <div className="my-3 h-[132px] w-24" style={{ perspective: 800 }}>
        <motion.div initial={{ rotateY: 0, scale: 0.9 }} animate={{ rotateY: 180, scale: 1 }} transition={{ duration: 0.8, ease: EASE }} className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 rounded-[14px] border-4 border-[#F5F1E8] [backface-visibility:hidden] [background:repeating-linear-gradient(45deg,#8E2B20,#8E2B20_6px,#B5392B_6px,#B5392B_12px)]" />
          <div className="absolute inset-0 grid place-items-center rounded-[14px] bg-[#F5F1E8] text-[64px] shadow-[0_0_44px_var(--accent)] [backface-visibility:hidden]" style={{ transform: 'rotateY(180deg)', color: th.col === '#E8EEF8' ? '#14201a' : '#D8283A' }}>{th.sym}</div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-2 text-[17px] font-bold text-[var(--accent)]">{th.name} are trump</motion.div>
      <Table uid="rs" players={g.players} dir={g.direction} dealer={stage < 1 ? (prev ?? r.dealerIndex) : r.dealerIndex} first={stage >= 2 ? r.firstPlayerIndex : undefined} noSeatAnim={false} center={<SuitCenter trump={r.trump} cards={r.cards} />}>
        {stage === 2 && Array.from({ length: n }, (_, k) => {
          const idx = (r.dealerIndex + 1 + k) % n, to = seatPos('full', n, idx, g.direction), rot = ((idx * 47) % 40) - 20;
          return <motion.div key={k} initial={{ x: from.x - 8, y: from.y - 11, opacity: 1, rotate: 0 }} animate={{ x: to.x - 8, y: to.y - 11, rotate: rot, opacity: [1, 1, 0] }} transition={{ default: { duration: 0.52, delay: k * 0.06, ease: EASE }, opacity: { duration: 0.52, delay: k * 0.06, times: [0, 0.8, 1] } }} className="absolute left-0 top-0 z-[7] h-[22px] w-4 rounded-[3px] border-[1.5px] border-[#F5F1E8] [background:repeating-linear-gradient(45deg,#C0392B,#C0392B_3px,#E2B653_3px,#E2B653_4px)]" />;
        })}
      </Table>
      <div className="min-h-[70px] px-7 py-3 text-center text-[17px] leading-[1.45] tracking-[-0.01em]">
        <AnimatePresence>{stage >= 3 && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>👑 <b>{g.players[r.dealerIndex].name}</b> deals {r.cards} cards each<br />First card to <b>{g.players[r.firstPlayerIndex].name}</b></motion.div>}</AnimatePresence>
      </div>
      <div className="absolute bottom-7 text-[13px] text-[var(--tx2)]">Tap to skip</div>
    </motion.div>
  );
}

/* ===================== SHEETS ===================== */
const rulesBody = (g) => (
  <div className="text-[16px] leading-[1.55] text-[#dfe6e0]">
    {[
      ['🪑', 'Seating & dealing', <>Sit in a circle. The dealer deals one card at a time, starting with the player on their <b>{g ? word(g) : 'left'}</b> and finishing with themselves. The deal passes to the next player each round.</>],
      ['🔢', 'Card sequence', <>Start at <b>3</b> cards and go up one at a time to the maximum (<b>10</b> for 3–5 players, <b>8</b> for 6, <b>7</b> for 7). Repeat the max once, come back down to 3, repeat 3 once, then climb again.<div className="mt-1 text-[13px] text-[var(--tx2)]">10-card game: 3 4 5 6 7 8 9 10 10 9 8 7 6 5 4 3 3 4 …</div></>],
      ['♠', 'Trump order', <>Trump rotates every round: <b>♠ Spades → <span className="text-[#FF5A5A]">♦ Diamonds</span> → ♣ Clubs → <span className="text-[#FF5A5A]">♥ Hearts</span></b>, then starts again.</>],
      ['🎯', 'Bidding & the dealer restriction', <>Everyone predicts how many tricks they will win (0 up to the cards dealt), starting with the player after the dealer. The dealer bids <b>last</b> and can’t pick a number that makes all bids add up to the cards dealt, so someone always misses.<div className="mt-2 rounded-2xl bg-white/[.06] p-3">4 players, 5 cards. The first three bid <b>2 + 1 + 0 = 3</b>. The dealer can’t bid <b>2</b>, because the total would be 5. Any other bid is fine.</div></>],
      ['🃏', 'Playing a trick', <>The player after the dealer leads. Follow the led suit if you can. If you can’t, play a trump or discard anything. The highest trump wins; with no trump, the highest card of the led suit wins. The winner leads next.</>],
      ['🏆', 'Scoring', <>
        <table className="my-1.5 w-full border-collapse"><thead><tr className="text-left"><th className="py-1.5">Bid</th><th>Made</th><th>Missed</th></tr></thead><tbody>{[[0, 10], [1, 10], [3, 30], [7, 70]].map(([b, v]) => <tr key={b} className="border-t border-white/10"><td className="py-2">{b}</td><td className="font-bold text-[var(--pos)]">+{v}</td><td className="font-bold text-[var(--neg)]">−{v}</td></tr>)}</tbody></table>
        <div className="text-[13px] text-[var(--tx2)]">Exactly your bid scores bid × 10 (a bid of 0 counts as 10). Any other number of tricks loses the same amount. Totals can go negative.</div></>],
    ].map(([ic, t, b]) => <div key={t} className="mb-5"><h3 className="disp mb-1.5 text-[20px] font-extrabold tracking-[-0.025em]">{ic} {t}</h3>{b}</div>)}
  </div>
);

function BoardBody() {
  const A = useApp(), g = A.game, done = doneRounds(g), t = totals(g);
  if (!done.length) return <p className="py-5 text-[16px] text-[var(--tx2)]">No finished rounds yet. Scores appear here after each round.</p>;
  return (
    <>
      <div className="mb-2 text-[13px] text-[var(--tx2)]">Tap a round to edit it.</div>
      <div className="no-scroll max-h-[calc(100%-28px)] overflow-auto rounded-2xl">
        <table className="min-w-full border-separate border-spacing-0 text-[13px]">
          <thead><tr><th className="sticky left-0 top-0 z-20 min-w-[112px] bg-[#0B1F17] px-2.5 py-2 text-left">Round</th>{g.players.map((p) => <th key={p.id} className="sticky top-0 z-10 min-w-[76px] bg-[#0B1F17] px-1 py-2 text-center"><div className="mx-auto mb-0.5 grid h-8 w-8 place-items-center rounded-full text-[18px]" style={{ background: p.color }}>{p.emoji}</div><div className="font-medium text-[var(--tx2)]">{trunc(p.name)}</div><div className={`disp text-[20px] font-extrabold ${t[p.id] < 0 ? 'text-[var(--neg)]' : t[p.id] > 0 ? 'text-[var(--pos)]' : ''}`}>{fmt(t[p.id])}</div></th>)}</tr></thead>
          <tbody>
            {done.map((r) => (
              <tr key={r.index} onClick={() => A.setSheet({ type: 'edit', i: r.index })} className="cursor-pointer active:bg-white/5">
                <td className="sticky left-0 z-[5] min-w-[112px] bg-[#0B1F17] px-2.5 py-1.5 text-left font-bold">R{r.index + 1} · {r.cards}{suit(r.trump)} · {g.players[r.dealerIndex].name}</td>
                {g.players.map((p) => { const v = pts(r, p.id), ok = r.results[p.id] === 'made'; return <td key={p.id} className="border-b border-white/[.06] bg-[#0B1F17] px-1 py-1.5 text-center"><div>{r.bids[p.id]} <span className={ok ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}>{ok ? '✓' : '✗'}</span></div><div className={`text-[15px] font-extrabold ${v > 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>{v == null ? '–' : sgnN(v)}</div></td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function EditBody({ i }) {
  const A = useApp(), g = A.game, r = g.rounds[i], od = bidOrder(g, r);
  const [bids, setBids] = useState({ ...r.bids }), [res, setRes] = useState({ ...r.results });
  const allMade = g.players.every((p) => res[p.id] === 'made');
  return (
    <>
      <div className="mb-2 text-[13px] text-[var(--tx2)]">{r.cards} cards · {TR[r.trump].name} · dealt by {g.players[r.dealerIndex].name}</div>
      {od.map((k) => { const p = g.players[k]; return (
        <Glass key={p.id} spot={false} className="mb-2 flex items-center gap-2.5 p-2.5">
          <Dot p={p} s={40} />
          <div className="min-w-0 flex-1"><div className="truncate text-[18px] font-bold tracking-[-0.015em]">{p.name}</div>
            <div className="mt-1 flex items-center">
              <motion.button whileTap={{ scale: 0.88 }} aria-label="Lower bid" onClick={() => setBids((b) => ({ ...b, [p.id]: Math.max(0, b[p.id] - 1) }))} className="h-10 w-10 rounded-xl bg-white/[.07] text-[22px] font-bold">−</motion.button>
              <output className="disp w-8 text-center text-[22px] font-extrabold">{bids[p.id]}</output>
              <motion.button whileTap={{ scale: 0.88 }} aria-label="Raise bid" onClick={() => setBids((b) => ({ ...b, [p.id]: Math.min(r.cards, b[p.id] + 1) }))} className="h-10 w-10 rounded-xl bg-white/[.07] text-[22px] font-bold">+</motion.button>
            </div></div>
          <Seg uid={'e' + p.id} size="sm" value={res[p.id]} onChange={(v) => setRes((s) => ({ ...s, [p.id]: v }))} options={[{ v: 'made', label: '✓', tone: 'pos' }, { v: 'missed', label: '✗', tone: 'neg' }]} />
        </Glass>
      ); })}
      {allMade && <div className="py-2 text-[14px] font-medium text-[var(--warn)]">Someone has to miss — the bids can’t all be right. Check again.</div>}
      <PrimaryButton className="mt-2 w-full" disabled={allMade} onClick={() => { A.commit((gg) => { const rr = gg.rounds[i]; rr.bids = { ...bids }; rr.results = { ...res }; rr.tricks = null; }, { undo: true, toast: `Round ${i + 1} updated` }); A.setSheet({ type: 'board' }); }}>Save</PrimaryButton>
    </>
  );
}
function UpcomingBody() {
  const A = useApp(), g = A.game, cr = curRound(g), base = cr.phase === 'done' ? cr.index + 1 : cr.index;
  return (
    <>
      {Array.from({ length: 7 }, (_, k) => {
        const i = base + k, r = roundAt(g, i), tag = r.cards === g.maxCards ? 'Peak round' : r.cards === 3 && i > 0 ? 'Back to 3' : '';
        return (
          <motion.div key={i} {...stagger(k)} className="mb-2">
            <Glass className={`flex min-h-[72px] items-center gap-3 p-3 ${k === 0 ? 'ring-1 ring-[var(--accent)] shadow-[0_0_28px_-6px_var(--glow)]' : ''}`}>
              <div className="disp min-w-12 text-center text-[40px] font-extrabold leading-none tracking-[-0.04em]">{r.cards}</div>
              <div className="w-[34px] text-center text-[30px]" style={{ color: TR[r.trump].col }}>{TR[r.trump].sym}</div>
              <div className="min-w-0 flex-1 text-[16px] leading-[1.3]"><div className="text-[13px] font-bold text-[var(--tx2)]">{k === 0 ? (cr.phase === 'done' ? 'NEXT · ' : 'NOW · ') : ''}ROUND {i + 1} {tag && <span className="ml-1 rounded-[10px] bg-[var(--gold)] px-2 py-0.5 text-[13px] text-[#3a2808]">{tag}</span>}</div>👑 {g.players[r.dealerIndex].name} deals → {g.players[r.firstPlayerIndex].name} first</div>
              <div className="flex w-10 flex-wrap justify-center gap-[3px]">{g.players.map((_, j) => <i key={j} className={`h-2 w-2 rounded-full ${j === r.dealerIndex ? 'bg-[var(--gold)] shadow-[0_0_6px_var(--gold)]' : 'bg-white/25'}`} />)}</div>
            </Glass>
          </motion.div>
        );
      })}
      <p className="p-1.5 text-center text-[13px] text-[var(--tx2)]">Cards, trump and dealer come straight from the seating order.</p>
    </>
  );
}
function MenuBody() {
  const A = useApp();
  const items = [['📖', 'Rules', () => A.setSheet({ type: 'rules' })], ['📊', 'Scoreboard', () => A.setSheet({ type: 'board' })], ['🗓️', 'Upcoming rounds', () => A.setSheet({ type: 'upcoming' })], ['↩️', 'Undo last action', () => A.undoLast()], ['🏁', 'End game', () => { A.setSheet(null); A.ask('End the game and crown the winner?', 'End game', A.finishGame, true); }, 'neg'], ['🏠', 'Quit to home', () => { A.setSheet(null); A.go('home', -1); }]];
  return <>{items.map(([ic, t, f, tone], i) => <motion.button key={t} {...stagger(i)} whileTap={{ scale: 0.97, backgroundColor: 'rgba(255,255,255,.07)' }} onClick={f} className={`flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-[18px] font-medium tracking-[-0.012em] ${tone === 'neg' ? 'text-[var(--neg)]' : ''}`}><span className="w-7 text-center text-[22px]">{ic}</span>{t}</motion.button>)}</>;
}
function SeatBody({ k }) {
  const A = useApp(), s = A.su.seats[k];
  const upd = (f) => A.setSu((x) => ({ ...x, seats: x.seats.map((q, i) => (i === k ? f(q) : q)) }));
  if (!s) return null;
  return <>{[['✏️', 'Rename', () => A.setSheet({ type: 'rename', k })], [s.emoji, 'Change avatar', () => A.setSheet({ type: 'avatar', k })], ['🗑️', 'Clear seat', () => { A.setSu((x) => ({ ...x, seats: x.seats.map((q, i) => (i === k ? null : q)) })); A.setSheet(null); }, 'neg']].map(([ic, t, f, tone]) => <motion.button key={t} whileTap={{ scale: 0.97 }} onClick={f} className={`flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-[18px] font-medium ${tone ? 'text-[var(--neg)]' : ''}`}><span className="w-7 text-center text-[22px]">{ic}</span>{t}</motion.button>)}</>;
}
function RenameBody({ k }) {
  const A = useApp(), s = A.su.seats[k], [v, setV] = useState(s.name), [err, setErr] = useState('');
  const save = () => { const nm = v.trim(); if (!nm) return; if (A.su.seats.some((q, i) => q && i !== k && q.name.toLowerCase() === nm.toLowerCase())) { setErr(`${nm} is already at the table.`); return; } A.setSu((x) => ({ ...x, seats: x.seats.map((q, i) => (i === k ? { ...q, name: nm } : q)) })); A.setSheet(null); };
  return <><input autoFocus id="rn" value={v} maxLength={14} onChange={(e) => { setV(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && save()} className="mb-1 h-14 w-full rounded-2xl bg-white/[.07] px-4 text-[18px] outline-none focus:shadow-[0_0_0_3px_var(--glow)]" /><div className="min-h-6 text-[14px] text-[var(--warn)]">{err}</div><PrimaryButton className="w-full" onClick={save}>Save</PrimaryButton></>;
}
function AvatarBody({ k }) {
  const A = useApp(), s = A.su.seats[k];
  const set = (f) => A.setSu((x) => ({ ...x, seats: x.seats.map((q, i) => (i === k ? { ...q, ...f } : q)) }));
  return (
    <>
      <div className="mb-4 grid grid-cols-7 gap-2">{EMOJIS.concat(MOREMOJI).map((e) => <motion.button key={e} whileTap={{ scale: 0.88 }} onClick={() => set({ emoji: e })} className={`glass grid aspect-square min-h-11 place-items-center !rounded-2xl text-[26px] ${s.emoji === e ? 'ring-2 ring-[var(--accent)]' : ''}`}>{e}</motion.button>)}</div>
      <div className="mb-4 flex gap-2.5">{COLORS.map((c) => <motion.button key={c} aria-label="Colour" whileTap={{ scale: 0.85 }} onClick={() => set({ color: c })} className={`h-11 w-11 rounded-full border-[3px] ${s.color === c ? 'border-[#F5F1E8]' : 'border-transparent'}`} style={{ background: c }} />)}</div>
      <PrimaryButton className="w-full" onClick={() => A.setSheet(null)}>Done</PrimaryButton>
    </>
  );
}
function ShareBody() {
  const A = useApp(), g = A.game, [img, setImg] = useState(null);
  useEffect(() => {
    const st = standings(g), c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
    const bg = x.createRadialGradient(540, 0, 50, 540, 300, 1200); bg.addColorStop(0, '#0E2A1F'); bg.addColorStop(1, '#06120D'); x.fillStyle = bg; x.fillRect(0, 0, 1080, 1350);
    x.textAlign = 'center'; const gd = x.createLinearGradient(300, 0, 780, 0); gd.addColorStop(0, '#F7E7A6'); gd.addColorStop(0.5, '#D4A23A'); gd.addColorStop(1, '#A8761E'); x.fillStyle = gd; x.font = '800 96px Bricolage Grotesque, system-ui, sans-serif'; x.fillText('Kachuful', 540, 130);
    x.fillStyle = '#A9B8AF'; x.font = '500 34px DM Sans, system-ui, sans-serif'; x.fillText(`${doneRounds(g).length} rounds · final scores`, 540, 185);
    [[2, 150, 230], [1, 420, 330], [3, 690, 160]].forEach(([k, px, hh]) => {
      const m = st.filter((s) => s.rank === k), cx = px + 120, top = 740 + 330 - hh; x.fillStyle = k === 1 ? '#D4A23A' : k === 2 ? '#C9D3DD' : '#D08A5B'; x.beginPath(); x.roundRect(px, top, 240, hh, 18); x.fill();
      x.fillStyle = '#1a1a1a'; x.font = '800 72px Bricolage Grotesque, sans-serif'; x.fillText(k === 1 ? '1st' : k === 2 ? '2nd' : '3rd', cx, top + 84);
      m.slice(0, 2).forEach((s, j) => { const ax = cx + (m.length > 1 ? (j ? 55 : -55) : 0), ay = top - 70; x.fillStyle = s.p.color; x.beginPath(); x.arc(ax, ay, 46, 0, 7); x.fill(); x.font = '56px sans-serif'; x.fillStyle = '#000'; x.fillText(s.p.emoji, ax, ay + 19); x.fillStyle = '#F5F1E8'; x.font = '700 30px DM Sans, sans-serif'; x.fillText(s.p.name.slice(0, 9), ax, ay - 62); });
    });
    st.slice(0, 7).forEach((s, i) => { const yy = 1110 + i * 38; x.textAlign = 'left'; x.fillStyle = '#F5F1E8'; x.font = '700 28px DM Sans, sans-serif'; x.fillText(`${s.rank}.  ${s.p.emoji}  ${s.p.name.slice(0, 12)}`, 220, yy); x.textAlign = 'right'; x.fillStyle = s.t < 0 ? '#FF5C6C' : '#4ADE80'; x.fillText(fmt(s.t), 860, yy); });
    const url = c.toDataURL('image/png'); setImg(url);
    c.toBlob(async (b) => { try { const f = new File([b], 'kachuful-scores.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Kachuful scores' }); } catch (e) {} });
  }, []);
  return <div className="text-center">{img && <motion.img initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} src={img} alt="Final scores card" className="mx-auto max-h-[56dvh] max-w-full rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,.7)]" />}<p className="mt-3 text-[14px] text-[var(--tx2)]">Press and hold the image to save or share it.</p></div>;
}
export function SheetHost() {
  const A = useApp(), [s0] = useState(A.sheet), s = s0, close = () => A.setSheet(null);
  const T = { menu: ['Menu', <MenuBody />], rules: ['How to play', rulesBody(A.game)], board: ['Scoreboard', <BoardBody />, true], edit: [`Edit round ${s.i + 1}`, <EditBody i={s.i} />, true], upcoming: ['Upcoming rounds', <UpcomingBody />, true], seat: [A.su && A.su.seats[s.k] ? A.su.seats[s.k].name : 'Seat', <SeatBody k={s.k} />], rename: ['Rename', <RenameBody k={s.k} />], avatar: ['Choose avatar', <AvatarBody k={s.k} />], share: ['Share', <ShareBody />] }[s.type];
  return <Sheet title={T[0]} full={T[2]} onClose={close}>{T[1]}</Sheet>;
}
