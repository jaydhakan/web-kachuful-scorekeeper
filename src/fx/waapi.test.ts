import { BEAT_HOLD_MS } from '@/components/ui/motion';
import { anim, forceReducedMotion, REDUCED_MS } from './waapi';

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

const el = () => document.createElement('div');
// Felt.tsx's "Spades broken" banner and TeamBar's bag "−100": both fade in and out.
const BANNER: Keyframe[] = [
  { transform: 'translate(-50%,-20px) scale(.8)', opacity: 0 },
  { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: 0.25 },
  { transform: 'translate(-50%,0) scale(1)', opacity: 1, offset: 0.8 },
  { transform: 'translate(-50%,0) scale(1)', opacity: 0 },
];
const MINUS: Keyframe[] = [
  { transform: 'translateY(0) scale(.6)', opacity: 0 },
  { transform: 'translateY(-26px) scale(1.2)', opacity: 1, offset: 0.3 },
  { transform: 'translateY(-60px) scale(1)', opacity: 0 },
];

describe('anim under reduced motion (the test setup prefers it)', () => {
  it('shows an in-and-out fade still, for its length, then hides it', () => {
    anim(el(), BANNER, { duration: 2000, fill: 'forwards' });
    const [f, o] = calls[0];
    const k = REDUCED_MS / 2000;
    expect(f.map((x) => [x.opacity, x.offset])).toEqual([
      [0, undefined],
      [1, k],
      [1, 1 - k],
      [0, undefined],
    ]);
    // Held in place: the pose it is read in, never moving.
    expect(new Set(f.map((x) => x.transform))).toEqual(new Set(['translate(-50%,0) scale(1)']));
    expect(o).toMatchObject({ duration: 2000, easing: 'linear', fill: 'forwards' });
  });

  it('keeps the "−100" on screen, and a short one at least a Beat’s read', () => {
    anim(el(), MINUS, { duration: 1500, delay: 120 });
    expect(calls[0][1]).toMatchObject({ duration: 1500, delay: 120 });
    expect(calls[0][0][1].transform).toBe('translateY(-26px) scale(1.2)');
    anim(el(), [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 300 });
    expect(calls[1][1].duration).toBe(BEAT_HOLD_MS);
  });

  it('cross-fades a one-way opacity change, as before', () => {
    anim(el(), [
      { transform: 'scale(.3)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ]);
    expect(calls[0]).toEqual([[{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MS }]);
  });

  it('plays nothing for pure motion, or for a dip in opacity', () => {
    anim(el(), [
      { transform: 'scale(1)' },
      { transform: 'scale(1.35)' },
      { transform: 'scale(1)' },
    ]);
    anim(el(), [{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }]);
    expect(calls).toEqual([]);
  });

  it('plays the keyframes as written with motion on', () => {
    forceReducedMotion(false);
    anim(el(), BANNER, { duration: 2000 });
    expect(calls[0][0]).toBe(BANNER);
  });
});
