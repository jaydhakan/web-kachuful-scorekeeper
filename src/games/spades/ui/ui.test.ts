import { storage } from '@/state/persistence';
import { SP_KEYS } from '@/games/spades/state/keys';
import { card, cards } from '@/games/spades/domain/__fixtures__/kit';
import { audible } from '@/games/spades/sound/sfx';
import { CARD_MAX, CARD_MIN, CARD_RATIO, fanLayout, indexSize, strip } from './fan';
import { sortHand } from './Hand';
import { readPrefs, resetPrefsForTests, writePrefs } from './prefs';

describe('the hand fan', () => {
  it.each([320, 360, 390, 430])('fits 13 cards inside %ipx', (w) => {
    const f = fanLayout(13, w);
    expect(f.cw).toBeGreaterThanOrEqual(CARD_MIN);
    expect(f.cw).toBeLessThanOrEqual(CARD_MAX);
    expect(f.slots[0].x).toBeGreaterThanOrEqual(0);
    expect(f.slots[12].x + f.cw).toBeLessThanOrEqual(w);
    // The end card's tilted outer corner stays on screen too.
    const r = (Math.abs(f.slots[12].r) * Math.PI) / 180;
    const swing = ((f.cw * CARD_RATIO) / 2) * Math.sin(r) - (f.cw / 2) * (1 - Math.cos(r));
    expect(f.slots[12].x + f.cw + swing).toBeLessThanOrEqual(w);
    expect(f.slots[0].x - swing).toBeGreaterThanOrEqual(0);
    // Every card keeps a visible strip to tap; the middle card is the arc's top.
    for (let i = 0; i < 12; i++) expect(strip(f, i)).toBeGreaterThan(19);
    expect(f.slots[6].y).toBeLessThan(f.slots[0].y);
  });

  it.each([320, 360, 390, 430])('keeps a "10" inside the strip at %ipx', (w) => {
    const f = fanLayout(13, w);
    const px = indexSize(f.cw, strip(f, 0));
    // Two bold digits, a font size wide, and the index's 3% inset.
    expect(px + f.cw * 0.03).toBeLessThanOrEqual(strip(f, 0));
    expect(px).toBeGreaterThanOrEqual(17);
  });

  it('keeps the fan nearly upright and the arc shallow, so every index reads', () => {
    const f = fanLayout(13, 390);
    expect(Math.max(...f.slots.map((p) => Math.abs(p.r)))).toBeLessThanOrEqual(8.5);
    expect(f.slots[0].y - f.slots[6].y).toBeLessThanOrEqual(8);
    expect(f.slots[6].y).toBeLessThan(f.slots[0].y);
  });

  it('grows the index with the room', () => {
    const at = (w: number) => {
      const f = fanLayout(13, w);
      return indexSize(f.cw, strip(f, 0));
    };
    expect(at(320)).toBeLessThan(at(430));
    expect(at(390)).toBeGreaterThanOrEqual(20);
  });

  it('never makes a card wider than the space allows', () => {
    expect(fanLayout(13, 1200).cw).toBe(CARD_MAX);
    expect(fanLayout(13, 800, 56).cw).toBe(56);
  });
});

describe('sortHand', () => {
  const h = cards('As 2h Kd 3c 10s Qh');
  it('alternates colours with spades on the right, low to high', () => {
    expect(sortHand(h, 'up')).toEqual(cards('Kd 3c 2h Qh 10s As'));
  });
  it('can sort each suit high to low', () => {
    expect(sortHand(h, 'down')).toEqual(cards('Kd 3c Qh 2h As 10s'));
    expect(sortHand([card('2c')], 'down')).toEqual([card('2c')]);
  });
});

describe('sounds and prefs', () => {
  beforeEach(() => resetPrefsForTests());

  it('plays everyone’s, only this player’s, or nothing', () => {
    expect(audible('all', false)).toBe(true);
    expect(audible('mine', false)).toBe(false);
    expect(audible('mine', true)).toBe(true);
    expect(audible('off', true)).toBe(false);
  });

  it('defaults to everyone’s sounds, survives junk, and keeps other keys', () => {
    expect(readPrefs()).toEqual({ sort: 'up', sounds: 'all', autoSingle: false });
    storage.set(SP_KEYS.prefs, { sort: 'sideways', sounds: 'mine', autoSingle: 'yes', other: 1 });
    expect(readPrefs()).toEqual({ sort: 'up', sounds: 'mine', autoSingle: false });
    writePrefs({ sort: 'down' });
    expect(storage.get(SP_KEYS.prefs, {})).toEqual({
      sort: 'down',
      sounds: 'mine',
      autoSingle: false,
      other: 1,
    });
  });

  it('remembers the one-card shortcut, which is off until it is turned on', () => {
    expect(readPrefs().autoSingle).toBe(false);
    writePrefs({ autoSingle: true });
    resetPrefsForTests();
    expect(readPrefs().autoSingle).toBe(true);
  });
});
