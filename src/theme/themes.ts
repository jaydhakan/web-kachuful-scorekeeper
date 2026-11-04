/**
 * The theme registry: the client's single list of themes (docs/codebase/DESIGN-SYSTEM.md, Switching themes). The look
 * of each lives in src/styles/themes.css; the boot script in index.html is generated from this list.
 */
export type ThemeId = 'sunset-glass' | 'yerba-sun' | 'editorial-paper' | 'emerald-gilt';

export interface ThemeInfo {
  label: string;
  scheme: 'dark' | 'light';
  /** The browser chrome and splash colour: the theme's --bg. */
  themeColor: string;
  /** Font faces to load before switching, so the swap doesn't flash fallback type. */
  fonts: string[];
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
  'sunset-glass': {
    label: 'Sunset Glass',
    scheme: 'dark',
    themeColor: '#14080F',
    fonts: ['700 1em "Instrument Sans"', '400 1em "Instrument Sans"'],
  },
  'yerba-sun': {
    label: 'Yerba Sun',
    scheme: 'light',
    themeColor: '#FBE7B5',
    fonts: ['800 1em "Bricolage Grotesque Variable"', '700 1em "Space Mono"'],
  },
  'editorial-paper': {
    label: 'Editorial Paper',
    scheme: 'light',
    themeColor: '#F3EFE6',
    fonts: ['italic 400 1em "Instrument Serif"', '400 1em "Instrument Sans"', '500 1em "DM Mono"'],
  },
  'emerald-gilt': {
    label: 'Emerald Gilt',
    scheme: 'dark',
    themeColor: '#0C1A12',
    fonts: ['700 1em "Cinzel"', '400 1em "Instrument Sans"', '700 1em "Instrument Sans"'],
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const DEFAULT_THEME: ThemeId = 'sunset-glass';
export const isThemeId = (x: unknown): x is ThemeId =>
  typeof x === 'string' && Object.hasOwn(THEMES, x);

/** The admin's choice for everyone, as last seen from the server or saved on this device. */
export interface Appearance {
  theme: ThemeId;
  allowUserOverride: boolean;
  updatedAt?: string;
  updatedBy?: string;
  /** `device` until the server stores appearance settings. */
  source: 'server' | 'device';
}

/**
 * Which theme this device shows: the player's own pick (only while the admin allows it), then the admin's default,
 * then the last theme shown here, then the built-in default. Unknown ids fall through, never throw.
 */
export function resolveTheme(o: {
  user?: unknown;
  appearance?: Partial<Appearance> | null;
  cached?: unknown;
}): ThemeId {
  if (o.appearance?.allowUserOverride && isThemeId(o.user)) return o.user;
  if (isThemeId(o.appearance?.theme)) return o.appearance.theme;
  if (isThemeId(o.cached)) return o.cached;
  return DEFAULT_THEME;
}
