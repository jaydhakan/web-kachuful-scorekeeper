import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import { archive } from '@/state/archive';
import { KtProvider, useKt, type KtActions } from '@/games/kaali-teeri/state/store';
import KtShell from './KtShell';
// Lazy chunks, loaded up front so transforming them can't outlast a findBy.
import './setup/Setup';
import './setup/Deal';
import '@/games/kaali-teeri/sheets/AddPlayerBody';

// framer-motion reads the media query once per process, so the deal test flips this instead.
const motion = vi.hoisted(() => ({ reduced: true }));
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => motion.reduced,
}));

const NAMES = ['Riya', 'Aarav', 'Kabir', 'Meera', 'Dev'];
// The store as the screens see it, read by the tests after each step.
const ref: { current: ReturnType<typeof useKt> | null } = { current: null };
function Probe() {
  const v = useKt();
  useEffect(() => void (ref.current = v));
  return null;
}
const actions = new Proxy({} as KtActions, {
  get: (_, k) => ref.current!.actions[k as keyof KtActions],
});
const st = () => ref.current!.state;

function mount() {
  const u = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <KtProvider>
          <Probe />
          <KtShell />
        </KtProvider>
      </MotionConfig>
    </LazyMotion>,
  );
  return u;
}

describe('Kaali Teeri shell, home and setup', () => {
  it('home: no game yet, an empty recent list, and New Game opens setup', async () => {
    await archive.ready;
    const u = mount();
    expect(screen.getByRole('heading', { name: 'Kaali Teeri' })).toBeInTheDocument();
    expect(await screen.findByText(/No games yet/)).toBeInTheDocument();
    expect(screen.queryByText('Resume game')).toBeNull();
    await u.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(
      await screen.findByText('Games show up here once a hand is scored.'),
    ).toBeInTheDocument();
    expect(st().pages).toEqual([{ page: 'history' }]);
    await u.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(st().pages).toEqual([]));
    await u.click(await screen.findByRole('button', { name: 'New Game' }));
    expect(
      (await screen.findAllByRole('heading', { name: 'Players and rules' }))[0],
    ).toBeInTheDocument();
  });

  it('setup 1: the count drives the decks, partners and the cards to take out', async () => {
    const u = mount();
    act(() => actions.startSetup());
    await screen.findAllByRole('heading', { name: 'Players and rules' });
    expect(screen.getByText('1 deck · min bid 150 · call 1 partner')).toBeInTheDocument();
    expect(screen.getByText('Nothing to take out · deal 13 each')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'One player fewer' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: 'One player more' }));
    expect(
      screen.getByText(/^Take out \w+ of clubs and \w+ of diamonds · deal 10 each$/),
    ).toBeInTheDocument();
    for (let i = 0; i < 2; i++)
      await u.click(screen.getByRole('button', { name: 'One player more' }));
    expect(st().setup!.n).toBe(7);
    expect(screen.getByText('2 decks · min bid 350 · call 2 partners')).toBeInTheDocument();
    // Advanced: the minimum moves in steps and the rules line follows.
    await u.click(screen.getByRole('button', { name: /Advanced/ }));
    await u.click(screen.getByRole('button', { name: 'Raise the minimum bid' }));
    expect(screen.getByText('2 decks · min bid 355 · call 2 partners')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'First to 1000' }));
    expect(st().setup!.length).toBe('to1000');
    await u.click(screen.getByRole('button', { name: 'Next: seat the table' }));
    expect(
      (await screen.findAllByRole('heading', { name: 'Seat the table' }))[0],
    ).toBeInTheDocument();
  });

  it('setup 2 and 3: seats fill, the dealer moves, and Deal! starts hand 1 with the deal', async () => {
    const u = mount();
    act(() => actions.startSetup());
    act(() => actions.setupCount(5));
    act(() => actions.setupStep(2));
    expect(
      (await screen.findAllByRole('heading', { name: 'Seat the table' }))[0],
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    NAMES.forEach((name, k) =>
      act(() => actions.setupSeat(k, { name, emoji: '🙂', color: '#FF8A65' })),
    );
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      (await screen.findAllByRole('heading', { name: 'First dealer' }))[0],
    ).toBeInTheDocument();
    const line = (text: string) =>
      screen.getByText((_, el) => el?.tagName === 'DIV' && el.textContent?.trim() === text);
    expect(line('Riya deals')).toBeInTheDocument();
    expect(line('Aarav bids first, then round to the left')).toBeInTheDocument();
    act(() => actions.setupDealer(3));
    expect(line('Meera deals')).toBeInTheDocument();
    expect(line('Dev bids first, then round to the left')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Deal!' }));
    // Screen changes run as transitions, so they may land a moment after the click.
    await waitFor(() => expect(st().game?.firstDealerIndex).toBe(3));
    // Reduced motion (as in these tests): no deal animation, straight to the hand.
    expect(st().deal).toBeNull();
    expect(st().screen).toBe('game');
  });

  it('the deal plays between setup and the hand, and one tap skips it', async () => {
    motion.reduced = false;
    try {
      const u = mount();
      act(() => actions.startSetup());
      NAMES.slice(0, 4).forEach((name, k) =>
        act(() => actions.setupSeat(k, { name, emoji: '🙂', color: '#FF8A65' })),
      );
      act(() => actions.beginGame());
      const skip = await screen.findByRole('button', { name: 'Skip the deal' });
      expect(within(skip).getByText('Hand 1')).toBeInTheDocument();
      await u.click(skip);
      await waitFor(() => expect(st().deal).toBeNull());
    } finally {
      motion.reduced = true;
    }
  });
});
