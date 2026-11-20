import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CROWN_SHOWS_A_NIGHT,
  forgetMoments,
  MomentQueue,
  MomentsProvider,
  resetCrownShows,
  takeCrownShow,
} from '@/fx/moments';
import { clearNews, news, putStatus } from '@/sync/news';
import type { CrownChange, GameStatus, PlayerSummary } from '@/sync/types';
import { CrownNews } from './CrownNews';
import { crownBanner } from './crownNews';

const p = (id: string, displayName: string) => ({ id, displayName }) as unknown as PlayerSummary;
const RIYA = p('r', 'Riya'),
  DEV = p('d', 'Dev'),
  ASHA = p('a', 'Asha');
const change = (kind: CrownChange['kind'], to: PlayerSummary[], from: PlayerSummary[] = []) => ({
  kind,
  to,
  from,
  defences: 0,
});
const st = (changes: CrownChange[], bounties: GameStatus['bounties'] = []): GameStatus => ({
  changes,
  bounties,
});

describe('what the crown news says', () => {
  it('heads a Kursi taken with "Kursi chheeni!" and who took it from whom', () => {
    expect(crownBanner(st([change('kursi', [DEV], [RIYA])]))).toEqual({
      glyph: '🪑',
      headline: 'Kursi chheeni!',
      lines: ['Dev ne Riya se Kursi chheen li'],
      kind: 'kursi',
    });
    expect(crownBanner(st([change('kursi', [DEV])]))?.headline).toBe('Pehli Kursi!');
  });

  it('puts a new Badshah first, with the Kursi, the other medals and the bounty as lines', () => {
    const b = crownBanner(
      st(
        [
          change('kursi', [DEV], [RIYA]),
          change('medal2', [ASHA]),
          change('medal1', [DEV], [RIYA]),
        ],
        [{ holder: RIYA, winner: DEV, amount: 40 }],
      ),
    );
    expect(b?.headline).toBe('Naya Badshah: Dev!');
    expect(b?.kind).toBe('gold');
    expect(b?.lines).toEqual([
      'Riya was Badshah',
      '🪑 Kursi chheeni! Dev ne Riya se Kursi chheen li',
      '🥈 Asha is the new Wazir',
      '+40 🪙 bounty: Dev beat Riya',
    ]);
  });

  it('leads with the Sitara, the Legend or a bounty when no big crown moved', () => {
    expect(crownBanner(st([change('sitara', [ASHA, DEV])]))).toMatchObject({
      glyph: '⭐',
      headline: '⭐ Aaj ka Sitara: Asha & Dev',
      kind: 'news',
    });
    expect(crownBanner(st([change('legend', [RIYA])]))?.headline).toBe('🏛️ Naya Legend: Riya');
    expect(crownBanner(st([], [{ holder: RIYA, winner: DEV, amount: 40 }]))).toEqual({
      glyph: '🪙',
      headline: '+40 🪙 bounty: Dev beat Riya',
      lines: [],
      kind: 'bounty',
    });
  });

  it('says nothing for a crown nobody holds now', () => {
    expect(crownBanner(st([change('sitara', [], [ASHA])]))).toBeNull();
  });
});

describe('crown news on another phone at the table', () => {
  let q: MomentQueue;
  const mount = () => {
    q = new MomentQueue({ playSound: () => undefined, vibrate: () => undefined });
    render(
      <MomentsProvider queue={q}>
        <CrownNews />
      </MomentsProvider>,
    );
  };
  const put = (s: GameStatus, local = false, gameId = 'g1') =>
    act(() => putStatus({ ...s, game: 'kachuful', gameId, local, at: 1 }));

  beforeEach(() => {
    forgetMoments();
    resetCrownShows();
    clearNews();
  });

  it('shows the banner for news from the stream, drops it from the store, and a tap closes it', async () => {
    mount();
    put(st([change('kursi', [DEV], [RIYA])]));
    const banner = await screen.findByRole('button', { name: /Kursi chheeni!/ });
    expect(banner).toHaveTextContent('Dev ne Riya se Kursi chheen li');
    expect(news().status).toEqual([]);
    fireEvent.click(banner);
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
  });

  it('closes on Escape', async () => {
    mount();
    put(st([], [{ holder: RIYA, winner: DEV, amount: 40 }]));
    await screen.findByRole('button', { name: /bounty: Dev beat Riya/ });
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
  });

  it('leaves the table device’s own news alone: it already showed the takeover', async () => {
    mount();
    put(st([change('kursi', [DEV], [RIYA])]), true);
    await act(() => Promise.resolve());
    expect(screen.queryByRole('button')).toBeNull();
    expect(news().status).toHaveLength(1);
  });

  it('waits while the screen takes a bid, then plays', async () => {
    mount();
    const release = q.hold();
    put(st([change('kursi', [DEV], [RIYA])]));
    await act(() => Promise.resolve());
    expect(screen.queryByRole('button')).toBeNull();
    act(release);
    await screen.findByRole('button', { name: /Kursi chheeni!/ });
  });

  it('past tonight’s crown shows the banner still comes, without the crown’s sound', async () => {
    for (let i = 0; i < CROWN_SHOWS_A_NIGHT; i++) takeCrownShow();
    const sounds: string[] = [];
    q = new MomentQueue({ playSound: (n) => sounds.push(n), vibrate: () => undefined });
    render(
      <MomentsProvider queue={q}>
        <CrownNews />
      </MomentsProvider>,
    );
    put(st([change('kursi', [DEV], [RIYA])]));
    await screen.findByRole('button', { name: /Kursi chheeni!/ });
    expect(sounds).toEqual([]);
  });
});
