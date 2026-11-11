import { act, fireEvent, render, screen } from '@testing-library/react';
import { clue, giver, pick, started, act as play } from '@/games/ishaara/domain/__fixtures__/kit';
import { SKIP_AFTER_MS, type IshaaraPublic } from '@/games/ishaara/domain';
import type { SendResult } from '@/games/ishaara/state/link';
import type { IshaaraTable } from '@/games/ishaara/state/useTable';
import { Board, diffReveal } from './Board';

type Send = (a: unknown) => Promise<SendResult>;

function table(game: IshaaraPublic, o: Partial<IshaaraTable> = {}): IshaaraTable {
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
    ...o,
  };
}

const noop = () => {};
const show = (t: IshaaraTable) =>
  render(<Board table={t} onLeave={noop} onRules={noop} onFinished={noop} />);
const card = (word: string) => screen.getByRole('button', { name: new RegExp(`^${word},`) });

afterEach(() => vi.useRealTimers());

describe('the board', () => {
  it('selects a card, then Confirm sends the guess; Cancel lets go', async () => {
    const k = clue(started(), 'spice', 2);
    const t = table(k.state);
    show(t);
    expect(screen.getByText('spice')).toBeInTheDocument();
    expect(card('RIVER')).toHaveAccessibleName('RIVER, face down');
    fireEvent.click(card('KITE'));
    expect(card('KITE')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    fireEvent.click(card('KITE'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm' })));
    expect(t.send).toHaveBeenCalledWith({ type: 'guess', card: 1 });
  });

  it('keeps End turn off until the first guess, then sends endTurn', async () => {
    let k = clue(started(), 'spice', 2);
    const { rerender } = show(table(k.state));
    expect(screen.getByRole('button', { name: 'End Sun’s turn' })).toBeDisabled();
    k = pick(k, 0);
    const t = table(k.state);
    rerender(<Board table={t} onLeave={noop} onRules={noop} onFinished={noop} />);
    const end = screen.getByRole('button', { name: 'End Sun’s turn' });
    expect(end).toBeEnabled();
    await act(async () => fireEvent.click(end));
    expect(t.send).toHaveBeenCalledWith({ type: 'endTurn' });
  });

  it('offers Undo for 10 s after a reveal, on the server’s clock', async () => {
    vi.useFakeTimers({ now: 0 });
    let k = clue(started(), 'spice', 2);
    k = pick(k, 0);
    // The device runs 1 s behind the server; the undo window ends at the server's `until`.
    const offset = k.now - Date.now();
    const t = table(k.state, { clockOffset: offset });
    show(t);
    const undo = screen.getByRole('button', { name: 'Undo RIVER' });
    await act(async () => fireEvent.click(undo));
    expect(t.send).toHaveBeenCalledWith({ type: 'undoLast' });
    await act(() => vi.advanceTimersByTimeAsync(10_500));
    expect(screen.queryByRole('button', { name: 'Undo RIVER' })).toBeNull();
  });

  it('dims the board and turns picks off while reconnecting; nothing is sent', () => {
    const k = clue(started(), 'spice', 2);
    const t = table(k.state, { conn: 'reconnecting' });
    show(t);
    expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
    expect(card('KITE')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(card('KITE'));
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    expect(screen.getByRole('button', { name: 'End Sun’s turn' })).toBeDisabled();
    expect(t.send).not.toHaveBeenCalled();
  });

  it('waits on the penalty pick and lets the host skip only after 60 s', async () => {
    vi.useFakeTimers({ now: 0 });
    let k = clue(started(), 'spice', 2);
    k = play(k, giver('moon'), { type: 'notAllowed' });
    const since = k.state.pending!.since;
    const t = table(k.state, { clockOffset: since - Date.now() });
    show(t);
    expect(screen.getByText('Dev is picking a Moon word to reveal')).toBeInTheDocument();
    expect(card('KITE')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Skip in 1:00' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(SKIP_AFTER_MS - 1000));
    expect(screen.getByRole('button', { name: 'Skip in 0:01' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(skip).toBeEnabled();
    await act(async () => fireEvent.click(skip));
    expect(t.send).toHaveBeenCalledWith({ type: 'skip' });
  });

  it('says why a pick didn’t go through', async () => {
    const k = clue(started(), 'spice', 2);
    const t = table(k.state, {
      send: vi.fn<Send>().mockResolvedValue({ ok: false, refused: 'offline' }),
    });
    show(t);
    fireEvent.click(card('KITE'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm' })));
    expect(screen.getByRole('alert')).toHaveTextContent('Not connected');
  });

  it('shows "Clue given · 2" in spoken mode and who it waits on before the clue', () => {
    const k0 = started({ rules: { clueEntry: 'spoken' } });
    const { rerender } = show(table(k0.state));
    expect(screen.getByText('Waiting for Riya’s clue')).toBeInTheDocument();
    const k = clue(k0, null, 2);
    rerender(<Board table={table(k.state)} onLeave={noop} onRules={noop} onFinished={noop} />);
    expect(screen.getByText('Clue given')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });
});

describe('reveal moments', () => {
  it('tells an own word, the other team’s, a blank, the trap and an undo apart', () => {
    const k = clue(started(), 'spice', 2);
    const after = (card: number) => diffReveal(k.state, pick(k, card).state);
    expect(after(0)).toMatchObject({ moment: { kind: 'own', team: 'sun', id: 'sun' } });
    expect(after(10)).toMatchObject({ moment: { kind: 'other', team: 'sun', id: 'moon' } });
    expect(after(20)).toMatchObject({ moment: { kind: 'blank', id: 'blank' } });
    expect(after(24)).toMatchObject({ moment: { kind: 'trap', team: 'sun' } });
    const picked = pick(k, 0);
    const undone = play(picked, { kind: 'table' }, { type: 'undoLast' });
    expect(diffReveal(picked.state, undone.state)).toEqual({ undone: 'river' });
  });

  it('announces a reveal and the next turn politely', () => {
    let k = clue(started(), 'spice', 2);
    const { rerender } = show(table(k.state));
    k = pick(k, 20);
    rerender(<Board table={table(k.state)} onLeave={noop} onRules={noop} onFinished={noop} />);
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('GARDEN is blank. Turn over.');
    expect(live).toHaveTextContent('Moon’s turn. Waiting for Dev’s clue.');
  });
});
