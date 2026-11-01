> **Superseded in part.** This is the v1 spec ("card room at night"). Its structure, component list, per-screen notes and motion list still apply. Its colour direction, token values and "forbidden" list (no gradients, glows, blur) are replaced by `THEMES_SPEC.md`. When this file and `themes.css` disagree, `themes.css` wins.

# Kachuful redesign: design spec

Direction: "Card room at night". Dark only. Source of truth for values is `reference-html/kf.css` (`:root` block). This file explains the system and how each screen uses it.

## Tokens

Colour: `--bg #0B1412`, `--surface-1 #111D1A`, `--surface-2 #172622`, `--surface-3 #1F322C`, `--hairline rgba(232,240,236,.08)`, `--hairline-2 rgba(232,240,236,.14)`, `--felt #123A2C`, `--felt-rim #B98B3A`, `--text-1 #EEF1EC`, `--text-2 #A7B4AE`, `--text-3 #6B7B75`, `--brand #D9A441` (the only accent), `--brand-press #C4902F`, `--on-brand #1A1306`, `--brand-soft rgba(217,164,65,.14)`, `--suit-red #E5484D`, `--suit-black #EDE6D6`, `--success #3DD68C`, `--danger #F2555A`, `--warning #F5A524` (blocking states only). Avatar palette (seat order): `#E8A87C #E3C766 #8FC9A3 #7FB3D5 #B49FDC #E39AB3 #9BC4C0 #D4A373`.

Type: Fraunces (display, titles, big numerals; SOFT 50, WONK 0) and Instrument Sans (UI, body, aligned numerals with `tnum`). Scale: display 34/40, title 24/30, heading 18/24, body 16/24, label 15/20, small 14/20, caption 12/16 uppercase +0.06em, score-xl 40/44, score-md 22/28.

Shape: spacing 4, 8, 12, 16, 20, 24, 32, 40, 56; gutter 20. Radius sm 8, md 12, lg 16, xl 24 (sheets only). No drop shadows in-page; layers separate by surface step plus a 1px inset hairline. Sheets get one shadow: `0 -8px 32px rgba(0,0,0,.4)`.

Icons: Phosphor, regular weight, 20/24px. Suits are custom SVG symbols (see any `.dc.html`, `s-spade`, `s-heart`, `s-diamond`, `s-club`). Avatars stay animal emoji on palette circles.

Contrast (measured): text-1 and text-2 pass AA on every surface (min 5.9:1). `text-3` is 4.2:1 on bg and 3.5:1 on surface-2, so it is for hints and seat numbers only. Recommended: lift to about `#7C8C86` (5.3:1 on bg). Danger on danger-soft is 4.40:1, borderline.

## Components (all in kf.css)

`.btn` (p primary, s secondary, g ghost, d destructive, `.dis` disabled, `.dis.info` for status text), `.ibtn`, `.seg` (sliding thumb via `--i` and `--n`), `.key` (`.on`, `.no` with diagonal strike), `.chip`, `.nchip` (remembered names), `.inp`, `.tog`, `.lr` list row, `.grp` grouped container, `.dl` definition list, `.m4` progress bar, `.av` avatar with `.live` ring, `.tbl/.felt/.seat` oval table (seats placed with CSS `cos()`/`sin()` from `--a`, `--rx`, `--ry`), `.dbtn` dealer disc, `.first` 1st chip, `.bid` bid badge, `.card` playing card 5:7, `.toast`, `.scrim/.sheet`, `.mk` made/missed control, `.stp` stepper, `.mx` score matrix with sticky first column.

## Screens in the reference (`reference-html/`)

| File | Screen | Notes |
|---|---|---|
| Main | Home | Fanned-card mark, brass wordmark, grouped nav list, demo row, "New game" in bottom bar. |
| HomeResume | Home, game in progress | Resume card above the list. |
| Setup | Decks and players | Sections for decks, players (5 keys), direction. Last-used count preselected. Preview seats outside the rim. |
| SeatPartial | Seat the table | Active ring on the next seat, remembered-name chips, brass add button. |
| SeatFull | Everyone's seated | Confirmation row plus "Edit seats". |
| Ready | Ready to deal | D and 1st markers, definition list, shuffle dealer, game length. |
| Intro | Round intro | Ivory 5:7 card, card backs at seats. |
| Bidding / BiddingLocked | Bidding | Header, table, bidder block, status, 6-column keypad, dealer lock. |
| Playing | Playing | Enlarged table, suit glyph centre, summary line, undo toast. |
| Results | Who made their bid | Rows with delta, soft success/danger ✓/✕, exact-tricks toggle. |
| Menu, Rules, Scoreboard, EditRound, Upcoming | Sheets | Grouped menu, scannable rules, standings plus matrix, edit round, upcoming list. |
| System | Tokens and components | Swatches, type scale, component states. |

## Motion: built vs specified

Easing: `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-in-out cubic-bezier(.65,0,.35,1)`. Durations: press 120ms, small UI 180–220ms, sheets 320ms, screens 280ms. Transform and opacity only. Keep all of the existing app's animations and wow moments as well.

Already in the reference CSS (port these):
- Press: scale .97–.98 with a background step on buttons, keys, icon buttons, chips (120ms).
- Segmented thumb slides (translateX, 220ms).
- Toggle knob slides (180ms).
- Active ring: 2px brass, 3px gap, 1.6s opacity pulse .6 to 1 (the only infinite animation).
- Progress bar fill uses scaleX (400ms).
- `prefers-reduced-motion`: ring pulse off, transitions shortened.

Specified, not built (implement these):
- Round intro: card flip (rotateY 450ms, spring), then cards fly to seats, staggered 40ms per seat.
- Seat the table: newly seated avatar flies from the input to its seat (shared element, 320ms).
- Bid commit: chosen key's badge flies to the bidder's seat (FLIP); active ring hands off around the table in dealing direction.
- Playing: table scales and translates up (animated, no re-layout).
- Score deltas count up (400ms, tabular numerals) after confirming a round.
- Sheets: drag to dismiss with velocity; scrim fades to rgba(0,0,0,.5).
- Table element persists between setup, ready and round screens (View Transitions API with fallback).
- Toast: auto-dismiss 4s, swipe to dismiss.
- Haptics: `navigator.vibrate(8)` on bid commit and confirm (feature-detect).
- Skeleton shimmer for list loading (opacity only).

## Deviations from the original brief (already applied in the reference)

- Segmented controls 48px tall (brief said 44) to meet the 48px target rule; every control has a 48px hit area via pseudo-elements.
- Disabled CTAs that carry status ("2 of 5 bids in") use `text-2`, not `text-3`.
- Wordmark 44px (display scale is 34px).
- Menu rows 48px (not 56); Quit to home and End game sit side by side.
- Playing centre label split into two lines to avoid seat-label overlap.
- Stepper visible buttons are 44px (as the brief said) with a 48px hit area.
- The 412px audit widened the 360px mocks; no separate 412 design exists.

## Not designed yet (apply the same system)

Boards, History, Game page, Player page, Head-to-head, Achievements, Players, Awards, Wrapped, Activity, Account, Admin, Sign in, Invite, Reset password, Not found, winner and end-game screens. Empty states: one Phosphor icon (32px, `text-3`), one-line title, one-line hint, one primary action. Loading: skeleton rows. Offline or error: inline banner under the header with a retry action.
