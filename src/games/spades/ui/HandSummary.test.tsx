import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { scoreHand } from '@/games/spades/domain/scoring';
import type { SpHand } from '@/games/spades/domain/types';
import { play } from '@/games/spades/strings/play';
import { HandSummary } from './HandSummary';

// Team a bids 4+3 and takes 5 (set, −70); team b bids 3+2 and takes 8 (made, +53).
const hand: SpHand = {
  index: 0,
  dealer: 0,
  bids: [4, 3, 3, 2],
  blind: [false, false, false, false],
  teamTricks: [5, 8],
  nilTricks: [null, null, null, null],
  phase: 'done',
};

const show = (run: boolean, order?: readonly ('a' | 'b')[], headline?: string) =>
  render(
    <HandSummary
      handNo={1}
      hand={hand}
      bagsBefore={{ a: 0, b: 0 }}
      before={{ a: 100, b: 40 }}
      after={{ a: 30, b: 93 }}
      names={['Asha', 'Bo', 'Cy', 'Di']}
      teamNames={{ a: 'Sun', b: 'Moon' }}
      order={order}
      headline={headline}
      verdict="First to 200."
      run={run}
    />,
  ).container;

describe('the hand summary', () => {
  it('rests on the final numbers when it is reopened, not on 0', () => {
    const el = show(false);
    const res = scoreHand(hand, { a: 0, b: 0 });
    expect(el.querySelector('[data-net="a"]')?.textContent).toBe(play.sign(res.a.net));
    expect(el.querySelector('[data-net="b"]')?.textContent).toBe(play.sign(res.b.net));
    expect(el.querySelector('[data-total="a"]')?.textContent).toBe('30');
    expect(el.querySelector('[data-total="b"]')?.textContent).toBe('93');
  });

  it('stamps SET on the team that missed its contract only', () => {
    const el = show(false);
    expect(el.querySelector('[data-stamp="a"]')?.textContent).toBe(play.team.set(-70));
    expect(el.querySelector('[data-stamp="b"]')).toBeNull();
  });

  it('draws the viewer’s team first when told to', () => {
    const heads = (el: HTMLElement) => [...el.querySelectorAll('h3')].map((h) => h.textContent);
    expect(heads(show(false))).toEqual(['Sun', 'Moon']);
    expect(heads(show(false, ['b', 'a']))).toEqual(['Moon', 'Sun']);
  });

  it('shows the hand’s headline over the verdict, only when there is one', () => {
    expect(show(false).textContent).not.toContain('Contract secured');
    expect(show(false, undefined, 'Contract secured ✅').textContent).toContain(
      'Contract secured ✅',
    );
  });
});
