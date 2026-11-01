# Themes spec

`reference-html/themes.css` is the source of truth. This document explains it. If they disagree, `themes.css` wins; report the mismatch in `DEVIATIONS.md`.

## 1. Architecture

- `kf.css` holds **geometry and behaviour**: sizes, grids, tap targets (48px), seat positioning, transitions.
- `themes.css` holds **look**: one block per theme, scoped by `[data-theme="<id>"]`. Each block defines tokens, then material overrides for components (keys, buttons, table, sheets and so on).
- Components never hard-code a colour, font or shadow. They read variables.
- The theme attribute goes on `<html data-theme="...">` in the app (the design files put it on `.app`). Switching theme is changing that one attribute, nothing else.
- **Geometry must not change between themes.** Every control keeps its size and hit area. Themes only change paint, type, radius and shadow. This is what lets an admin switch live without layout shifts, and it keeps the 48px tap-target rule true everywhere.

## 2. Token reference (same names in every theme)

| Group | Tokens |
|---|---|
| Surfaces | `--bg --surface-1 --surface-2 --surface-3` (and `--panel` in Yerba Sun, `--paper-hi` in Editorial Paper) |
| Lines | `--hairline --hairline-2` |
| Text | `--text-1 --text-2 --text-3` |
| Accent | `--brand --brand-press --on-brand --brand-soft` |
| Table | `--felt --felt-rim` (and `--felt-hi --felt-lo` in the dark and paper themes) |
| Suits | `--suit-red --suit-black` (+ `--suit-red-ui`, `--suit-red-felt` where the heart sits on a differently coloured surface) |
| Status | `--success --success-soft --danger --danger-soft --warning` |
| Overlay | `--scrim --sheet-shadow` |
| Avatars | `--av1 … --av8` |
| Shape | `--r-sm --r-md --r-lg --r-xl` |
| Type roles | `--font-display --font-body --font-mono` |
| Hero layout | `--big-size --big-track --big-weight --big-style --tally-fg --tick-bg --tick-fg --tick-dot --tick-rule --ctr-fg` |
| Cards | `--card-bg --card-fg --card-red` |
| Glass only | `--g1 --g2 --g3` (wallpaper blobs), `--ga --gb` (accent gradient), `--glow`, `--glass --glass-b --hl --drop` |

Use `text-3` only for non-essential hints. Disabled but status-bearing controls use `text-2`.

## 3. Theme: Sunset Glass (`sunset-glass`, dark, default)

Colours: bg `#14080F`, surfaces `#1E0F1A / #2A1220 / #3A1B2E`, text `#FFF6F0 / #F0D2CE / #CCA8AC`, accent gradient `#FFB86B → #FF5E9C`, `--brand #FFB86B`, `--on-brand #2A0A14`, table `#7E2058` (lit `#C03C80`, shadow `#40103A`), rim `#FFB4A0`, heart `#FFA6B4`. Wallpaper blobs: orange `rgba(255,138,76,.50)` top-left, pink `rgba(236,72,153,.42)` right, violet `rgba(124,58,237,.48)` bottom-left.

Fonts: Instrument Sans only (400 to 800). Display weight 800, tracking `-0.03em`.

Material:
- Wallpaper is three radial gradients over `--bg` on `.app`.
- Keys, ghost buttons, inputs, groups, segmented, toast: `--glass` fill, `backdrop-filter: blur(22px) saturate(180%)`, 1px inner edge `--glass-b`, top highlight `--hl`.
- Selected key, primary button, segmented thumb, meter fill, "1st" chip: the `--ga → --gb` gradient with `--glow` underneath.
- Table is a lit disc: radial gradient, inner top highlight, soft glow, faint outer ring, gloss highlight.
- Header buttons are round glass. Primary button is a 28px pill.
- Sheets: translucent `rgba(30,12,26,.72)` with `blur(30px)`.

Required fallbacks: `@supports not (backdrop-filter: blur(1px))` use opaque `--surface-2` fills. Under `prefers-reduced-transparency` do the same. Limit blur to the controls listed, never to full-screen layers that animate. Provide a "Lite" switch (hidden setting) that drops blur on low-end devices.

## 4. Theme: Yerba Sun (`yerba-sun`, light)

This is variant **A, Butter Cream** of the Yerba Sun explorations.

Colours: bg `#FBE7B5`, surfaces `#FFF0CB / #F2D690 / #E8C97A`, panel `#FFF8E6`, ink `#2B1A0E` (also `--text-1`), `--text-2 #5B4128`, `--text-3 #6E5232`, accent `#EE6A4B` with `--on-brand #2B1A0E`, table `#EE6A4B` with ink rim, heart `#6E0F1C`, warning `#8A2A0E`, success `#1E6B45`, danger `#A3202F`. Avatars are brighter: `#FFB347 #FFF3D6 #7FD6A8 #8CC8F0 #C9A6FF #FF9BB5 #7FDAD0 #E8A56A`.

Fonts: Bricolage Grotesque 400 to 800 (display and body, display weight 800, tracking `-0.035em`), Space Mono 400/700 for the ticker, kicker and section labels.

Material: everything has a 2.5px ink outline (inset box-shadow) and a hard offset shadow (3px to 6px, no blur). Selected keys press in (`translate(2px,2px)`, smaller shadow). Primary button is lifted (`translate(-2px,-2px)`) with a 5px hard shadow. The table has a 3px ink border and 6px hard shadow. Seat names are ink pills with cream text. The ticker is a tilted (-1.6deg) accent band. Radii: 14 / 18 / 26.

## 5. Theme: Editorial Paper (`editorial-paper`, light)

Kept exactly as first designed.

Colours: bg `#F3EFE6`, surfaces `#EBE6DA / #E8E2D4 / #DAD3C2`, paper highlight `#FBF8F0`, ink `#151412`, `--text-2 #46433C`, `--text-3 #615D54`, accent tomato `#FF4B1F` with `--on-brand #151412`, table `#16352A` (lit `#1F4A39`, shade `#143127`) with ink rim, header heart `#D7261E`, heart on the table `#FF7A66`, warning `#B3380E`.

Fonts: Instrument Serif (display, italic for the big name and tally, numerals on keys), Instrument Sans (body), DM Mono 400/500 (labels, buttons, ticker, seat names, uppercase with tracking).

Material: radius 0 to 6px, hairline ink outlines (1px), no shadows. The table has a double-rule rim (`0 0 0 6px bg, 0 0 0 7.5px ink`). Primary button is solid ink with a tomato arrow, mono uppercase, `space-between`. Selected key is tomato. Seat names are paper labels with an ink outline. The ticker is an ink band. Buttons use `letter-spacing .14em`, reduced to `.06em` for small ones so labels never wrap.

## 6. Hero layout (Bidding, and Playing)

`BiddingHero.dc.html` is the target for the Bidding screen in every theme. Compared with the base `Bidding.dc.html` it adds three pieces, all CSS, no logic:

1. **Ticker** under the header: `.tick > .tk > span*2` (the content is duplicated so a `-50%` translate loops seamlessly). It shows live status ("Round 08 • 10 cards • Kabir deals • Meera leads • Bids 5/10"). Pauses under reduced motion; hide it when the tab is not visible. Keep it one line, 30px tall, `aria-hidden="true"` (the same information is in the header).
2. **Who row** above the bid keys: avatar, kicker ("Dealer · bids last"), the big player name (`.big`), and a live tally (`.tally`, "5/10").
3. A slimmer header (round and subtitle in the mono role).

Apply the same who-row and tally to the Playing screen. Other screens use the base layout plus the theme paint (see the screenshots).

## 7. Contrast (computed, WCAG)

Computed for the token pairs (not for text over the gradient wallpaper):

| Pair | Sunset Glass | Yerba Sun | Editorial Paper |
|---|---|---|---|
| `text-1` on `bg` | 18.4 | 13.7 | 16.0 |
| `text-2` on `bg` or surface | 12.3 | 7.7 | 8.6 |
| `text-3` on `bg` | 9.1 | 5.9 | 5.7 |
| `text-3` on `surface-2` | 8.1 | 5.1 | 5.1 |
| `on-brand` on accent | 10.7 (gold end), 6.4 (pink end) | 5.4 | 5.5 |
| table-centre text on the table | white at 86% | 5.4 | 10.3 |
| heart on the table | 5.1 | 3.9 (large glyph only) | 5.2 |

Verify again after implementation. On glass, text sits over a gradient, so test at the brightest wallpaper blob and fix with a darker scrim behind long text if needed. Report anything below AA in `DEVIATIONS.md`.

## 8. Fonts: loading rules

- Self-host Latin subsets, `font-display: swap`.
- Load only the **active theme's** fonts. Preload them for the cached theme in the `<head>` bootstrap. Fetch the others lazily when the admin previews or switches.
- Sunset Glass: Instrument Sans variable. Yerba Sun: Bricolage Grotesque variable, Space Mono 400/700. Editorial Paper: Instrument Serif regular and italic, Instrument Sans variable, DM Mono 400/500.
- Fraunces is no longer used. Instrument Sans provides `tnum` for aligned numerals.

## 9. What changed from the v1 direction

The v1 package forbade gradients, glows, backdrop blur, hard shadows and bold accents. Those rules are superseded **per theme**: Sunset Glass may use gradient, glow and blur; Yerba Sun may use hard shadows and outlines; Editorial Paper stays flat. Still forbidden everywhere: emoji as UI icons (avatars excepted), hard-coded colours outside `themes.css`, infinite animations other than the active-seat ring and the ticker, animating `box-shadow` or `filter`.
