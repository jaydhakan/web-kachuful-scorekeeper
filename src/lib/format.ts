export const sgnN = (v: number): string => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
export const trunc = (s: string): string => (s.length > 8 ? s.slice(0, 7) + '…' : s);
export const fmt = (v: number): string => (v < 0 ? '−' + Math.abs(v) : String(v));
export const agoTxt = (t: number, now = Date.now()): string => {
  const m = Math.max(1, Math.round((now - t) / 60000));
  const d = Math.round(m / 1440);
  if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' hr ago';
  if (d < 14) return d + ' d ago';
  return d < 60 ? Math.round(d / 7) + ' wk ago' : Math.round(d / 30.44) + ' mo ago';
};
