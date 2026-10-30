/* Kachuful rules engine. Pure functions, same behaviour as the original prototype. */
export const TRUMPS = ['spades', 'diamonds', 'clubs', 'hearts'];
export const TR = {
  spades:   { sym: '♠', name: 'Spades',   acc: '#7FB3FF', glow: 'rgba(127,179,255,.25)', col: '#E8EEF8' },
  diamonds: { sym: '♦', name: 'Diamonds', acc: '#FF7A45', glow: 'rgba(255,122,69,.25)',  col: '#FF5A5A' },
  clubs:    { sym: '♣', name: 'Clubs',    acc: '#A98BFF', glow: 'rgba(169,139,255,.25)', col: '#E8EEF8' },
  hearts:   { sym: '♥', name: 'Hearts',   acc: '#FF4F8B', glow: 'rgba(255,79,139,.25)',  col: '#FF5A5A' },
};
export const COLORS = ['#FF8A65', '#4FC3F7', '#FFD54F', '#81C784', '#BA68C8', '#F06292', '#4DB6AC'];
export const EMOJIS = ['🦁', '🐯', '🦊', '🐼', '🐸', '🦄', '🐙'];
export const MOREMOJI = ['🐻', '🐨', '🐵', '🦉', '🐧', '🦋', '🐲', '🐬', '🦖', '🐰', '🦅', '🐺', '🐢', '🦒'];

export const maxFor = (n) => (n <= 5 ? 10 : n === 6 ? 8 : 7);
export const cycleLen = (max) => 2 * (max - 2);
export function cardsFor(i, max) {
  const L = cycleLen(max), p = i % L;
  return p < max - 2 ? 3 + p : max - (p - (max - 2));
}
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const sgnN = (v) => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
export const trunc = (s) => (s.length > 8 ? s.slice(0, 7) + '…' : s);

const derive = (g, i) => {
  const n = g.players.length, d = (g.firstDealerIndex + i) % n;
  return { index: i, cards: cardsFor(i, g.maxCards), trump: TRUMPS[i % 4], dealerIndex: d, firstPlayerIndex: (d + 1) % n };
};
export const newRound = (g, i) => ({ ...derive(g, i), bids: {}, results: {}, tricks: null, hookHits: 0, phase: 'bidding' });
export const roundAt = (g, i) => g.rounds[i] || derive(g, i);
export const curRound = (g) => g.rounds[g.rounds.length - 1];
export const bidOrder = (g, r) => Array.from({ length: g.players.length }, (_, k) => (r.firstPlayerIndex + k) % g.players.length);
export const doneRounds = (g) => g.rounds.filter((r) => r.phase === 'done');
export function forbiddenFor(g, r) {
  const dl = g.players[r.dealerIndex];
  let s = 0;
  for (const p of g.players) {
    if (p.id === dl.id) continue;
    if (r.bids[p.id] === undefined) return null;
    s += r.bids[p.id];
  }
  const f = r.cards - s;
  return f >= 0 && f <= r.cards ? f : null;
}
export const sumBids = (r) => Object.values(r.bids).reduce((a, b) => a + b, 0);
export function pts(r, pid) {
  const b = r.bids[pid], res = r.results[pid];
  if (b === undefined || !res) return null;
  const v = Math.max(b, 1) * 10;
  return res === 'made' ? v : -v;
}
export function totals(g, rounds) {
  const t = {};
  g.players.forEach((p) => (t[p.id] = 0));
  (rounds || doneRounds(g)).forEach((r) => g.players.forEach((p) => { const v = pts(r, p.id); if (v != null) t[p.id] += v; }));
  return t;
}
export function standings(g, rounds) {
  const t = totals(g, rounds);
  const a = g.players.map((p, i) => ({ p, i, t: t[p.id] })).sort((x, y) => y.t - x.t || x.i - y.i);
  let rk = 0;
  a.forEach((x, k) => { if (k === 0 || x.t !== a[k - 1].t) rk = k + 1; x.rank = rk; });
  return a;
}
export function streaks(g) {
  const out = {};
  g.players.forEach((p) => { let s = 0; for (const r of doneRounds(g)) { if (r.results[p.id] === 'made') s++; else s = 0; } out[p.id] = s; });
  return out;
}
export const totalRounds = (g) => (g.lengthMode === 'endless' ? Infinity : cycleLen(g.maxCards) * (g.lengthMode === '1cycle' ? 1 : 2));
export function resultsState(g, r) {
  const exact = !!r.tricks, rows = g.players;
  const all = rows.every((p) => r.results[p.id]);
  const allMade = all && rows.every((p) => r.results[p.id] === 'made');
  let msg = '';
  if (exact) {
    const tsum = rows.reduce((a, p) => a + (r.tricks[p.id] || 0), 0);
    if (tsum !== r.cards) msg = `Tricks add up to ${tsum} — should be ${r.cards}.`;
  }
  if (!msg && allMade) msg = "Someone has to miss — the bids can't all be right. Check again.";
  return { all, msg, ok: all && !msg, exact };
}
export function gameStats(g) {
  const S = {};
  g.players.forEach((p) => (S[p.id] = { p, exact: 0, best: -1e9, worst: 1e9, run: 0, maxRun: 0, hook: 0 }));
  doneRounds(g).forEach((r) => {
    g.players.forEach((p) => {
      const s = S[p.id], v = pts(r, p.id);
      if (r.results[p.id] === 'made') { s.exact++; s.run++; s.maxRun = Math.max(s.maxRun, s.run); } else s.run = 0;
      if (v != null) { s.best = Math.max(s.best, v); s.worst = Math.min(s.worst, v); }
    });
    S[g.players[r.dealerIndex].id].hook += r.hookHits || 0;
  });
  const A = Object.values(S), top = (f) => A.reduce((a, b) => (f(b) > f(a) ? b : a), A[0]);
  return { sharp: top((s) => s.exact), big: top((s) => s.best), streak: top((s) => s.maxRun), hook: top((s) => s.hook), ouch: top((s) => -s.worst) };
}

export function demoGame() {
  const now = Date.now();
  const P = [['Aarav', '🦁'], ['Riya', '🐯'], ['Kabir', '🦊'], ['Meera', '🐼'], ['Dev', '🐸']].map(([n, e], i) => ({ id: 'p' + i, name: n, emoji: e, color: COLORS[i] }));
  const g = { id: 'demo', createdAt: now - 3600e3, updatedAt: now - 12 * 60e3, players: P, direction: 'cw', firstDealerIndex: 0, maxCards: 10, lengthMode: 'endless', rounds: [], status: 'active', ui: { view: 'round', bidIdx: 2 } };
  const D = [
    [[1, 1, 0, 0, 0], [1, 1, 1, 0, 1], 0], [[1, 1, 2, 1, 0], [0, 0, 1, 0, 1], 0], [[1, 1, 1, 2, 1], [1, 1, 0, 1, 1], 1],
    [[1, 2, 0, 1, 3], [1, 1, 1, 0, 0], 2], [[2, 2, 1, 1, 2], [1, 0, 1, 0, 1], 0], [[3, 3, 2, 1, 1], [0, 0, 1, 0, 1], 0],
  ];
  D.forEach(([b, m, h], i) => {
    const r = { ...derive(g, i), bids: {}, results: {}, tricks: null, hookHits: h, phase: 'done' };
    P.forEach((p, k) => { r.bids[p.id] = b[k]; r.results[p.id] = m[k] ? 'made' : 'missed'; });
    g.rounds.push(r);
  });
  g.rounds.push({ ...derive(g, 6), bids: { p2: 2, p3: 3 }, results: {}, tricks: null, hookHits: 0, phase: 'bidding' });
  return g;
}

const mem = {};
export const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch (e) {} return k in mem ? mem[k] : d; },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
export const agoTxt = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' d ago'; };
