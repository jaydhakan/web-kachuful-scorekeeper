import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { forceReducedMotion } from '@/fx/reduced';
import { archive } from '@/state/archive';
import { SUIT_PITCH } from '@/games/kaali-teeri/sound/plans';
import { KtProvider, useKt } from './store';

const fb = vi.hoisted(() => vi.fn());
const pc = vi.hoisted(() => vi.fn());
vi.mock('@/fx/feedback', async (orig) => ({
  ...(await orig<typeof import('@/fx/feedback')>()),
  feedback: fb,
  playCue: pc,
}));

const wrapper = ({ children }: { children: ReactNode }) => <KtProvider>{children}</KtProvider>;
const kinds = () => fb.mock.calls.map((c) => c[0]);

async function table() {
  await archive.ready;
  const r = renderHook(() => useKt(), { wrapper });
  act(() => r.result.current.actions.startSetup());
  ['Riya', 'Aarav', 'Kabir', 'Meera'].forEach((name, k) =>
    act(() => r.result.current.actions.setupSeat(k, { name, emoji: '🙂', color: '#FF8A65' })),
  );
  fb.mockClear();
  return { r, a: () => r.result.current.actions };
}

beforeEach(() => {
  fb.mockClear();
  pc.mockClear();
  forceReducedMotion(false);
});
afterAll(() => forceReducedMotion(null));

describe('Kaali Teeri taps feel and sound as the plan says', () => {
  it('setup taps pop, starting the game riffles, undo and a refused undo differ', async () => {
    const { r, a } = await table();
    a().vib();
    act(() => a().beginGame());
    expect(kinds()).toEqual(['tap', 'begin']);
    fb.mockClear();
    act(() => a().undo());
    expect(kinds()).toEqual(['err']);
    expect(r.result.current.state.game).not.toBeNull();
  });

  it('an auction raise carries the amount’s pitch, a pass and an illegal call differ', async () => {
    const { r, a } = await table();
    act(() => a().beginGame());
    act(() => a().setMode('auction'));
    fb.mockClear();
    act(() => a().call(150));
    act(() => a().call(200));
    act(() => a().call('pass'));
    act(() => a().call(147));
    expect(kinds()).toEqual(['raise', 'raise', 'pass', 'forbidden']);
    const [lo, hi] = [fb.mock.calls[0][1].pitch, fb.mock.calls[1][1].pitch];
    expect(hi).toBeGreaterThan(lo);
    expect(r.result.current.state.game!.hands[0].calls).toHaveLength(3);
  });

  it('quick bid, trump, partner cards, confirm and marking each have a sound', async () => {
    const { r, a } = await table();
    act(() => a().beginGame());
    const ids = r.result.current.state.game!.players.map((p) => p.id);
    act(() => a().setMode('quick'));
    fb.mockClear();
    act(() => a().quickBid(ids[0], 150));
    act(() => a().trump('spades'));
    act(() => a().addCard({ rank: 'A', suit: 'hearts' }));
    act(() => a().confirmCall());
    act(() => a().markPlayed(0, ids[2]));
    expect(kinds()).toEqual(['raise', 'pick', 'pick', 'startPlay', 'pick']);
    expect(fb.mock.calls[1][1]).toEqual({ pitch: SUIT_PITCH.spades });
    act(() => a().markPlayed(0, null));
    act(() => a().removeCard(0));
    expect(pc.mock.calls.map((c) => c[0].name)).toEqual(['undo', 'undo']);
    act(() => a().undo());
    expect(kinds().at(-1)).toBe('undo');
  });

  it('confirming a hand taps; reduced motion also sounds the verdict once the hand is scored', async () => {
    const { r, a } = await table();
    act(() => a().beginGame());
    const ids = r.result.current.state.game!.players.map((p) => p.id);
    const score = () => {
      act(() => a().setMode('quick'));
      act(() => a().quickBid(ids[0], 150));
      act(() => a().trump('hearts'));
      act(() => a().addCard({ rank: 'A', suit: 'hearts' }));
      act(() => a().confirmCall());
      act(() => a().markPlayed(0, ids[2]));
      act(() => a().toResult());
      act(() => a().points(60));
    };
    score();
    pc.mockClear();
    act(() => a().confirmHand());
    expect(kinds().at(-1)).toBe('confirm');
    expect(pc).not.toHaveBeenCalled();

    act(() => a().undo());
    forceReducedMotion(true);
    pc.mockClear();
    act(() => a().confirmHand());
    expect(pc.mock.calls.map((c) => c[0].name)).toEqual(['made', 'thud']);
  });
});
