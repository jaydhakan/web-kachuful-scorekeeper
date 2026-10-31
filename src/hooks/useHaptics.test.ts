import { vibrate } from './useHaptics';

afterEach(() => Reflect.deleteProperty(navigator, 'vibrate'));

describe('vibrate', () => {
  it('vibrates when supported', () => {
    const v = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: v, configurable: true });
    vibrate();
    expect(v).toHaveBeenCalledWith(10);
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
