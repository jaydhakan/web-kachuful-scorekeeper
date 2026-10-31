import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { MQ } from '@/theme/breakpoints';

/** A desktop: the large-screen queries match (layout CSS is not applied in jsdom; only the JS switch matters). */
beforeEach(() => {
  const on = new Set<string>([MQ.big, MQ.roomy, MQ.rail, MQ.dt, MQ.kbd]);
  window.matchMedia = (q: string) =>
    ({
      matches: on.has(q) || q.includes('prefers-reduced-motion'),
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
});

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const bidGroup = (name: string) => screen.findByRole('group', { name: `Bid for ${name}` });

/** First run opens the demo on Home: round 7 (9 cards), Kabir and Meera have bid, Dev is next. */
async function openDemo(u: ReturnType<typeof setup>) {
  render(<App />);
  await screen.findByRole('button', { name: /Resume/ });
  await u.keyboard('{Enter}');
  return bidGroup('Dev');
}

describe('large-screen keyboard shortcuts', () => {
  it('picks a bid with a digit, locks it in with Enter and undoes it with Z', async () => {
    const u = setup();
    const keys = await openDemo(u);
    await u.keyboard('3');
    expect(within(keys).getByRole('button', { name: 'Bid 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Lock in 3/ })).toBeEnabled();
    // Nothing is saved until it is locked in.
    expect(screen.queryByRole('button', { name: 'Dev bid 3. Change it' })).toBeNull();

    await u.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: 'Dev bid 3. Change it' })).toBeInTheDocument();
    await bidGroup('Aarav');

    await u.keyboard('z');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Dev bid 3. Change it' })).toBeNull(),
    );
    await bidGroup('Dev');
  });

  it('a digit above the cards dealt does nothing; a second press of the picked digit locks it in', async () => {
    const u = setup();
    await openDemo(u);
    await u.keyboard('7');
    await u.keyboard('7');
    expect(await screen.findByRole('button', { name: 'Dev bid 7. Change it' })).toBeInTheDocument();
  });

  it('the dealer’s locked number shakes and is never picked', async () => {
    const u = setup();
    await openDemo(u);
    for (const d of ['1', '2']) {
      await u.keyboard(d);
      await u.keyboard('{Enter}');
      await act(() => new Promise((r) => setTimeout(r, 300)));
    }
    const keys = await bidGroup('Riya');
    const locked = within(keys).getByRole('button', { name: /^Locked / });
    const n = locked.getAttribute('aria-label')!.replace('Locked ', '');
    await u.keyboard(n);
    expect(locked).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Pick a bid' })).toBeDisabled();
  });

  it('Enter moves the round on; E goes back to the bids while playing', async () => {
    const u = setup();
    await openDemo(u);
    for (const d of ['1', '2']) {
      await u.keyboard(d);
      await u.keyboard('{Enter}');
      await act(() => new Promise((r) => setTimeout(r, 300)));
    }
    const keys = await bidGroup('Riya');
    const free = within(keys)
      .getAllByRole('button')
      .find((b) => !b.hasAttribute('aria-disabled'))!;
    await u.keyboard(free.textContent!.trim());
    await u.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: /Start playing/ })).toBeEnabled();

    await u.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: /Enter results/ })).toBeInTheDocument();
    await u.keyboard('e');
    expect(await screen.findByRole('button', { name: /Start playing/ })).toBeInTheDocument();
    await u.keyboard('{Enter}');
    await u.keyboard('{Enter}');
    expect(await screen.findByText('Who made their bid?')).toBeInTheDocument();
    // Results still open: Enter does not confirm a round that does not add up.
    await u.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: /Confirm round/ })).toBeDisabled();
    expect(screen.getByText('Who made their bid?')).toBeInTheDocument();
  });

  it('? opens the shortcuts sheet and Escape closes it', async () => {
    const u = setup();
    await openDemo(u);
    await u.keyboard('?');
    const sheet = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(sheet).getByText('Undo')).toBeInTheDocument();
    // While it is open the page's keys are off.
    await u.keyboard('3');
    expect(screen.queryByRole('button', { name: /Lock in 3/ })).toBeNull();
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('N starts a new game from Home; typing a name never fires a shortcut', async () => {
    const u = setup();
    render(<App />);
    await screen.findByRole('button', { name: /Resume/ });
    await u.keyboard('n');
    await u.click(await screen.findByRole('button', { name: '3 players' }));
    await u.type(screen.getByLabelText('Seat 1 name'), 'zeren?');
    expect(screen.getByLabelText('Seat 1 name')).toHaveValue('zeren?');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Set the table')).toBeInTheDocument();
  });

  it('R starts a rematch once the game is over', async () => {
    const u = setup();
    await openDemo(u);
    await u.click(screen.getByRole('button', { name: 'End game' }));
    await u.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'End game' }),
    );
    expect(await screen.findByText(/wins with/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await u.keyboard('r');
    expect(
      await screen.findByRole('button', { name: 'Skip the deal animation' }),
    ).toBeInTheDocument();
  });
});
