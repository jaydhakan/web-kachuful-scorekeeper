import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { KEYS, wasNightSeen } from '@/state/persistence';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { clearNews, news, putNight } from '@/sync/news';
import type { NightResp, NightRow, Page, PlayerSummary } from '@/sync/types';
import {
  markNightOpened,
  NightReadyCard,
  useReadyNight,
} from '@/games/kachuful/components/NightReady';
import { NightPage } from './NightPage';

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const res = <T,>(data: T) => ({ data, status: 200, etag: null });
const person = (id: string, displayName: string) =>
  ({ id, displayName, emoji: '🦊', color: 'c1', photoUrl: null }) as unknown as PlayerSummary;
const RIYA = person('p1', 'Riya');
const DEV = person('p2', 'Dev');

const story: NightResp = {
  id: 'n1',
  closed: true,
  startedAt: Date.now() - 6 * 3600e3,
  endedAt: Date.now() - 4 * 3600e3,
  players: [RIYA, DEV],
  data: {
    from: 0,
    to: 1,
    gameIds: ['g1', 'g2'],
    players: [
      { playerId: 'p1', wins: 2, games: 2, edge: 40 },
      { playerId: 'p2', wins: 0, games: 2, edge: -40 },
    ],
    winner: 'p1',
    swing: null,
    bestBid: null,
    braveCall: { playerId: 'p2', bid: 5, cards: 6 },
    gameWinners: [['p1'], ['p1']],
    gameKinds: ['kachuful', 'kachuful'],
    sitara: ['p1'],
    sikke: { p1: 145, p2: 60 },
    achievements: [{ playerId: 'p2', game: 'kachuful', code: 'first_win' }],
  },
};

/** Shows the route on top of the nav stack, to see where a tap went. */
function Where() {
  const nav = useApp().state.nav;
  return <output data-testid="where">{JSON.stringify(nav.at(-1) ?? null)}</output>;
}

async function show(id?: string, signedIn = true) {
  if (signedIn)
    localStorage.setItem(
      KEYS.session,
      JSON.stringify({
        user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: 'p1' },
        player: { ...RIYA, email: 'me@test.dev' },
      }),
    );
  await archive.ready;
  render(
    <AppProvider>
      <NightPage id={id} />
      <Where />
    </AppProvider>,
  );
}
const where = () => JSON.parse(screen.getByTestId('where').textContent ?? 'null');
const next = (u: ReturnType<typeof setup>) => u.click(screen.getByRole('button', { name: 'Next' }));

afterEach(() => {
  vi.restoreAllMocks();
  clearNews();
});

describe('a night from the server', () => {
  it('waits while loading', async () => {
    vi.spyOn(ep, 'night').mockReturnValue(new Promise(() => {}));
    await show('n1');
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Tonight')).not.toBeInTheDocument();
  });

  it('says the night is still being counted, and asks again on Check again', async () => {
    const get = vi
      .spyOn(ep, 'night')
      .mockResolvedValueOnce(res({ ...story, closed: false, data: null }))
      .mockResolvedValue(res(story));
    await show('n1');
    expect(await screen.findByText('Your night is being counted…')).toBeInTheDocument();
    expect(wasNightSeen('n1')).toBe(false);
    await setup().click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('2 games')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('shows the error with a retry', async () => {
    vi.spyOn(ep, 'night')
      .mockRejectedValueOnce(new ApiError(500, 'server'))
      .mockResolvedValue(res(story));
    await show('n1');
    expect(await screen.findByText("That didn't load")).toBeInTheDocument();
    await setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('2 games')).toBeInTheDocument();
  });

  it('tells the story with the server’s names, Sitara, achievements and Sikke, and remembers it was opened', async () => {
    vi.spyOn(ep, 'night').mockResolvedValue(res(story));
    putNight('n1');
    await show('n1');
    expect(await screen.findByText('2 games')).toBeInTheDocument();
    await waitFor(() => expect(wasNightSeen('n1')).toBe(true));
    expect(news().nights).not.toContain('n1');
    const u = setup();
    const seen: string[] = [];
    for (const kicker of [
      'The night’s winner',
      'Brave call',
      'Aaj ka Sitara',
      'Achievements tonight',
      'Sikke tonight',
      'The story of the night',
    ]) {
      await next(u);
      seen.push((await screen.findByText(kicker)).textContent!);
      if (kicker === 'The night’s winner') expect(screen.getByText('Riya')).toBeInTheDocument();
      if (kicker === 'Brave call')
        expect(screen.getByText('Dev went for it, on 6 cards')).toBeInTheDocument();
      if (kicker === 'Aaj ka Sitara') {
        expect(screen.getAllByText('Riya').at(-1)).toBeInTheDocument();
        expect(screen.getByText('Tonight’s star · +30 🪙 each')).toBeInTheDocument();
      }
      if (kicker === 'Achievements tonight')
        expect(await screen.findByText(/First win · Dev/)).toBeInTheDocument();
      if (kicker === 'Sikke tonight') {
        expect(screen.getByText('+205')).toBeInTheDocument();
        expect(screen.getByText('Riya +145 🪙')).toBeInTheDocument();
        expect(screen.getByText('Dev +60 🪙')).toBeInTheDocument();
      }
    }
    expect(seen).toHaveLength(6);
  });

  it('asks a signed-out visitor to sign in', async () => {
    const get = vi.spyOn(ep, 'night');
    await show('n1', false);
    expect(screen.getByText('Sign in to see this night')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
});

describe('your nights', () => {
  const open: NightRow = {
    id: null,
    closed: false,
    startedAt: Date.now() - 3600e3,
    endedAt: Date.now() - 600e3,
    players: [RIYA, DEV],
    games: 3,
    winner: null,
  };
  const closed: NightRow = {
    id: 'n1',
    closed: true,
    startedAt: story.startedAt,
    endedAt: story.endedAt,
    players: [RIYA, DEV],
    games: 2,
    winner: RIYA,
  };
  const page = (items: NightRow[]): Page<NightRow> => ({ items, nextCursor: null });

  it('lists the open night first, then each closed night, which opens its story', async () => {
    vi.spyOn(ep, 'nights').mockResolvedValue(page([open, closed]));
    await show();
    expect(await screen.findByText('3 games so far · being counted…')).toBeInTheDocument();
    const row = screen.getByRole('button', { name: /2 games · Riya won, new\. Open the night$/ });
    await setup().click(row);
    expect(where()).toEqual({ screen: 'night', params: { id: 'n1' } });
  });

  it('ends the night after asking, then opens it', async () => {
    const list = vi
      .spyOn(ep, 'nights')
      .mockResolvedValueOnce(page([open, closed]))
      .mockResolvedValue(page([{ ...open, id: 'n2', closed: true }, closed]));
    let done!: (v: { id: string }) => void;
    const close = vi.spyOn(ep, 'closeNight').mockReturnValue(new Promise((r) => (done = r)));
    await show();
    const u = setup();
    await u.click(await screen.findByRole('button', { name: 'End the night' }));
    const ask = screen.getByRole('alertdialog', { name: 'End the night now?' });
    await u.click(within(ask).getByRole('button', { name: 'End the night' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Ending…' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => done({ id: 'n2' }));
    expect(where()).toEqual({ screen: 'night', params: { id: 'n2' } });
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('keeps the night when the confirm is cancelled, and says so when there was none to end', async () => {
    vi.spyOn(ep, 'nights').mockResolvedValue(page([open]));
    const close = vi.spyOn(ep, 'closeNight').mockRejectedValue(new ApiError(404, 'not_found'));
    await show();
    const u = setup();
    await u.click(await screen.findByRole('button', { name: 'End the night' }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: 'End the night' }));
    await u.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'End the night' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('There’s no open night to end.');
  });

  it('says when there are no nights yet', async () => {
    vi.spyOn(ep, 'nights').mockResolvedValue(page([]));
    await show();
    expect(await screen.findByText('No nights yet')).toBeInTheDocument();
  });
});

describe('your night is ready', () => {
  const row = (id: string, endedAt: number): NightRow => ({
    id,
    closed: true,
    startedAt: endedAt - 3600e3,
    endedAt,
    players: [RIYA],
    games: 4,
    winner: RIYA,
  });
  function Ready() {
    const ready = useReadyNight('p1');
    return ready ? <NightReadyCard ready={ready} onOpen={() => {}} /> : <p>none</p>;
  }
  const card = () => screen.queryByRole('button', { name: 'Your night is ready. Open the story' });

  it('shows the latest closed night of the last week until it is opened here', async () => {
    vi.spyOn(ep, 'nights').mockResolvedValue({
      items: [row('n5', Date.now() - 864e5), row('n4', Date.now() - 2 * 864e5)],
      nextCursor: null,
    });
    await archive.ready;
    render(<Ready />);
    expect(await screen.findByText('4 games · Riya won')).toBeInTheDocument();
    act(() => markNightOpened('n5'));
    // The older one is next, until it too is opened.
    await waitFor(() => expect(card()).toBeInTheDocument());
    act(() => markNightOpened('n4'));
    expect(await screen.findByText('none')).toBeInTheDocument();
  });

  it('ignores nights older than a week, but not one the user stream just closed', async () => {
    vi.spyOn(ep, 'nights').mockResolvedValue({
      items: [row('n6', Date.now() - 8 * 864e5)],
      nextCursor: null,
    });
    await archive.ready;
    render(<Ready />);
    await waitFor(() => expect(ep.nights).toHaveBeenCalled());
    expect(await screen.findByText('none')).toBeInTheDocument();
    act(() => putNight('n7'));
    expect(await screen.findByText('Tap to open the story')).toBeInTheDocument();
    // The list is asked again, so the new night's row arrives.
    await waitFor(() => expect(ep.nights).toHaveBeenCalledTimes(2));
  });
});
