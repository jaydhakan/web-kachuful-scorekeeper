import { act, fireEvent, render, screen } from '@testing-library/react';
import { demoGame, newRound, totalRounds, type Game } from '@/games/kachuful/domain';
import { t } from '@/strings';
import { MedalsValue, NO_MEDALS, type TableMedals } from '@/games/kachuful/state/medals';
import { RoundStart } from './RoundStart';

// Framer Motion reads the motion preference once per file, so the hook itself is switched per test.
const env = vi.hoisted(() => ({
  rm: false,
  state: {} as { game: unknown; seq: unknown },
  seqDone: vi.fn(),
}));
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => env.rm,
}));
vi.mock('@/games/kachuful/state/store', () => ({
  useApp: () => ({ state: env.state, actions: { seqDone: env.seqDone } }),
}));

/** Five players, no dealer-chip pass: the reveal is 1170ms, the whole deal 3200ms (4050ms on the last round). */
function mount(index: number, rm = false) {
  const g: Game = { ...demoGame(), rounds: [], lengthMode: '1cycle' };
  g.players = g.players.slice(0, 5);
  const round = newRound(g, index);
  env.rm = rm;
  env.state = { game: g, seq: { round, prev: round.dealerIndex, banner: null } };
  return { g, ...render(<RoundStart />) };
}
// One act per millisecond: each stage's timer is only set once the commit before it has flushed.
const tick = (ms: number) => {
  for (let i = 0; i < ms; i++) act(() => vi.advanceTimersByTime(1));
};
const skip = () => screen.getByRole('button', { name: t.start.skip });

beforeEach(() => {
  vi.useFakeTimers();
  env.seqDone.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('RoundStart', () => {
  it('finishes after the full timeline, and not while the trump is still being revealed', () => {
    mount(0);
    expect(document.activeElement).toBe(skip());
    // Wait 350 + lift 120 + turn 450 + beat 250: the line has only just started.
    tick(1170);
    expect(env.seqDone).not.toHaveBeenCalled();
    expect(screen.queryByText(/First card to/)).toBeNull();
    tick(1330);
    expect(screen.getByText(/First card to/)).toBeInTheDocument();
    tick(699);
    expect(env.seqDone).not.toHaveBeenCalled();
    tick(1);
    expect(env.seqDone).toHaveBeenCalledTimes(1);
  });

  it('a click skips at once, from the first frame, and so do the keys', () => {
    const first = mount(0);
    fireEvent.click(skip());
    expect(env.seqDone).toHaveBeenCalledTimes(1);
    tick(5000);
    expect(env.seqDone).toHaveBeenCalledTimes(1);
    first.unmount();

    for (const key of ['Enter', ' ', 'Escape']) {
      env.seqDone.mockClear();
      const { unmount } = mount(0);
      fireEvent.keyDown(skip(), { key });
      expect(env.seqDone).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it('leaves no timer behind when it unmounts mid-deal', () => {
    const { unmount } = mount(0);
    tick(500);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(env.seqDone).not.toHaveBeenCalled();
  });

  it('under reduced motion shows the face and both lines at once and finishes within 700ms', () => {
    mount(0, true);
    expect(screen.getByText(/are trump$/)).toBeInTheDocument();
    expect(screen.getByText(/First card to/)).toBeInTheDocument();
    tick(599);
    expect(env.seqDone).not.toHaveBeenCalled();
    tick(101);
    expect(env.seqDone).toHaveBeenCalledTimes(1);
  });

  it('reduced motion can be skipped too', () => {
    mount(0, true);
    fireEvent.click(skip());
    expect(env.seqDone).toHaveBeenCalledTimes(1);
  });

  it('says "Last round" only on the final round, announces it, and deals that round slower', () => {
    const { g, unmount } = mount(0);
    expect(totalRounds(g)).toBeGreaterThan(1);
    expect(screen.queryByText(t.start.lastRound)).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    unmount();

    mount(totalRounds(g) - 1);
    expect(screen.getByRole('status')).toHaveTextContent(t.start.lastRound);
    expect(screen.getAllByText(t.start.lastRound)).toHaveLength(2);
    // 600ms of title, then the usual deal with the cards flying a third slower: 3200 + 600 + 250.
    tick(4040);
    expect(env.seqDone).not.toHaveBeenCalled();
    tick(20);
    expect(env.seqDone).toHaveBeenCalledTimes(1);
  });

  it('the last round under reduced motion still takes only the 600ms hold', () => {
    const { g, unmount } = mount(0, true);
    unmount();
    mount(totalRounds(g) - 1, true);
    expect(screen.getAllByText(t.start.lastRound)).toHaveLength(2);
    tick(600);
    expect(env.seqDone).toHaveBeenCalledTimes(1);
  });
});

describe('the medallists at round 1’s deal', () => {
  const medalsFor = (g: Game, seats: number[]): TableMedals => ({
    ...NO_MEDALS,
    held: new Map(
      seats.map((k, i) => [g.players[k].id, { medal: (i + 1) as 1 | 2, defending: false }]),
    ),
    after: new Map(),
    chase: { slipping: new Set(), onTrack: new Map() },
    marks: new Map(),
    banter: [],
    changes: [],
    defended: null,
  });
  function mountWith(index: number, seats: number[]) {
    const g: Game = { ...demoGame(), rounds: [], lengthMode: '1cycle' };
    g.players = g.players.slice(0, 5);
    const round = newRound(g, index);
    env.rm = false;
    env.state = { game: g, seq: { round, prev: round.dealerIndex, banner: null } };
    render(
      <MedalsValue value={medalsFor(g, seats)}>
        <RoundStart />
      </MedalsValue>,
    );
    return g;
  }
  const line = () => document.querySelector('[data-medal-line]');

  it('says the one medallist at the table, then gives way to the dealer’s line', () => {
    const g = mountWith(0, [2]);
    tick(1);
    expect(line()).toHaveTextContent(`Badshah ${g.players[2].name} table pe hai`);
    tick(2600);
    expect(screen.getByText(/First card to/)).toBeInTheDocument();
    expect(line()).toBeNull();
  });

  it('sets two medallists against each other', () => {
    const g = mountWith(0, [1, 3]);
    tick(1);
    expect(line()).toHaveTextContent(`Badshah ${g.players[1].name}`);
    expect(line()).toHaveTextContent(`vs`);
    expect(line()).toHaveTextContent(`Wazir ${g.players[3].name}`);
  });

  it('is only on round 1', () => {
    mountWith(1, [0]);
    tick(1);
    expect(line()).toBeNull();
  });
});
