import { act, render, screen, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { kitGame } from '@/games/kachuful/domain/__fixtures__/kit';
import { AppProvider, useApp } from '@/games/kachuful/state/store';
import { DeskSummary } from './DeskSummary';

/** Five players; Eve goes from last to first in the round just confirmed, and only Asha misses it. */
function comebackGame() {
  const g = kitGame({
    id: 'cb',
    players: ['a', 'b', 'c', 'd', 'e'],
    names: ['Asha', 'Bela', 'Chirag', 'Dev', 'Eve'],
    rounds: [{ made: [true, true, true, true, false] }, { made: [false, true, true, true, true] }],
    start: 1_000,
  });
  g.rounds.pop();
  g.ui = { view: 'summary', bidIdx: 0 };
  const [p0, p1, p2, p3, p4] = g.players.map((p) => p.id);
  g.rounds[0].bids = { [p0]: 4, [p1]: 3, [p2]: 2, [p3]: 1, [p4]: 1 };
  g.rounds[1].bids = { [p0]: 1, [p1]: 1, [p2]: 1, [p3]: 1, [p4]: 9 };
  return g;
}

function Host({ anim }: { anim: boolean }) {
  const { state, actions } = useApp();
  const [open, setOpen] = useState(!anim);
  useEffect(() => {
    if (anim) actions.setSumAnim(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);
  useEffect(() => {
    if (state.sumAnim) setOpen(true);
  }, [state.sumAnim]);
  return open ? <DeskSummary /> : null;
}
const mount = (anim: boolean) =>
  render(
    <AppProvider initial={{ game: comebackGame(), screen: 'round', undo: [], corrupt: false }}>
      <Host anim={anim} />
    </AppProvider>,
  );
const order = () =>
  within(screen.getByRole('list', { name: 'Standings' }))
    .getAllByRole('listitem')
    .map((li) => /Asha|Bela|Chirag|Dev|Eve/.exec(li.textContent ?? '')?.[0]);
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

// The test setup turns reduced motion on, so this file covers the still version of the sequence.
describe('the large-screen summary under reduced motion', () => {
  afterEach(() => vi.useRealTimers());

  it('goes straight to the final order on a comeback: no steps, nothing pushed back', () => {
    vi.useFakeTimers();
    mount(true);
    tick(179);
    expect(order()).toEqual(['Asha', 'Bela', 'Chirag', 'Dev', 'Eve']);
    tick(1);
    expect(order()).toEqual(['Eve', 'Bela', 'Asha', 'Chirag', 'Dev']);
  });

  it('says who missed with the deltas, which all land at once', () => {
    vi.useFakeTimers();
    mount(true);
    const line = screen.getByRole('status');
    expect(line).toBeEmptyDOMElement();
    tick(60);
    expect(line).toHaveTextContent('Everyone but Asha made it');
    expect(
      within(screen.getByRole('list', { name: 'Standings' }))
        .getAllByText(/^[+−-]\d+$/)
        .filter((e) => e.className.includes('min-w-[52px]')),
    ).toHaveLength(5);
  });

  it('reopened without the sequence, the line and the final order are simply there', () => {
    mount(false);
    expect(screen.getByRole('status')).toHaveTextContent('Everyone but Asha made it');
    expect(order()).toEqual(['Eve', 'Bela', 'Asha', 'Chirag', 'Dev']);
  });
});
