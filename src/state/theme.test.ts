import { vi } from 'vitest';

// Production answers 404 until the backend is deployed: the store must keep working.
vi.mock('@/sync/endpoints', () => ({
  ep: {
    appearance: vi.fn(),
    setAppearance: vi.fn(),
    setPrefs: vi.fn(),
  },
}));

const { ep } = await import('@/sync/endpoints');
const { ApiError } = await import('@/sync/api');
const store = await import('./theme');
const { cachedPrefs } = await import('./prefs');

const at = (iso: string) => Date.parse(iso);
const shown = () => document.documentElement.getAttribute('data-theme');
const serverSays = (theme: string, allowUserOverride: boolean, updatedAt: number | null) =>
  vi.mocked(ep.appearance).mockResolvedValueOnce({
    data: { theme, allowUserOverride, updatedAt, updatedBy: 'Jay' },
    status: 200,
    etag: `"${updatedAt}"`,
  });
const prefs = (theme: string | null) => ({ theme, setup: null, updatedAt: 1 });

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(ep.appearance).mockReset();
    vi.mocked(ep.setAppearance).mockReset();
    vi.mocked(ep.setPrefs).mockReset();
    // The store is a module singleton: back to a device that has never seen a setting.
    Object.assign(store.themeStore.get(), {
      appearance: null,
      user: null,
      preview: null,
      remote: 'unknown',
      etag: null,
    });
    document.documentElement.setAttribute('data-theme', 'sunset-glass');
  });

  it('applies to everyone on this device only when the server has no endpoint, and says so', async () => {
    vi.mocked(ep.setAppearance).mockRejectedValue(new ApiError(404, 'not_found'));
    const r = await store.applyToEveryone('editorial-paper', false, 'Jay');
    expect(r.saved).toBe('device');
    expect(store.themeStore.get().remote).toBe('missing');
    expect(document.documentElement.getAttribute('data-theme')).toBe('editorial-paper');
    expect(localStorage.getItem('kf.theme')).toBe('editorial-paper');
  });

  it('a preview is not saved, and stopping it returns to the resolved theme', async () => {
    vi.mocked(ep.setAppearance).mockRejectedValue(new ApiError(0, 'offline'));
    await store.applyToEveryone('yerba-sun', false, 'Jay');
    store.previewTheme('editorial-paper');
    await vi.waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('editorial-paper'),
    );
    expect(localStorage.getItem('kf.theme')).toBe('yerba-sun');
    store.previewTheme(null);
    await vi.waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('yerba-sun'),
    );
  });

  it('takes the server’s setting, keeping its epoch-ms time as the ISO string the device stores', async () => {
    serverSays('editorial-paper', true, at('2026-11-01T10:00:00Z'));
    await store.refreshAppearance();
    expect(store.themeStore.get().appearance).toEqual({
      theme: 'editorial-paper',
      allowUserOverride: true,
      updatedAt: '2026-11-01T10:00:00.000Z',
      updatedBy: 'Jay',
      source: 'server',
    });
    expect(JSON.parse(localStorage.getItem('kf.theme.appearance')!).updatedAt).toBe(
      '2026-11-01T10:00:00.000Z',
    );
    await vi.waitFor(() => expect(shown()).toBe('editorial-paper'));
  });

  it('never-changed default (null time and name) is taken as the server’s', async () => {
    vi.mocked(ep.appearance).mockResolvedValueOnce({
      data: { theme: 'sunset-glass', allowUserOverride: false, updatedAt: null, updatedBy: null },
      status: 200,
      etag: '"0"',
    });
    await store.refreshAppearance();
    expect(store.themeStore.get().appearance).toMatchObject({
      theme: 'sunset-glass',
      source: 'server',
      updatedAt: undefined,
      updatedBy: undefined,
    });
  });

  it('sends the ETag it has, and a 304 keeps the setting as it is', async () => {
    serverSays('yerba-sun', false, at('2026-11-01T10:00:00Z'));
    await store.refreshAppearance();
    vi.mocked(ep.appearance).mockResolvedValueOnce({
      data: null as never,
      status: 304,
      etag: null,
    });
    await store.refreshAppearance();
    expect(vi.mocked(ep.appearance).mock.calls[1][0]).toEqual({
      etag: `"${at('2026-11-01T10:00:00Z')}"`,
    });
    expect(store.themeStore.get()).toMatchObject({
      remote: 'ok',
      appearance: { theme: 'yerba-sun' },
    });
  });

  it('after an admin applies, an older copy from the browser’s cache does not undo it', async () => {
    vi.mocked(ep.setAppearance).mockResolvedValueOnce({
      theme: 'editorial-paper',
      allowUserOverride: false,
      updatedAt: at('2026-11-01T10:40:00Z'),
      updatedBy: 'Jay',
    });
    const r = await store.applyToEveryone('editorial-paper', false, 'Jay');
    expect(r.saved).toBe('everyone');
    expect(store.themeStore.get().appearance).toMatchObject({
      source: 'server',
      updatedAt: '2026-11-01T10:40:00.000Z',
    });
    serverSays('yerba-sun', false, at('2026-11-01T10:00:00Z'));
    await store.refreshAppearance();
    expect(store.themeStore.get().appearance?.theme).toBe('editorial-paper');
    await vi.waitFor(() => expect(shown()).toBe('editorial-paper'));
  });

  it('only a 404 says the server doesn’t store it; offline says offline; other failures change nothing', async () => {
    vi.mocked(ep.appearance).mockRejectedValueOnce(new ApiError(404, 'not_found'));
    await store.refreshAppearance();
    expect(store.themeStore.get().remote).toBe('missing');
    vi.mocked(ep.appearance).mockRejectedValueOnce(new ApiError(0, 'offline'));
    await store.refreshAppearance();
    expect(store.themeStore.get().remote).toBe('offline');
    vi.mocked(ep.appearance).mockRejectedValueOnce(new ApiError(503, 'server'));
    await store.refreshAppearance();
    expect(store.themeStore.get().remote).toBe('offline');
  });
});

describe('a player’s own theme (request 2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(ep.setPrefs).mockReset();
    Object.assign(store.themeStore.get(), {
      appearance: {
        theme: 'sunset-glass',
        allowUserOverride: true,
        source: 'server',
      },
      user: null,
      preview: null,
    });
  });

  it('a pick signed in is sent, and cleared as unsent once the server has it', async () => {
    vi.mocked(ep.setPrefs).mockResolvedValueOnce(prefs('yerba-sun'));
    store.chooseOwnTheme('yerba-sun', true);
    expect(localStorage.getItem('kf.theme.user.unsent')).toBe('true');
    await vi.waitFor(() => expect(localStorage.getItem('kf.theme.user.unsent')).toBeNull());
    expect(ep.setPrefs).toHaveBeenCalledWith({ theme: 'yerba-sun' });
    expect(cachedPrefs()?.theme).toBe('yerba-sun');
    expect(localStorage.getItem('kf.theme.user')).toBe('yerba-sun');
  });

  it('a pick the server can’t take yet (404) stays on the device, marked unsent', async () => {
    vi.mocked(ep.setPrefs).mockRejectedValueOnce(new ApiError(404, 'not_found'));
    store.chooseOwnTheme('editorial-paper', true);
    await vi.waitFor(() => expect(ep.setPrefs).toHaveBeenCalled());
    expect(localStorage.getItem('kf.theme.user')).toBe('editorial-paper');
    expect(localStorage.getItem('kf.theme.user.unsent')).toBe('true');
    await vi.waitFor(() => expect(shown()).toBe('editorial-paper'));
  });

  it('signed out, a pick never touches the network', () => {
    store.chooseOwnTheme('yerba-sun', false);
    expect(ep.setPrefs).not.toHaveBeenCalled();
    expect(localStorage.getItem('kf.theme.user.unsent')).toBeNull();
  });

  it('the account’s pick replaces this device’s, null included, unless this device’s is unsent', async () => {
    localStorage.setItem('kf.theme.user', 'yerba-sun');
    store.themeStore.get().user = 'yerba-sun';
    await store.syncUserTheme('editorial-paper');
    expect(store.themeStore.get().user).toBe('editorial-paper');
    await store.syncUserTheme(null);
    expect(store.themeStore.get().user).toBeNull();
    expect(localStorage.getItem('kf.theme.user')).toBeNull();
    expect(ep.setPrefs).not.toHaveBeenCalled();

    // Picked offline: still unsent when the account's answer comes, so it is sent instead of replaced.
    vi.mocked(ep.setPrefs).mockRejectedValueOnce(new ApiError(0, 'offline'));
    store.chooseOwnTheme('yerba-sun', true);
    await vi.waitFor(() => expect(ep.setPrefs).toHaveBeenCalledTimes(1));
    vi.mocked(ep.setPrefs).mockResolvedValueOnce(prefs('yerba-sun'));
    await store.syncUserTheme('editorial-paper');
    expect(store.themeStore.get().user).toBe('yerba-sun');
    expect(ep.setPrefs).toHaveBeenCalledTimes(2);
    expect(ep.setPrefs).toHaveBeenLastCalledWith({ theme: 'yerba-sun' });
    expect(localStorage.getItem('kf.theme.user.unsent')).toBeNull();
  });

  it('an unknown theme from a newer app leaves the device’s as it is', async () => {
    store.themeStore.get().user = 'yerba-sun';
    await store.syncUserTheme('neon-night');
    expect(store.themeStore.get().user).toBe('yerba-sun');
  });

  it('is shown only while the admin lets players choose', () => {
    const s = { ...store.themeStore.get(), user: 'editorial-paper' as const };
    expect(store.resolved(s)).toBe('editorial-paper');
    expect(
      store.resolved({ ...s, appearance: { ...s.appearance!, allowUserOverride: false } }),
    ).toBe('sunset-glass');
  });
});
