import { act, render } from '@testing-library/react';
import { archive, type PlayerRec } from '@/state/archive';
import { Avatar, tierOf } from './Avatar';

// One fake observer the whole file shares, like the app's: tests resize avatars by calling its callback.
const made: FakeRO[] = [];
class FakeRO {
  els = new Set<Element>();
  constructor(public cb: ResizeObserverCallback) {
    made.push(this);
  }
  observe(el: Element) {
    this.els.add(el);
  }
  unobserve(el: Element) {
    this.els.delete(el);
  }
  disconnect() {}
  resize(el: Element, width: number) {
    act(() =>
      this.cb([{ target: el, contentRect: { width } } as unknown as ResizeObserverEntry], this),
    );
  }
}
Object.assign(globalThis, { ResizeObserver: FakeRO });

const look = {
  outfit: { id: 'kurta', v: 1 },
  headwear: { id: 'cricket_cap', v: 0 },
  frame: { id: 'gold_ring', v: 0 },
};
const riya = { emoji: '🦊', color: '#E8A87C', look };
const tierEl = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-tier]')!;

describe('avatar tiers', () => {
  it('sizes tiers at 32, 48 and 72px', () => {
    expect([20, 31.9, 32, 47, 48, 71, 72, 220].map(tierOf)).toEqual([
      'dot',
      'dot',
      'seat',
      'seat',
      'hero',
      'hero',
      'stage',
      'stage',
    ]);
  });

  it('draws a player without a look exactly as before, and observes nothing', () => {
    const { container } = render(<Avatar p={{ emoji: '🐯', color: '#7FB3D5' }} />);
    expect(container.querySelector('[data-tier]')).toBeNull();
    expect(container.textContent).toBe('🐯');
  });

  it('rings a dressed seat in the frame colour and adds art from hero size', async () => {
    const { container } = render(<Avatar p={riya} />);
    const host = tierEl(container);
    expect(host.dataset.tier).toBe('seat');
    expect(host.style.boxShadow).toContain('var(--medal-gold)');
    const ro = made[made.length - 1];
    ro.resize(host, 26);
    expect(host.dataset.tier).toBe('dot');
    expect(host.style.boxShadow).toContain('2px');
    ro.resize(host, 52);
    expect(host.dataset.tier).toBe('hero');
    await vi.waitFor(() => expect(host.querySelector('svg')).not.toBeNull());
    ro.resize(host, 96);
    expect(host.dataset.tier).toBe('stage');
    await vi.waitFor(() => expect(host.querySelectorAll('svg')).toHaveLength(2));
  });

  it('shares one observer between every avatar on screen', () => {
    const before = made.length;
    render(
      <>
        <Avatar p={riya} />
        <Avatar p={riya} />
        <Avatar p={riya} />
      </>,
    );
    expect(made.length - before).toBeLessThanOrEqual(1);
    expect(made[0].els.size).toBeGreaterThanOrEqual(3);
  });

  it("finds the look on the registry's player when the face has none", () => {
    archive.put('players', {
      id: 'pl-1',
      displayName: 'Dev',
      nameKey: 'dev',
      emoji: '🐯',
      color: '#7FB3D5',
      createdAt: 0,
      updatedAt: 0,
      local: false,
      look: { frame: { id: 'neon_ring', v: 1 } },
    } satisfies PlayerRec);
    const { container } = render(
      <Avatar p={{ emoji: '🐯', color: '#7FB3D5', playerId: 'pl-1' }} />,
    );
    expect(tierEl(container).style.boxShadow).toContain('var(--cloth-8)');
  });

  it('puts a pip top-right, decorative', () => {
    const { container } = render(<Avatar p={{ emoji: '🐯', color: '#7FB3D5' }} pip="👑" />);
    const pip = container.querySelector('[data-pip]');
    expect(pip?.textContent).toBe('👑');
    expect(pip?.getAttribute('aria-hidden')).toBe('true');
  });
});
