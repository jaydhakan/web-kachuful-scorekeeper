import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import type { KtGame, KtHand } from '@/games/kaali-teeri/domain';
import { KtProvider, useKt, type KtActions } from '@/games/kaali-teeri/state/store';
import { DEFAULT_PREFS } from '@/games/kaali-teeri/state/types';
import { testGame } from '@/games/kaali-teeri/test/handGame';
import { finishedDemo } from '@/games/kaali-teeri/test/render';
import { MQ } from '@/theme/breakpoints';
import KtDeskShell from './KtDeskShell';
// Lazy chunks, loaded up front so transforming them can't outlast a findBy.
import '../setup/Setup';
import '../setup/Deal';
import '../Winner';
import '@/games/kaali-teeri/sheets/Rules';
import '@/games/kaali-teeri/sheets/Scoreboard';

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

/** A desktop with a keyboard: the large-screen queries match (layout CSS is not applied in jsdom). */
beforeEach(() => {
  const on = new Set<string>([MQ.big, MQ.roomy, MQ.rail, MQ.dt, MQ.kbd, MQ.wide]);
  window.matchMedia = (q: string) =>
    ({
      matches: on.has(q) || q.includes('prefers-reduced-motion'),
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
});

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
const hand = () => st().game!.hands.at(-1)!;

function mount(game: KtGame | null) {
  const u = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <KtProvider
          initial={{
            game,
            screen: game ? 'game' : 'home',
            undo: [],
            prefs: DEFAULT_PREFS,
            corrupt: false,
          }}
        >
          <Probe />
          <KtDeskShell />
        </KtProvider>
      </MotionConfig>
    </LazyMotion>,
  );
  return u;
}

/** Five players at hand 1, dealer Aarav, so Riya speaks first; Riya won at 160 unless `h` says otherwise. */
const at = (h: Partial<KtHand>) => testGame(5, { bidder: 'p1', bid: 160, mode: 'quick', ...h });
const playing = (playedBy: (string | null)[] = [null]) =>
  at({
    phase: 'playing',
    trump: 'hearts',
    called: [{ rank: 'A', suit: 'hearts' }],
    playedBy,
  });

describe('Kaali Teeri on a large screen', () => {
  it('quick mode: ← → pick the winner, ↑ and typed digits set the amount, Enter confirms', async () => {
    const u = mount(testGame(5));
    expect(screen.getByRole('navigation', { name: 'Hand steps' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'No hands yet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Who won the bid?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tap the seat that won the bid' })).toBeDisabled();

    await u.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: 'Aarav · 150' })).toBeInTheDocument();
    await u.keyboard('{ArrowRight}{ArrowUp}');
    expect(screen.getByRole('heading', { name: 'Riya · 155' })).toBeInTheDocument();
    await u.keyboard('185');
    expect(screen.getByRole('button', { name: 'Riya · 185' })).toBeEnabled();

    await u.keyboard('{Enter}');
    expect(hand()).toMatchObject({ phase: 'calling', bidder: 'p1', bid: 185 });
    expect(await screen.findByText('Riya, pick trump')).toBeInTheDocument();

    // Z undoes the bid.
    await u.keyboard('z');
    await waitFor(() => expect(hand().phase).toBe('bidding'));
  });

  it('full auction: M switches to it, Enter bids the amount, P passes', async () => {
    const u = mount(testGame(5));
    await u.keyboard('m');
    expect(hand().mode).toBe('auction');
    expect(await screen.findByRole('heading', { name: 'Riya bids first' })).toBeInTheDocument();
    await u.keyboard('{ArrowUp}{Enter}');
    expect(hand().calls).toEqual([{ playerId: 'p1', bid: 155 }]);
    expect(await screen.findByRole('heading', { name: 'High bid 155 · Riya' })).toBeInTheDocument();
    await u.keyboard('p');
    expect(hand().calls.at(-1)).toEqual({ playerId: 'p2', pass: true });
  });

  it('trump and call: the phone screen in the pane; a suit letter names trump, Enter moves on', async () => {
    const u = mount(at({ phase: 'calling' }));
    const pane = screen.getByRole('region', { name: 'Hand steps' });
    expect(within(pane).getByText('Riya, pick trump')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Riya won at 160' })).toBeInTheDocument();
    // Enter does nothing until trump is named.
    await u.keyboard('{Enter}');
    expect(within(pane).getByRole('group', { name: 'Trump' })).toBeInTheDocument();
    await u.keyboard('h');
    expect(hand().trump).toBe('hearts');
    await u.keyboard('{Enter}');
    expect(await within(pane).findByText('Call 1 partner card')).toBeInTheDocument();
    expect(within(pane).queryByRole('group', { name: 'Trump' })).toBeNull();
  });

  it('play: a digit opens who played that card; keys rest while the sheet is open; Enter ends the hand', async () => {
    const u = mount(playing());
    expect(screen.getByRole('heading', { name: 'Hearts trump · Riya 160' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Called cards' })).toBeInTheDocument();
    await u.keyboard('1');
    expect(await screen.findByRole('dialog', { name: 'Who played it?' })).toBeInTheDocument();
    await u.keyboard('{Enter}');
    expect(hand().phase).toBe('playing');
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await u.keyboard('{Enter}');
    expect(hand().phase).toBe('result');
  });

  it('points: E goes back to play, ↑ changes the points, Enter confirms; Enter on the summary deals the next hand', async () => {
    const u = mount(playing(['p3']));
    await u.keyboard('{Enter}');
    expect(hand().phase).toBe('result');
    expect(
      await screen.findByRole('heading', { name: 'How many points did the defenders take?' }),
    ).toBeInTheDocument();
    await u.keyboard('e');
    expect(hand().phase).toBe('playing');
    await u.keyboard('{Enter}');
    // The defenders' default is where the bid is exactly made: 250 − 160.
    await u.keyboard('{ArrowUp}');
    expect(screen.getByRole('spinbutton', { name: 'Defenders’ points' })).toHaveAttribute(
      'aria-valuenow',
      '95',
    );
    // The score panel shows what confirming would give.
    expect(screen.getByRole('region', { name: 'If hand 1 is confirmed' })).toBeInTheDocument();
    await u.keyboard('{Enter}');
    expect(hand().phase).toBe('done');
    expect(await screen.findByRole('button', { name: /Next hand/ })).toBeInTheDocument();
    await u.keyboard('{Enter}');
    await waitFor(() => expect(st().game!.hands).toHaveLength(2));
  });

  it('? lists the shortcuts and pauses the page keys; B opens the scoreboard, I the rules', async () => {
    const u = mount(testGame(5));
    await u.keyboard('?');
    const keys = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(keys).getByText('Name trump')).toBeInTheDocument();
    await u.keyboard('{ArrowRight}');
    expect(screen.queryByRole('heading', { name: 'Aarav · 150' })).toBeNull();
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await u.keyboard('b');
    expect(await screen.findByRole('dialog', { name: 'Scoreboard' })).toBeInTheDocument();
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await u.keyboard('i');
    expect(await screen.findByRole('dialog', { name: /Rules|How to play/ })).toBeInTheDocument();
  });

  it('home: N starts a new game; the winner: R starts a rematch', async () => {
    const u = mount(finishedDemo());
    expect(st().screen).toBe('home');
    act(() => actions.go('winner'));
    expect(await screen.findByRole('button', { name: /Rematch/ })).toBeInTheDocument();
    await u.keyboard('r');
    await waitFor(() => expect(st().screen).toBe('game'));
    expect(st().game!.hands).toHaveLength(1);

    act(() => actions.go('home', -1));
    await waitFor(() => expect(st().screen).toBe('home'));
    await u.keyboard('n');
    await waitFor(() => expect(st().screen).toBe('setup'));
  });
});
