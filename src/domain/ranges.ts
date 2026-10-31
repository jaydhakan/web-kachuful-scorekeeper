/** Date ranges for boards and stats, as half-open [from, to) epoch ms in a timezone. */

export type RangeKind = 'today' | '7d' | 'month' | 'lastMonth' | 'all' | 'custom';

export interface Range {
  kind: RangeKind;
  from: number;
  to: number;
}

const DAY = 864e5;
// A day or a week may be an hour longer across a clock change.
const SLACK = 3600e3;

/** More than this many rounds in the range earns a rank on a rate board (average, accuracy, win rate). */
export function minRoundsFor(from: number, to: number): number {
  const len = to - from;
  if (len <= DAY + SLACK) return 10;
  if (len <= 7 * DAY + SLACK) return 25;
  return 50;
}

/** Year, month (0-based) and day of an instant in a timezone (the device's when tz is undefined). */
export function partsIn(
  t: number,
  tz?: string,
): { y: number; m: number; d: number; h: number; min: number } {
  if (!tz) {
    const x = new Date(t);
    return {
      y: x.getFullYear(),
      m: x.getMonth(),
      d: x.getDate(),
      h: x.getHours(),
      min: x.getMinutes(),
    };
  }
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(t);
  const get = (k: string) => Number(f.find((p) => p.type === k)?.value);
  return { y: get('year'), m: get('month') - 1, d: get('day'), h: get('hour'), min: get('minute') };
}

/** Midnight at the start of a calendar date in a timezone. */
export function midnight(y: number, m: number, d: number, tz?: string): number {
  if (!tz) return new Date(y, m, d).getTime();
  // Start from UTC midnight and correct by the zone's offset (twice, for offsets that change that day).
  let t = Date.UTC(y, m, d);
  for (let i = 0; i < 2; i++) {
    const p = partsIn(t, tz);
    const shown = Date.UTC(p.y, p.m, p.d, p.h, p.min);
    t -= shown - Date.UTC(y, m, d);
  }
  return t;
}

/** 'YYYY-MM-DD' of an instant in a timezone. */
export function dayOf(t: number, tz?: string): string {
  const p = partsIn(t, tz);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** 'YYYY-MM' of an instant in a timezone. */
export const monthOf = (t: number, tz?: string): string => dayOf(t, tz).slice(0, 7);

export function dayRange(day: string, tz?: string): [number, number] {
  const [y, m, d] = day.split('-').map(Number);
  return [midnight(y, m - 1, d, tz), midnight(y, m - 1, d + 1, tz)];
}

export function monthRange(month: string, tz?: string): [number, number] {
  const [y, m] = month.split('-').map(Number);
  return [midnight(y, m - 1, 1, tz), midnight(y, m, 1, tz)];
}

/** A preset range around `now`. "Last 7 days" is today and the six days before it. */
export function rangeFor(kind: Exclude<RangeKind, 'custom'>, now: number, tz?: string): Range {
  const { y, m, d } = partsIn(now, tz);
  const tomorrow = midnight(y, m, d + 1, tz);
  switch (kind) {
    case 'today':
      return { kind, from: midnight(y, m, d, tz), to: tomorrow };
    case '7d':
      return { kind, from: midnight(y, m, d - 6, tz), to: tomorrow };
    case 'month':
      return { kind, from: midnight(y, m, 1, tz), to: midnight(y, m + 1, 1, tz) };
    case 'lastMonth':
      return { kind, from: midnight(y, m - 1, 1, tz), to: midnight(y, m, 1, tz) };
    case 'all':
      return { kind, from: 0, to: tomorrow };
  }
}

/** A custom range of whole days, both ends included. */
export function customRange(fromDay: string, toDay: string, tz?: string): Range {
  const [a, b] = fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay];
  return { kind: 'custom', from: dayRange(a, tz)[0], to: dayRange(b, tz)[1] };
}

/** The window of the same length just before this one (for rank movement). */
export const previousWindow = (from: number, to: number): [number, number] => [
  Math.max(0, from - (to - from)),
  from,
];
