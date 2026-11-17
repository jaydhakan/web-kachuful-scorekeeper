/** Date ranges for boards and stats, as half-open [from, to) epoch ms in a timezone. */
import { dayRange, midnight, partsIn } from '../../../progression/zone';

export { dayOf, dayRange, midnight, monthOf, monthRange, partsIn } from '../../../progression/zone';

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
