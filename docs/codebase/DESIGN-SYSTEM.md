# Design system: three runtime themes

Source of truth: `src/styles/themes.css` (from `design-reference/reference-html/themes.css`; spec in
`design-reference/specs/THEMES_SPEC.md`). Three themes share one set of components: `sunset-glass` (dark, default),
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

## Layout and sizing

- **Breakpoints** live in `src/theme/breakpoints.ts` and become Tailwind screens: `land:`, `md:`, `wide:`, `pane:` (land or wide), `roomy:` (md or wide). Pick the layout with these; use container queries for anything inside a component.
- **Container queries** come from `@tailwindcss/container-queries` (`@sm:`, `@[26rem]:`) plus two height variants, `@h-short:` (40rem) and `@h-tiny:` (32rem), which answer to the nearest size container (the Scaffold root).
- **Type never uses an in-between size.** It moves between the existing scale steps at a breakpoint or container size (a large title `text-30` to `text-36`, the table's suit `text-34` to `text-40`); `clamp()` is for spacing and the table only.
- **Touch targets** are at least 44px (`max(44px, 2.75rem)`), hover styles apply only on devices that can hover (`future.hoverOnlyWhenSupported`), and every control has a visible focus ring.
- **The table has its own unit.** Inside a table, sizes are `calc(N * var(--s))` where `--s` is one design pixel at the table's current size, so an avatar, a bubble or a chip scales with the seats; text stays on the type scale and never shrinks below `text-13`.
- **Scrollbars** are hidden on touch and thin and themed on devices with a fine pointer (`.scroll-thin`); a hidden scrollbar on a laptop hides the fact that content scrolls.
