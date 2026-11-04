import { DEFAULT_THEME, isThemeId, resolveTheme } from './themes';

describe('theme resolution (DESIGN-SYSTEM.md, Switching themes)', () => {
  const admin = {
    theme: 'yerba-sun' as const,
    allowUserOverride: false,
    source: 'server' as const,
  };

  it('uses the player’s own pick only while the admin allows it', () => {
    expect(resolveTheme({ user: 'editorial-paper', appearance: admin })).toBe('yerba-sun');
    expect(
      resolveTheme({ user: 'editorial-paper', appearance: { ...admin, allowUserOverride: true } }),
    ).toBe('editorial-paper');
  });

  it('falls back from the admin default to the cached theme, then the built-in default', () => {
    expect(resolveTheme({ appearance: admin, cached: 'editorial-paper' })).toBe('yerba-sun');
    expect(resolveTheme({ appearance: null, cached: 'editorial-paper' })).toBe('editorial-paper');
    expect(resolveTheme({})).toBe(DEFAULT_THEME);
  });

  it('knows Emerald Gilt, which is a choice but never the default', () => {
    expect(isThemeId('emerald-gilt')).toBe(true);
    expect(resolveTheme({ appearance: { theme: 'emerald-gilt' } })).toBe('emerald-gilt');
    expect(DEFAULT_THEME).toBe('sunset-glass');
  });

  it('never trusts an unknown or corrupted id', () => {
    expect(resolveTheme({ user: 'neon', appearance: { theme: 'x' as never }, cached: '{' })).toBe(
      DEFAULT_THEME,
    );
    expect(isThemeId('toString')).toBe(false);
    expect(isThemeId('__proto__')).toBe(false);
  });
});
