import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import { archive } from '@/state/archive';
import { SpTableProvider, useSp, type SpActions } from '@/games/spades/table/state/store';
import Shell from './Screens';
// Lazy chunks, loaded up front so transforming them can't outlast a findBy.
import './setup/Setup';
import './Winner';
import './pages/Pages';
import '@/games/spades/table/sheets/Scoreboard';
import '@/games/spades/table/sheets/EditHand';

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

const NAMES = ['Riya', 'Arjun', 'Dev', 'Meera'];
const ref: { current: ReturnType<typeof useSp> | null } = { current: null };
function Probe() {
  const v = useSp();
  useEffect(() => void (ref.current = v));
  return null;
}
const actions = new Proxy({} as SpActions, {
  get: (_, k) => ref.current!.actions[k as keyof SpActions],
});
const st = () => ref.current!.state;

async function mount(rules: Partial<{ target: number | null }> = {}) {
  await archive.ready;
  const u = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <SpTableProvider>
          <Probe />
          <Shell page={null} />
        </SpTableProvider>
      </MotionConfig>
    </LazyMotion>,
  );
  await waitFor(() => expect(ref.current).not.toBe(null));
  act(() => {
    NAMES.forEach((name, k) => actions.setupSeat(k, { name, emoji: '🙂', color: '#FF8A65' }));
    actions.setupRules({ ...st().setup!.rules, ...rules });
  });
  await u.click(await screen.findByRole('button', { name: 'Next' }));
  await u.click(await screen.findByRole('button', { name: 'Start the game' }));
  await screen.findByRole('group', { name: 'Bid for Arjun' });
  return u;
}

/** Riya deals first, so Arjun, Dev, Meera, Riya bid in that order. */
async function bidAll(u: ReturnType<typeof userEvent.setup>, bids: [string, string][]) {
  for (const [who, v] of bids) {
    const keys = await screen.findByRole('group', { name: `Bid for ${who}` });
    await u.click(within(keys).getByRole('button', { name: v }));
  }
}

beforeEach(() => localStorage.clear());

/** The one button by that name, once a leaving screen's copy has gone. */
async function one(name: string | RegExp) {
  let el: HTMLElement | null = null;
  await waitFor(() => {
    const all = screen.getAllByRole('button', { name });
    expect(all).toHaveLength(1);
    el = all[0];
  });
  return el as unknown as HTMLElement;
}

describe('the scorekeeper, setup to winner', () => {
  it('bids, tricks, the summary with E1 and E4, then the winner', async () => {
    const u = await mount({ target: 200 });
    // Hand 1: team A (Riya, Dev) bid Nil and 4 (E4); team B 3 and 3.
    await bidAll(u, [
      ['Arjun', '3'],
      ['Dev', '4'],
      ['Meera', '3'],
      ['Riya', 'Nil'],
    ]);
    expect(screen.getByRole('listitem', { name: /Riya, Team A: Nil/ })).toBeInTheDocument();
    await u.click(await one('Play the hand'));
    await u.click(
      within(await screen.findByRole('group', { name: 'Tricks taken by Team A' })).getByRole(
        'button',
        { name: '5 tricks' },
      ),
    );
    expect(screen.getByText(/How many tricks did Riya take/)).toBeInTheDocument();
    await u.click(await one('Save hand'));
    const a = await screen.findByRole('region', { name: 'Team A' });
    expect(within(a).getByText('+141')).toBeInTheDocument();
    expect(within(a).getByText('+100')).toBeInTheDocument();
    const b = screen.getByRole('region', { name: 'Team B' });
    expect(within(b).getByText('+62')).toBeInTheDocument();
    // Undo from the toast takes the hand back to Tricks.
    act(() => actions.undo());
    await screen.findByRole('button', { name: 'Save hand' });
    act(() => actions.saveHand());
    await u.click(await screen.findByRole('button', { name: /Next hand/ }));
    // Hand 2: Arjun deals; team A bids 6 and 6 and takes all 13 → +132, past 200.
    await bidAll(u, [
      ['Dev', '6'],
      ['Meera', '1'],
      ['Riya', '6'],
      ['Arjun', '1'],
    ]);
    await u.click(await one('Play the hand'));
    await u.click(
      within(await screen.findByRole('group', { name: 'Tricks taken by Team A' })).getByRole(
        'button',
        { name: '13 tricks' },
      ),
    );
    await u.click(await one('Save hand'));
    expect(await screen.findByText('Team A win the game!')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'See the winner' }));
    expect(await screen.findByRole('heading', { name: 'Riya & Dev win!' })).toBeInTheDocument();
    expect(st().game!.result).toEqual({ winner: 'a', endedBy: 'target' });
    await u.click(screen.getByRole('button', { name: 'Rematch · swap partners' }));
    await screen.findByRole('group', { name: /Bid for/ });
    expect(st().game!.players.map((p) => p.name)).toEqual(['Riya', 'Dev', 'Meera', 'Arjun']);
  });

  it('greys out a bid the minimum-team rule forbids, and says why', async () => {
    const u = await mount();
    act(() => {
      // Rules live on the game once it starts; this game is played with the minimum on.
      const g = st().game!;
      ref.current!.actions.openGame({ ...g, rules: { ...g.rules, minTeamBid: 4 } });
    });
    await bidAll(u, [
      ['Arjun', '1'],
      ['Dev', '2'],
    ]);
    const keys = await screen.findByRole('group', { name: 'Bid for Meera' });
    expect(within(keys).getByRole('button', { name: '2, not allowed' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(/Arjun bid 1, so 3 or more, or Nil/)).toBeInTheDocument();
    await u.click(within(keys).getByRole('button', { name: '2, not allowed' }));
    expect(st().game!.hands[0].bids[3]).toBe(null);
  });

  it('Undo bid, Edit hand from the scoreboard, and End game from the menu (D14)', async () => {
    const u = await mount({ target: null });
    await bidAll(u, [['Arjun', '3']]);
    await u.click(screen.getByRole('button', { name: 'Undo bid' }));
    expect(st().game!.hands[0].bids[1]).toBe(null);
    await bidAll(u, [
      ['Arjun', '3'],
      ['Dev', '2'],
      ['Meera', '3'],
      ['Riya', '3'],
    ]);
    await u.click(await one('Play the hand'));
    await u.click(await one('Save hand'));
    await screen.findByRole('button', { name: /Next hand/ });
    expect(st().game!.status).toBe('active');
    // Edit hand 1: team A took 7, not 5 (E2 → +52).
    await u.click(screen.getByRole('button', { name: 'Edit hand' }));
    await u.click(await screen.findByRole('button', { name: 'More: Taken by Riya & Dev' }));
    await u.click(screen.getByRole('button', { name: 'More: Taken by Riya & Dev' }));
    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(st().game!.hands[0].teamTricks).toEqual([7, 6]));
    act(() => actions.openSheet(null));
    await u.click(await one('Menu'));
    await u.click(await screen.findByRole('button', { name: 'End game' }));
    const dialog = await screen.findByRole('alertdialog');
    await u.click(within(dialog).getByRole('button', { name: 'End game' }));
    // Team B made 6 of 6 (+60) against team A's 52.
    expect(await screen.findByRole('heading', { name: 'Arjun & Meera win!' })).toBeInTheDocument();
    expect(st().game!.result).toEqual({ winner: 'b', endedBy: 'end' });
  });

  it('Call it a draw and Cancel game, each behind a confirmation (D14)', async () => {
    const u = await mount();
    act(() => {
      actions.bid(3, false);
      actions.bid(3, false);
      actions.bid(3, false);
      actions.bid(3, false);
    });
    act(() => actions.toTricks());
    act(() => actions.saveHand());
    act(() => actions.nextHand());
    await u.click(await one('Menu'));
    await u.click(await screen.findByRole('button', { name: 'Call it a draw' }));
    await u.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Call it a draw',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'It’s a draw' })).toBeInTheDocument();
    act(() => actions.undo());
    await u.click(await one('Menu'));
    await u.click(await screen.findByRole('button', { name: 'Cancel game' }));
    await u.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel game' }),
    );
    await screen.findByText(/shows in History as Cancelled/);
    expect(st().game!.status).toBe('cancelled');
    expect(st().screen).toBe('setup');
    await waitFor(() => expect(archive.spGames()[0]?.game.status).toBe('cancelled'));
  });
});
