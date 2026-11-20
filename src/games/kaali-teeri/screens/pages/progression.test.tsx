import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { T0, kitGame } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import type { KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtRoute } from '@/games/kaali-teeri/state/types';
import { renderKt } from '@/games/kaali-teeri/test/render';
import { archive, archiveKtGame } from '@/state/archive';
import { setSession } from '@/sync/session';
import Home from '../Home';
import Pages from './Pages';

const P = ['Riya', 'Aarav', 'Kabir', 'Meera'];
/** Kabir and Riya take all 250; then Riya's bid with Meera takes nothing, a brick wall for Aarav and Kabir. */
const G = kitGame({
  id: 'G',
  players: P,
  start: T0,
  finished: true,
  hands: [
    { bidder: 2, bid: 150, playedBy: [0], team: 250 },
    { bidder: 0, bid: 160, playedBy: [3], team: 0 },
  ],
});

function Host({ start }: { start: KtRoute }) {
  const { state, actions } = useKt();
  const [first] = useState(start);
  useEffect(() => actions.openPage(first), [actions, first]);
  const top = state.pages.at(-1);
  return top ? <Pages route={top} /> : <p>Closed</p>;
}

async function open(start: KtRoute, games: KtGame[] = [G]) {
  await archive.ready;
  games.forEach((g) => archiveKtGame(g));
  const u = userEvent.setup({ pointerEventsCheck: 0 });
  return { u, ...renderKt(<Host start={start} />, null) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0 + 3600e3);
});
afterEach(() => vi.useRealTimers());

describe('Kaali Teeri progression pages, signed out', () => {
  it('Awards: the day’s awards from this device’s hands, and a way to the achievements', async () => {
    const { u, state } = await open({ page: 'awards' });
    const star = (await screen.findByText('Player of the Day')).closest('button')!;
    expect(within(star).getByText('Kabir')).toBeInTheDocument();
    const grinder = screen.getAllByText('Grinder');
    expect(grinder.length).toBeGreaterThan(0);
    await u.click(screen.getByRole('button', { name: /Achievements/ }));
    expect(state().pages.at(-1)).toMatchObject({ page: 'achievements' });
  });

  it('Achievements: a player’s earned moments lit, the rest locked', async () => {
    await open({ page: 'achievements', id: 'Kabir' });
    expect(await screen.findByRole('heading', { name: 'Hand moments' })).toBeInTheDocument();
    expect(screen.getByText('Clean Sweep').closest('li')).toHaveTextContent(/Earned · /);
    expect(screen.getByText('Brick Wall').closest('li')).toHaveTextContent(/Earned · /);
    // Lone Wolf is hidden: nobody has it, so it's a secret.
    expect(screen.queryByText('Lone Wolf')).toBeNull();
    expect(screen.getByText('???').closest('li')).toHaveTextContent('Not earned yet');
    const shame = screen.getByText('So Close').closest('li')!;
    expect(within(shame).getByRole('img', { name: 'Just for laughs' })).toBeInTheDocument();
  });

  it('the player page opens their achievements', async () => {
    const { u, state } = await open({ page: 'player', id: 'Riya' });
    await u.click(await screen.findByRole('button', { name: /Achievements/ }));
    expect(state().pages.at(-1)).toEqual({ page: 'achievements', id: 'Riya' });
    expect(await screen.findByText('Clean Sweep')).toBeInTheDocument();
  });

  it('no games: Awards says why the day is empty', async () => {
    await open({ page: 'awards' }, []);
    expect(await screen.findByText('Awards appear once hands are played.')).toBeInTheDocument();
  });

  it('Home links to Awards, not to the feed', async () => {
    await archive.ready;
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    const { state } = renderKt(<Home />, null);
    expect(screen.queryByRole('button', { name: /Activity/ })).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Awards/ }));
    expect(state().pages).toEqual([{ page: 'awards' }]);
  });
});

describe('signed in', () => {
  afterEach(() => setSession(null));

  it('Home links to the feed too', async () => {
    setSession({
      user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null },
      player: null,
    });
    await archive.ready;
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    const { state } = renderKt(<Home />, null);
    await u.click(screen.getByRole('button', { name: /Activity/ }));
    expect(state().pages).toEqual([{ page: 'activity' }]);
  });
});
