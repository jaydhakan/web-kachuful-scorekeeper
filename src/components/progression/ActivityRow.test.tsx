import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameProgression } from '@/progression/registry';
import { newsworthy, type Activity, type PlayerSummary } from '@/sync/types';
import { ActivityRow } from './ActivityPage';
import { ProgressionScope, type ProgressionEnv } from './env';

const prog = {
  id: 'kachuful',
  catalogue: [],
  ladders: [],
  strings: { achievements: {} },
} as unknown as GameProgression;
const NAMES: Record<string, string> = { r: 'Riya', d: 'Dev', a: 'Asha' };
const envOf = (over: Partial<ProgressionEnv> = {}): ProgressionEnv => ({
  prog,
  signedIn: true,
  me: 'r',
  person: (id) => ({ id, name: NAMES[id] ?? id, emoji: '🙂', color: 'var(--tx2)' }),
  onBack: () => {},
  openPlayer: vi.fn(),
  openAchievements: vi.fn(),
  ...over,
});
const summary = (id: string) =>
  ({ id, displayName: NAMES[id], emoji: '🙂', color: 'var(--tx2)' }) as unknown as PlayerSummary;
const item = (kind: Activity['kind'], data: Record<string, unknown>, player = 'd'): Activity => ({
  id: 1,
  kind,
  gameKind: 'kachuful',
  player: summary(player),
  game: null,
  data,
  createdAt: Date.now(),
});
const row = (a: Activity, env = envOf()) =>
  render(
    <ProgressionScope env={env}>
      <ActivityRow a={a} />
    </ProgressionScope>,
  );

describe('crowns and nights in the feed', () => {
  it('keeps both: the feed leaves out only small streaks', () => {
    expect(newsworthy(item('crown', { crown: 'medal1', from: ['r'], to: ['d'] }))).toBe(true);
    expect(newsworthy(item('night', { nightId: 'n1', games: 4, winner: 'r' }))).toBe(true);
  });

  it('says who took a crown, and opens the new holder', async () => {
    const env = envOf();
    row(item('crown', { crown: 'medal1', from: ['r'], to: ['d'], defences: 0 }), env);
    const b = screen.getByRole('button', { name: /Dev is the new Badshah/ });
    expect(b).toHaveTextContent('🥇');
    await userEvent.click(b);
    expect(env.openPlayer).toHaveBeenCalledWith('d');
  });

  it('words each medal, the Sitara, the Legend and a kind it does not know', () => {
    const lines = [
      [{ crown: 'kursi', from: [], to: ['d'] }, 'Dev took a crown'],
      [{ crown: 'medal1', from: ['r'], to: ['d'] }, 'Dev is the new Badshah'],
      [{ crown: 'medal3', from: [], to: ['d'] }, 'Dev is the new Senapati'],
      [{ crown: 'sitara', from: [], to: ['d', 'a'] }, 'Dev & Asha are tonight’s Sitara'],
      [{ crown: 'legend', from: [], to: ['d'] }, 'Dev is the new Legend'],
    ] as const;
    for (const [data, text] of lines) {
      const { unmount } = row(item('crown', data));
      expect(screen.getByRole('button')).toHaveTextContent(text);
      unmount();
    }
  });

  it('says a night’s Wrapped is ready and opens it', async () => {
    const openNight = vi.fn();
    row(
      item('night', { nightId: 'n1', games: ['g1', 'g2', 'g3', 'g4'], winner: 'r' }, 'r'),
      envOf({ openNight }),
    );
    const b = screen.getByRole('button', {
      name: /Tonight’s Wrapped is ready: 4 games, Riya won/,
    });
    await userEvent.click(b);
    expect(openNight).toHaveBeenCalledWith('n1');
  });

  it('without a night page, a night opens its winner', async () => {
    const env = envOf();
    row(item('night', { nightId: 'n1', games: 1, winner: null }, 'r'), env);
    const b = screen.getByRole('button', { name: /Tonight’s Wrapped is ready: 1 game/ });
    await userEvent.click(b);
    expect(env.openPlayer).toHaveBeenCalledWith('r');
  });
});
