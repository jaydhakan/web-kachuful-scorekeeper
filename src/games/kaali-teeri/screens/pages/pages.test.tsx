import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { T0, kitGame } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import type { KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtRoute } from '@/games/kaali-teeri/state/types';
import { renderKt } from '@/games/kaali-teeri/test/render';
import { archive, archiveKtGame, memoryBackend, resetArchive } from '@/state/archive';
import Pages from './Pages';

const DAY = 864e5;
const P = ['Riya', 'Aarav', 'Kabir', 'Meera'];
/** Riya wins with 380: her bid made with Aarav, then Aarav's missed. */
const G1 = kitGame({
  id: 'G1',
  players: P,
  start: T0,
  finished: true,
  hands: [
    { bidder: 0, bid: 180, playedBy: [1], team: 190 },
    { bidder: 1, bid: 200, playedBy: [2], team: 100 },
  ],
});
/** Kabir wins with 500; Dev sits in for Meera. */
const G2 = kitGame({
  id: 'G2',
  players: ['Riya', 'Aarav', 'Kabir', 'Dev'],
  start: T0 + DAY,
  finished: true,
  hands: [
    { bidder: 2, bid: 150, playedBy: [0], team: 250 },
    { bidder: 0, bid: 160, playedBy: [3], team: 0 },
  ],
});
/** In play: Riya made 150 with Aarav. */
const L = kitGame({
  id: 'L',
  players: P,
  start: T0 + 2 * DAY,
  hands: [
    { bidder: 0, bid: 150, playedBy: [1], team: 150 },
    { bidder: 1, bid: 150, phase: 'playing' },
  ],
});

/** Opens `start` on the page stack and shows the top page, as the shell does. */
function Host({ start }: { start: KtRoute }) {
  const { state, actions } = useKt();
  const [first] = useState(start);
  useEffect(() => actions.openPage(first), [actions, first]);
  const top = state.pages.at(-1);
  return top ? <Pages route={top} /> : <p>Closed</p>;
}

async function open(start: KtRoute, games: KtGame[] = [G1, G2, L], table: KtGame | null = null) {
  await archive.ready;
  games.forEach((g) => archiveKtGame(g));
  const u = userEvent.setup({ pointerEventsCheck: 0 });
  const r = renderKt(<Host start={start} />, table);
  return { u, ...r };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0 + 2 * DAY + 3600e3);
});
afterEach(() => vi.useRealTimers());

describe('History', () => {
  it('no games: says so and offers a new one', async () => {
    const { u, state } = await open({ page: 'history' }, []);
    expect(await screen.findByText('No games yet')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'New Game' }));
    expect(state().screen).toBe('setup');
    expect(state().pages).toEqual([]);
  });

  it('lists games by day, filters by status and player, and opens one', async () => {
    const { u, state } = await open({ page: 'history' }, [G1, G2, L], L);
    const rows = await screen.findAllByRole('button', { name: /: (Riya|Kabir) / });
    expect(rows).toHaveLength(3);
    expect(screen.getByText('On the table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Riya won · 380/ })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'In progress' }));
    expect(screen.getAllByRole('button', { name: /leads/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /won/ })).toBeNull();

    await u.click(screen.getByRole('button', { name: 'Dev' }));
    expect(screen.getByText('No games match')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('button', { name: /: (Riya|Kabir) / })).toHaveLength(3);

    await u.click(screen.getByRole('button', { name: /Kabir won · 500/ }));
    expect(state().pages.at(-1)).toEqual({ page: 'game', id: 'G2' });
    expect(await screen.findByRole('heading', { name: 'Kabir won · 500' })).toBeInTheDocument();
  });

  it('loading until the archive is read', async () => {
    resetArchive({ ...memoryBackend(), load: () => new Promise(() => {}) });
    renderKt(<Host start={{ page: 'history' }} />, null);
    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(archive.loaded).toBe(false);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('an archive this browser cannot read', async () => {
    await archive.ready;
    archive.lastError = 'unavailable';
    renderKt(<Host start={{ page: 'leaderboard' }} />, null);
    expect(await screen.findByText("Past games can't be read")).toBeInTheDocument();
  });
});

describe('a game', () => {
  it('finished: rules, podium, standings that open a player, and every hand', async () => {
    const { u, state } = await open({ page: 'game', id: 'G1' });
    expect(await screen.findByRole('heading', { name: 'Riya won · 380' })).toBeInTheDocument();
    expect(screen.getByText('1 deck · min bid 150 · 1 partner')).toBeInTheDocument();
    expect(screen.getByText('Hand by hand')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resume|Continue/ })).toBeNull();
    await u.click(screen.getByRole('button', { name: "Meera's stats" }));
    expect(state().pages.at(-1)).toEqual({ page: 'player', id: 'Meera' });
  });

  it('the game on the table resumes; another game in play can be continued', async () => {
    const first = await open({ page: 'game', id: 'L' }, [G1, L], L);
    await first.u.click(await screen.findByRole('button', { name: 'Resume game' }));
    expect(first.state()).toMatchObject({ screen: 'game', pages: [] });
    first.unmount();

    const { u, state } = await open({ page: 'game', id: 'L' }, [G1, L], null);
    await u.click(await screen.findByRole('button', { name: 'Continue this game' }));
    expect(state()).toMatchObject({ screen: 'game', pages: [] });
    expect(state().game?.syncId).toBe('L');
  });

  it('an unknown game', async () => {
    await open({ page: 'game', id: 'nope' });
    expect(await screen.findByText('Game not found')).toBeInTheDocument();
  });
});

describe('Leaderboard', () => {
  it('by points this season; made % ranks only players with enough bids', async () => {
    const { u, state } = await open({ page: 'leaderboard' });
    expect(await screen.findByRole('button', { name: '#1, Riya, 780' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#2, Aarav, 580' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#5, Dev, 0' })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Made %' }));
    expect(screen.getByText(/Nobody has yet/)).toBeInTheDocument();
    expect(screen.getByText('Fewer than 5 bids')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unranked, Kabir, 100%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unranked, Meera, –' })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Wins' }));
    expect(screen.getByRole('button', { name: '#1, Kabir, 1' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: '#1, Riya, 1' }));
    expect(state().pages.at(-1)).toEqual({ page: 'player', id: 'Riya' });
  });

  it('a period with nothing in it offers all time', async () => {
    vi.setSystemTime(T0 + 30 * DAY);
    const { u } = await open({ page: 'leaderboard' });
    expect(await screen.findByText('Nothing in this period')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Show all time' }));
    expect(await screen.findByRole('button', { name: '#1, Riya, 780' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all time' })).toBeNull();
  });

  it('today: only the game in play', async () => {
    const { u } = await open({ page: 'leaderboard' });
    await u.click(await screen.findByRole('button', { name: 'Today' }));
    expect(screen.getByRole('button', { name: '#1, Riya, 150' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dev/ })).toBeNull();
  });

  it('no games at all', async () => {
    await open({ page: 'leaderboard' }, []);
    expect(
      await screen.findByText('Score a game and the table ranks itself here.'),
    ).toBeInTheDocument();
  });
});

describe('players, a player and head to head', () => {
  it('players: most games first, a search with no match, and a row opens their stats', async () => {
    const { u, state } = await open({ page: 'players' });
    const list = await screen.findByRole('list');
    const text = within(list)
      .getAllByRole('button')
      .map((b) => b.textContent?.replace(/[^\w ]/gu, ''));
    expect(text).toEqual([
      'Aarav3 games',
      'Kabir3 games',
      'Riya3 games',
      'Meera2 games',
      'Dev1 game',
    ]);
    await u.type(screen.getByLabelText('Find a player'), 'zz');
    expect(screen.getByText('Nobody called “zz”')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Clear search' }));
    await u.type(screen.getByLabelText('Find a player'), 'me');
    await u.click(screen.getByRole('button', { name: /Meera/ }));
    expect(state().pages.at(-1)).toEqual({ page: 'player', id: 'Meera' });
  });

  it('no players yet', async () => {
    await open({ page: 'players' }, []);
    expect(await screen.findByText('No players yet')).toBeInTheDocument();
  });

  it('a player: games, bidding and partner stats, recent games and who they play with', async () => {
    const { u, state } = await open({ page: 'player', id: 'Riya' });
    expect(await screen.findByRole('heading', { name: 'Riya' })).toBeInTheDocument();
    const tile = (label: string) => screen.getByText(label).parentElement!;
    expect(tile('Points')).toHaveTextContent('780');
    expect(tile('Made %')).toHaveTextContent('67%2 of 3');
    expect(tile('Highest made')).toHaveTextContent('180');
    expect(tile('Average place')).toHaveTextContent('1.5');
    expect(screen.getByText('Most often with')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /^#1/ }));
    expect(state().pages.at(-1)).toEqual({ page: 'game', id: 'G1' });
  });

  it('a player with no games here', async () => {
    await open({ page: 'player', id: 'Nobody' });
    expect(await screen.findByText('No games for this player')).toBeInTheDocument();
  });

  it('head to head from a player, and back', async () => {
    const { u, state } = await open({ page: 'player', id: 'Kabir' });
    const rows = await screen.findAllByRole('button', { name: 'Kabir and Riya, head to head' });
    await u.click(rows[0]);
    expect(state().pages.at(-1)).toEqual({ page: 'h2h', a: 'Kabir', b: 'Riya' });
    expect(await screen.findByRole('heading', { name: 'Kabir · Riya' })).toBeInTheDocument();
    expect(screen.getByText('Games together').parentElement).toHaveTextContent('3');
    await u.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(state().pages.at(-1)).toEqual({ page: 'player', id: 'Kabir' }));
  });

  it('two players who never shared a table', async () => {
    await open({ page: 'h2h', a: 'Meera', b: 'Dev' });
    expect(await screen.findByText('Not at the same table yet')).toBeInTheDocument();
  });
});
