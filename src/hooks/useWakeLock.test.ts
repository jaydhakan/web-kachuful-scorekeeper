import { renderHook } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

const flush = () => new Promise((r) => setTimeout(r, 0));

function fakeWakeLock() {
  const sentinels: {
    released: boolean;
    release: () => Promise<void>;
    addEventListener: (t: string, f: () => void) => void;
    fire: () => void;
  }[] = [];
  const request = vi.fn(async () => {
    let onRelease: () => void = () => undefined;
    const s = {
      released: false,
      release: async () => {
        s.released = true;
      },
      addEventListener: (_t: string, f: () => void) => {
        onRelease = f;
      },
      fire: () => onRelease(),
    };
    sentinels.push(s);
    return s;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinels };
}

const setVisibility = (v: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
  setVisibility('visible');
});

describe('useWakeLock', () => {
  it('requests a screen lock while active and releases it on unmount', async () => {
    const { request, sentinels } = fakeWakeLock();
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledWith('screen');
    unmount();
    expect(sentinels[0].released).toBe(true);
  });

  it('does nothing when inactive or unsupported', async () => {
    const { request } = fakeWakeLock();
    renderHook(() => useWakeLock(false));
    await flush();
    expect(request).not.toHaveBeenCalled();
    Reflect.deleteProperty(navigator, 'wakeLock');
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });

  it('re-acquires after the browser releases it and the tab is visible again', async () => {
    const { request, sentinels } = fakeWakeLock();
    renderHook(() => useWakeLock(true));
    await flush();
    setVisibility('hidden');
    sentinels[0].fire();
    setVisibility('visible');
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('never holds two locks when visibility events arrive together', async () => {
    const { request } = fakeWakeLock();
    renderHook(() => useWakeLock(true));
    setVisibility('visible');
    setVisibility('visible');
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('releases when the game ends', async () => {
    const { sentinels } = fakeWakeLock();
    const { rerender } = renderHook(({ on }) => useWakeLock(on), { initialProps: { on: true } });
    await flush();
    rerender({ on: false });
    expect(sentinels[0].released).toBe(true);
  });
});
