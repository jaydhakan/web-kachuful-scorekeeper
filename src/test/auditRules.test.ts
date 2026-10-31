import type { ScreenReport } from '../../e2e/audit';
import { violations } from '../../e2e/audit-rules';

const clean = (screen: string): ScreenReport => ({
  screen,
  primary: null,
  offscreenControls: [],
  offscreen: [],
  clipped: [],
  shortened: [],
  scrolls: [],
  overlaps: [],
  smallTargets: [],
  covered: [],
  pageOverflow: [],
});
const phone = { width: 390, height: 844, players: 5 };

describe('audit rules', () => {
  it('passes a clean screen', () => {
    expect(violations(clean('09-bidding'), phone)).toEqual([]);
  });

  it.each<[string, Partial<ScreenReport>]>([
    ['primary', { primary: 'covered' }],
    ['offscreenControls', { offscreenControls: ['Bid 3'] }],
    ['offscreen', { offscreen: ['Konstan…'] }],
    ['clipped', { clipped: ['Guadalupe'] }],
    ['overlaps', { overlaps: ['a × b'] }],
    ['smallTargets', { smallTargets: ['Colour 31×44'] }],
    ['pageOverflow', { pageOverflow: ['412 > 390'] }],
  ])('fails on %s', (_k, patch) => {
    expect(violations({ ...clean('15-play'), ...patch }, phone)).toHaveLength(1);
  });

  it('does not count shortened names or covered candidates', () => {
    expect(
      violations({ ...clean('15-play'), shortened: ['Barthol…'], covered: ['seat'] }, phone),
    ).toEqual([]);
  });

  it('wants one-screen layouts not to scroll on a portrait phone of 360x640 and up', () => {
    const r = { ...clean('02-setup1'), scrolls: ['Content'] };
    expect(violations(r, phone)).toHaveLength(1);
    expect(violations(r, { width: 360, height: 640, players: 3 })).toHaveLength(1);
    expect(violations(r, { width: 320, height: 568, players: 3 })).toEqual([]);
    expect(violations(r, { width: 844, height: 390, players: 3 })).toEqual([]);
  });

  it('lets six or seven players scroll the Results and Summary lists, but not five', () => {
    const r = { ...clean('17-summary'), scrolls: ['Standings'] };
    expect(violations(r, { ...phone, players: 5 })).toHaveLength(1);
    expect(violations(r, { ...phone, players: 7 })).toEqual([]);
  });

  it('lets sheets scroll', () => {
    expect(violations({ ...clean('11-sheet-rules'), scrolls: ['How to play'] }, phone)).toEqual([]);
  });
});
