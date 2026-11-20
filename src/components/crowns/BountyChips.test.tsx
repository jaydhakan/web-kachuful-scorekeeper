import { act, render, screen } from '@testing-library/react';
import { clearNews, putStatus } from '@/sync/news';
import type { PlayerSummary } from '@/sync/types';
import { BountyChips } from './BountyChips';

vi.mock('@/fx/feedback', () => ({ playCue: vi.fn() }));

const p = (id: string, displayName: string) =>
  ({ id, displayName, emoji: '🙂', color: '#888888' }) as unknown as PlayerSummary;
const people = [
  { id: 'd', name: 'Dev', emoji: '🐼', color: '#60a5fa' },
  { id: 'r', name: 'Riya', emoji: '🦊', color: '#f87171' },
];

describe('the bounties on the winner screen', () => {
  beforeEach(() => clearNews());

  it('shows nothing until the server says a bounty was paid', () => {
    const { container } = render(<BountyChips gameId="g1" people={people} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a chip per bounty: who earned it and whom they beat, with a coin', async () => {
    const { playCue } = await import('@/fx/feedback');
    render(<BountyChips gameId="g1" people={people} />);
    act(() =>
      putStatus({
        game: 'kachuful',
        gameId: 'g1',
        local: true,
        at: 1,
        changes: [],
        bounties: [
          { holder: p('r', 'Riya'), winner: p('d', 'Dev'), amount: 40 },
          { holder: p('r', 'Riya'), winner: p('k', 'Kabir'), amount: 40 },
        ],
      }),
    );
    const list = screen.getByRole('list', { name: 'Bounties' });
    expect(list).toHaveTextContent('Dev +40 🪙 bounty beat Riya');
    expect(
      screen.getByRole('listitem', { name: 'Kabir earned a 40 Sikke bounty for beating Riya' }),
    ).toBeInTheDocument();
    expect(playCue).toHaveBeenCalledTimes(1);
  });

  it('ignores another game’s bounties', () => {
    render(<BountyChips gameId="g2" people={people} />);
    act(() =>
      putStatus({
        game: 'kachuful',
        gameId: 'g1',
        local: true,
        at: 1,
        changes: [],
        bounties: [{ holder: p('r', 'Riya'), winner: p('d', 'Dev'), amount: 40 }],
      }),
    );
    expect(screen.queryByRole('list')).toBeNull();
  });
});
