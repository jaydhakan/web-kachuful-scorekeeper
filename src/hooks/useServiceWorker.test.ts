import { act, renderHook } from '@testing-library/react';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

const registerSW = vi.fn<(o: RegisterSWOptions) => () => Promise<void>>();
vi.mock('virtual:pwa-register', () => ({ registerSW }));

const load = async () => {
  vi.resetModules();
  return import('./useServiceWorker');
};

const setVisibility = (v: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  registerSW.mockReset();
  registerSW.mockReturnValue(() => Promise.resolve());
});
afterEach(() => {
  vi.useRealTimers();
  setVisibility('visible');
});

test('registers once however often the shell remounts, and reports a waiting update', async () => {
  const { useServiceWorker } = await load();
  const a = renderHook(() => useServiceWorker());
  a.unmount();
  const b = renderHook(() => useServiceWorker());
  expect(registerSW).toHaveBeenCalledTimes(1);
  expect(b.result.current.needRefresh).toBe(false);
  act(() => registerSW.mock.calls[0][0].onNeedRefresh!());
  expect(b.result.current.needRefresh).toBe(true);
  expect(b.result.current).not.toHaveProperty('dismiss');
});

test('reload only activates the waiting worker when asked', async () => {
  const apply = vi.fn(() => Promise.resolve());
  registerSW.mockReturnValue(apply);
  const { useServiceWorker } = await load();
  const { result } = renderHook(() => useServiceWorker());
  act(() => registerSW.mock.calls[0][0].onNeedRefresh!());
  expect(apply).not.toHaveBeenCalled();
  result.current.reload();
  expect(apply).toHaveBeenCalledTimes(1);
});

test('asks for updates at launch, on return, on coming online and hourly; never offline, hidden or twice a minute', async () => {
  vi.useFakeTimers();
  const { watchForUpdates, CHECK_EVERY, CHECK_GAP } = await load();
  const update = vi.fn(() => Promise.resolve());
  watchForUpdates({ update, installing: null } as unknown as ServiceWorkerRegistration);
  expect(update).toHaveBeenCalledTimes(1); // at launch

  setVisibility('visible');
  expect(update).toHaveBeenCalledTimes(1); // too soon
  vi.advanceTimersByTime(CHECK_GAP);
  setVisibility('hidden');
  expect(update).toHaveBeenCalledTimes(1);
  setVisibility('visible');
  expect(update).toHaveBeenCalledTimes(2);

  vi.advanceTimersByTime(CHECK_GAP);
  window.dispatchEvent(new Event('online'));
  expect(update).toHaveBeenCalledTimes(3);

  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  vi.advanceTimersByTime(CHECK_EVERY);
  expect(update).toHaveBeenCalledTimes(3);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.advanceTimersByTime(CHECK_EVERY);
  expect(update).toHaveBeenCalledTimes(4);
});
