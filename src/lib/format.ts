export const sgnN = (v: number): string => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
export const trunc = (s: string): string => (s.length > 8 ? s.slice(0, 7) + '…' : s);
export const fmt = (v: number): string => (v < 0 ? '−' + Math.abs(v) : String(v));
export const agoTxt = (t: number, now = Date.now()): string => {
  const m = Math.max(1, Math.round((now - t) / 60000));
  return m < 60
    ? m + ' min ago'
    : m < 1440
      ? Math.round(m / 60) + ' hr ago'
      : Math.round(m / 1440) + ' d ago';
};
