import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { freshBackend, signIn } from './backend';
import { btn } from './helpers';

// Player photos (HANDOFF §5.7): mock API, or a real backend with E2E_API=local.
freshBackend();

/** A plain RGB PNG, so the test needs no image file: the app squares and shrinks it, the server re-encodes it. */
function png(w: number, h: number): Buffer {
  const crc = (b: Buffer) => {
    let c = ~0;
    for (const x of b) {
      c ^= x;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    t.copy(out, 4);
    out.writeUInt32BE(crc(t), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) rows.set([x % 256, y % 256, 160], y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const photo = (page: Page) => page.locator('img[src*="/photo?v="]').first();

test('a player adds a photo, it shows instead of the emoji, and can be removed', async ({
  page,
}) => {
  await signIn(page, 'riya');
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await btn(page, 'Account').click();
  await page
    .getByLabel('Choose a photo for Riya')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png(640, 480) });
  await expect(page.getByText('Photo saved')).toBeVisible();
  const img = photo(page);
  await expect(img).toBeVisible();
  // The server keeps a 256×256 square (the phone already sent one).
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(256);
  const src = (await img.getAttribute('src'))!;
  expect(src).toMatch(/^\/api\/players\/[\w-]+\/photo\?v=\d+$/);
  // Public, versioned, cached forever.
  const r = await page.request.get(src);
  expect(r.status()).toBe(200);
  expect(r.headers()['content-type']).toBe('image/webp');
  expect(r.headers()['cache-control']).toBe('public, max-age=31536000, immutable');

  await btn(page, 'Remove photo').click();
  await expect(page.getByText('Photo removed')).toBeVisible();
  await expect(page.locator('img[src*="/photo?v="]')).toHaveCount(0);
});

test("only the admin, the creator and the player may change a player's photo", async ({ page }) => {
  // Riya is linked to her player; Kabir didn't create it.
  await signIn(page, 'kabir');
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await page
    .getByRole('button', { name: /Players/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Riya/ }).first().click();
  await expect(page.getByRole('heading', { name: /Riya/ })).toBeVisible();
  await expect(btn(page, '📷 Add photo')).toHaveCount(0);
});
