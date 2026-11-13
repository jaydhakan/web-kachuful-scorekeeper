import { render } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'framer-motion';
import { Podium, type PodiumStanding } from './Podium';
import { revealPlan } from './podiumReveal';

const s = (name: string, rank: number, total: number): PodiumStanding => ({
  id: name,
  name,
  rank,
  total,
  emoji: '🐯',
  color: 'var(--tx)',
});
const three = [s('Riya', 1, 90), s('Dev', 2, 60), s('Meera', 3, 40)];
const show = (ui: React.ReactElement) =>
  render(
    <LazyMotion features={domAnimation} strict>
      {ui}
    </LazyMotion>,
  ).container;

/** Motion allowed: the shared setup asks for reduced motion, under which the podium is simply in place. */
beforeEach(() => {
  window.matchMedia = (q: string) =>
    ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList;
});

describe('revealPlan', () => {
  it('raises 3rd, 2nd, then 1st, half a second apart, and names the winner after a beat', () => {
    expect(revealPlan([1, 2, 3, 4])).toEqual({
      step: { 3: 0, 2: 500, 1: 1000 },
      name: 1930,
      done: 2630,
    });
  });

  it('gives an empty step no turn: lowest place first, the winner last', () => {
    expect(revealPlan([1, 1, 3]).step).toEqual({ 3: 0, 2: null, 1: 500 });
    expect(revealPlan([1, 2])).toEqual({ step: { 3: null, 2: 0, 1: 500 }, name: 1430, done: 2130 });
    expect(revealPlan([1, 1, 1]).step).toEqual({ 3: null, 2: null, 1: 0 });
  });
});

describe.each(['phone', 'desk'] as const)('Podium (%s)', (look) => {
  it('slides each step up inside a clipped box of its final size, never scaling it', () => {
    const c = show(<Podium look={look} standings={three} reveal={revealPlan([1, 2, 3])} />);
    const steps = [...c.querySelectorAll<HTMLElement>('[data-step]')];
    expect(steps.map((x) => x.dataset.step)).toEqual(['2', '1', '3']);
    for (const box of steps) {
      const slab = box.firstElementChild as HTMLElement;
      expect(box.className).toContain('overflow-hidden');
      expect(box.style.transform).toBe('');
      expect(slab.style.transform).toContain('translateY(100%)');
      expect(slab.style.transform).not.toContain('scale');
      expect(slab.textContent).toMatch(/^(1st|2nd|3rd)/);
    }
  });

  it('marks the first winner as the confetti origin only when the reveal is staged', () => {
    const tie = [s('Riya', 1, 90), s('Dev', 1, 90), s('Meera', 3, 40)];
    const staged = show(<Podium look={look} standings={tie} reveal={revealPlan([1, 1, 3])} />);
    expect(staged.querySelectorAll('[data-confetti-origin]')).toHaveLength(1);
    expect(staged.querySelector('[data-step="2"] > *')!.getAttribute('style') ?? '').not.toContain(
      'translateY',
    );
    const plain = show(<Podium look={look} standings={tie} />);
    expect(plain.querySelector('[data-confetti-origin]')).toBeNull();
  });

  it('has everything in place when there is no reveal', () => {
    const c = show(<Podium look={look} standings={three} reveal={null} />);
    for (const box of c.querySelectorAll<HTMLElement>('[data-step]'))
      expect((box.firstElementChild as HTMLElement).style.transform).not.toContain(
        'translateY(100%)',
      );
  });
});
