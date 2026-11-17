import { KEYS, storage } from '@/state/persistence';
import { vibrate } from './useHaptics';

afterEach(() => Reflect.deleteProperty(navigator, 'vibrate'));

const stub = () => {
  const v = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: v, configurable: true });
  return v;
};

describe('vibrate', () => {
  it('vibrates when supported', () => {
    const v = stub();
    vibrate();
    expect(v).toHaveBeenCalledWith(10);
  });

  it('takes a pattern', () => {
    const v = stub();
    vibrate([12, 40, 18]);
    expect(v).toHaveBeenCalledWith([12, 40, 18]);
  });

  it('stays still when the player turned vibration off, and ignores reduced motion', () => {
    const v = stub();
    // The test setup matches prefers-reduced-motion: vibration still runs.
    vibrate(30);
    expect(v).toHaveBeenCalledTimes(1);
    storage.set(KEYS.fx, { sounds: 'moments', vibrate: false });
    vibrate(30);
    expect(v).toHaveBeenCalledTimes(1);
  });

  it('is a silent no-op where navigator.vibrate is missing (iOS) or throws', () => {
    expect(() => vibrate()).not.toThrow();
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {
        throw new Error('blocked');
      },
      configurable: true,
    });
    expect(() => vibrate()).not.toThrow();
  });
});
