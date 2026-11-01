# Design system: three runtime themes

Source of truth: `src/styles/themes.css`. Three themes share one set of components: `sunset-glass` (dark, default),
`yerba-sun` and `editorial-paper`. `<html data-theme>` picks one; switching changes that attribute and nothing else.

## How tokens reach the code

- `themes.css` is the only file with colour values. Each `[data-theme]` block sets the same tokens (`--bg`,
  `--surface-1…3`, `--text-1…3`, `--brand`, `--on-brand`, `--felt*`, `--suit-*`, `--success`/`--danger`/`--warning`,
  medals, `--seat-1…10`, font roles `--font-display/body/mono`, radii) and then paints the materials.
- **Materials** are classes the shared components carry: `.glass` (grouped surface), `.mat-fill` / `-s` / `-d` / `-off`
  (button fills), `.mat-cta`, `.mat-ibtn` (header buttons), `.mat-seg` / `.mat-thumb`, `.mat-key` / `-on` / `-no`,
  `.mat-av`, `.mat-name`, `.mat-bid`, `.mat-first`, `.mat-dealer`, `.mat-sheet`, `.mat-toast`, `.mat-inp`, `.mat-tog`,
  `.mat-meter`, `.felt`, plus the hero pieces `.ticker`, `.hero-name`, `.hero-tally` and the `.mono-label` type role.
  A theme may change colour, type, radius and shadow only; borders are inset shadows, so no box changes size.
- `src/theme/colors.ts` maps every Tailwind colour name to a theme variable (`text-primary` → `--text-1`,
  `gold` → `--medal-gold`, `ov`/`shade` → white or ink per theme), and `palette` gives the same as `var()` strings;
  canvas code resolves real values with `cssColor` / `colorValue`. The old names still work.
- Saved player colours stay hex in storage; `seatColor(hex)` draws each in the theme's avatar palette, matched by hue.
- The trump tints only the glow and the table's suit halo (`--trump`, `--trump-glow`, set by the shells); flat themes
  switch that off with `--trump-glow-amt: 0%`.
- The theme registry is `src/theme/themes.ts`; the boot script that sets `data-theme` before the first paint is
  generated from it (`vite.config.ts`, `themeBoot`). The runtime store is `src/state/theme.ts`.
- ESLint rejects hex colour literals in `src/components`, `src/screens` and `src/sheets`;
  `src/theme/contrast.test.ts` checks every theme's text pairs against WCAG AA.

## Rules

- Positive and negative colours always come with a sign or a mark. Gold is for first place.
- Fonts are self-hosted Latin subsets: Instrument Sans (all themes), Bricolage Grotesque and Space Mono (Yerba Sun),
  Instrument Serif and DM Mono (Editorial Paper). Only the active theme's faces download; only Instrument Sans is
  precached.
- Icons are Phosphor (regular), inlined in `src/components/ui/Icons.tsx` (first load) and `IconsMore.tsx` (lazy screens).
  Emoji are for avatars and personality copy, never for UI icons.
- A new component or state is added to all three themes at once.
- Component-intrinsic sizes (a 60px button, a 66px dealer chip) stay as arbitrary values; colours and font sizes do not.

## Themes

- **Sunset Glass** (dark, default): frosted glass over a peach, pink and violet wallpaper, gradient accent, glow. Blur is
  only on small controls (keys, header buttons, inputs, groups, segmented, toast), never on a full-screen layer that
  animates; without `backdrop-filter`, under `prefers-reduced-transparency`, or with `<html data-lite>` (a hidden
  setting for low-end phones) surfaces turn opaque. Sheets are 95% opaque with no blur, because they slide.
- **Yerba Sun** (light): butter background, tomato accent, ink outlines and hard offset shadows; keys press into their
  shadow, the primary button lifts. Bricolage Grotesque and Space Mono.
- **Editorial Paper** (light): newsprint, ink, tomato, hairlines and no shadows; serif display, mono labels in
  uppercase (tracking drops on small buttons so labels never wrap), green table with a double rule.
- **Paint, never geometry.** Every control keeps its size and a 48px hit area in every theme; body text has a fixed
  line-height (1.22) because each face's `normal` differs. `e2e/themes.spec.ts` checks it.
- **Nested themes** (the Appearance previews) paint from the `--m-*` tokens, not material classes: custom properties
  resolve against the nearest `data-theme`, class rules from the page's theme would leak in.
- The trump colour tints only the glow and the table's suit halo on Sunset Glass; controls use the theme's accent.

## Switching themes

- Resolution: the player's own pick (only while the admin allows it), then the admin's default, then the theme last
  shown on this device, then Sunset Glass. Unknown or corrupt ids fall back, never throw.
- A boot script in `<head>` (generated from the registry in `vite.config.ts`) sets `data-theme` and the browser
  colour before the first paint, from `kf.theme`, so a cold start never flashes the wrong theme.
- `applyTheme` cross-fades with View Transitions (250ms), instantly under reduced motion, and loads the new theme's
  fonts first. Only the active theme's fonts download; only Instrument Sans is precached, the rest are cached on use.
- Admin › Appearance: preview cards, Preview on this device (not saved), Apply to everyone with an 8-second Undo,
  and Let players choose. Signed in, the setting is read at idle, on return to the app and every 5 minutes; signed out
  nothing touches the network. Until the server stores it (`backend-requests.md`), a change is saved on this device
  only, and the section says so. Changes are announced in an `aria-live` region.

## Hero layout

Bidding and Playing: a mono header (round and cards; who deals and who leads), one thin ticker under it (decorative,
`aria-hidden`, stops under reduced motion), and a who row with the player's name set big and the live bid tally. The
name is sized to its column and never cut.

## Motion

Existing animations all stay. Added, each off or reduced to a fade under `prefers-reduced-motion`:

1. **Deal fan**: card backs leave the deck behind the trump card on the round intro, once.
2. **Loader**: a squash-and-stretch ball for a lazy screen still loading, invisible for the first 300ms. No
   percentage, since nothing reports real progress.
3. **Bid pop**: the badge springs in with an overshoot; the avatar squashes and stretches.
4. **Bid flight**: a copy of the tapped key flies to the bidder's seat as the badge pops.
5. **Outline-to-fill**: the winner's name draws as an outline, then fills left to right.
6. **Variable-weight score**: count-ups swell from light to heavy, then settle.
7. **Turn light**: a lit arc on the rim points at the active seat and turns to the next one.
8. **Feedback**: Results rows flash made or missed; Yerba Sun keys press in; toasts flick away.

Rules: transform and opacity only (plus `clip-path` for the fill); entrances ease out (`cubic-bezier(.22,1,.36,1)`),
in-place changes ease in and out; nothing blocks a tap.

## Contrast

`src/theme/contrast.test.ts` reads every theme from `themes.css` and checks its text pairs against WCAG AA. One
allowed exception: the heart on Yerba Sun's tomato table (3.9:1) is a large glyph, so 3:1 applies. Text over Sunset
Glass's wallpaper is checked by screenshot, since the wallpaper is a gradient.

## Layout and sizing

- **Breakpoints** live in `src/theme/breakpoints.ts` and become Tailwind screens: `land:`, `md:`, `wide:`, `pane:` (land or wide), `roomy:` (md or wide). Pick the layout with these; use container queries for anything inside a component.
- **Container queries** come from `@tailwindcss/container-queries` (`@sm:`, `@[26rem]:`) plus two height variants, `@h-short:` (40rem) and `@h-tiny:` (32rem), which answer to the nearest size container (the Scaffold root).
- **Type never uses an in-between size.** It moves between the existing scale steps at a breakpoint or container size (a large title `text-30` to `text-36`, the table's suit `text-34` to `text-40`); `clamp()` is for spacing and the table only.
- **Touch targets** are at least 44px (`max(44px, 2.75rem)`), hover styles apply only on devices that can hover (`future.hoverOnlyWhenSupported`), and every control has a visible focus ring.
- **The table has its own unit.** Inside a table, sizes are `calc(N * var(--s))` where `--s` is one design pixel at the table's current size, so an avatar, a bubble or a chip scales with the seats; text stays on the type scale and never shrinks below `text-13`.
- **Scrollbars** are hidden on touch and thin and themed on devices with a fine pointer (`.scroll-thin`); a hidden scrollbar on a laptop hides the fact that content scrolls.
