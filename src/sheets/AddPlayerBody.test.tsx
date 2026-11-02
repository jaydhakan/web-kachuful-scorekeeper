import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
// The shell is a lazy chunk; loaded up front so transforming it on first render can't outlast a findBy.
import '@/components/PhoneShell';
import { archive } from '@/state/archive';
import { KEYS } from '@/state/persistence';
import { ensurePlayer } from '@/state/registry';

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const btn = (name: string | RegExp) => screen.findByRole('button', { name });

async function toStep2(u: ReturnType<typeof setup>) {
  await u.click(await btn('New Game'));
  await u.click(await btn('3 players'));
  await u.click(await btn('Next'));
}

const sheet = () => screen.findByRole('dialog');

describe('the Add player sheet', () => {
  beforeEach(async () => {
    await archive.ready;
    for (const n of ['Asha', 'Bo']) ensurePlayer({ name: n, emoji: '🙂', color: 'c' });
  });

  it('finds people as you type, seats one seat after another and closes when the table is full', async () => {
    const u = setup();
    render(<App />);
    await toStep2(u);
    await u.click(await btn('Add player'));
    const d = await sheet();
    expect(within(d).getByRole('heading', { name: 'Seat 1 of 3' })).toBeInTheDocument();
    const field = within(d).getByLabelText('Player name');
    await waitFor(() => expect(field).toHaveFocus());

    await u.type(field, 'as');
    const list = within(d).getByRole('group', { name: 'People you know' });
    expect(
      within(list)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['🙂Asha']);
    await u.click(within(list).getByRole('button', { name: /Asha/ }));
    expect(await within(d).findByRole('heading', { name: 'Seat 2 of 3' })).toBeInTheDocument();
    expect(field).toHaveValue('');

    await u.type(field, 'Zed');
    expect(within(d).getByText(/Nobody called “Zed” yet/)).toBeInTheDocument();
    await u.type(field, '{Enter}');
    expect(await within(d).findByRole('heading', { name: 'Seat 3 of 3' })).toBeInTheDocument();
    await u.type(field, 'Bo{Enter}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('3 of 3 seated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus());
  });

  it('refuses someone already at the table', async () => {
    const u = setup();
    render(<App />);
    await toStep2(u);
    await u.click(await btn('Asha'));
    await u.click(await btn('Add player'));
    const d = await sheet();
    await u.type(within(d).getByLabelText('Player name'), 'asha{Enter}');
    expect(await within(d).findByText('Asha is already at the table.')).toBeInTheDocument();
    expect(within(d).getByRole('heading', { name: 'Seat 2 of 3' })).toBeInTheDocument();
  });
});

describe('signed in, a known player with no email', () => {
  beforeEach(async () => {
    localStorage.setItem(
      KEYS.session,
      JSON.stringify({
        user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: null },
        player: null,
      }),
    );
    await archive.ready;
    ensurePlayer({ name: 'Bo', emoji: '🙂', color: 'c' });
  });

  it('is never seated from a chip: the sheet opens on their email', async () => {
    const u = setup();
    render(<App />);
    await toStep2(u);
    await u.click(await btn('Bo'));
    const d = await sheet();
    const email = within(d).getByLabelText("Bo's email");
    await waitFor(() => expect(email).toHaveFocus());
    expect(within(d).getByLabelText('Player name')).toHaveValue('Bo');
    expect(within(d).getByRole('button', { name: 'Add Bo' })).toBeDisabled();
    expect(screen.getByText('0 of 3 seated')).toBeInTheDocument();
  });

  it('is never seated from the list either: picking them asks for the email', async () => {
    const u = setup();
    render(<App />);
    await toStep2(u);
    await u.click(await btn('Add player'));
    const d = await sheet();
    const row = within(within(d).getByRole('group', { name: 'People you know' })).getByRole(
      'button',
      { name: /Bo/ },
    );
    expect(row).toHaveTextContent('Needs an email');
    await u.click(row);
    await waitFor(() => expect(within(d).getByLabelText("Bo's email")).toHaveFocus());
    expect(within(d).getByRole('heading', { name: 'Seat 1 of 3' })).toBeInTheDocument();
    expect(screen.getByText('0 of 3 seated')).toBeInTheDocument();
  });
});
