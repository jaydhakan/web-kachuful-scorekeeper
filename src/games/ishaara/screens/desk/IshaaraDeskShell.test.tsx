import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clue, started } from '@/games/ishaara/domain/__fixtures__/kit';
import type { IshaaraPublic } from '@/games/ishaara/domain';
import type { SendResult } from '@/games/ishaara/state/link';
import { IshaaraProvider } from '@/games/ishaara/state/store';
import type { IshaaraTable } from '@/games/ishaara/state/useTable';
import { setSession } from '@/sync/session';
import { MQ } from '@/theme/breakpoints';
import Ishaara from '../../index';
import IshaaraDeskShell from './IshaaraDeskShell';
// Lazy chunks, loaded up front so transforming them can't outlast a findBy.
import './DeskBoard';
import '../board/Board';

type Send = (a: unknown) => Promise<SendResult>;
const live: { table: IshaaraTable | null } = { table: null };
vi.mock('@/games/ishaara/state/useTable', async (orig) => ({
  ...(await orig<typeof import('@/games/ishaara/state/useTable')>()),
  useTable: () => live.table!,
}));

function table(game: IshaaraPublic): IshaaraTable {
  return {
    game,
    me: { host: true, team: null },
    status: 'ready',
    conn: 'live',
    busy: false,
    lastError: null,
    clockOffset: 0,
    send: vi.fn<Send>().mockResolvedValue({ ok: true, game }),
    reload: vi.fn(),
  };
}

/** Which media queries match; layout CSS is not applied in jsdom. */
function screenIs(on: string[]) {
  window.matchMedia = (q: string) =>
    ({
      matches: on.includes(q),
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

beforeEach(() => {
  setSession({ user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null }, player: null });
  screenIs([MQ.big, MQ.rail, MQ.dt, MQ.kbd, MQ.wide, MQ.pane]);
});

function showBoard() {
  const t = table(clue(started(), 'spice', 2).state);
  live.table = t;
  render(
    <IshaaraProvider initial={{ screen: 'board', gameId: t.game!.id, role: 'table' }}>
      <IshaaraDeskShell />
    </IshaaraProvider>,
  );
  return t;
}
const card = (word: string) => screen.getByRole('button', { name: new RegExp(`^${word},`) });

describe('Ishaara’s desk board', () => {
  it('lays the turn panel beside the grid', async () => {
    showBoard();
    await screen.findByRole('group', { name: 'Board' });
    expect(document.querySelector('[data-desk]')).not.toBeNull();
    const panel = screen.getByRole('complementary', { name: 'This turn' });
    expect(panel).toHaveTextContent('spice');
    expect(screen.getByRole('button', { name: 'End Sun’s turn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /, face down$/ })).toHaveLength(25);
  });

  it('moves across the grid with the arrows, one tab stop for all 25 cards', async () => {
    const u = userEvent.setup();
    showBoard();
    await screen.findByRole('group', { name: 'Board' });
    expect(card('RIVER')).toHaveAttribute('tabindex', '0');
    expect(card('KITE')).toHaveAttribute('tabindex', '-1');
    act(() => card('RIVER').focus());
    await u.keyboard('{ArrowRight}');
    expect(card('KITE')).toHaveFocus();
    await u.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: /face down/ })[6]);
    await u.keyboard('{ArrowUp}{ArrowLeft}{ArrowLeft}');
    // Wraps from the first card to the last.
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: /face down/ })[24]);
  });

  it('Enter picks a card, Enter again guesses it', async () => {
    const u = userEvent.setup();
    const t = showBoard();
    await screen.findByRole('group', { name: 'Board' });
    act(() => card('KITE').focus());
    await u.keyboard('{Enter}');
    expect(card('KITE')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Guess KITE?')).toBeInTheDocument();
    await u.keyboard('{Enter}');
    expect(t.send).toHaveBeenCalledWith({ type: 'guess', card: 1 });
  });

  it('Enter on the page guesses the picked card; Enter on a button stays with the button', async () => {
    const u = userEvent.setup();
    const t = showBoard();
    await screen.findByRole('group', { name: 'Board' });
    await u.click(card('TRAIN'));
    act(() => screen.getByRole('button', { name: 'Cancel' }).focus());
    await u.keyboard('{Enter}');
    expect(t.send).not.toHaveBeenCalled();
    await u.click(card('TRAIN'));
    act(() => (document.activeElement as HTMLElement).blur());
    await u.keyboard('{Enter}');
    expect(t.send).toHaveBeenCalledWith({ type: 'guess', card: 2 });
  });

  it('Escape lets go of the pick; Confirm and Cancel work by pointer too', async () => {
    const u = userEvent.setup();
    const t = showBoard();
    await screen.findByRole('group', { name: 'Board' });
    act(() => card('KITE').focus());
    await u.keyboard('{Enter}');
    await u.keyboard('{Escape}');
    expect(card('KITE')).toHaveAttribute('aria-pressed', 'false');
    await u.click(card('TRAIN'));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    await u.click(card('TRAIN'));
    await u.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(t.send).toHaveBeenCalledWith({ type: 'guess', card: 2 });
  });
});

describe('Ishaara’s root', () => {
  it('picks the desk shell at MQ.big and the phone shell below it', async () => {
    const { unmount } = render(<Ishaara />);
    await waitFor(() => expect(document.querySelector('[data-desk]')).not.toBeNull());
    expect(screen.getByRole('heading', { name: 'Ishaara' })).toBeInTheDocument();
    unmount();
    screenIs([]);
    render(<Ishaara />);
    expect(screen.getByRole('heading', { name: 'Ishaara' })).toBeInTheDocument();
    expect(document.querySelector('[data-desk]')).toBeNull();
  });
});
