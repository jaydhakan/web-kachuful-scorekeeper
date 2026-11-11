import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { archive } from '@/state/archive';
import { finishedDemo, renderKt } from '@/games/kaali-teeri/test/render';
import Winner from './Winner';

const u = () => userEvent.setup({ pointerEventsCheck: 0 });

describe('Winner', () => {
  beforeEach(() => archive.ready);

  it('crowns tied winners together and lists everyone, ties sharing the place', () => {
    renderKt(<Winner />, finishedDemo());
    expect(screen.getByText('Riya & Meera share it')).toBeInTheDocument();
    expect(screen.getByText('4 hands')).toBeInTheDocument();
    const rows = within(screen.getByRole('list', { name: 'Final standings' })).getAllByRole(
      'listitem',
    );
    expect(rows.map((r) => r.textContent)).toEqual([
      '1🐯Riya630',
      '1🐼Meera630',
      '3🐸Dev540',
      '4🦁Aarav0',
      '4🦊Kabir0',
    ]);
  });

  it('says how a lone winner bid', () => {
    const g = finishedDemo();
    renderKt(<Winner />, { ...g, hands: g.hands.slice(0, 3) });
    expect(screen.getByText('Dev wins')).toBeInTheDocument();
    expect(screen.getByText('3 hands · made 1 of 1 bid')).toBeInTheDocument();
  });

  it('opens the share sheet and starts a rematch with the same seats', async () => {
    const user = u();
    const r = renderKt(<Winner />, finishedDemo());
    await user.click(screen.getByRole('button', { name: /Share/ }));
    expect(r.state().sheet).toEqual({ type: 'share' });
    const before = r.state().game!;
    await user.click(screen.getByRole('button', { name: 'Rematch' }));
    const g = r.state().game!;
    expect(g.id).not.toBe(before.id);
    expect(g.status).toBe('active');
    expect(g.players.map((p) => p.name)).toEqual(before.players.map((p) => p.name));
    expect(r.state().screen).toBe('game');
  });

  it('goes home or to a new setup', async () => {
    const user = u();
    const r = renderKt(<Winner />, finishedDemo());
    await user.click(screen.getByRole('button', { name: 'New game' }));
    expect(r.state().screen).toBe('setup');
  });

  it('shows an empty state with no scored game', async () => {
    const user = u();
    const r = renderKt(<Winner />, null);
    expect(screen.getByText('There’s no finished game to show.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(r.state().screen).toBe('home');
  });
});
