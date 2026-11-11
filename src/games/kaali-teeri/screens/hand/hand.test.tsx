import { fireEvent, render, screen, within } from '@testing-library/react';
import { initialKtState, ktReducer } from '@/games/kaali-teeri/state/reducer';
import { curHand } from '@/games/kaali-teeri/state/select';
import { KtProvider, useKt } from '@/games/kaali-teeri/state/store';
import { DEFAULT_PREFS, type KtAction, type KtState } from '@/games/kaali-teeri/state/types';
import type { CardRef } from '@/games/kaali-teeri/domain';
import EditHand from '@/games/kaali-teeri/sheets/EditHand';
import PlayedBy from '@/games/kaali-teeri/sheets/PlayedBy';
import Scoreboard from '@/games/kaali-teeri/sheets/Scoreboard';
import Play from './Play';
import Result from './Result';
import Summary from './Summary';

const NAMES = ['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev', 'Ishaan', 'Zoya'];

/** A game at `n` seats, `done` hands confirmed, the next one in play with its cards called (Riya bids). */
function game(n: number, done = 0, cards?: CardRef[]): KtState {
  let s = initialKtState(null, 'home', [], DEFAULT_PREFS);
  const d = (a: KtAction) => (s = ktReducer(s, a));
  d({ type: 'startSetup', lg: null });
  d({ type: 'setupCount', n });
  NAMES.slice(0, n).forEach((name, k) =>
    d({ type: 'setupSeat', k, seat: { name, emoji: '🙂', color: '#FF8A65' } }),
  );
  d({
    type: 'beginGame',
    id: 'g',
    syncId: 's',
    now: Date.now() - 60e3,
    playerIds: NAMES.slice(0, n).map((x) => 'r' + x),
  });
  const ids = s.game!.players.map((p) => p.id);
  const call = cards ?? [{ rank: 'A', suit: 'hearts' }];
  const hand = () => {
    d({ type: 'quickBid', bidder: ids[1], bid: s.game!.rules.minBid + 30 });
    d({ type: 'trump', suit: 'spades' });
    call.forEach((card) => d({ type: 'addCard', card }));
    d({ type: 'confirmCall' });
  };
  for (let k = 0; k < done; k++) {
    hand();
    call.forEach((_, i) => d({ type: 'markPlayed', i, by: ids[2 + i] }));
    d({ type: 'toResult' });
    d({ type: 'points', entered: 60 });
    d({ type: 'confirmHand' });
    if (k < done - 1) d({ type: 'nextHand' });
  }
  if (!done) hand();
  return s;
}

/** The hand screens and their sheets, as the shell would show them. */
function Host() {
  const { state } = useKt();
  const g = state.game!;
  const h = curHand(g);
  const sheet = state.sheet;
  return (
    <>
      {g.ui.view === 'summary' ? (
        <Summary />
      ) : h.phase === 'playing' ? (
        <Play />
      ) : h.phase === 'result' ? (
        <Result />
      ) : null}
      {sheet && (
        <div role="dialog" key={JSON.stringify(sheet)}>
          {sheet.type === 'playedBy' ? (
            <PlayedBy />
          ) : sheet.type === 'board' ? (
            <Scoreboard />
          ) : sheet.type === 'edit' ? (
            <EditHand />
          ) : null}
        </div>
      )}
      <output data-testid="state">
        {JSON.stringify({ phase: h.phase, view: g.ui.view, hands: g.hands.length })}
      </output>
    </>
  );
}

const mount = (s: KtState) =>
  render(
    <KtProvider
      initial={{ game: s.game, screen: 'game', undo: [], prefs: s.prefs, corrupt: false }}
    >
      <Host />
    </KtProvider>,
  );
const st = () => JSON.parse(screen.getByTestId('state').textContent!);

describe('Play', () => {
  it('marks who played a called card: the card turns and they join the team', () => {
    mount(game(5));
    expect(screen.getAllByText('Secret until played').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: /ace of hearts, not played yet/i })[0]);
    const dialog = screen.getByRole('dialog');
    // Any seat, the bidder included.
    expect(within(dialog).getByRole('button', { name: /Riya/ })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Kabir/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByRole('button', { name: /played by Kabir/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Partner').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Kabir is Riya’s partner');
  });

  it('leaves the bidder out of "the other one"', () => {
    mount(
      game(7, 0, [
        { rank: 'A', suit: 'hearts', copy: 'other' },
        { rank: 'K', suit: 'clubs', copy: 1 },
      ]),
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: /ace of hearts, the other one, not played yet/i })[0],
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: /^Riya/ })).toBeNull();
    expect(within(dialog).getByText(/Riya isn’t listed/)).toBeInTheDocument();
  });

  it('goes to the result when the hand is over', () => {
    mount(game(5));
    fireEvent.click(screen.getByRole('button', { name: 'Hand over · enter points' }));
    expect(st().phase).toBe('result');
  });
});

describe('Result', () => {
  const atResult = () => {
    const s = game(5);
    return { ...s, game: ktReducer(s, { type: 'toResult' }).game };
  };

  it('asks for unmarked called cards before Confirm', () => {
    mount(atResult());
    const confirm = screen.getByRole('button', { name: 'Confirm hand 1' });
    expect(confirm).toBeDisabled();
    expect(screen.getByText('Mark who played the called card first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ace of hearts, not played yet/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Meera/ }));
    expect(screen.getByRole('button', { name: 'Confirm hand 1' })).toBeEnabled();
  });

  it('takes the defenders’ points by default, shows the other side and each change, then confirms', () => {
    const s = atResult();
    s.game = ktReducer(s, { type: 'markPlayed', i: 0, by: s.game!.players[3].id }).game;
    mount(s);
    // Bid 180: the stepper starts where it is exactly made (defenders 70).
    expect(screen.getByRole('spinbutton', { name: 'Defenders’ points' })).toHaveAttribute(
      'aria-valuenow',
      '70',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Down 25' }));
    expect(screen.getByText(/Defenders 45 → Riya’s team 205/)).toBeInTheDocument();
    expect(screen.getByText('Made · 25 over')).toBeInTheDocument();
    expect(screen.getAllByText('+180')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Riya’s team' }));
    expect(screen.getByRole('spinbutton', { name: 'Bidding team’s points' })).toHaveAttribute(
      'aria-valuenow',
      '45',
    );
    expect(screen.getByText('Missed by 135')).toBeInTheDocument();
    // A miss pays each defender the bid; the team gets nothing.
    expect(screen.getAllByText('+180')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm hand 1' }));
    expect(st()).toMatchObject({ phase: 'done', view: 'summary' });
  });

  it('confirms the shown number when it was never changed', () => {
    const s = atResult();
    s.game = ktReducer(s, { type: 'markPlayed', i: 0, by: s.game!.players[3].id }).game;
    mount(s);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm hand 1' }));
    expect(st().phase).toBe('done');
  });

  it('shows a double slot and a sweep', () => {
    const s = atResult();
    s.game = ktReducer(s, { type: 'markPlayed', i: 0, by: s.game!.players[1].id }).game;
    mount(s);
    expect(screen.getByText('2× · two cards')).toBeInTheDocument();
    for (let k = 0; k < 3; k++) fireEvent.click(screen.getByRole('button', { name: 'Down 25' }));
    expect(screen.getByText('Bidding team swept')).toBeInTheDocument();
    expect(screen.getByText('Sweep')).toBeInTheDocument();
  });
});

describe('Summary and the scoreboard', () => {
  it('shows the hand, the standings and who deals next, then starts the next hand', () => {
    mount(game(5, 1));
    expect(screen.getByText('Riya’s team made 190 of 180')).toBeInTheDocument();
    expect(screen.getByText('Hand 2 · Riya deals · Kabir bids first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
    expect(st()).toMatchObject({ hands: 2, phase: 'bidding', view: 'hand' });
  });

  it('opens a hand from the scoreboard and saves an edit, or explains why it can’t', () => {
    mount(
      game(6, 1, [
        { rank: 'A', suit: 'hearts' },
        { rank: 'K', suit: 'clubs' },
      ]),
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Scoreboard' })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Edit ?Hand 1 / }));
    const dialog = () => screen.getByRole('dialog');
    // The same card called twice is refused, with the reason beside it.
    fireEvent.change(within(dialog()).getAllByLabelText('Rank')[1], { target: { value: 'A' } });
    fireEvent.change(within(dialog()).getAllByLabelText('Suit')[1], {
      target: { value: 'hearts' },
    });
    expect(within(dialog()).getByRole('alert')).toHaveTextContent('can’t be called twice');
    expect(within(dialog()).getByRole('button', { name: 'Save hand' })).toBeDisabled();
    fireEvent.change(within(dialog()).getAllByLabelText('Rank')[1], { target: { value: 'Q' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Diamonds' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save hand' }));
    // Saved: the reducer goes back to the board.
    expect(within(dialog()).getByText('Tap a hand to edit it.')).toBeInTheDocument();
  });

  it('says so when there are no hands yet', () => {
    const s = game(5);
    render(
      <KtProvider
        initial={{ game: s.game, screen: 'game', undo: [], prefs: s.prefs, corrupt: false }}
      >
        <Scoreboard />
      </KtProvider>,
    );
    expect(screen.getByText(/No hands yet/)).toBeInTheDocument();
  });
});
