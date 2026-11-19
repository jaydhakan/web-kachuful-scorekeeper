import { render } from '@testing-library/react';
import { card, cards } from '@/games/spades/domain/__fixtures__/kit';
import { NUDGE } from './fan';
import { Hand, type HandProps } from './Hand';

const props = (over: Partial<HandProps>): HandProps => ({
  cards: cards('As 2h 3h'),
  count: 3,
  reveal: true,
  handKey: 'h1',
  sort: 'up',
  playable: true,
  myTurn: true,
  trick: [{ seat: 1, card: card('Kh') }],
  broken: false,
  onPlay: () => {},
  onBlocked: () => {},
  width: 390,
  lifted: null,
  onLift: () => {},
  ...over,
});
const y = (el: Element) =>
  Number(/translate\([^,]+, (-?[\d.]+)px\)/.exec((el as HTMLElement).style.transform)?.[1]);
const rows = (c: HTMLElement) => [...c.querySelectorAll('button[data-card-id]')];

describe('the hand when some cards cannot be played', () => {
  it('raises the playable cards by the nudge and leaves the blocked one down', () => {
    const at = (over: Partial<HandProps>) => {
      const { container } = render(<Hand {...props(over)} />);
      return new Map(rows(container).map((b) => [b.getAttribute('data-card-id'), b]));
    };
    const free = at({ trick: [], broken: true });
    const mixed = at({});
    let raised = 0;
    for (const [id, b] of mixed) {
      const blocked = !!b.getAttribute('aria-disabled');
      const was = y(free.get(id)!);
      expect(y(b)).toBeCloseTo(blocked ? was : was - NUDGE, 5);
      if (!blocked) raised++;
    }
    expect(raised).toBe(2);
  });

  it('raises nothing when every card can be played', () => {
    const { container } = render(<Hand {...props({ trick: [], cards: cards('2h 3h 4h') })} />);
    expect(rows(container).every((b) => !b.getAttribute('aria-disabled'))).toBe(true);
    const ys = rows(container).map(y);
    // The arc alone: the middle card sits highest, by the arc and not by a nudge.
    expect(Math.min(...ys)).toBe(ys[1]);
  });

  it('dims the blocked card with a light neutral shade, not the page colour', () => {
    const { container } = render(<Hand {...props({})} />);
    const dim = container.querySelector('.sp-dim.opacity-100');
    expect(dim?.className).toContain('var(--shade)_28%');
  });
});
