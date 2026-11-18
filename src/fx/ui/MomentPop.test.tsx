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
