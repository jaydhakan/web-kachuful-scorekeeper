import { vi } from 'vitest';

// The backend has no appearance endpoints yet (backend-requests.md, request 1): the store must keep working.
vi.mock('@/sync/endpoints', () => ({
  ep: {
    appearance: vi.fn(),
    setAppearance: vi.fn(),
    setMyTheme: vi.fn(),
  },
}));

const { ep } = await import('@/sync/endpoints');
const { ApiError } = await import('@/sync/api');
const store = await import('./theme');

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('takes the server’s setting when it exists', async () => {
    vi.mocked(ep.appearance).mockResolvedValue({
      data: {
        theme: 'editorial-paper',
        allowUserOverride: true,
        updatedAt: '2026-11-01T10:00:00Z',
        updatedBy: 'Jay',
      },
      status: 200,
      etag: '"1"',
    });
    await store.refreshAppearance();
    expect(store.themeStore.get().appearance).toMatchObject({
      theme: 'editorial-paper',
      allowUserOverride: true,
      source: 'server',
    });
    await vi.waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('editorial-paper'),
    );
  });
});
