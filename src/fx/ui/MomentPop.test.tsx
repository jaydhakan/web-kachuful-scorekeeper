import { render, screen } from '@testing-library/react';
import type { PopCard } from '@/components/progression/popCard';
import { MomentPop } from './MomentPop';

const big = (who: string, mine?: boolean): PopCard => ({
  k: 'slam' + who,
  emoji: '💯',
  text: `${who} · Grand Slam`,
  who,
  what: 'Grand Slam',
  tier: 'big',
  ...(mine === undefined ? {} : { mine }),
});

describe('the unlock card online', () => {
  it('deals the big card on the earner’s phone', async () => {
    render(<MomentPop pops={{ id: 1, cards: [big('Riya', true)] }} onDone={() => {}} />);
    expect(await screen.findByText('Riya unlocked Grand Slam')).toBeInTheDocument();
  });

  it('shows someone else’s big moment as a compact card', async () => {
    render(<MomentPop pops={{ id: 2, cards: [big('Dev', false)] }} onDone={() => {}} />);
    expect(await screen.findByText('Dev · Grand Slam')).toBeInTheDocument();
    expect(document.querySelector('[data-unlock-card]')).toBeNull();
  });
});

describe('a scorekeeper round', () => {
  const card = (code: string, who: string): PopCard => ({ ...big(who), k: code + who, code });

  it('deals one big card a round; the next big one of that round drops in small', async () => {
    const { rerender } = render(
      <MomentPop
        pops={{
          id: 3,
          cards: [card('slam', 'Asha'), card('perfect', 'Kabir')],
          round: { game: 'g3', n: 4 },
        }}
        onDone={() => {}}
      />,
    );
    expect(await screen.findByText('Kabir · Grand Slam', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(await screen.findByText('Kabir · Grand Slam')).toBeInTheDocument();
    expect(screen.queryByText('Kabir unlocked Grand Slam')).toBeNull();
    // The same achievement again two rounds later is small too.
    rerender(
      <MomentPop
        pops={{ id: 4, cards: [card('slam', 'Mira')], round: { game: 'g3', n: 6 } }}
        onDone={() => {}}
      />,
    );
    expect(await screen.findByText('Mira · Grand Slam')).toBeInTheDocument();
    expect(screen.queryByText('Mira unlocked Grand Slam')).toBeNull();
  });
});
