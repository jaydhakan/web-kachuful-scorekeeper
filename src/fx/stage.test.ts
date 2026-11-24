import { riseAndSettle, seatTransform } from './stage';
import { forceReducedMotion } from './waapi';

const box = (left: number, top: number, size: number) =>
  ({ left, top, width: size, height: size }) as DOMRect;

function stage() {
  const el = document.createElement('div');
  const played: Keyframe[][] = [];
  el.getBoundingClientRect = () => box(100, 300, 200);
  el.animate = ((frames: Keyframe[]) => {
    played.push(frames);
    return { finished: Promise.resolve(), cancel() {}, playbackRate: 1 };
  }) as unknown as HTMLElement['animate'];
  return { el, played };
}

describe('the stage', () => {
  afterEach(() => forceReducedMotion(null));

  it('maps the bust onto the seat it rises from', () => {
    expect(seatTransform(box(100, 300, 200), box(20, 40, 40))).toBe(
      'translate(-160px,-340px) scale(0.2)',
    );
    expect(seatTransform(box(100, 300, 200), null)).toBe('translateY(24px) scale(.6)');
  });

  it('rises from the seat, holds, and settles back into it', async () => {
    forceReducedMotion(false);
    const { el, played } = stage();
    await riseAndSettle(el, box(20, 40, 40), { hold: 0 }).done;
    expect(played).toHaveLength(2);
    expect(played[0][0].transform).toBe('translate(-160px,-340px) scale(0.2)');
    expect(played[0][2].transform).toBe('none');
    expect(played[1][2]).toMatchObject({ opacity: 0 });
  });

  it('only fades under reduced motion: nothing travels', async () => {
    forceReducedMotion(true);
    const { el, played } = stage();
    await riseAndSettle(el, box(20, 40, 40), { hold: 0 }).done;
    expect(played.length).toBeGreaterThan(0);
    for (const frames of played) for (const f of frames) expect(f.transform).toBeUndefined();
  });

  it('can stay up, and stops when cancelled', async () => {
    forceReducedMotion(false);
    const { el, played } = stage();
    await riseAndSettle(el, null, { settle: false }).done;
    expect(played).toHaveLength(1);
    const run = riseAndSettle(el, null, { hold: 50 });
    run.cancel();
    await run.done;
    expect(played).toHaveLength(2);
  });
});
