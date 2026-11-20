import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameProgression } from '@/progression/registry';
import { WIN_STREAK } from '@/progression/rules';
import { monthOf } from '@/progression/zone';
import type { Earned } from '@/progression/types';
import { archive } from '@/state/archive';
import { ep } from '@/sync/endpoints';
import { AchievementsPage } from './AchievementsPage';
import { ActivityPage } from './ActivityPage';
import { AwardsPage } from './AwardsPage';
import { SeasonNews } from './SeasonNews';
import { StatCrowns } from './StatCrowns';
import { saveSeasonShown } from '@/state/persistence';
import { bindDevice, ProgressionScope, type ProgressionEnv } from './env';

const ok = <T,>(data: T) => ({ data, status: 200, etag: null });
const text = (name: string, how = 'How') => ({ name, how });

/** A made-up game ranked on win rate, with a hand moment, a 🙃 one and the shared win-streak ladder. */
const prog: GameProgression<Earned[]> = {
  id: 'spades',
  catalogue: [
    { code: 'boston', emoji: '🧹', group: 'moment', big: true },
    { code: 'sandbagged', emoji: '🛍️', group: 'moment', shame: true },
    { code: 'deuce_ace', emoji: '🪨', group: 'moment', hidden: true },
    ...WIN_STREAK.codes.map((code) => ({ code, emoji: '🥇', group: 'career' as const })),
    { code: 'season_champion', emoji: '👑', group: 'season' },
  ],
  ladders: [WIN_STREAK],
  strings: {
    achievements: {
      boston: text('Boston', 'Take all 13 tricks'),
      sandbagged: text('Sandbagged'),
      deuce_ace: text('Deuce Ace', 'Win a trick with the two'),
      first_win: text('First Win'),
      back_to_back: text('Back to Back'),
      hat_trick: text('Hat-trick'),
      dynasty: text('Dynasty'),
      season_champion: text('Season Champion'),
    },
    ladders: { wins: { name: 'Winning run', count: 'Most wins in a row' } },
    groups: {
      moment: 'Hand moments',
      game: 'Game finish',
      career: 'Career',
      daily: 'Daily awards',
      season: 'Seasons',
    },
    dayEmpty: 'Awards appear once hands are played.',
    seasonEmpty: 'No games this month yet',
  },
  standings: 'winRate',
  seasonMin: 10,
  device: {
    earned: (f) => f,
    ladderCounts: () => ({ wins: 1 }),
    daily: () => [],
    season: (_f, month) => ({ season: month, standings: [], awards: [] }),
    months: () => [],
  },
};

const won = (code: string, playerId: string): Earned => ({
  code,
  playerId,
  gameId: 'g',
  roundIndex: 0,
  period: null,
  earnedAt: Date.now(),
  data: {},
});

const envOf = (signedIn: boolean, over: Partial<ProgressionEnv> = {}): ProgressionEnv => ({
  prog: prog as GameProgression,
  signedIn,
  me: signedIn ? 'a' : null,
  person: (id) => ({ id, name: id.toUpperCase(), emoji: '🙂', color: 'var(--tx2)' }),
  onBack: () => {},
  openPlayer: vi.fn(),
  openAchievements: vi.fn(),
  device: bindDevice(prog.device!, [
    won('boston', 'a'),
    won('sandbagged', 'a'),
    won('first_win', 'b'),
  ]),
  ...over,
});

const show = async (env: ProgressionEnv, page: React.ReactNode) => {
  await archive.ready;
  render(<ProgressionScope env={env}>{page}</ProgressionScope>);
};

describe('the shared pages, for a game ranked on win rate', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists the catalogue by its own groups, a ladder as one card and a 🙃 on the shame ones', async () => {
    await show(envOf(false), <AchievementsPage id="a" />);
    expect(screen.getByRole('heading', { name: 'Hand moments' })).toBeInTheDocument();
    const boston = screen.getByText('Boston').closest('li')!;
    expect(within(boston).getByText(/^Earned · /)).toBeInTheDocument();
    const shame = screen.getByText('Sandbagged').closest('li')!;
    expect(within(shame).getByRole('img', { name: 'Just for laughs' })).toBeInTheDocument();
    const run = screen.getByText('Winning run').closest('li')!;
    expect(within(run).getByText('Most wins in a row 1 / 1')).toBeInTheDocument();
  });

  it('keeps a hidden achievement a secret until someone earns it', async () => {
    await show(envOf(false), <AchievementsPage id="a" />);
    expect(screen.queryByText('Deuce Ace')).toBeNull();
    expect(screen.getByText('???')).toBeInTheDocument();
    cleanup();
    await show(
      envOf(false, { device: bindDevice(prog.device!, [won('deuce_ace', 'b')]) }),
      <AchievementsPage id="a" />,
    );
    expect(screen.getByText('Deuce Ace')).toBeInTheDocument();
  });

  it('reads the season from the server with ?game=, ranked on win rate', async () => {
    const month = monthOf(Date.now());
    vi.spyOn(ep, 'daily').mockResolvedValue(ok({ date: '', awards: [], final: false }));
    vi.spyOn(ep, 'seasons').mockResolvedValue(ok([]));
    const season = vi.spyOn(ep, 'season').mockResolvedValue(
      ok({
        season: month,
        final: false,
        gameKind: 'spades',
        minGames: 10,
        standings: [
          { rank: 1, qualified: true, player: { id: 'a' }, value: 0.7, games: 10, wins: 7 },
          { rank: null, qualified: false, player: { id: 'b' }, value: 0.5, games: 4, wins: 2 },
        ],
        awards: [
          {
            code: 'season_champion',
            player: { id: 'a' },
            value: 0.7,
            gameId: null,
            roundIndex: null,
          },
        ],
      }) as never,
    );
    await show(envOf(true), <AwardsPage />);
    await userEvent
      .setup({ pointerEventsCheck: 0 })
      .click(screen.getByRole('button', { name: /Season/ }));
    expect(await screen.findByText('7 of 10 games won')).toBeInTheDocument();
    expect(screen.getByText('2 of 4 games won')).toBeInTheDocument();
    expect(screen.getByText('Not ranked yet · 10 games needed')).toBeInTheDocument();
    const champ = screen.getByText('Season Champion').closest('button')!;
    expect(within(champ).getByText('70%')).toBeInTheDocument();
    expect(season.mock.calls[0][2]).toBe('spades');
  });

  it('reveals a season that has just closed once on this device, and replays it on asking', async () => {
    const now = new Date();
    const last = monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 15).getTime());
    const env = envOf(false, {
      device: bindDevice(
        {
          ...prog.device!,
          months: () => [last],
          season: (_f, month) => ({
            season: month,
            standings: [
              { playerId: 'a', rank: 1, qualified: true, value: 0.7, games: 10 },
              { playerId: 'b', rank: 2, qualified: true, value: 0.6, games: 10 },
            ],
            awards: [],
          }),
        },
        [],
      ),
    });
    await show(env, <AwardsPage />);
    // The page opens on the closed season, with the ceremony's title and the champion crowned.
    const title = await screen.findByRole('heading', { name: /^Season · / });
    expect(document.querySelector('[data-season-podium="ceremony"] [data-crown]')).not.toBeNull();
    await userEvent
      .setup({ pointerEventsCheck: 0 })
      .click(screen.getByRole('button', { name: 'Replay the reveal' }));
    expect(await screen.findByRole('heading', { name: title.textContent! })).toBeInTheDocument();
    // Seen once: the next visit opens on the day, as usual.
    cleanup();
    await show(env, <AwardsPage />);
    expect(screen.queryByRole('heading', { name: /^Season · / })).not.toBeInTheDocument();
  });

  it('says on the leaderboard that a season is decided, until its reveal has been seen', async () => {
    const now = new Date();
    const last = monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 15).getTime());
    const env = envOf(false, {
      device: bindDevice(
        {
          ...prog.device!,
          months: () => [last],
          season: (_f, month) => ({
            season: month,
            standings: [{ playerId: 'a', rank: 1, qualified: true, value: 0.7, games: 10 }],
            awards: [],
          }),
        },
        [],
      ),
    });
    const open = vi.fn();
    await archive.ready;
    const { unmount } = render(<SeasonNews env={env} onOpen={open} />);
    await userEvent.click(screen.getByRole('button', { name: /season is decided/ }));
    expect(open).toHaveBeenCalled();
    unmount();
    saveSeasonShown('spades', last);
    render(<SeasonNews env={env} onOpen={open} />);
    expect(screen.queryByRole('button', { name: /season is decided/ })).not.toBeInTheDocument();
  });

  it("says why a day is empty in the game's own words", async () => {
    await show(envOf(false), <AwardsPage />);
    expect(screen.getByText('Awards appear once hands are played.')).toBeInTheDocument();
  });

  it("names a feed item's achievement from the game's catalogue", async () => {
    const feed = vi.spyOn(ep, 'activity').mockResolvedValue({
      items: [
        {
          id: 1,
          kind: 'achievement',
          gameKind: 'spades',
          player: { id: 'a', displayName: 'Asha' } as never,
          game: null,
          data: { code: 'boston' },
          createdAt: Date.now(),
        },
      ],
      nextCursor: null,
    });
    await show(envOf(true), <ActivityPage />);
    expect(await screen.findByText('Asha earned Boston')).toBeInTheDocument();
    expect(feed).toHaveBeenCalledWith(null, 'spades');
  });

  it('shows the catalogue locked for a game with nothing on the device, signed out', async () => {
    await show(envOf(false, { device: undefined }), <AchievementsPage />);
    expect(screen.getByText('Boston').closest('li')).toHaveTextContent('Not earned yet');
  });

  it("names the stat crowns a player holds this month, and nobody else's", async () => {
    const device = {
      ...prog.device!,
      season: (_f: Earned[], month: string) => ({
        season: month,
        standings: [],
        awards: [
          { code: 'season_sharpest', playerId: 'a', value: 0.8 },
          { code: 'season_iron', playerId: 'b', value: 40 },
        ],
      }),
    };
    const env = envOf(false, { device: bindDevice(device, []) });
    await show(env, <StatCrowns env={env} playerId="a" />);
    const list = screen.getByRole('list', { name: 'Crowns held this month' });
    expect(within(list).getByText('Nishanebaaz')).toBeInTheDocument();
    expect(within(list).queryByText('Lohe ka')).toBeNull();
  });
});
