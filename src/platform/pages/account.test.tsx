import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { recFromServer } from '@/state/registry';
import { KEYS } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import { resetFxForTests } from '@/fx/prefs';
import type { Player } from '@/sync/types';
import { AccountPage } from './AccountPage';

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const PHOTO = '/api/players/p1/photo?v=2';
const player: Player = {
  id: 'p1',
  displayName: 'Jay',
  email: 'me@test.dev',
  photoUrl: PHOTO,
  firstName: 'Jay',
  lastName: 'Dhakan',
  emoji: '🦊',
  color: 'c1',
  createdBy: null,
  linkedUserId: 'u1',
  mergedInto: null,
  createdAt: 0,
  updatedAt: 0,
};

const profile = (rank: number | null) =>
  ({
    player: { ...player, games: 14, lastPlayedAt: null, createdByName: 'Jay' },
    totals: { games: 14 },
    achievements: [
      { id: 'a1', code: 'first_game', playerId: 'p1' },
      { id: 'a2', code: 'first_game', playerId: 'p1' },
      { id: 'a3', code: 'first_win', playerId: 'p1' },
    ],
    rank: { global: rank, outOf: 9 },
  }) as unknown as Awaited<ReturnType<typeof ep.player>>;

async function show(withPlayer = false) {
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({
      user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: withPlayer ? 'p1' : null },
      player: withPlayer ? player : null,
    }),
  );
  await archive.ready;
  if (withPlayer) archive.put('players', recFromServer(player));
  render(
    <AppProvider>
      <AccountPage />
    </AppProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());
const res = <T,>(data: T) => ({ data, status: 200, etag: null });
// The wallet asks for the player's Sikke, the nights card for their nights; these tests are about the rest.
beforeEach(() => {
  vi.spyOn(ep, 'nights').mockResolvedValue({ items: [], nextCursor: null });
  vi.spyOn(ep, 'sikke').mockResolvedValue(
    res({
      playerId: 'p1',
      balance: 0,
      lifetime: 0,
      level: { n: 1, from: 0, next: 500 },
    }),
  );
});

describe('the Me screen', () => {
  it('shows my photo large, my email once, and where I stand', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(1));
    await show(true);
    expect(screen.getByRole('heading', { name: 'Me' })).toBeInTheDocument();
    const hero = screen.getByRole('button', { name: /Photo of Jay/ });
    expect(hero.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
    expect(screen.getAllByText(/me@test\.dev/)).toHaveLength(1);
    expect(screen.getByText('Jay Dhakan · me@test.dev')).toBeInTheDocument();
    const rank = await screen.findByRole('button', { name: /Rank/ });
    expect(rank).toHaveTextContent('#1');
    expect(rank).toHaveTextContent('of 9');
    expect(screen.getByRole('button', { name: /Games/ })).toHaveTextContent('14');
    // Two of one code count once.
    expect(screen.getByRole('button', { name: /Achievements/ })).toHaveTextContent(/^2/);
  });

  it('says so when I am not ranked yet', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(null));
    await show(true);
    expect(await screen.findByRole('button', { name: /Rank/ })).toHaveTextContent('Not ranked');
  });

  it('hides Needs you while nothing needs me, and counts it when something does', async () => {
    await show();
    expect(screen.queryByText(/Needs you/)).not.toBeInTheDocument();
    archive.put('inbox', {
      id: 'i1',
      kind: 'conflict',
      createdAt: 1,
      key: 'g1',
      data: { copy: 'g1' },
    });
    expect(await screen.findByText('Needs you (1)')).toBeInTheDocument();
    archive.del('inbox', 'i1');
  });

  it('changes the password in a sheet', async () => {
    const change = vi.spyOn(ep, 'changePassword').mockResolvedValue(undefined as never);
    await show();
    const u = setup();
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Change password' }));
    const sheet = screen.getByRole('dialog', { name: 'Change password' });
    await u.type(within(sheet).getByLabelText('Current password'), 'old-one');
    await u.type(within(sheet).getByLabelText('New password'), 'new-one-2');
    await u.click(within(sheet).getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(change).toHaveBeenCalledWith('old-one', 'new-one-2'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('sounds and vibration', () => {
  beforeEach(() => resetFxForTests());

  it('defaults to Big moments and vibration on, and keeps a change on this device', async () => {
    await show();
    const u = setup();
    const sounds = screen.getByRole('group', { name: 'Sounds' });
    expect(within(sounds).getByRole('button', { name: 'Big moments' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const vib = screen.getByRole('switch', { name: /Vibration/ });
    expect(vib).toHaveAttribute('aria-checked', 'true');
    await u.click(within(sounds).getByRole('button', { name: 'Off' }));
    await u.click(vib);
    expect(vib).toHaveAttribute('aria-checked', 'false');
    expect(JSON.parse(localStorage.getItem(KEYS.fx) ?? 'null')).toEqual({
      sounds: 'off',
      vibrate: false,
      banter: true,
    });
  });

  it('has table banter on by default, and turns it off on this device', async () => {
    await show();
    const u = setup();
    const banter = screen.getByRole('switch', { name: /Table banter/ });
    expect(banter).toHaveAttribute('aria-checked', 'true');
    await u.click(banter);
    expect(banter).toHaveAttribute('aria-checked', 'false');
    expect(JSON.parse(localStorage.getItem(KEYS.fx) ?? 'null')).toMatchObject({ banter: false });
  });

  it('is there signed out too', () => {
    render(
      <AppProvider>
        <AccountPage />
      </AppProvider>,
    );
    expect(screen.getByRole('group', { name: 'Sounds' })).toBeInTheDocument();
  });
});

describe('signing out', () => {
  it('asks once, and Cancel really cancels', async () => {
    const out = vi.spyOn(ep, 'logout').mockResolvedValue(undefined as never);
    await show();
    const u = setup();
    await u.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Sign out of me@test.dev?');
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(out).not.toHaveBeenCalled();
  });

  it('removes the synced games without asking again', async () => {
    const out = vi.spyOn(ep, 'logout').mockResolvedValue(undefined as never);
    await show();
    const u = setup();
    await u.click(await screen.findByRole('button', { name: 'Sign out' }));
    await u.click(screen.getByRole('button', { name: 'Remove synced games' }));
    await waitFor(() => expect(out).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('the Me screen’s every-game sections', () => {
  const page = <T,>(items: T[]) => ({ items, nextCursor: null });

  it('counts each game’s achievements I hold, once per code, out of its catalogue', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(1));
    vi.spyOn(ep, 'activity').mockResolvedValue(page([]));
    vi.spyOn(ep, 'achievements').mockImplementation(async (_id, _c, game) =>
      page(
        game === 'spades'
          ? ([{ code: 'boston' }, { code: 'boston' }, { code: 'winner' }] as never[])
          : [],
      ),
    );
    await show(true);
    const spades = await screen.findByRole('button', { name: /^Spades: 2 of \d+ achievements$/ });
    expect(spades).toHaveTextContent(/^Spades2 \/ \d+$/);
    expect(screen.getByRole('button', { name: /^Ishaara: 0 of \d+ achievements$/ })).toBeVisible();
  });

  it('shows the newest few items from every game, each naming its game, and links to the whole feed', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(1));
    vi.spyOn(ep, 'achievements').mockResolvedValue(page([]));
    const who = { id: 'p1', displayName: 'Jay', emoji: '🦊', color: 'c1', photoUrl: null };
    const items = [1, 2, 3, 4].map((id) => ({
      id,
      kind: 'achievement' as const,
      gameKind: id === 1 ? ('ishaara' as const) : ('spades' as const),
      player: who,
      game: null,
      data: { code: id === 1 ? 'mind_meld' : 'boston' },
      createdAt: Date.now(),
    }));
    vi.spyOn(ep, 'activity').mockResolvedValue(page(items) as never);
    await show(true);
    expect(await screen.findByText('Jay earned Mind meld')).toBeInTheDocument();
    expect(screen.getByText('in Ishaara')).toBeInTheDocument();
    expect(screen.getAllByText('Jay earned Boston')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'See all activity' })).toBeVisible();
    expect(ep.activity).toHaveBeenCalledWith(null, 'all');
  });

  it('says so when nothing has happened yet', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(1));
    vi.spyOn(ep, 'achievements').mockResolvedValue(page([]));
    vi.spyOn(ep, 'activity').mockResolvedValue(page([]));
    await show(true);
    expect(await screen.findByText('Nothing yet')).toBeInTheDocument();
  });

  it('offers a retry when the counts fail to load', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(1));
    vi.spyOn(ep, 'activity').mockResolvedValue(page([]));
    const ach = vi.spyOn(ep, 'achievements').mockRejectedValue(new Error('offline'));
    await show(true);
    const retry = await screen.findByRole('button', { name: /Try again|Retry/ });
    ach.mockResolvedValue(page([]));
    await setup().click(retry);
    expect(
      await screen.findByRole('button', { name: /^Kachuful: 0 of \d+ achievements$/ }),
    ).toBeVisible();
  });
});

describe('the Me screen’s nights', () => {
  it('says my night is ready until I open it, and always offers my nights', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(1));
    vi.spyOn(ep, 'nights').mockResolvedValue({
      items: [
        {
          id: 'n1',
          closed: true,
          startedAt: Date.now() - 5 * 3600e3,
          endedAt: Date.now() - 4 * 3600e3,
          players: [],
          games: 3,
          winner: null,
        },
      ],
      nextCursor: null,
    });
    await show(true);
    expect(
      await screen.findByRole('button', { name: 'Your night is ready. Open the story' }),
    ).toHaveTextContent('3 games');
    expect(screen.getByRole('button', { name: 'Your nights' })).toBeVisible();
  });
});
