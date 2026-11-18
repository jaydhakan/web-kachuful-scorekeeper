import { expect, test, type Page } from '@playwright/test';
import { btn, playRound, startGame } from './helpers';
import { openSeeded, seedGame } from './fixtures';
import { callCards, confirmHand, ktBtn, ktStart, playedBy, points, quickBid } from './kt-helpers';

type Level = 'all' | 'moments' | 'off';
interface Cue {
  name: string;
  tier: string;
  pitch?: number;
}

/** Sets the device's Sounds before the app starts (the app saves its own settings, so never under it). */
const sounds = (page: Page, level: Level) =>
  page.addInitScript(
    (l) => localStorage.setItem('baithak.fx', JSON.stringify({ sounds: l, vibrate: true })),
    level,
  );
const heard = (page: Page) =>
  page.evaluate(() => (window as unknown as { __fxLog?: Cue[] }).__fxLog ?? []);
const names = async (page: Page) => (await heard(page)).map((c) => c.name);

const P4 = ['Riya', 'Aarav', 'Meera', 'Kabir'];

/** A quick-mode Kaali Teeri hand from the deal to its confirmed summary. */
async function ktHand(page: Page, level: Level) {
  await page.goto('/kaali-teeri');
  await ktStart(page, P4);
  await quickBid(page, 'Meera', 175);
  // The gavel lands 260ms after SOLD shows; moving on sooner (as a script can) leaves the stamp, and its sound, behind.
  if (level !== 'off') await expect.poll(() => names(page)).toContain('gavel');
  await callCards(page, 'Hearts', [{ rank: 'A', suit: 'Spades' }]);
  await playedBy(page, /^Ace of spades/, 'Kabir');
  await points(page, 75, { bid: 175 });
  await confirmHand(page, 1);
  await expect(page.getByRole('heading', { name: 'After hand 1' })).toBeVisible();
}

/** One Kachuful round on a phone, bids to confirm. */
async function kfRound(page: Page) {
  await page.goto('/kachuful');
  await startGame(page, ['Aarav', 'Riya', 'Kabir']);
  await playRound(page);
}

test.describe('Kachuful sounds', () => {
  test('on All, a round plays its taps, then one collapsed sound for the reveal under reduced motion', async ({
    page,
  }) => {
    await sounds(page, 'all');
    await kfRound(page);
    await expect.poll(() => names(page)).toContain('thud');
    const n = await names(page);
    expect(n).toContain('flick');
    expect(n.indexOf('flick')).toBeLessThan(n.indexOf('thud'));
    // Reduced motion: no per-player run and no tally, one sound for the whole reveal.
    expect(n).not.toContain('tally');
    expect(n.filter((x) => x === 'made' || x === 'missed')).toHaveLength(3);
  });

  test('on Big moments a round is silent, and on Off nothing plays at all', async ({ page }) => {
    await sounds(page, 'moments');
    await kfRound(page);
    await page.waitForTimeout(500);
    expect(await names(page)).toEqual([]);
  });

  test('a reload mid-round plays nothing for what was already shown', async ({ page }) => {
    await sounds(page, 'all');
    await kfRound(page);
    await page.waitForTimeout(500);
    await page.evaluate(() => ((window as unknown as { __fxLog: Cue[] }).__fxLog = []));
    await page.reload();
    await page.waitForTimeout(800);
    expect(await names(page)).toEqual([]);
  });

  test('the quick mute cycles All, Big moments, Off and says so', async ({ page }) => {
    await sounds(page, 'all');
    await page.goto('/kachuful');
    await startGame(page, ['Aarav', 'Riya', 'Kabir']);
    await btn(page, 'Menu').click();
    const row = page.getByRole('button', { name: /^Sounds: / });
    await expect(row).toHaveText(/Sounds: All/);
    await row.click();
    await expect(row).toHaveText(/Sounds: Big moments/);
    await row.click();
    await expect(row).toHaveText(/Sounds: Off/);
    expect(await page.evaluate(() => localStorage.getItem('baithak.fx'))).toContain('"off"');
  });
});

test.describe('Kachuful: the winner', () => {
  test.describe('with motion on', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('a game just ended: thuds, the roll, then the fanfare lands the winner, once', async ({
      page,
    }) => {
      await sounds(page, 'all');
      await page.goto('/kachuful');
      await openSeeded(page, seedGame(5, 'summary'), 'round');
      await btn(page, 'End game').click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
      await expect.poll(() => names(page), { timeout: 8000 }).toContain('fanfare');
      const log = await heard(page);
      const n = log.map((c) => c.name);
      expect(n.filter((x) => x === 'fanfare')).toHaveLength(1);
      expect(n.filter((x) => x === 'thud').length).toBeGreaterThanOrEqual(1);
      expect(n.indexOf('roll')).toBeLessThan(n.indexOf('fanfare'));
      expect(log.find((c) => c.name === 'fanfare')?.tier).toBe('moment');
    });

    test('on Big moments the winner is the fanfare alone', async ({ page }) => {
      await sounds(page, 'moments');
      await page.goto('/kachuful');
      await openSeeded(page, seedGame(5, 'summary'), 'round');
      await btn(page, 'End game').click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
      await expect.poll(() => names(page), { timeout: 8000 }).toEqual(['fanfare']);
    });
  });

  test('under reduced motion the winner is one fanfare, and a reopened game stays silent', async ({
    page,
  }) => {
    await sounds(page, 'all');
    await page.goto('/kachuful');
    await openSeeded(page, seedGame(5, 'summary'), 'round');
    await btn(page, 'End game').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'End game' }).click();
    await expect.poll(() => names(page)).toEqual(['fanfare']);
    await openSeeded(page, seedGame(5, 'winner'), 'winner');
    await page.waitForTimeout(800);
    expect(await names(page)).toEqual([]);
  });
});

test.describe('Kaali Teeri sounds', () => {
  test('on All, a hand plays chips, the gavel, a pick, the verdict and the confirm', async ({
    page,
  }) => {
    await sounds(page, 'all');
    await ktHand(page, 'all');
    await expect.poll(() => names(page)).toContain('thud');
    const log = await heard(page);
    const n = log.map((c) => c.name);
    expect(n).toContain('chip');
    expect(n.indexOf('chip')).toBeLessThan(n.indexOf('gavel'));
    expect(log.find((c) => c.name === 'gavel')?.tier).toBe('moment');
    expect(n.indexOf('gavel')).toBeLessThan(n.indexOf('made'));
    expect(n).toContain('thud');
    // Reduced motion: no stage-by-stage chips or tally.
    expect(n).not.toContain('tally');
  });

  test('raises climb in pitch with the amount', async ({ page }) => {
    await sounds(page, 'all');
    await page.goto('/kaali-teeri');
    await ktStart(page, P4);
    await page.getByRole('switch', { name: /^Quick mode/ }).click();
    await ktBtn(page, 'Up 10').click();
    await ktBtn(page, 'Bid 160').click();
    await ktBtn(page, 'Pass').click();
    await ktBtn(page, 'Pass').click();
    await ktBtn(page, 'Bid 165').click();
    await ktBtn(page, 'Pass').click();
    await ktBtn(page, 'Bid 170').click();
    const chips = (await heard(page)).filter((c) => c.name === 'chip');
    const pitches = chips.map((c) => c.pitch ?? 0);
    expect(pitches.length).toBeGreaterThanOrEqual(3);
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
    expect(pitches.at(-1)).toBeGreaterThan(pitches[0]);
    expect(await names(page)).toContain('knock');
  });

  test('on Big moments only the gavel is heard in a hand', async ({ page }) => {
    await sounds(page, 'moments');
    await ktHand(page, 'moments');
    await page.waitForTimeout(600);
    expect(await names(page)).toEqual(['gavel']);
  });

  test('on Off nothing plays', async ({ page }) => {
    await sounds(page, 'off');
    await ktHand(page, 'off');
    expect(await names(page)).toEqual([]);
  });
});
