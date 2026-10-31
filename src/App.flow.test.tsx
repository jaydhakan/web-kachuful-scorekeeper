import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { KEYS } from './state/persistence';
import fixture from './state/__fixtures__/prototype-save.json';

const seedPrototypeSave = (screenName = 'round') => {
  localStorage.setItem(KEYS.game, JSON.stringify(fixture['kachuful.v1']));
  localStorage.setItem(KEYS.screen, JSON.stringify(screenName));
  localStorage.setItem(KEYS.lastGroup, JSON.stringify(fixture['kachuful.lastGroup']));
  localStorage.setItem(KEYS.recentNames, JSON.stringify(fixture['kachuful.recentNames']));
};
const btn = (name: string | RegExp) => screen.findByRole('button', { name });
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

async function seatThree(u: ReturnType<typeof setup>) {
  await u.click(await btn('New Game'));
  await u.click(await btn('3 players'));
  await u.click(await btn('Next'));
  for (const [i, n] of ['Asha', 'Bo', 'Cy'].entries()) {
    await u.type(await screen.findByLabelText('Player name'), n + '{Enter}');
    await screen.findByText(`${i + 1} of 3 seated`);
  }
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
  await u.click(screen.getByRole('button', { name: 'Next' }));
  await u.click(await btn('Deal!'));
  await u.click(await btn('Skip the deal animation'));
}

describe('setup → bid → play → results → summary', () => {
  it('plays a whole round', async () => {
    const u = setup();
    render(<App />);
    await seatThree(u);

    // Round 1: Asha deals 3 cards; Bo bids first, the dealer last.
    expect(await screen.findByText('Bids 1st · gets the first card')).toBeInTheDocument();
    await u.click(await btn('Bid 1'));
    await screen.findByText('Bids 2 of 3', undefined, { timeout: 2000 });
    await u.click(await btn('Bid 1'));
    await screen.findByText(/Dealer — bids last/, undefined, { timeout: 2000 });
    expect(screen.getByText(/Can’t bid 1 — total/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Locked 1' })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Bid 0' }));
    await u.click(await btn('Start playing'));
    await u.click(await btn('Enter results'));

    expect(await screen.findAllByText('Who made their bid?')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Confirm round' })).toBeDisabled();
    // Bo and Cy bid 1 and Asha bid 0, on 3 cards. Everyone making it cannot add up to 3 tricks, so the last
    // Made is not offered: the app does not let that state be reached.
    for (const made of screen.getAllByText('✓ Made')) await u.click(made);
    const last = screen.getAllByText('✓ Made')[2].closest('button')!;
    expect(last).toHaveAttribute('aria-disabled', 'true');
    expect(last).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Doesn’t add up with the other results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm round' })).toBeDisabled();
    await u.click(screen.getAllByText('✗ Missed')[2]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirm round' })).toBeEnabled(),
    );
    await u.click(screen.getByRole('button', { name: 'Confirm round' }));

    expect(await screen.findAllByText('After Round 1')).not.toHaveLength(0);
    expect(await screen.findByText('Next round')).toBeInTheDocument();
  });

  it('undo from the toast on the summary returns to the results', async () => {
    const u = setup();
    render(<App />);
    await seatThree(u);
    await u.click(await btn('Bid 1'));
    await screen.findByText('Bids 2 of 3', undefined, { timeout: 2000 });
    await u.click(await btn('Bid 1'));
    await screen.findByText(/Dealer — bids last/, undefined, { timeout: 2000 });
    await u.click(screen.getByRole('button', { name: 'Bid 0' }));
    await u.click(await btn('Start playing'));
    await u.click(await btn('Enter results'));
    await u.click((await screen.findAllByText('✓ Made'))[0]);
    await u.click(screen.getAllByText('✗ Missed')[1]);
    await u.click(screen.getAllByText('✗ Missed')[2]);
    await u.click(await btn('Confirm round'));
    await screen.findAllByText('After Round 1');

    await u.click(await btn('Undo'));
    expect(await screen.findAllByText('Who made their bid?')).not.toHaveLength(0);
    await waitFor(() => expect(screen.queryAllByText('After Round 1')).toHaveLength(0));
  });

  it('refuses a duplicate name at the table', async () => {
    const u = setup();
    render(<App />);
    await u.click(await btn('New Game'));
    await u.click(await btn('4 players'));
    await u.click(await btn('Next'));
    const input = await screen.findByLabelText('Player name');
    await u.type(input, 'Asha{Enter}');
    await screen.findByText(/sitting on Asha/);
    await u.type(screen.getByLabelText('Player name'), 'asha{Enter}');
    expect(await screen.findByText('Asha is already at the table.')).toBeInTheDocument();
  });
});

describe('first run', () => {
  it('presents the demo as a demo and keeps its players out of setup', async () => {
    const u = setup();
    render(<App />);
    expect(await screen.findByText('Try the demo')).toBeInTheDocument();
    expect(screen.queryByText(/Saved /)).not.toBeInTheDocument();
    await u.click(await btn('New Game'));
    expect(await btn('3 players')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Use last group/ })).not.toBeInTheDocument();
    await u.click(await btn('3 players'));
    await u.click(await btn('Next'));
    expect(
      await screen.findByText('Names you add are remembered for next time.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aarav' })).not.toBeInTheDocument();
  });
});

describe('a save from the prototype', () => {
  it('opens on the round it was left on, with the verified leaderboard', async () => {
    seedPrototypeSave();
    const u = setup();
    render(<App />);
    expect(await screen.findByText('Round 7')).toBeInTheDocument();
    await u.click(await btn('Scoreboard'));
    const board = await screen.findByRole('table');
    expect(within(board).getByText('Kabir')).toBeInTheDocument();
    const totals = within(board)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(totals.join(' ')).toMatch(/Kabir.*60/);
    expect(totals.join(' ')).toMatch(/Meera.*−30/);
  });

  it('restores the same state after a refresh mid-round', async () => {
    seedPrototypeSave();
    const u = setup();
    const first = render(<App />);
    await screen.findByText('Round 7');
    await u.click(await btn('Bid 1'));
    await screen.findByText('Bids 7 / 9 cards');
    await new Promise((r) => setTimeout(r, 400));
    first.unmount();

    render(<App />);
    expect(await screen.findByText('Round 7')).toBeInTheDocument();
    expect(await screen.findByText('Bids 7 / 9 cards')).toBeInTheDocument();
    expect(screen.getByText('Dealer — bids last')).toBeInTheDocument();
  });

  it('edits a past round when later rounds exist and recalculates the totals', async () => {
    seedPrototypeSave();
    const u = setup();
    render(<App />);
    await u.click(await btn('Scoreboard'));
    const rows = await screen.findAllByRole('row', { name: /Edit round/ });
    expect(rows).toHaveLength(6);
    await u.click(rows[0]);
    await screen.findByText('Edit round 1');
    await u.click(await btn('Raise bid for Aarav'));
    // Bids may not add up to the 3 cards, so Riya's goes down by the one Aarav's went up.
    await u.click(await btn('Lower bid for Riya'));
    await u.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Round 1 updated')).toBeInTheDocument();
    const board = await screen.findByRole('table');
    // Aarav made a bid of 1 (+10) in round 1; now a bid of 2 (+20), so 10 → 20.
    await waitFor(() =>
      expect(
        within(board)
          .getAllByRole('columnheader')
          .map((h) => h.textContent)
          .join(' '),
      ).toMatch(/Aarav.*20/),
    );
    // Later rounds are untouched and still counted.
    expect(within(board).getByText('R6 · 8', { exact: false })).toBeInTheDocument();
  });
});

describe('editing a past round', () => {
  it('does not save bids that add up to the cards, and says why', async () => {
    seedPrototypeSave();
    const u = setup();
    render(<App />);
    await u.click(await btn('Scoreboard'));
    await u.click((await screen.findAllByRole('row', { name: /Edit round/ }))[0]);
    await screen.findByText('Edit round 1');
    // Round 1 deals 3 cards and the bids add up to 2: one more makes 3, the total the dealer cannot reach.
    await u.click(await btn('Raise bid for Aarav'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Bids can’t add up to 3/);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await u.click(await btn('Lower bid for Aarav'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  });
});

describe('a saved game that cannot be read', () => {
  it('asks before touching it, backing the raw data up first', async () => {
    localStorage.setItem(KEYS.game, '{"players": [');
    const u = setup();
    render(<App />);
    expect(await screen.findByText(/Saved game couldn't be read/)).toBeInTheDocument();
    expect(localStorage.getItem(KEYS.backup)).toBe('{"players": [');
    expect(localStorage.getItem(KEYS.game)).toBe('{"players": [');

    await u.click(screen.getByRole('button', { name: 'Keep backup' }));
    await waitFor(() =>
      expect(screen.queryByText(/Saved game couldn't be read/)).not.toBeInTheDocument(),
    );
    expect(localStorage.getItem(KEYS.backup)).toBe('{"players": [');
    expect(JSON.parse(localStorage.getItem(KEYS.game)!).id).toBe('demo');
    expect(await screen.findByText('Try the demo')).toBeInTheDocument();
  });

  it('Reset discards the backup as well', async () => {
    localStorage.setItem(KEYS.game, 'nope');
    const u = setup();
    render(<App />);
    await u.click(await btn('Reset'));
    await waitFor(() => expect(localStorage.getItem(KEYS.backup)).toBeNull());
    expect(JSON.parse(localStorage.getItem(KEYS.game)!).id).toBe('demo');
  });

  it('does not overwrite the unreadable save while the question is open', async () => {
    localStorage.setItem(KEYS.game, 'nope');
    render(<App />);
    await screen.findByText(/Saved game couldn't be read/);
    await new Promise((r) => setTimeout(r, 100));
    expect(localStorage.getItem(KEYS.game)).toBe('nope');
  });
});
