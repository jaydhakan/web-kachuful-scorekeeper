import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence, MotionConfig, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { TR, EMOJIS, COLORS, maxFor, clone, newRound, curRound, bidOrder, forbiddenFor, roundAt, doneRounds, totalRounds, resultsState, demoGame, LS } from './logic.js';
import { AppCtx } from './ctx.js';
import { Toast, Banner, Modal, Sheet, EASE, SPRING, SPRING_POP, PrimaryButton, Glass, Confetti } from './ui.jsx';
import { Home, Setup, Bidding, Play, Results, Summary, Winner, RoundStart, SheetHost } from './screens.jsx';

const KEY = 'kachuful.v1';
const vib = () => { try { navigator.vibrate && navigator.vibrate(10); } catch (e) {} };

function usePhone() {
  const [game, setGame] = useState(() => {
    let sv = LS.get(KEY, null);
    if (!sv || !sv.players) {
      sv = demoGame(); LS.set(KEY, sv);
      if (!LS.get('kachuful.lastGroup', null)) {
        LS.set('kachuful.lastGroup', { names: sv.players.map((p) => p.name), emojis: sv.players.map((p) => p.emoji), colors: sv.players.map((p) => p.color), direction: 'cw' });
        LS.set('kachuful.recentNames', sv.players.map((p) => p.name));
      }
    }
    return sv;
  });
  const gref = useRef(game);
  const undo = useRef(LS.get('kachuful.undo', []));
  const [screen, setScreen] = useState(() => { const s = LS.get('kachuful.screen', 'home'); return s === 'round' || s === 'winner' ? s : 'home'; });
  const [dir, setDir] = useState(1);
  const [su, setSu] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [banner, setBanner] = useState(null);
  const [seq, setSeq] = useState(null);
  const [fresh, setFresh] = useState(false);
  const [sumAnim, setSumAnim] = useState(false);
  const tRef = useRef(); const bRef = useRef(); const advRef = useRef();

  useEffect(() => { gref.current = game; }, [game]);
  useEffect(() => { LS.set('kachuful.screen', screen); }, [screen]);
  // wake lock while a game is active
  useEffect(() => {
    let wl = null, dead = false;
    const req = async () => { try { if ('wakeLock' in navigator && game.status === 'active' && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; } };
    req();
    const vis = () => { if (document.visibilityState === 'visible') req(); };
    document.addEventListener('visibilitychange', vis);
    return () => { dead = true; document.removeEventListener('visibilitychange', vis); try { wl && wl.release(); } catch (e) {} };
  }, [game.status]);

  const say = useCallback((msg, undoable) => { clearTimeout(tRef.current); setToast({ id: Date.now(), msg, undo: undoable }); tRef.current = setTimeout(() => setToast(null), 4000); }, []);
  const shout = useCallback((text) => { clearTimeout(bRef.current); setBanner(text); bRef.current = setTimeout(() => setBanner(null), 1600); }, []);
  const go = useCallback((s, d = 1) => { setDir(d); setScreen(s); }, []);

  const commit = useCallback((fn, o = {}) => {
    const g = clone(gref.current);
    if (o.undo) { undo.current.push(JSON.stringify(gref.current)); if (undo.current.length > 20) undo.current.shift(); }
    fn(g);
    g.updatedAt = Date.now();
    gref.current = g; setGame(g); LS.set(KEY, g); LS.set('kachuful.undo', undo.current);
    if (o.toast) say(o.toast, !!o.undo);
    return g;
  }, [say]);

  const undoLast = useCallback(() => {
    if (!undo.current.length) { say('Nothing to undo'); return; }
    const g = JSON.parse(undo.current.pop());
    clearTimeout(advRef.current);
    gref.current = g; setGame(g); LS.set(KEY, g); LS.set('kachuful.undo', undo.current);
    setSumAnim(false); setSheet(null); setDir(-1); setScreen(g.status === 'finished' ? 'winner' : 'round'); say('Undone');
  }, [say]);

  const ask = useCallback((text, ok, onOk, danger) => setModal({ text, ok, onOk, danger }), []);
  const startSeq = useCallback((round, prev, after) => setSeq({ round, prev, after }), []);
  const roundBanner = (g, r) => { if (r.cards === g.maxCards) shout(`Peak round — ${r.cards} cards!`); else if (r.cards === 3 && r.index > 0) shout('Back to 3 — climbing again'); };

  const A = {
    game, screen, dir, su, setSu, sheet, setSheet, modal, setModal, toast, banner, seq, setSeq, fresh, setFresh, sumAnim, setSumAnim,
    commit, undoLast, ask, say, shout, go, startSeq, vib,
    bid(v) {
      const g = gref.current, r = curRound(g), od = bidOrder(g, r), n = g.players.length, bi = g.ui.bidIdx, pI = od[bi], p = g.players[pI];
      if (pI === r.dealerIndex && v === forbiddenFor(g, r)) { commit((gg) => { curRound(gg).hookHits = (curRound(gg).hookHits || 0) + 1; }); vib(); return 'locked'; }
      let next = bi;
      commit((gg) => {
        const rr = curRound(gg); rr.bids[p.id] = v;
        if (pI === rr.dealerIndex) gg.ui.hookWarn = false;
        const miss = od.findIndex((i) => rr.bids[gg.players[i].id] === undefined);
        if (miss >= 0) next = miss;
        else { const f = forbiddenFor(gg, rr), dl = gg.players[rr.dealerIndex]; if (f != null && rr.bids[dl.id] === f) { delete rr.bids[dl.id]; gg.ui.hookWarn = true; } next = n - 1; }
      }, { undo: true, toast: 'Bid saved' });
      vib();
      if (next !== bi) { clearTimeout(advRef.current); advRef.current = setTimeout(() => commit((gg) => { gg.ui.bidIdx = next; }), 250); }
      return 'ok';
    },
    pickSeat(k) { const g = gref.current, r = curRound(g); if (r.phase !== 'bidding') return; const od = bidOrder(g, r), pos = od.indexOf(k), p = g.players[k]; if (r.bids[p.id] !== undefined || pos === g.ui.bidIdx) commit((gg) => { gg.ui.bidIdx = pos; }); },
    phase(ph, d = 1) { setDir(d); commit((g) => { curRound(g).phase = ph; if (ph === 'bidding') g.ui.bidIdx = 0; if (ph === 'playing') g.ui.hookWarn = false; }); },
    setResult(id, v) { commit((g) => { curRound(g).results[id] = v; }); vib(); },
    setTricks(id, d) { commit((g) => { const r = curRound(g); const v = Math.max(0, Math.min(r.cards, (r.tricks[id] || 0) + d)); r.tricks[id] = v; r.results[id] = v === r.bids[id] ? 'made' : 'missed'; }); vib(); },
    toggleExact() { commit((g) => { const r = curRound(g); if (r.tricks) r.tricks = null; else { r.tricks = {}; g.players.forEach((p) => { r.tricks[p.id] = r.results[p.id] === 'made' ? r.bids[p.id] : 0; r.results[p.id] = r.tricks[p.id] === r.bids[p.id] ? 'made' : 'missed'; }); } }); },
    confirmRound() {
      const g0 = gref.current, r0 = curRound(g0); if (!resultsState(g0, r0).ok) return;
      vib();
      const g = commit((g) => { curRound(g).phase = 'done'; if (g.rounds.length >= totalRounds(g)) g.status = 'finished'; else g.ui.view = 'summary'; }, { undo: true });
      setDir(1);
      if (g.status === 'finished') { setFresh(true); setScreen('winner'); } else { setSumAnim(true); setScreen('round'); say('Round saved', true); }
    },
    nextRound() {
      const pr = curRound(gref.current);
      const g = commit((gg) => { gg.rounds.push(newRound(gg, pr.index + 1)); gg.ui = { view: 'round', bidIdx: 0 }; }, { undo: true });
      const r = curRound(g);
      startSeq(r, pr.dealerIndex, () => roundBanner(g, r));
    },
    finishGame() { commit((g) => { g.status = 'finished'; }, { undo: true }); setFresh(true); go('winner', 1); },
    rematch() {
      const old = gref.current; const n = old.players.length;
      undo.current = [];
      const g = { id: 'g' + Date.now(), createdAt: Date.now(), updatedAt: Date.now(), players: old.players.map((p) => ({ ...p })), direction: old.direction, firstDealerIndex: (old.firstDealerIndex + 1) % n, maxCards: old.maxCards, lengthMode: old.lengthMode, rounds: [], status: 'active', ui: { view: 'round', bidIdx: 0 } };
      g.rounds.push(newRound(g, 0)); gref.current = g; setGame(g); LS.set(KEY, g); LS.set('kachuful.undo', []);
      go('round', 1); startSeq(g.rounds[0], null, () => roundBanner(g, g.rounds[0]));
    },
    beginGame(S) {
      const n = S.n, players = S.seats.map((p, i) => ({ id: 'p' + Date.now().toString(36) + i, name: p.name, emoji: p.emoji, color: p.color }));
      const g = { id: 'g' + Date.now(), createdAt: Date.now(), updatedAt: Date.now(), players, direction: S.dir, firstDealerIndex: S.dealer, maxCards: maxFor(n), lengthMode: S.length, rounds: [], status: 'active', ui: { view: 'round', bidIdx: 0 } };
      g.rounds.push(newRound(g, 0)); undo.current = [];
      const names = players.map((p) => p.name);
      LS.set('kachuful.lastGroup', { names, emojis: players.map((p) => p.emoji), colors: players.map((p) => p.color), direction: S.dir });
      const rn = LS.get('kachuful.recentNames', []); names.forEach((x) => { const k = rn.findIndex((y) => y.toLowerCase() === x.toLowerCase()); if (k >= 0) rn.splice(k, 1); rn.unshift(x); }); LS.set('kachuful.recentNames', rn.slice(0, 20));
      gref.current = g; setGame(g); LS.set(KEY, g); LS.set('kachuful.undo', []);
      go('round', 1); startSeq(g.rounds[0], null, () => roundBanner(g, g.rounds[0]));
    },
    startSetup() { setSu({ step: 1, n: null, dir: 'cw', seats: [], dealer: 0, length: 'endless', lg: LS.get('kachuful.lastGroup', null) }); go('setup', 1); },
    resume() { go(gref.current.status === 'finished' ? 'winner' : 'round', 1); },
  };

  const trump = (game && game.rounds.length) ? (seq ? seq.round.trump : (screen === 'home' || screen === 'setup' ? 'spades' : curRound(game).trump)) : 'spades';
  return { A, trump };
}

function Phone({ A, trump }) {
  const { game, screen, dir, seq, sheet, modal, toast, banner, fresh } = A;
  const th = TR[trump];
  const r = curRound(game);
  const screenKey = screen === 'round' ? `round-${game.ui.view}-${r.phase}` : screen === 'setup' ? `setup` : screen;
  const rm = useReducedMotion();
  const variants = {
    enter: (d) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 36, scale: 0.985 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d) => (rm ? { opacity: 0 } : { opacity: 0, x: d * -36, scale: 0.985 }),
  };
  let content;
  if (screen === 'home') content = <Home />;
  else if (screen === 'setup') content = <Setup />;
  else if (screen === 'winner') content = <Winner />;
  else if (game.ui.view === 'summary') content = <Summary />;
  else content = r.phase === 'bidding' ? <Bidding /> : r.phase === 'playing' ? <Play /> : <Results />;
  return (
    <div className="app-root scr-bg grain relative h-full w-full overflow-hidden" style={{ '--accent': th.acc, '--glow': th.glow, '--suit': th.col }}>
      <motion.div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[520px] -translate-x-1/2 rounded-full opacity-90 blur-3xl" style={{ background: 'radial-gradient(closest-side, var(--glow), transparent)' }} animate={rm ? undefined : { scale: [1, 1.08, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        <motion.div key={screenKey} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.42, ease: EASE }} className="absolute inset-0">
          {content}
        </motion.div>
      </AnimatePresence>
      <Banner text={banner} />
      <Toast toast={toast} onUndo={A.undoLast} />
      <AnimatePresence>{sheet && <SheetHost key={sheet.type} />}</AnimatePresence>
      <AnimatePresence>{modal && <Modal {...modal} onCancel={() => A.setModal(null)} onOk={() => { const f = modal.onOk; A.setModal(null); f(); }} />}</AnimatePresence>
      <AnimatePresence>{seq && <RoundStart key="seq" />}</AnimatePresence>
      {fresh && screen === 'winner' && <Confetti colors={[...A.game.players.map((p) => p.color), '#F7E7A6']} onDone={() => A.setFresh(false)} />}
    </div>
  );
}

function Hero({ A, scrollRef }) {
  const { scrollY } = useScroll({ container: scrollRef });
  const y1 = useTransform(scrollY, [0, 900], [0, -140]);
  const y2 = useTransform(scrollY, [0, 900], [0, 90]);
  const o = useTransform(scrollY, [0, 500], [1, 0.25]);
  const item = (i) => ({ initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.9, ease: EASE, delay: i * 0.08 } });
  const F = [
    ['Under 30 seconds a round', 'Bids, results and the leaderboard in about ten taps for five players. Nothing to type once the game starts.'],
    ['One phone, passed around', 'The deal guide names the dealer, the first card and the trump. The dealer’s locked bid is explained, never guessed.'],
    ['Colour follows the trump', 'Spades, diamonds, clubs, hearts. The whole table changes mood every round, so the room always knows what’s trump.'],
  ];
  return (
    <div className="relative hidden min-w-0 flex-1 px-[clamp(32px,6vw,96px)] pb-40 pt-[14vh] lg:block">
      <motion.div aria-hidden style={{ y: y1 }} className="pointer-events-none absolute -left-20 top-10 h-[520px] w-[520px] rounded-full blur-3xl [background:radial-gradient(closest-side,var(--glow),transparent)]" />
      <motion.div aria-hidden style={{ y: y2 }} className="pointer-events-none absolute right-0 top-[60vh] h-[420px] w-[420px] rounded-full opacity-60 blur-3xl [background:radial-gradient(closest-side,rgba(226,182,83,.18),transparent)]" />
      <motion.div style={{ opacity: o }} className="relative max-w-[640px]">
        <motion.p {...item(0)} className="mb-5 text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Judgement scorekeeper</motion.p>
        <motion.h1 {...item(1)} className="disp gold-text text-[clamp(64px,9vw,128px)] font-extrabold leading-[0.92] tracking-[-0.05em]">Kachuful.</motion.h1>
        <motion.p {...item(2)} className="mt-7 max-w-[30ch] text-[clamp(22px,2.4vw,32px)] font-medium leading-[1.2] tracking-[-0.022em] text-[var(--tx)]">Everyone plays the cards. The phone keeps the score.</motion.p>
        <motion.p {...item(3)} className="mt-4 max-w-[46ch] text-[18px] leading-[1.55] tracking-[-0.005em] text-[var(--tx2)]">Seating, dealer, trump, bids and the dealer’s hook, worked out for you. The demo game on the right is live. Tap Resume.</motion.p>
        <motion.div {...item(4)} className="mt-9"><PrimaryButton onClick={() => A.resume()} className="!h-14 w-[220px] !text-[17px]">Open the demo game</PrimaryButton></motion.div>
      </motion.div>
      <div className="relative mt-[22vh] grid max-w-[640px] gap-4">
        {F.map(([t, d], i) => (
          <motion.div key={t} {...item(i)}><Glass className="p-7"><h3 className="disp text-[26px] font-extrabold leading-tight tracking-[-0.03em]">{t}</h3><p className="mt-2 text-[17px] leading-[1.55] text-[var(--tx2)]">{d}</p></Glass></motion.div>
        ))}
      </div>
    </div>
  );
}

function Device({ children }) {
  const rx = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 }), ry = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });
  const rm = useReducedMotion();
  const move = (e) => { if (rm || e.pointerType !== 'mouse') return; const r = e.currentTarget.getBoundingClientRect(); ry.set(((e.clientX - r.left) / r.width - 0.5) * 5); rx.set(-((e.clientY - r.top) / r.height - 0.5) * 4); };
  const leave = () => { rx.set(0); ry.set(0); };
  return (
    <div className="h-full w-full lg:grid lg:place-items-center" style={{ perspective: 1600 }} onPointerMove={move} onPointerLeave={leave}>
      <motion.div style={{ rotateX: rx, rotateY: ry }} className="h-full w-full lg:h-[min(844px,calc(100dvh-48px))] lg:w-[390px] lg:overflow-hidden lg:rounded-[56px] lg:shadow-[0_60px_140px_-20px_rgba(0,0,0,.85),0_0_0_10px_#0c1512,0_0_0_11px_rgba(255,255,255,.1),0_0_120px_-10px_var(--shell-glow)]">
        {children}
      </motion.div>
    </div>
  );
}

function App() {
  const { A, trump } = usePhone();
  const scrollRef = useRef(null);
  const shellRef = scrollRef;
  const th = TR[trump];
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <AppCtx.Provider value={A}>
        <div ref={shellRef} className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-[var(--bg)] no-scroll" style={{ '--shell-glow': th.glow }}>
          <div className="h-full lg:h-auto lg:flex lg:min-h-full lg:items-start">
            <Hero A={A} scrollRef={scrollRef} />
            <div className="h-full w-full lg:sticky lg:top-0 lg:h-[100dvh] lg:w-[min(46vw,560px)] lg:shrink-0">
              <Device><Phone A={A} trump={trump} /></Device>
            </div>
          </div>
        </div>
      </AppCtx.Provider>
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')).render(<App />);
