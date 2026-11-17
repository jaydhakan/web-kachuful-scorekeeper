import { STAMP_MS } from '@/components/ui/motion';
import { stamp, sheen } from './stamp';
import { forceReducedMotion, REDUCED_MS } from './waapi';

let calls: [Keyframe[], KeyframeAnimationOptions][] = [];
beforeEach(() => {
  calls = [];
  HTMLElement.prototype.animate = function (f: Keyframe[], o: KeyframeAnimationOptions) {
    calls.push([f, o]);
    return { finished: Promise.resolve(), cancel: () => undefined } as unknown as Animation;
  } as HTMLElement['animate'];
});
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  forceReducedMotion(null);
});

describe('stamp', () => {
  it('lands from 1.6× and settles 3px, keeping a positioning transform', () => {
    forceReducedMotion(false);
    stamp(document.createElement('b'), { base: 'translate(-50%,-50%)' });
    const [f, o] = calls[0];
    expect(f[0].transform).toBe('translate(-50%,-50%) rotate(-14deg) scale(1.6) translateY(0px)');
    expect(f[1]).toMatchObject({
      transform: 'translate(-50%,-50%) rotate(-8deg) scale(1) translateY(0px)',
    });
    expect(f[2].transform).toContain('translateY(3px)');
    expect(f[3].transform).toBe(f[1].transform);
    expect(o).toMatchObject({ duration: STAMP_MS + 140, fill: 'both' });
  });

  it('under reduced motion fades in where it rests', () => {
    stamp(document.createElement('b'), { angle: -6 });
    expect(calls[0]).toEqual([
      [
        { transform: 'rotate(-6deg) scale(1) translateY(0px)', opacity: 0 },
        { transform: 'rotate(-6deg) scale(1) translateY(0px)', opacity: 1 },
      ],
      { duration: REDUCED_MS, delay: 0, fill: 'both' },
    ]);
  });
});

describe('sheen', () => {
  it('crosses once and takes its layer away after', async () => {
    forceReducedMotion(false);
    const host = document.createElement('div');
    const p = sheen(host, { duration: 900 });
    expect(host.children).toHaveLength(1);
    expect(calls[0][1]).toMatchObject({ duration: 900, easing: 'linear' });
    await p.done;
    expect(host.children).toHaveLength(0);
  });

  it('is left out under reduced motion', () => {
    const host = document.createElement('div');
    sheen(host);
    expect(calls).toEqual([]);
    expect(host.children).toHaveLength(0);
  });
});
