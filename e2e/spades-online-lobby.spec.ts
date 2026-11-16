import { expect, test, type Page } from '@playwright/test';
import { REAL } from './backend';
import { accounts, phone, type Account } from './spades-helpers';

/**
 * Spades' lobby on four phones (plan §2.2–§2.3, §3.2): the host starts a table, one person joins by code, two come
 * by seat invite (one declines first), all four say they're ready, and the draw for deal opens the table everywhere.
 * Every account is new to this test, so invites from other specs never reach these pages. Mock only.
 */
test.skip(REAL, 'runs against the mock API');

const chair = (page: Page, name: string) =>
  page.getByRole('group', { name: new RegExp(`^${name}`) });

test('four phones: create, join by code, invites (one declined first), ready, draw for deal', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const [hostAcc, riaAcc, kaiAcc, zedAcc] = await accounts(baseURL!);

  const host = await phone(browser, hostAcc, '/spades');
  await host.getByRole('button', { name: 'Start a table' }).click();
  await expect(host).toHaveURL(/\?table=[\w-]+$/);
  await expect(
    host.getByRole('heading', { level: 1, name: `${hostAcc.name}'s table` }),
  ).toBeVisible();
  await expect(
    host.getByRole('button', { name: /^Rules: 200 points · Nil · 30 s turns/ }),
  ).toBeVisible();
  await expect(host.getByRole('img', { name: /^QR code that opens table/ })).toBeVisible();
  const label = await host.getByRole('img', { name: /^Room code/ }).getAttribute('aria-label');
  const code = label!.replace('Room code ', '').replace(/ /g, '');
  expect(code).toMatch(/^[A-Z2-9]{4}$/);

  // Zed is in the room: the code. They land in the next free chair, on the host's left.
  const zed = await phone(browser, zedAcc, `/spades?join=${code}`);
  await expect(zed).toHaveURL(/\?table=[\w-]+$/);
  await expect(chair(zed, 'You')).toBeVisible();
  await expect(
    zed.getByRole('button', { name: `${hostAcc.name} deals when everyone is ready` }),
  ).toBeDisabled();
  await expect(chair(host, zedAcc.name)).toContainText('Opponent');
  await expect(host.getByText(`${zedAcc.name} joined`)).toBeVisible();

  // The host changes a rule: every phone's line follows.
  await host.getByRole('button', { name: /^Rules:/ }).click();
  await host.getByRole('group', { name: 'Play to' }).getByRole('button', { name: '300' }).click();
  await host.getByRole('button', { name: 'Done' }).click();
  await expect(zed.getByRole('button', { name: /^Rules: 300 points/ })).toBeVisible();
  await zed.getByRole('button', { name: /^Rules:/ }).click();
  await expect(zed.getByText(`Only ${hostAcc.name} can change these.`)).toBeVisible();
  await zed.getByRole('button', { name: 'Close' }).last().click();

  // Ria is invited to the partner's chair, declines; the chair shakes empty and the host hears.
  const ria = await phone(browser, riaAcc, '/spades');
  const kai = await phone(browser, kaiAcc, '/spades');
  const invite = async (place: string, who: Account) => {
    await host.getByRole('button', { name: `Invite someone to the ${place} chair` }).click();
    const sheet = host.getByRole('dialog', { name: 'Invite to this seat' });
    await expect(sheet.getByRole('button', { name: 'Move here' })).toBeVisible();
    await sheet.getByRole('button', { name: new RegExp(`^Invite ${who.name}`) }).click();
    await expect(sheet).toBeHidden();
    await expect(
      host.getByRole('button', { name: `${who.name} is invited. Cancel the invite` }),
    ).toBeVisible();
  };
  await invite('top', riaAcc);
  await expect(zed.getByRole('img', { name: `${riaAcc.name} is invited` })).toBeVisible();
  const riaCard = ria.getByRole('article', { name: `${hostAcc.name} invited you` });
  await riaCard.getByRole('button', { name: 'Decline' }).click();
  await expect(host.getByText(`${riaAcc.name} can’t join`)).toBeVisible();
  await expect(host.getByRole('button', { name: 'Invite someone to the top chair' })).toBeVisible();

  // Asked again, Ria joins from the card and lands in the lobby, in her seat.
  await invite('top', riaAcc);
  await ria
    .getByRole('article', { name: `${hostAcc.name} invited you` })
    .getByRole('button', { name: 'Join' })
    .click();
  await expect(ria).toHaveURL(/\?table=[\w-]+/);
  await expect(chair(ria, 'You')).toBeVisible();
  await expect(chair(host, riaAcc.name)).toContainText('Your partner');

  await invite('right', kaiAcc);
  await kai
    .getByRole('article', { name: `${hostAcc.name} invited you` })
    .getByRole('button', { name: 'Join' })
    .click();
  await expect(chair(kai, 'You')).toBeVisible();

  // A full table needs no share card. Draw for deal waits for everyone to be ready.
  await expect(host.getByRole('img', { name: /^QR code/ })).toHaveCount(0);
  await expect(
    host.getByRole('button', { name: 'Waiting for everyone to be ready…' }),
  ).toBeDisabled();
  for (const p of [host, zed, ria, kai]) await p.getByRole('button', { name: 'I’m ready' }).click();
  for (const p of [host, zed, ria, kai])
    await expect(chair(p, 'You')).toHaveAccessibleName(/, ready/);
  const draw = host.getByRole('button', { name: 'Draw for deal' });
  await expect(draw).toBeEnabled();
  await draw.click();

  for (const p of [host, zed, ria, kai])
    await expect(p.getByRole('heading', { level: 1, name: 'Hand 1' })).toBeVisible({
      timeout: 10_000,
    });

  for (const p of [host, zed, ria, kai]) await p.context().close();
});
