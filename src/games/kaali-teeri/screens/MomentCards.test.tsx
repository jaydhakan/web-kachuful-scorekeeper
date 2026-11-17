import { screen } from '@testing-library/react';
import { useEffect } from 'react';
import { kitGame, T0 } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import { useKt } from '@/games/kaali-teeri/state/store';
import { renderKt } from '@/games/kaali-teeri/test/render';
import MomentCards from './MomentCards';

/** Confirms the hand at its result, as the Result screen's button does. */
function Confirm() {
  const { actions } = useKt();
  useEffect(() => actions.confirmHand(), [actions]);
  return null;
}

const atResult = (team: number) =>
  kitGame({
    id: 'm1',
    players: ['Riya', 'Aarav', 'Kabir', 'Meera'],
    start: T0,
    hands: [{ bidder: 0, bid: 200, playedBy: [2], team, phase: 'result' }],
  });

describe('the hand’s moment cards', () => {
  it('one card per moment with everyone who earned it, the big ones first', async () => {
    renderKt(
      <>
        <Confirm />
        <MomentCards />
      </>,
      atResult(250),
    );
    const cards = await screen.findAllByText(/ · /);
    expect(cards.map((c) => c.textContent)).toEqual([
      'Riya, Kabir · Clean Sweep',
      'Riya · High Roller',
    ]);
  });

  it('a 🙃 one shows too; a hand with nothing to say shows nothing', async () => {
    const { unmount } = renderKt(
      <>
        <Confirm />
        <MomentCards />
      </>,
      atResult(195),
    );
    expect(await screen.findByText('Riya · So Close')).toBeInTheDocument();
    unmount();
    renderKt(
      <>
        <Confirm />
        <MomentCards />
      </>,
      kitGame({
        id: 'm2',
        players: ['Riya', 'Aarav', 'Kabir', 'Meera'],
        start: T0,
        hands: [{ bidder: 0, bid: 160, playedBy: [2], team: 170, phase: 'result' }],
      }),
    );
    expect(screen.queryByText(/ · /)).not.toBeInTheDocument();
  });
});
