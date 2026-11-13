# Design system: four runtime themes

Source of truth: `src/styles/themes.css` and each theme's `src/styles/themes/<id>.css`. Four themes share one set of components: `sunset-glass` (dark, default),
`yerba-sun`, `editorial-paper` and `emerald-gilt` (dark). `<html data-theme>` picks one; switching changes that attribute and nothing else.

## How tokens reach the code

- `themes.css` (the default theme and shared tokens) and `themes/<id>.css` (one per other theme) are the only files
  with colour values. Each `[data-theme]` block sets the same tokens (`--bg`,
  `--surface-1…3`, `--text-1…3`, `--brand`, `--on-brand`, `--felt*`, `--suit-*`, `--success`/`--danger`/`--warning`,
  medals, `--seat-1…14`, font roles `--font-display/body/mono`, radii) and then paints the materials.
- Platform tokens, in every theme: `--game-<id>` (each game's accent), Ishaara's `--team-sun/-moon` (+ `-ink`) and
  word cards `--word-card/-blank/-trap` (+ `-ink`) and `--word-edge`, Kaali Teeri's bidding team `--kt-bid` (+ `-ink`),
  and the coming-soon badge `--soon-bg/-ink/-edge`. Offline and live use `--warning` (on its 10% tint) and `--success`.
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
- **Each theme but the default has its own stylesheet** (`src/styles/themes/<id>.css`): its tokens and every `[data-theme='<id>']` rule. `themes.css` keeps the shared rules and Sunset Glass, so a device downloads one theme, not four, and the CSS budget counts only the main sheet. The build's boot script writes the shown theme's `<link>` right after the main stylesheet (`themeCssBoot`, `vite.config.ts`), so it blocks the first paint and keeps its place in the cascade. Switching or previewing loads it first and stays on the current theme if it can't load (`src/theme/themeCss.ts`). Admin's previews load all of them. A new theme's rules go in its own file, never in `themes.css`.
- The theme registry is `src/theme/themes.ts`; the boot script that sets `data-theme` before the first paint is
  generated from it (`vite.config.ts`, `themeBoot`). The runtime store is `src/state/theme.ts`.
- **Deck art** (Emerald Gilt's card back and court cards, `src/assets/themes/emerald-gilt/`, used with permission,
  see its `SOURCE.md`) is referenced only as tokens (set in `themes/emerald-gilt.css`, defaulted to `none` in `themes.css`:`--art-back`, `--art-back-mini`,
  `--art-trump-<suit>`). Components paint it through classes (`.card-art`,
  `.trump-face`, `TrumpMark`), so none knows which theme has art and other themes never download it. A trump with no
  file keeps its suit symbol; never show another suit's card. It never leaves the app (share image, icons, manifest).
  Backgrounds only download once something on screen uses them, so `src/theme/art.ts` imports the same files and
  fetches and decodes them when the theme is shown, then sets `<html data-art-ready>`. The suit symbol is hidden only
  under that flag, so a face is never blank (offline included), and `RoundStart` waits up to 300ms for the art.
- **Cards** (`components/ui/PlayingCard`, any card game) stack three layers: the theme's flat face (rank and pip),
  the theme's stand-in for that card (`.card-standin[data-card]`, only Emerald Gilt paints them, from `standins/`:
  our own drawings, the 3♠ marked as special) and the card's photo art (`--art-card-<rank>-<suit>`, `none` until a
  real file exists; adding one is a file plus that token's line). Each covers the one below once loaded, and a
  stand-in downloads only when a card on screen uses it. A card never shows another card's art.
- **Theme hooks** have a neutral value in every theme: `--card-back-edge`, `--reveal-hold` (extra ms the round intro
  holds the trump card face-down before it turns; read once by `RoundStart`), `--fan-*`, `--reveal-rays`, `--reveal-glint`, `--name-frame`, the
  `--m-back` preview token, and slots that only one theme paints (`.suit-ring`, `.trump-mini`, `.empty-card`,
  `.streak-ring`, `.sq-card`, `.badge-pop`). `--confetti-1…4` are set only by a theme that wants its own confetti.
- ESLint rejects hex colour literals in `src/components`, `src/platform` and each game's `components`, `screens` and `sheets`;
  `src/theme/contrast.test.ts` checks every theme's text pairs against WCAG AA.

## Rules

- Positive and negative colours always come with a sign or a mark. Gold is for first place.
- Fonts are self-hosted Latin subsets: Instrument Sans (every theme but Yerba Sun), Bricolage Grotesque and Space Mono (Yerba Sun),
  Instrument Serif and DM Mono (Editorial Paper), Cinzel (Emerald Gilt; its `@font-face` leaves out digits and signs,
  so every number falls through to Instrument Sans). Only the active theme's faces download; only Instrument Sans is
  precached.
- Icons are Phosphor (regular), inlined in `src/components/ui/Icons.tsx` (first load) and `IconsMore.tsx` (lazy screens).
  The large-screen rail draws the current page with the fill weight (`IconsFill.tsx`), so place is told by shape as
  well as colour.
- Accent or gold used as **text** is `text-[var(--accent-tx)]` and `text-[var(--gold-tx)]`: the same as `--accent` and
  `--medal-gold` on the dark themes, darkened to pass AA on the light ones. `--accent` and `text-gold` are for fills,
  borders and glows. The focus ring is `--focus` (ink on the light themes).
  Emoji are for avatars and personality copy, never for UI icons.
- A new component or state is added to all four themes at once.
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
- **Emerald Gilt** (dark): from the emerald-and-gold deck. Bottle-green field, gold foil for lines, frames and the main
  action (never a large fill), ivory card faces, the deck's real art. Cinzel caps for display and labels, Instrument
  Sans for body, names and every number; a sentence that would wrap in Cinzel where other faces don't stays in the
  body face (`.face-body`). Double gold rim and faint rays on the felt, a dotted ring round the trump, a gold piano
  strip only on sheets, the winner's frame and a new badge.
- **Paint, never geometry.** Every control keeps its size in every theme; body text has a fixed
  line-height (1.22) because each face's `normal` differs. `e2e/themes.spec.ts` checks that the bidding screen's controls measure the same in every theme.
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
  nothing touches the network. Until the server stores it, a change is saved on this device
  only, and the section says so. Changes are announced in an `aria-live` region.

## Hero layout

Bidding and Playing: a mono header (round and cards; who deals and who leads), one thin ticker under it (decorative,
`aria-hidden`, stops under reduced motion), and a who row with the player's name set big and the live bid tally. The
name is sized to its column and never cut.

## Motion

Existing animations all stay. Added, each off or reduced to a fade under `prefers-reduced-motion`:

1. **Trump reveal and deal**: on the round intro the card waits face-down (350ms), lifts (120ms), turns (450ms) and
   is held (250ms) before "Trump is …"; then the backs fan out from the deck behind it and the suit settles into the
   table centre. The last round first holds "Last round" for 600ms and deals a third slower. A tap skips it. Reduced
   motion: the face for 600ms, then on.
2. **Loader**: a squash-and-stretch ball for a lazy screen still loading, invisible for the first 300ms. No
   percentage, since nothing reports real progress.
3. **Bid pop**: the badge springs in with an overshoot; the avatar squashes and stretches.
4. **Bid flight**: a copy of the tapped key flies to the bidder's seat as the badge pops.
5. **Winner reveal** (a game just finished; reopened, everything is in place): 3rd, 2nd, then 1st, each step sliding
   up inside a clipped box of its final size with its player landing on it; a 350ms beat; the name inks in from
   outline to fill over 700ms with one line on how it was won; confetti bursts from the winner's avatar as the name
   completes; then the trophy, rows and stats, and only then any badge cards. Timings are in
   `ui/podiumReveal.ts`. Confetti steps by elapsed time, so 60Hz and 120Hz screens draw the same flight. Leaving for
   Home, a chip of the winner flies to the History entry (`FiledAway.tsx`).
6. **Variable-weight score**: count-ups swell from light to heavy, then settle.
7. **Turn light**: a lit arc on the rim points at the active seat and turns to the next one.
8. **Feedback**: Results rows flash made or missed; Yerba Sun keys press in; toasts flick away.
9. **Trump reveal (Emerald Gilt)**: on top of item 1, the real back is held longer (`--reveal-hold`, 700ms), the card
   turns to its court card, gold rays bloom behind it and one glint crosses it, and the backs fan out wider.
   Reduced motion: the face with the rays, nothing else.
10. **Emerald Gilt extras**: one sheen across the foil button on press (200ms), the winner's frame settling in with the
    fill, the loader's card back turning. Each is off or static under reduced motion.
11. **Bidding to playing** (phone): one screen (`Turn.tsx`) and one table element; the who row, dock and buttons
    cross-fade round it (out 110ms, in 200ms) and the table does not move. The dealer's forbidden key dims to locked
    over 200ms and the reason fades in with it.
12. **Round summary**: a player climbing two or more places into first passes each rival in turn (about 170ms each)
    before the crown lands; "everyone but one made it" is called out.
13. **Browsing**: leaderboard rows slide to their new rank on a sort or range change; a newly earned medal turns over
    and stamps into its slot once; Wrapped's last slide holds a beat, then counts the rank; the confirmation dialog
    fades and settles (scale .96 to 1, 200ms).
14. **Platform**: a landing tile grows to fill the screen (280ms) before the game comes up; an accepted invite gets a
    short welcome once.
15. **Kaali Teeri**: when a called card is played, the bidding team's colour runs from the card to that seat and the
    role badge settles; a sweep fans the hand's cards toward the winning side before the totals count.

Rules: transform and opacity only (plus `clip-path` for the fill); entrances ease out (`cubic-bezier(.22,1,.36,1)`),
in-place changes ease in and out; nothing blocks a tap.

## Contrast

`src/theme/contrast.test.ts` reads every theme from `themes.css` and `themes/*.css` and checks its text pairs against WCAG AA. One
allowed exception: the heart on Yerba Sun's tomato table (3.9:1) is a large glyph, so 3:1 applies. Text over Sunset
Glass's wallpaper is checked by screenshot, since the wallpaper is a gradient.

## Layout and sizing

- **Breakpoints** live in `src/theme/breakpoints.ts` and become Tailwind screens: `land:`, `md:`, `wide:`, `pane:` (land or wide), `roomy:` (md or wide). Pick the layout with these; use container queries for anything inside a component.
- **Container queries** come from `@tailwindcss/container-queries` (`@sm:`, `@[26rem]:`) plus two height variants, `@h-short:` (40rem) and `@h-tiny:` (32rem), which answer to the nearest size container (the Scaffold root).
- **Type never uses an in-between size.** It moves between the existing scale steps at a breakpoint or container size (a large title `text-30` to `text-36`, the table's suit `text-34` to `text-40`); `clamp()` is for spacing and the table only.
- **Touch targets** are at least 44px (`e2e/targets.spec.ts` measures every control), hover styles apply only on devices that can hover (`future.hoverOnlyWhenSupported`), and every control has a visible focus ring.
- **The table has its own unit.** Inside a table, sizes are `calc(N * var(--s))` where `--s` is one design pixel at the table's current size, so an avatar, a bubble or a chip scales with the seats; text stays on the type scale and never shrinks below `text-13`.
- **Scrollbars** are hidden on touch and thin and themed on devices with a fine pointer (`.scroll-thin`); a hidden scrollbar on a laptop hides the fact that content scrolls.
- **Lists that open something** (Admin's People and Players, the Overview's attention items) are full-width `glass` rows, at least 64px tall, with a trailing chevron. The row is the one button, and its actions live in the sheet it opens, so a list never carries rows of equal-weight buttons.
- **A tall sheet opened from a page renders beside the `Page`, not inside it.** The page's scroll area fades its top edge (`edge-fade-top`), which would fade out the sheet's title (see `AdminPage` and `MergeCompare`).
