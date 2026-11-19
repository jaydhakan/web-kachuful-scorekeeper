import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dealSeeded } from '@/games/spades/domain/cards';
import { scoreHand } from '@/games/spades/domain/scoring';
import { play } from '@/games/spades/strings/play';
import type { Card, Seat } from '@/games/spades/domain/types';
import { storage } from '@/state/persistence';
import { SP_KEYS } from '@/games/spades/state/keys';
import { resetPrefsForTests } from '@/games/spades/ui/prefs';
import { cardName } from '@/games/spades/ui/SpCard';
import {
  createFake,
  FakeTableProvider,
  type FakeOptions,
  type FakeTable,
} from './__fixtures__/fakeTable';
import PlayTable from './PlayTable';

const u = () => userEvent.setup({ pointerEventsCheck: 0 });

function mount(o: FakeOptions = {}) {
  const fake = createFake(o);
  render(
    <FakeTableProvider fake={fake}>
      <PlayTable />
    </FakeTableProvider>,
  );
  return fake;
}
const hand = () => within(screen.getByRole('group', { name: 'Your hand' })).getAllByRole('button');
const cardBtn = (c: Card) => screen.getByRole('button', { name: new RegExp(`^${cardName(c)}`) });
/** A seed whose first hand gives seat 0 both spades and other suits. */
const mixedSeed = () => {
  for (let seed = 1; seed < 200; seed++) {
    const h = dealSeeded(seed * 100)[0];
    if (h.some((c) => c.suit === 'spades') && h.some((c) => c.suit !== 'spades')) return seed;
  }
  throw new Error('no seed');
};
/** All four bid: the fake's bot bids for the others, this phone through the keypad's rules. */
const bidRound = (fake: FakeTable, bid = 3) => {
  act(() => {
    while (fake.state.phase === 'bidding') fake.auto(bid);
  });
};

beforeEach(() => resetPrefsForTests());

describe('PlayTable', () => {
  it('shows both teams, four seats and your 13 cards, face up and sorted', () => {
    mount();
    expect(
      screen.getByRole('group', { name: /^Your team, You & Dev: 0 points$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /^Rivals, Arjun & Meera: 0 points$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^Arjun, opponent/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^Dev, your partner/ })).toBeInTheDocument();
    const cards = hand();
    expect(cards).toHaveLength(13);
    expect(cards.every((b) => b.getAttribute('aria-label') !== 'Face-down card')).toBe(true);
    expect(screen.getByText('♠ locked')).toBeInTheDocument();
  });

  it('puts your own team first, whichever team you are on', () => {
    mount({ seat: 3 });
    const bars = screen.getAllByRole('group', { name: / points$/ });
    expect(bars.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Your team, You & Arjun: 0 points',
      'Rivals, Riya & Dev: 0 points',
    ]);
  });

  describe('bidding', () => {
    it('places a bid from the keypad', async () => {
      const fake = mount();
      const pad = screen.getByRole('region', { name: 'Your bid' });
      expect(within(pad).getByRole('button', { name: 'Pick a bid' })).toBeDisabled();
      await u().click(within(pad).getByRole('button', { name: '4' }));
      await u().click(within(pad).getByRole('button', { name: 'Bid 4' }));
      expect(fake.sent).toContainEqual({ type: 'bid', bid: 4 });
      expect(fake.state.bids[0]).toBe(4);
    });

    it('greys out the bids below the team minimum and says why', async () => {
      // Dealer 1: seat 2 (the partner) bids first, then 3, then this phone.
      const fake = mount({ dealer: 1, rules: { minTeamBid: 4 } });
      act(() => {
        fake.auto(1);
        fake.auto(2);
      });
      const pad = screen.getByRole('region', { name: 'Your bid' });
      expect(
        within(pad).getByText(/Dev bid 1\. Team needs 4: bid 3\+ or Nil\./),
      ).toBeInTheDocument();
      const two = within(pad).getByRole('button', { name: /^2, not allowed/ });
      expect(two).toHaveAttribute('aria-disabled', 'true');
      await u().click(two);
      expect(await screen.findByText('the team needs 4')).toBeInTheDocument();
      expect(within(pad).getByRole('button', { name: 'Nil' })).not.toHaveAttribute('aria-disabled');
      expect(fake.sent.some((a) => a.type === 'bid')).toBe(false);
    });

    it('lists everyone else’s bid in the pad, in seat order, with the team line', () => {
      // Dealer 1: Dev (the partner) bids 2, Meera 5, then this phone; Arjun is the dealer, still to bid.
      const fake = mount({ dealer: 1 });
      act(() => {
        fake.auto(2);
        fake.auto(5);
      });
      const pad = screen.getByRole('region', { name: 'Your bid' });
      const items = within(within(pad).getByRole('list', { name: 'Bids so far' })).getAllByRole(
        'listitem',
      );
      expect(items.map((li) => li.textContent)).toEqual([
        expect.stringMatching(/^Arjun/),
        expect.stringMatching(/^Dev.*2/),
        expect.stringMatching(/^Meera.*5/),
      ]);
      expect(items[0]).toHaveTextContent('…');
      expect(within(pad).getByText('Dev 2 + you · They have 5 so far')).toBeInTheDocument();
    });

    it('keeps Nil off when the table plays without it', () => {
      mount({ rules: { nil: false, blindNil: false } });
      expect(
        screen.getByRole('button', { name: /Nil, not allowed: Nil is off at this table/ }),
      ).toHaveAttribute('aria-disabled', 'true');
    });

    it('with Blind Nil on, cards stay face down until Look; Blind Nil is offered before', async () => {
      const fake = mount({ rules: { blindNil: true } });
      expect(hand().every((b) => b.getAttribute('aria-label') === 'Face-down card')).toBe(true);
      expect(screen.queryByRole('region', { name: 'Your bid' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Blind Nil · +200 / −200' })).toBeInTheDocument();
      await u().click(screen.getByRole('button', { name: 'Look at cards' }));
      expect(fake.sent).toContainEqual({ type: 'look' });
      await waitFor(() => expect(hand()[0]).not.toHaveAttribute('aria-label', 'Face-down card'));
      expect(screen.getByRole('region', { name: 'Your bid' })).toBeInTheDocument();
    });

    it('a Blind Nil bid is sent without looking', async () => {
      const fake = mount({ rules: { blindNil: true } });
      await u().click(screen.getByRole('button', { name: 'Blind Nil · +200 / −200' }));
      expect(fake.sent).toContainEqual({ type: 'blindNil' });
      expect(fake.state.bids[0]).toBe(0);
    });
  });

  describe('playing', () => {
    it('dims a spade you can’t lead and says why; a legal card lifts, then plays', async () => {
      const fake = mount({ seed: mixedSeed() });
      bidRound(fake);
      const mine = fake.hands![0];
      const spade = mine.find((c) => c.suit === 'spades')!;
      const other = mine.find((c) => c.suit !== 'spades')!;
      const s = cardBtn(spade);
      expect(s).toHaveAttribute('aria-disabled', 'true');
      expect(s.getAttribute('aria-label')).toMatch(/can’t lead spades yet/);
      await u().click(s);
      expect(await screen.findByText('Spades aren’t broken yet')).toBeInTheDocument();
      expect(fake.sent.some((a) => a.type === 'play')).toBe(false);
      await u().click(cardBtn(other));
      expect(fake.sent.some((a) => a.type === 'play')).toBe(false);
      await u().click(cardBtn(other));
      expect(fake.sent).toContainEqual({ type: 'play', card: other });
    });

    it('plays at once, and snaps the card back when the server refuses it', async () => {
      const fake = mount({ seed: mixedSeed() });
      bidRound(fake);
      const card = fake.hands![0].find((c) => c.suit !== 'spades')!;
      fake.hold = true;
      fake.refuseNext = 'must-follow';
      await u().click(cardBtn(card));
      await u().click(cardBtn(card));
      // Optimistic: it left the hand and sits on the felt before the server answers.
      expect(hand()).toHaveLength(12);
      expect(screen.getByRole('img', { name: cardName(card) })).toBeInTheDocument();
      await act(async () => fake.release());
      await waitFor(() => expect(hand()).toHaveLength(13));
      expect(await screen.findByText('You have to follow suit')).toBeInTheDocument();
    });

    it('plays from the keyboard: arrows move along the hand and Enter plays', async () => {
      const fake = mount({ seed: mixedSeed() });
      bidRound(fake);
      const user = u();
      const cards = hand();
      cards[0].focus();
      await user.keyboard('{ArrowRight}');
      expect(cards[1]).toHaveFocus();
      const legal = hand().find((b) => b.getAttribute('aria-disabled') !== 'true')!;
      legal.focus();
      await user.keyboard('{Enter}');
      expect(fake.sent.filter((a) => a.type === 'play')).toHaveLength(1);
    });

    it('shows your seconds under the hand on your turn', () => {
      const fake = mount({ seed: mixedSeed() });
      bidRound(fake);
      expect(screen.getByText(/^YOUR TURN · \d+s$/)).toBeInTheDocument();
    });

    it('gathers a finished trick, then the meters count it', async () => {
      const fake = mount({ seed: mixedSeed() });
      bidRound(fake, 3);
      expect(screen.getAllByLabelText('0 of 6 tricks')).toHaveLength(2);
      act(() => {
        for (let i = 0; i < 4; i++) fake.auto();
      });
      // The trick holds on the felt first (the count waits), then it is gathered.
      expect(screen.getAllByLabelText('0 of 6 tricks')).toHaveLength(2);
      await waitFor(() => expect(screen.getByLabelText('1 of 6 tricks')).toBeInTheDocument(), {
        timeout: 3000,
      });
    });

    it('opens the hand summary with the scorer’s numbers', async () => {
      const fake = mount({ seed: 3 });
      bidRound(fake, 3);
      act(() => {
        while (fake.state.phase === 'playing') fake.auto();
      });
      const sheet = await screen.findByRole('dialog', { name: 'Hand 1' }, { timeout: 4000 });
      const res = scoreHand(fake.state.history[0]);
      await waitFor(
        () => {
          expect(sheet.querySelector('[data-net="a"]')?.textContent).toBe(play.sign(res.a.net));
          expect(sheet.querySelector('[data-net="b"]')?.textContent).toBe(play.sign(res.b.net));
        },
        { timeout: 3000 },
      );
      expect(within(sheet).getByText('Show all four hands')).toBeInTheDocument();
    });
  });

  describe('whose turn it is, in the middle of the felt', () => {
    it('names the bidder, then the leader, and nothing once it is your turn or a card is down', () => {
      const fake = mount({ seed: mixedSeed(), seat: 1 });
      expect(screen.getByText('Riya is bidding…')).toBeInTheDocument();
      act(() => fake.auto());
      expect(screen.queryByText(/is bidding…|to lead/)).toBeNull();
      act(() => {
        fake.auto();
        fake.auto();
      });
      act(() => fake.auto());
      expect(fake.state.phase).toBe('playing');
      // Seat 0 leads, and it is not seat 1's turn.
      expect(screen.getByText('Riya to lead')).toBeInTheDocument();
      act(() => fake.auto());
      expect(screen.queryByText(/to lead/)).toBeNull();
    });
  });

  describe('your turn over an open sheet', () => {
    it('offers a way back from the menu, and not when it is someone else’s turn', async () => {
      const fake = mount();
      const user = u();
      await user.click(screen.getByRole('button', { name: 'Table menu' }));
      await user.click(
        await screen.findByRole('button', { name: 'Your turn · back to the table' }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Table' })).toBeNull());
      expect(screen.queryByRole('button', { name: /back to the table/ })).toBeNull();
      act(() => fake.auto());
      await user.click(screen.getByRole('button', { name: 'Table menu' }));
      await screen.findByRole('dialog', { name: 'Table' });
      expect(screen.queryByRole('button', { name: /back to the table/ })).toBeNull();
    });
  });

  describe('playing your only card for you', () => {
    const c = (rank: string, suit: Card['suit']) => ({ rank, suit }) as Card;
    const ranks = (suit: Card['suit'], rs: string[]) => rs.map((r) => c(r, suit));
    // Seat 0 holds one heart; seat 1 wins the first trick with the king of clubs and leads a heart.
    const DEAL: Card[][] = [
      [
        ...ranks('clubs', ['2']),
        ...ranks('hearts', ['2']),
        ...ranks('diamonds', ['2', '3', '4', '5', '6', '7', '8']),
        ...ranks('spades', ['2', '3', '4', '5']),
      ],
      [
        ...ranks('clubs', ['K']),
        ...ranks('hearts', ['3', '4', '5', '6', '7', '8', '9']),
        ...ranks('diamonds', ['9', '10', 'J', 'Q']),
        ...ranks('spades', ['6']),
      ],
      [
        ...ranks('clubs', ['3']),
        ...ranks('hearts', ['10', 'J', 'Q', 'K', 'A']),
        ...ranks('diamonds', ['K', 'A']),
        ...ranks('spades', ['7', '8', '9', '10', 'J']),
      ],
      [
        ...ranks('clubs', ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'A']),
        ...ranks('spades', ['Q', 'K', 'A']),
      ],
    ];
    const SECOND = () => ({ type: 'play', card: c('2', 'hearts') });
    /** Second trick: seat 1 led a heart, seats 2 and 3 played, and seat 0's only legal card is the 2♥. */
    const atSecondTrick = (auto: boolean) => {
      if (auto) storage.set(SP_KEYS.prefs, { autoSingle: true });
      resetPrefsForTests();
      const fake = mount({ deal: DEAL });
      bidRound(fake);
      act(() => {
        fake.as(0, { type: 'play', card: c('2', 'clubs') });
        fake.as(1, { type: 'play', card: c('K', 'clubs') });
        fake.as(2, { type: 'play', card: c('3', 'clubs') });
        fake.as(3, { type: 'play', card: c('4', 'clubs') });
        fake.as(1, { type: 'play', card: c('3', 'hearts') });
        fake.as(2, { type: 'play', card: c('10', 'hearts') });
        fake.as(3, { type: 'play', card: c('5', 'clubs') });
      });
      return fake;
    };
    const sentPlays = (fake: FakeTable) => fake.sent.filter((a) => a.type === 'play');
    // It is this phone's turn at once (the next trick is under way), so the five seconds run from here.
    const settle = async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
    };
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    it('plays the lone legal card after five seconds, once', async () => {
      const fake = atSecondTrick(true);
      await settle();
      expect(sentPlays(fake)).toHaveLength(0);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
      expect(sentPlays(fake)).toHaveLength(0);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(sentPlays(fake)).toEqual([SECOND()]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(sentPlays(fake)).toHaveLength(1);
    });

    it('does nothing when the setting is off', async () => {
      const fake = atSecondTrick(false);
      await settle();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(sentPlays(fake)).toHaveLength(0);
    });

    it('waits while the card is lifted, and starts again when it is put back', async () => {
      const fake = atSecondTrick(true);
      await settle();
      const user = userEvent.setup({
        pointerEventsCheck: 0,
        advanceTimers: vi.advanceTimersByTime,
      });
      await user.click(cardBtn(c('2', 'hearts')));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12_000);
      });
      expect(sentPlays(fake)).toHaveLength(0);
      fireEvent.click(document.querySelector('[data-hand]')!);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5500);
      });
      expect(sentPlays(fake)).toEqual([SECOND()]);
    });

    it('never plays on the first trick', async () => {
      storage.set(SP_KEYS.prefs, { autoSingle: true });
      resetPrefsForTests();
      const fake = mount({ deal: DEAL });
      bidRound(fake);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12_000);
      });
      expect(sentPlays(fake)).toHaveLength(0);
    });
  });

  describe('tapping the table to play', () => {
    const lift = async (fake: FakeTable) => {
      bidRound(fake);
      const card = fake.hands![0].find((c) => c.suit !== 'spades')!;
      await u().click(cardBtn(card));
      return card;
    };

    it('shows where a lifted card lands, and playing it from the felt sends it', async () => {
      const fake = mount({ seed: mixedSeed() });
      const card = await lift(fake);
      expect(screen.getByText('Tap to play')).toBeInTheDocument();
      expect(screen.getByText(/^Tap again or tap the table/)).toBeInTheDocument();
      await u().click(screen.getByRole('button', { name: `Play ${cardName(card)}` }));
      expect(fake.sent).toContainEqual({ type: 'play', card });
      expect(screen.queryByText('Tap to play')).toBeNull();
    });

    it('shows no slot for a card you can’t play, or when nothing is lifted', async () => {
      const fake = mount({ seed: mixedSeed() });
      bidRound(fake);
      expect(screen.queryByText('Tap to play')).toBeNull();
      await u().click(cardBtn(fake.hands![0].find((c) => c.suit === 'spades')!));
      expect(screen.queryByText('Tap to play')).toBeNull();
    });

    it('puts the card back on a tap in the hand’s empty space, and buzzes once on lift', async () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
      const fake = mount({ seed: mixedSeed() });
      await lift(fake);
      expect(vibrate).toHaveBeenCalledWith(5);
      fireEvent.click(document.querySelector('[data-hand]')!);
      expect(screen.queryByText('Tap to play')).toBeNull();
      expect(fake.sent.some((a) => a.type === 'play')).toBe(false);
    });

    it('opens the last trick from its own button, and the felt no longer does', async () => {
      mount();
      await u().click(screen.getByRole('button', { name: 'Show the last trick' }));
      expect(await screen.findByRole('dialog', { name: 'Last trick' })).toBeInTheDocument();
    });
  });

  describe('sheets and the next deal', () => {
    const finishHand = async (fake: FakeTable) => {
      bidRound(fake, 3);
      act(() => {
        while (fake.state.phase === 'playing') fake.auto();
      });
      return screen.findByRole('dialog', { name: 'Hand 1' }, { timeout: 4000 });
    };

    it('closes the summary by itself when the next hand is dealt, and says why', async () => {
      const fake = mount({ seed: 3, seat: 1 });
      await finishHand(fake);
      expect(screen.getByText(/deals next/)).toBeInTheDocument();
      act(() => fake.auto());
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hand 1' })).toBeNull());
      expect(await screen.findByText('Hand 2 is dealt')).toBeInTheDocument();
    });

    it('does not toast the deal for a summary that was already closed', async () => {
      const fake = mount({ seed: 3, seat: 1 });
      const sheet = await finishHand(fake);
      await u().click(within(sheet).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hand 1' })).toBeNull());
      act(() => fake.auto());
      expect(screen.queryByText('Hand 2 is dealt')).toBeNull();
    });

    it('closes the scoreboard when your turn comes', async () => {
      const fake = mount({ seat: 1 });
      const user = u();
      await user.click(screen.getByRole('button', { name: 'Table menu' }));
      const menu = await screen.findByRole('dialog', { name: 'Table' });
      await user.click(within(menu).getByRole('button', { name: 'Scoreboard' }));
      expect(await screen.findByRole('dialog', { name: 'Scoreboard' })).toBeInTheDocument();
      act(() => fake.auto());
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Scoreboard' })).toBeNull());
    });
  });

  describe('the link', () => {
    it('says so while a quiet table is being checked, and a dead link says reconnecting', () => {
      const fake = mount();
      expect(screen.queryByText('Checking the table…')).toBeNull();
      act(() => fake.set({ stale: true }));
      expect(screen.getByText('Checking the table…')).toBeInTheDocument();
      act(() => fake.set({ status: 'reconnecting' }));
      expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
      expect(screen.queryByText('Checking the table…')).toBeNull();
    });
  });

  describe('the host', () => {
    it('ends the game only after the confirmation', async () => {
      const fake = mount();
      const user = u();
      await user.click(screen.getByRole('button', { name: 'Table menu' }));
      await user.click(screen.getByRole('button', { name: 'End game' }));
      const dlg = screen.getByRole('alertdialog');
      await user.click(within(dlg).getByRole('button', { name: 'Keep playing' }));
      expect(fake.sent.some((a) => a.type === 'endGame')).toBe(false);
      await user.click(screen.getByRole('button', { name: 'Table menu' }));
      await user.click(screen.getByRole('button', { name: 'Call it a draw' }));
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Call it a draw' }),
      );
      expect(fake.sent).toContainEqual({ type: 'drawGame' });
      expect(await screen.findByRole('heading', { name: 'It’s a draw' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rematch · same partners' })).toBeInTheDocument();
    });

    it('sends a rematch with or without swapped partners', async () => {
      const fake = mount();
      act(() => fake.as(0, { type: 'endGame' }));
      await u().click(await screen.findByRole('button', { name: 'Swap partners' }));
      expect(fake.sent).toContainEqual(expect.objectContaining({ type: 'rematch', swap: true }));
    });

    it('offers no host actions to anyone else', async () => {
      mount({ seat: 1, dealer: 0 });
      await u().click(screen.getByRole('button', { name: 'Table menu' }));
      expect(screen.queryByRole('button', { name: 'End game' })).not.toBeInTheDocument();
    });
  });

  describe('deal, reactions and preferences', () => {
    it('the dealer holds to deal; the deal can be skipped with a tap', async () => {
      window.matchMedia = ((q: string) => ({
        matches: false,
        media: q,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
      const fake = mount({ dealer: 0, dealt: false });
      const hold = screen.getByRole('button', { name: 'Hold to shuffle & deal' });
      fireEvent.pointerDown(hold);
      expect(fake.sent).toContainEqual({ type: 'deal' });
      const skip = await screen.findByRole('button', { name: 'Skip the deal' });
      expect(hand().every((b) => b.getAttribute('aria-label') === 'Face-down card')).toBe(true);
      fireEvent.click(skip);
      expect(screen.queryByRole('button', { name: 'Skip the deal' })).not.toBeInTheDocument();
    });

    it('sends a reaction at most once every 2 seconds, and floats others’', async () => {
      const fake = mount();
      const user = u();
      await user.click(screen.getByRole('button', { name: 'Send a reaction' }));
      await user.click(screen.getByRole('button', { name: 'Send 🔥' }));
      await user.click(screen.getByRole('button', { name: 'Send a reaction' }));
      await user.click(screen.getByRole('button', { name: 'Send 👏' }));
      expect(fake.sent.filter((a) => a.type === 'react')).toEqual([{ type: 'react', emoji: '🔥' }]);
      act(() => fake.react(1 as Seat, '😂'));
      expect(screen.getByText('😂')).toBeInTheDocument();
    });

    it('remembers the sounds choice on this device', async () => {
      mount();
      const user = u();
      await user.click(screen.getByRole('button', { name: 'Table menu' }));
      await user.click(screen.getByRole('button', { name: 'Sounds and sorting' }));
      await user.click(screen.getByRole('button', { name: 'Only mine' }));
      expect(storage.get<{ sounds: string }>(SP_KEYS.prefs, { sounds: '' }).sounds).toBe('mine');
    });

    it('turns the one-card shortcut on from the settings', async () => {
      mount();
      const user = u();
      await user.click(screen.getByRole('button', { name: 'Table menu' }));
      await user.click(screen.getByRole('button', { name: 'Sounds and sorting' }));
      await user.click(screen.getByRole('button', { name: 'After 5 seconds' }));
      expect(
        storage.get<{ autoSingle: boolean }>(SP_KEYS.prefs, { autoSingle: false }).autoSingle,
      ).toBe(true);
    });
  });
});
