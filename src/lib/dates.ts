/** Dates in the device's timezone. */

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for the local day an instant falls on. */
export const dayKey = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Local midnight at the start of the day `t` falls on, `add` days later. */
export const startOfDay = (t: number, add = 0): number => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + add).getTime();
};

/** Parses 'YYYY-MM-DD' as local midnight. */
export const parseDay = (k: string): number => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const DAY_Y = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

/** "Today", "Yesterday", "Mon 27 Oct", or with the year when it is not this year. */
export function dayLabel(t: number, now = Date.now()): string {
  const d = (startOfDay(now) - startOfDay(t)) / 864e5;
  if (Math.round(d) === 0) return 'Today';
  if (Math.round(d) === 1) return 'Yesterday';
  return new Date(t).getFullYear() === new Date(now).getFullYear()
    ? DAY.format(t)
    : DAY_Y.format(t);
}

export const timeLabel = (t: number): string => TIME.format(t);
export const monthLabel = (t: number): string => MONTH.format(t);
export const shortDay = (t: number): string => DAY_Y.format(t);
