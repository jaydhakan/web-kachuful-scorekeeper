import { dayOf } from '@/progression/zone';

/** A festival the table dresses up for on the day (REWARDS-PLAN §8). */
export type Festival = 'diwali' | 'holi' | 'eid' | 'christmas' | 'newyear' | 'uttarayan';

/** Same date every year, as MM-DD. */
const FIXED: Record<string, Festival> = {
  '12-25': 'christmas',
  '12-31': 'newyear',
  '01-01': 'newyear',
  '01-14': 'uttarayan',
};

/**
 * Lunar festivals move every year: add the next year's rows before they run out (docs/codebase/TODO.md). Diwali and
 * Holi from publicholidays.in; Eid al-Fitr is tentative until the moon is sighted.
 */
const LUNAR: Record<string, Festival> = {
  '2026-11-08': 'diwali',
  '2027-03-10': 'eid',
  '2027-03-22': 'holi',
  '2027-10-29': 'diwali',
  '2028-02-27': 'eid',
  '2028-03-11': 'holi',
  '2028-10-17': 'diwali',
};

/** The festival on the day of `t` where the table is (the device's own time zone), if any. */
export function festivalOn(t: number, tz?: string): Festival | null {
  const day = dayOf(t, tz);
  return LUNAR[day] ?? FIXED[day.slice(5)] ?? null;
}
