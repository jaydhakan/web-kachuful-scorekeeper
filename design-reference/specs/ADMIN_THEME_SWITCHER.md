# Admin theme switcher

Goal: an admin picks which theme the app uses, at runtime, and it applies without a redeploy. Changing colours is cheap because every colour, font role, radius and shadow comes from variables scoped by `data-theme` (see `THEMES_SPEC.md`).

## 1. Behaviour

- Three themes today: `sunset-glass` (default), `yerba-sun`, `editorial-paper`. Adding a theme later is one new block in `themes.css` plus one registry entry.
- **Admin screen, new "Appearance" section.** Shows each theme as a live preview card (a small table, a key row and a button drawn with that theme's real tokens, via a nested element carrying `data-theme="<id>"`). Radio selection. Buttons: "Preview on this device" and "Apply to everyone".
- **Two settings:**
  1. `theme.default` — the theme everyone gets unless they override.
  2. `theme.allow_user_override` — boolean, default `false`. If true, Settings shows a "Theme" picker for every user and their choice wins on their own devices.
- **Resolution order:** user override (only if allowed) → admin default from the server → last cached value on the device → built-in default `sunset-glass`.
- **Undo:** after "Apply to everyone", show a toast with Undo for 8 seconds.
- **Switching animation:** use the View Transitions API for a 250ms cross-fade when available; with `prefers-reduced-motion` or no API, switch instantly. Layout never moves, because geometry is identical in all themes.

## 2. No flash on load

Put a tiny blocking script in `<head>` before the stylesheet:

```html
<script>
(function () {
  try {
    var t = localStorage.getItem('kf.theme');
    var ok = { 'sunset-glass': '#14080F', 'yerba-sun': '#FBE7B5', 'editorial-paper': '#F3EFE6' };
    if (!ok[t]) t = 'sunset-glass';
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', ok[t]);
    document.documentElement.style.colorScheme = t === 'sunset-glass' ? 'dark' : 'light';
  } catch (e) { document.documentElement.setAttribute('data-theme', 'sunset-glass'); }
})();
</script>
```

Also preload that theme's primary font files from the same cached value if your build allows (otherwise rely on `font-display: swap`).

## 3. Registry (single source for the client)

```ts
export type ThemeId = 'sunset-glass' | 'yerba-sun' | 'editorial-paper';

export const THEMES: Record<ThemeId, { label: string; scheme: 'dark' | 'light'; themeColor: string; swatches: string[] }> = {
  'sunset-glass':    { label: 'Sunset Glass',    scheme: 'dark',  themeColor: '#14080F', swatches: ['#14080F', '#7E2058', '#FFB86B', '#FF5E9C'] },
  'yerba-sun':       { label: 'Yerba Sun',       scheme: 'light', themeColor: '#FBE7B5', swatches: ['#FBE7B5', '#EE6A4B', '#2B1A0E', '#FFF8E6'] },
  'editorial-paper': { label: 'Editorial Paper', scheme: 'light', themeColor: '#F3EFE6', swatches: ['#F3EFE6', '#16352A', '#FF4B1F', '#151412'] },
};
export const DEFAULT_THEME: ThemeId = 'sunset-glass';
export const isThemeId = (x: unknown): x is ThemeId => typeof x === 'string' && x in THEMES;
```

Unknown ids from the server or storage must fall back to the default, never throw.

## 4. Applying a theme

```ts
export function applyTheme(id: ThemeId, { animate = true } = {}) {
  const run = () => {
    const root = document.documentElement;
    root.setAttribute('data-theme', id);
    root.style.colorScheme = THEMES[id].scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[id].themeColor);
    try { localStorage.setItem('kf.theme', id); } catch {}
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (animate && !reduce && 'startViewTransition' in document) (document as any).startViewTransition(run);
  else run();
}
```

Load the new theme's fonts before or while switching (`document.fonts.load` for the display and body faces) so the swap doesn't flash fallback type.

## 5. Server contract (record in `backend-requests.md`)

Do not fake this. Build the UI against these endpoints, with the local fallback in section 6 until they exist.

- `GET /api/settings/appearance` — public, cacheable (`ETag`, short `max-age`).
  Response: `{ "theme": "sunset-glass", "allowUserOverride": false, "updatedAt": "2026-11-01T10:00:00Z", "updatedBy": "admin" }`
- `PUT /api/admin/settings/appearance` — admin only.
  Body: `{ "theme": "yerba-sun", "allowUserOverride": true }`. Validate `theme` against the allowed list. Return the stored object.
- Optional per-user override: `PATCH /api/me/preferences` with `{ "theme": "editorial-paper" | null }`, honoured only when `allowUserOverride` is true.
- Storage: one row per key in an app-settings table (`theme.default`, `theme.allow_user_override`), plus an audit entry (who changed it, when, from, to).
- Freshness: clients fetch on app start, on `visibilitychange` to visible, and every few minutes while open. If the app already has a socket or server-sent events channel, push a `settings.appearance` event instead of polling.

## 6. Local-first and offline

- The app must keep working with no network and no backend support for this feature.
- Cache the last known setting in `localStorage` (`kf.theme`, `kf.theme.allowOverride`).
- If the endpoint is missing or the request fails, show the Appearance section with a notice "Saved on this device only" and store the choice locally. Do not hide the feature.
- All three themes' tokens live in one small `themes.css` that is precached by the service worker. Only the **fonts** are lazy.
- A theme change must never block gameplay or clear game state.

## 7. Accessibility and safety

- Announce the change through an `aria-live="polite"` region ("Theme changed to Yerba Sun").
- Keep focus where it was. Respect `forced-colors` (fall back to system colours) and `prefers-reduced-transparency` (opaque surfaces on Sunset Glass).
- Only the admin role can change the global default. Check on the server, not just in the UI.
- Themes may not change layout, sizes or tap targets. A visual regression test should screenshot the 16 reference screens in all three themes at 360x780 and 412x915.

## 8. Admin UI sketch

```
Appearance
  Theme for everyone
  ( ) Sunset Glass     [preview card]
  (•) Yerba Sun        [preview card]
  ( ) Editorial Paper  [preview card]
  [ ] Let players choose their own theme
  [Preview on this device]   [Apply to everyone]
  Last changed by Admin on 1 Nov, 3:40 pm
```

Use the app's existing Segmented, ListRow and Button components, not new ones. The preview card is a 160x120 box that sets `data-theme` on itself and draws an oval table, three seats, a key row and a primary button from real tokens, so previews can never drift from the real themes.

## 9. Testing checklist

- Cold load with each theme cached: no flash of the wrong theme.
- Switch while a game is in progress: state, timers and scroll position are untouched.
- Offline: cached theme applies; admin change shows "saved on this device only".
- Unknown or corrupted stored value: falls back to `sunset-glass`.
- With user override on and off: resolution order holds.
- Contrast and screenshot checks on all 16 screens in all 3 themes.
