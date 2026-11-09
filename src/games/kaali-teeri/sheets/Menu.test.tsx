import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { archive } from '@/state/archive';
import { liveDemo, renderKt } from '@/games/kaali-teeri/test/render';
import type { KtGame } from '@/games/kaali-teeri/domain';
import Confirm from './Confirm';
import Menu from './Menu';

const u = () => userEvent.setup({ pointerEventsCheck: 0 });
const btn = (name: string) => screen.getByRole('button', { name });

/** Menu and the confirm modal, as the shell mounts them. */
const both = (g: KtGame | null) =>
  renderKt(
    <>
      <Menu />
      <Confirm />
    </>,
    g,
  );

describe('the in-game menu', () => {
  beforeEach(() => archive.ready);

  it('opens the game sheets', async () => {
    const user = u();
    const r = both(liveDemo());
    for (const [label, type] of [
      ['Scoreboard', 'board'],
      ['Rules', 'rules'],
      ['Share scores', 'share'],
    ] as const) {
      await user.click(btn(label));
      expect(r.state().sheet).toEqual({ type });
    }
    expect(btn('All games')).toBeInTheDocument();
  });

  it('finishes the game after asking, and lands on the winner', async () => {
    const user = u();
    const r = both(liveDemo());
    await user.click(btn('Finish game'));
    expect(r.state().modal).toBe('finish');
    const d = screen.getByRole('alertdialog');
    expect(d).toHaveTextContent('Finish the game and crown the winner?');
    await user.click(within(d).getByRole('button', { name: 'Finish game' }));
    expect(r.state().game!.status).toBe('finished');
    expect(r.state().screen).toBe('winner');
  });

  it('abandons after asking; with no hand scored it discards and cannot be finished', async () => {
    const user = u();
    const g = liveDemo();
    const r = both({ ...g, hands: g.hands.slice(-1).map((h) => ({ ...h, index: 0 })) });
    expect(btn('Finish game')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Share scores' })).toBeNull();
    await user.click(btn('Abandon game'));
    expect(screen.getByText('No hand was scored. Discard this game?')).toBeInTheDocument();
    await user.click(btn('Discard game'));
    expect(r.state().game).toBeNull();
    expect(r.state().screen).toBe('home');
  });

  it('cancelling keeps the game', async () => {
    const user = u();
    const r = both(liveDemo());
    await user.click(btn('Abandon game'));
    await user.click(btn('Cancel'));
    expect(r.state().modal).toBeNull();
    expect(r.state().game!.status).toBe('active');
  });

  it('off the table shows only the app rows and New game', async () => {
    const user = u();
    const r = both(null);
    expect(screen.queryByRole('button', { name: 'Scoreboard' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Finish game' })).toBeNull();
    await user.click(btn('New game'));
    expect(r.state().screen).toBe('setup');
  });
});
