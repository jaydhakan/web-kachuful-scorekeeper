import type { Preferences } from '@/sync/types';
import type { LastGroup } from './persistence';
import { setupDefaults } from './prefs';

/** Newest wins between this device's last group and the account's setup (backend-requests.md, request 3). */
const group = (n: number, o: Partial<LastGroup> = {}): LastGroup => ({
  names: Array.from({ length: n }, (_, i) => 'P' + i),
  emojis: [],
  colors: [],
  direction: 'cw',
  decks: 1,
  ...o,
});
const account = (
  playerCount: number,
  updatedAt: number | null,
  o: Partial<NonNullable<Preferences['setup']>> = {},
): Preferences => ({
  theme: null,
  setup: { playerCount, decks: 1, direction: 'cw', ...o },
  updatedAt,
});

describe('setup defaults: newest wins', () => {
  it('a device with no group takes the account’s setup', () => {
    expect(setupDefaults(null, account(5, 100, { direction: 'ccw' }))).toEqual({
      n: 5,
      decks: 1,
      dir: 'ccw',
    });
  });

  it('the account’s setup wins when it is newer and different', () => {
    expect(setupDefaults(group(4, { at: 50 }), account(8, 100, { decks: 2 }))).toEqual({
      n: 8,
      decks: 2,
      dir: 'cw',
    });
  });

  it('this device’s group wins when it is newer, or as new: nothing is preselected, as before', () => {
    expect(setupDefaults(group(4, { at: 200 }), account(8, 100, { decks: 2 }))).toBeNull();
    expect(setupDefaults(group(4, { at: 100 }), account(8, 100, { decks: 2 }))).toBeNull();
  });

  it('a newer time with the same table (the theme changed) preselects nothing', () => {
    expect(setupDefaults(group(5, { at: 50 }), account(5, 100))).toBeNull();
  });

  it('a group saved before groups had a time counts as older', () => {
    expect(setupDefaults(group(4), account(6, 100))).toEqual({ n: 6, decks: 1, dir: 'cw' });
  });

  it('nothing from the server, a never-changed account, or a setup that doesn’t fit, changes nothing', () => {
    expect(setupDefaults(null, null)).toBeNull();
    expect(setupDefaults(null, { theme: null, setup: null, updatedAt: 100 })).toBeNull();
    expect(setupDefaults(null, account(5, null))).toBeNull();
    expect(setupDefaults(null, account(9, 100))).toBeNull();
    expect(setupDefaults(null, account(5, 100, { direction: 'up' as never }))).toBeNull();
  });
});
