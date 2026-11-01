# Deviations from the design reference

Where the reference (`design-reference/`) and the real app disagree, the app keeps its functionality and takes the
reference's look. Each decision is listed here so nothing forks silently. "Reference" means the specs, `themes.css`,
`kf.css`, the `.dc.html` screens and the target screenshots.

## Kept from the app, restyled

| #   | Where                  | Reference                                                    | What shipped, and why                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Trump colour           | One accent per theme                                         | Controls use the theme's accent. The per-trump colour still tints the breathing glow behind the header and the table's suit halo on Sunset Glass; the flat themes show the trump by its suit glyph (header, table, ticker). Controls no longer change colour each round.                                                                                                           |
| 2   | Seat chip anchors      | Fixed: D at 4 o'clock, 1st at 12, bid at 8                   | The app's anchors are kept: they are chosen per seat so chips never touch a neighbour, and `e2e/table-overlap.spec.ts` proves it from 3 to 10 seats. The reference's D disc, 1st chip and bid badge looks are adopted.                                                                                                                                                             |
| 3   | Bidding table card     | Bare table                                                   | The table keeps its card, because the card carries the deal line ("Kabir deals 10 cards each · first card to Meera"), which the ticker repeats only decoratively.                                                                                                                                                                                                                  |
| 4   | Hero name              | One size (64/60/84px)                                        | The name steps down with its length and wraps rather than truncating: the project rule is that a player's name is never cut where the player is the focus (`src/test/names.guard.test.ts`).                                                                                                                                                                                        |
| 5   | Round header           | Mono header on Bidding                                       | The mono header with "deals · leads" is on Bidding and Playing (the hero screens). The other round screens keep "Round N" in the display face.                                                                                                                                                                                                                                     |
| 6   | Screen layouts         | Per-screen mockups (Main, Setup, Seat, Ready, Intro, sheets) | Home, the Menu, Setup step 1 (labelled sections) and Results (one grouped list with a points column and the dealer's D) follow the reference's layouts. Seat, Ready, Intro and the other sheets keep the app's structure with the theme's paint, type and materials: they already match the mockups' structure. The tablet and desktop UI has no mockups and keeps its own layout. |
| 7   | Player theme picker    | "Settings shows a Theme picker"                              | The app has no Settings screen, so "Theme" is a Menu row, shown only while the admin allows players to choose.                                                                                                                                                                                                                                                                     |
| 8   | Appearance Undo        | A toast with Undo                                            | The Undo toast for "Apply to everyone" is drawn by the Appearance section, not the app's one toast slot, whose Undo is wired to the game's undo. It shows for 8 seconds as specified.                                                                                                                                                                                              |
| 9   | Preview on this device | Not specified                                                | A preview lasts while the Admin page is open; a reload or leaving the page returns to the real theme. Nothing is saved.                                                                                                                                                                                                                                                            |

## Changed for performance or accessibility

| #   | Where                    | Reference                                                                 | What shipped, and why                                                                                                                                                                                                                                                                                      |
| --- | ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | Sheets on Sunset Glass   | 72% fill with `blur(30px)`                                                | 95% fill, no blur. A sheet is a full-height layer that slides; THEMES_SPEC.md forbids blurring animated full-screen layers, and the earlier perf pass removed this blur for frame cost.                                                                                                                    |
| 11  | Font preload             | Preload the cached theme's fonts in `<head>`                              | Not preloaded: on Slow 4G every early byte delays the first paint (reports/perf/REPORT.md). `font-display: swap`, and the default face is precached by the service worker, so returning visits never swap.                                                                                                 |
| 12  | Display weight on Sunset | Instrument Sans 800                                                       | 700: Instrument Sans stops at 700 (the reference's own Google Fonts link also stops there).                                                                                                                                                                                                                |
| 13  | Font subsets             | Latin                                                                     | Latin only, as specified. The previous fonts also shipped latin-ext, so a name with, say, "ł" now shows that one letter in the system face.                                                                                                                                                                |
| 14  | Loader percent           | A percent counter beside the ball                                         | No percentage: nothing reports real loading progress, and a number that counts on its own would mislead. The loader says "Loading" and only appears after 300ms.                                                                                                                                           |
| 15  | Turn light               | A conic light chasing the rim (4s loop) and a table tilt of a few degrees | The lit arc points at the player whose turn it is and turns to the next one, which says whose turn it is instead of looping. It is a rotation inside a fixed mask, so it never repaints. No tilt: seats and their tap areas are placed on the flat oval, and a tilt would move the picture away from them. |
| 16  | Header buttons           | 44px drawn inside a 48px hit area                                         | 48px drawn, 48px hit area (the app's existing size). Geometry is identical in all themes.                                                                                                                                                                                                                  |
| 17  | CSS budget               | —                                                                         | Raised from 20 to 22 KB gzip (`tools/budget.json`). The three themes' tokens and materials are 4.7 KB; the rest of the CSS shrank from 16.7 to 16.1 KB.                                                                                                                                                    |

## Not built (from the v1 "specified, not built" list)

| Item                                                                         | Why                                                                                                                                           |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Table shared between Setup, Ready and rounds (skipped by choice, 2026-11-01) | Needs View Transitions with named elements across screens that mount separate tables; left for a follow-up. Screen transitions are unchanged. |
| "Lite" switch UI                                                             | The CSS hook exists (`<html data-lite>` drops every blur); there is no visible toggle, as the spec calls it a hidden setting.                 |

## Emoji kept on purpose

UI icons are Phosphor everywhere. These emoji are content, not icons, and stay: player avatars (animals, and 🙂 for an
unknown player), achievement badge art, the streak celebration's titles and particles (🔥 "is on fire!", 🥶 "has gone ice
cold"), the suits ♠ ♦ ♣ ♥, and the ✓ ✗ result marks.

## Contrast

`src/theme/contrast.test.ts` reads every theme from `themes.css` and checks 17 pairs per theme (51 in all): all pass
WCAG AA, with one specified exception: the heart on Yerba Sun's tomato table is 3.9:1, allowed because it is a large
glyph (3:1), as THEMES_SPEC.md §7 notes. Text over Sunset Glass's wallpaper blobs is checked by screenshot, since the
blobs are gradients.

## Screens

Screens in the reference, all three themes: Home, Home with a game, Setup, Seat (partial and full), Ready (dealer),
Round intro, Bidding (hero), Bidding with the dealer's struck key, Playing (hero), Results, Menu, Rules, Scoreboard,
Edit round, Upcoming. Screens not in the reference take the same system through the shared components and materials:
Boards, History, Game, Player, Head to head, Achievements, Players, Awards, Wrapped, Activity, Account, Admin, Sign in,
Invite, Reset password, Not found, Import, the end-game confirmation and both Winner screens, and the whole tablet and
desktop UI.
