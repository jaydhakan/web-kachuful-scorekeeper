import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardMenu } from './BoardMenu';

const menu = (o: { host?: boolean; timed?: boolean } = {}) => {
  const props = {
    onClose: vi.fn(),
    onRules: vi.fn(),
    onLeave: vi.fn(),
    onResign: vi.fn(),
    canResign: true,
    gameId: 'g1',
    ...o,
  };
  render(<BoardMenu {...props} />);
  return props;
};

afterEach(() => vi.unstubAllGlobals());

describe('the board menu (ISH-F22)', () => {
  it('lets the host end a game without a result, after asking', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? 'GET'} ${url}`);
        return new Response(null, { status: 204 });
      }),
    );
    const u = userEvent.setup();
    const p = menu({ host: true });
    await u.click(screen.getByRole('button', { name: 'End game without a result' }));
    expect(p.onLeave).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: 'End game' }));
    await waitFor(() => expect(p.onLeave).toHaveBeenCalled());
    expect(calls.some((c) => c.startsWith('DELETE') && c.includes('/ishaara/games/g1'))).toBe(true);
  });

  it('asks before the host leaves a timed turn, and leaves at once otherwise', async () => {
    const u = userEvent.setup();
    const timed = menu({ host: true, timed: true });
    await u.click(screen.getByRole('button', { name: 'Back to games' }));
    expect(timed.onLeave).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: 'Stay on the board' }));
    expect(timed.onLeave).not.toHaveBeenCalled();
  });

  it('shows no End game to someone who only watches', () => {
    const p = menu();
    expect(screen.queryByRole('button', { name: 'End game without a result' })).toBeNull();
    screen.getByRole('button', { name: 'Back to games' }).click();
    expect(p.onLeave).toHaveBeenCalled();
  });
});
