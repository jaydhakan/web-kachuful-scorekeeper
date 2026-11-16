import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import save from '../../table/state/__fixtures__/sp-v1-save.json';
import { gameTotals, newTable, type SpGame } from '../../domain';
import { spEp } from '../sync/endpoints';
import ShareView from './ShareView';

const game = save as unknown as SpGame;

afterEach(() => vi.restoreAllMocks());

describe('a Spades share link', () => {
  it("shows a scorekeeper game's board from its live link", async () => {
    vi.spyOn(spEp, 'share').mockResolvedValue({ kind: 'spades', game, updatedAt: 1 });
    render(<ShareView token="tok" recap={false} />);
    const t = gameTotals(game);
    const a = [game.players[0].name, game.players[2].name].join(' & ');
    expect(await screen.findByRole('region', { name: `${a}: ${t.a.score} points` })).toBeTruthy();
    expect(spEp.share).toHaveBeenCalledWith('tok', false);
  });

  it("shows an online table's final board from its recap link", async () => {
    const table = newTable({
      id: 't',
      code: 'KQ7M',
      name: 'Friday',
      rules: game.rules,
      host: { userId: 'u', playerId: 'p', name: 'Jay', emoji: '🦊', color: '#000' },
      now: 1,
    });
    vi.spyOn(spEp, 'share').mockResolvedValue({
      kind: 'spades-online',
      game: { ...table, status: 'cancelled' },
      summary: {} as never,
      updatedAt: 1,
      scorerSeenAt: null,
    });
    render(<ShareView token="tok" recap />);
    expect(await screen.findByRole('heading', { name: 'Spades · Recap' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('This game was cancelled');
  });
});
