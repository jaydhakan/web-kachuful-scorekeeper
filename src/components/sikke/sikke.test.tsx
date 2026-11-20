import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/games/kachuful/state/store';
import { ep } from '@/sync/endpoints';
import { setSyncStatus } from '@/sync/status';
import { GameSikke } from './GameSikke';
import { WalletChip } from './Wallet';

const level = { n: 2, from: 500, next: 1500 };

describe('Sikke', () => {
  afterEach(() => vi.restoreAllMocks());

  it('the wallet shows the balance and level, and opens the ledger newest first', async () => {
    vi.spyOn(ep, 'sikke').mockResolvedValue({ playerId: 'p1', balance: 640, lifetime: 640, level });
    const entries = vi.spyOn(ep, 'sikkeEntries').mockResolvedValue({
      items: [
        {
          id: 'e2',
          kind: 'win',
          amount: 25,
          game: 'kachuful',
          gameId: 'g1',
          code: null,
          period: null,
          earnedAt: Date.now(),
        },
        {
          id: 'e1',
          kind: 'finish',
          amount: 30,
          game: 'kachuful',
          gameId: 'g1',
          code: null,
          period: null,
          earnedAt: Date.now(),
        },
      ],
      nextCursor: null,
    });
    render(
      <AppProvider>
        <WalletChip id="p1" />
      </AppProvider>,
    );
    const chip = await screen.findByRole('button', { name: /640 Sikke, Mehmaan/ });
    expect(screen.getByText('860 to Regular')).toBeInTheDocument();
    await userEvent.click(chip);
    await waitFor(() => expect(entries).toHaveBeenCalledWith('p1', null));
    expect(await screen.findByText('Won a game')).toBeInTheDocument();
    expect(screen.getByText('Finished a game')).toBeInTheDocument();
  });

  it('the ledger says so when there is nothing yet', async () => {
    vi.spyOn(ep, 'sikke').mockResolvedValue({
      playerId: 'p1',
      balance: 0,
      lifetime: 0,
      level: { n: 1, from: 0, next: 500 },
    });
    vi.spyOn(ep, 'sikkeEntries').mockResolvedValue({ items: [], nextCursor: null });
    render(
      <AppProvider>
        <WalletChip id="p1" />
      </AppProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /0 Sikke/ }));
    expect(await screen.findByText(/No Sikke yet/)).toBeInTheDocument();
  });

  it('the winner screen waits for the upload, then pays each player and names a level up', async () => {
    setSyncStatus({ phase: 'syncing', waiting: 1 });
    const ask = vi.spyOn(ep, 'gameSikke').mockResolvedValue({
      items: [
        {
          playerId: 'p1',
          amount: 70,
          entries: [],
          level: { n: 3, from: 1500, next: 4000 },
          levelUp: { from: 2, to: 3 },
        },
        { playerId: 'p2', amount: 30, entries: [], level, levelUp: null },
      ],
    });
    const people = [
      { id: 'p1', name: 'Riya', emoji: '🦊', color: '#000000' },
      { id: 'p2', name: 'Dev', emoji: '🐯', color: '#000000' },
    ];
    render(
      <AppProvider>
        <GameSikke gameId="g1" people={people} heading="" />
      </AppProvider>,
    );
    expect(ask).not.toHaveBeenCalled();
    setSyncStatus({ phase: 'idle', waiting: 0 });
    expect(await screen.findByLabelText('Riya: 70 Sikke, up to Regular')).toBeInTheDocument();
    expect(screen.getByLabelText('Dev: 30 Sikke')).toBeInTheDocument();
    setSyncStatus({ phase: 'signedOut' });
  });
});
