# Responsive plan: every device, every orientation, no clipped text

Written 2026-10-30, on `feat/port` at `fb2401d`. **Status: approved 2026-10-30.** The user allowed new dependencies where they improve the app (see D5).

This file is both the spec and the build plan. Read §1–§3 once. §4 and §5 are the design. §6 is the build order, with a check for each step. §7 is how the work is proven.

---

## 1. Decisions (made; do not re-ask)

| #   | Question                                                   | Decision                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Marketing hero, device frame, tilt                         | **Not built.** They exist only in the read-only `prototype/`. The real app has no frame, only a 430px column (`App.tsx:15`). That column goes away and the app fills the viewport.                                                                               |
| D2  | Tablet portrait (768×1024): side by side or one column?    | **One centred column, max width 40rem, with a bigger table.** Two panes at 768px wide leave about 500px of empty height. Two panes start at tablet **landscape**.                                                                                                |
| D3  | Fluid type (`clamp()`) vs. "no off-scale font sizes"       | **Type moves between existing scale steps at breakpoints and container sizes; it never uses in-between sizes.** `clamp()` is used only for spacing, the table, avatars and chips.                                                                                |
| D4  | Type scale in px or rem                                    | **rem.** Same values at 16px (`text-16` = 1rem), so nothing changes visually by default. Browser and OS text-size settings start to work. Touch targets use `max(44px, 2.75rem)`, so they never go under 44px.                                                   |
| D5  | Container queries in Tailwind 3                            | **`@tailwindcss/container-queries` (official, dev-only, build time) for width variants (`@sm`, `@md`, `@lg`, `@[…]`).** A few lines in `tailwind.config.ts` add the height variants (`@short`, `@tall`) that the plugin lacks.                                   |
| D6  | Sheet animation needs to know phone sheet vs. tablet modal | **One `useMediaQuery` hook, used only to pick the enter and exit motion.** It reads the same query strings as Tailwind, exported from one module. All layout stays pure CSS. This is the only JS check in the work.                                              |
| D7  | Results on wide screens                                    | **The table with made and missed marks sits in the side pane.** This shows data that already exists (`Table` already takes `res`). Hidden on phones.                                                                                                             |
| D8  | Screenshots                                                | **JPEG contact sheets committed to `reports/responsive/`**, before and after, like `reports/phase2-audit/`. Raw PNGs stay ignored (`.gitignore` already has `reports/**/*.png`).                                                                                 |
| D9  | Keyboard use on desktop                                    | **Arrow keys move between options** (bid pills, player-count pills, segmented controls) with a roving tab stop. Enter or Space picks. Tab goes to the next group, not through every pill. Esc closes any sheet, modal or the deal animation. No other shortcuts. |
| D10 | Scrollbars                                                 | **Thin themed scrollbars on mouse and trackpad devices (`pointer: fine`).** Hidden on touch devices, as today. A hidden scrollbar on a laptop hides the fact that content scrolls.                                                                               |
| D11 | Browsers too old for container queries (iOS < 16)          | **They get today's fixed-size table, through `@supports not (width: 1cqw)`.** The layout still works; only the table stops scaling.                                                                                                                              |
| D12 | `Phone.tsx` is a misleading name now                       | **Renamed to `AppShell.tsx` in its own `refactor` commit**, with no other change.                                                                                                                                                                                |
| D13 | Branch                                                     | **`feat/responsive`, from `feat/port`.** Never pushed unless asked.                                                                                                                                                                                              |

Unchanged: game rules, scoring, saved keys and shapes, token values, springs and easing, CI workflows. New dependencies only where they clearly improve the app (user approval, 2026-10-30). Anything that would touch one of these means **stop and ask**.

---

## 2. What the app does today

| ID  | Finding                                                                                                                                                                                                                                      | Where                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A1  | The whole app is capped at 430px wide. Laptops and tablets show a phone-width strip.                                                                                                                                                         | `App.tsx:15`                                                                                    |
| A2  | Scaffold puts the header and bar on top of one scrolling body, and pads the body by a JS-measured bar height. Nothing can "take the leftover space", so every table has a fixed `h-[300px]`.                                                 | `Scaffold.tsx:36-61,76`, `Play.tsx:37`, `Step1/2/3`                                             |
| A3  | Table sizes are fixed (full 340×300, mini 320×170) and seats are placed in px. The RoundStart deal cards, the Step 3 spin token and the drag ghost all depend on those px coordinates.                                                       | `tableGeometry.ts:5-8`, `Table.tsx:127,215`, `RoundStart.tsx:34,90`, `Step3.tsx:19`             |
| A4  | Only the top and bottom safe areas are handled. A phone in landscape puts the notch on the left or right.                                                                                                                                    | `index.css:52-53`                                                                               |
| A5  | The type scale is in px, so browser text-size settings do nothing.                                                                                                                                                                           | `tailwind.config.ts:19`                                                                         |
| A6  | Names are cut with `truncate` where the player is the focus: the bidder card, Results, Summary, the Winner ranking and the Edit sheet. Seat labels, the podium and the Scoreboard headers use `trunc` (8 chars) with no full name available. | `Bidding.tsx:199`, `Results.tsx:77`, `Summary.tsx:125`, `Winner.tsx:83,152`, `BoardBody.tsx:34` |
| A7  | The Bidding dock (meter, reason, 2 rows of pills, button) lives in the bar. With 10 cards it is about 290px tall, which leaves too little room for the table and bidder card at 360×640. The bidder card has a fixed height of 104px.        | `Bidding.tsx:74-157,181`                                                                        |
| A8  | Setup 3 stacks the table, dealer line, Random row and a game-length accordion. Setup 2 stacks the table, prompt, input and name chips. Both overflow small phones.                                                                           | `Step2.tsx`, `Step3.tsx`                                                                        |
| A9  | Nothing keeps the name input above the on-screen keyboard.                                                                                                                                                                                   | `index.html:5`                                                                                  |
| A10 | Sheets are bottom sheets at every width. The Scoreboard has fixed column widths and no way to use extra space.                                                                                                                               | `Sheet.tsx:50`, `BoardBody.tsx:20-26`                                                           |
| A11 | Confetti sizes its canvas once, at mount. Rotating the device during it leaves a canvas of the wrong size.                                                                                                                                   | `Confetti.tsx:16-21`                                                                            |
| A12 | There is no `verify` script, and Playwright runs only one phone profile (Pixel 5, 390×844).                                                                                                                                                  | `package.json`, `playwright.config.ts`                                                          |

---

## 3. Targets and standards

### Devices

| Class           | Viewports tested                            | Layout                                |
| --------------- | ------------------------------------------- | ------------------------------------- |
| Phone portrait  | 320×568, 360×640, 375×667, 390×844, 430×932 | stacked (today's layout, made to fit) |
| Phone landscape | 568×320, 740×360, 844×390, 932×430          | two panes, compact                    |
| Tablet portrait | 768×1024, 820×1180                          | one centred column, bigger table      |
| Tablet / laptop | 1024×768, 1180×820, 1280×800                | two panes, centred                    |
| Desktop         | 1440×900, 1920×1080, 2560×1440              | two panes, max width 72rem            |

### Standards (every screen, every size)

1. **One screen.** On Home, Setup 1–3, Bidding, Play, Results (up to 5 players) and Summary (up to 5 players), the content and the primary action fit without scrolling at 360×640 and up. At 320×568 the content area may scroll, but the primary action stays visible.
2. **Allowed to scroll, inside the content area only:** Rules, Scoreboard, Upcoming, Edit, the Winner ranking and highlights, the Results and Summary lists with 6–7 players, and the recent-names row in Setup 2. The header and the action bar never scroll.
3. **No clipped text.** No `truncate` on labels, instructions, warnings, buttons or headings; they wrap with `text-wrap: balance`. Names may be shortened only on seat labels, Scoreboard headers and the podium, and each of those also has the full name as an accessible name and a hover tooltip. Wherever the player is the focus, the name is shown in full and wraps.
4. **No horizontal page scroll**, ever.
5. **Primary action always visible**, including with the keyboard open and at 200% text.
6. **Touch targets** of at least 44×44px. **Hover states** only on devices that can hover. **Visible focus rings** everywhere.
7. **Motion:** animate only transform and opacity, with the existing springs and easing. Every new animation has a reduced-motion version (opacity only, or none).
8. **Rotation and resizing** never reload, remount a screen or lose state. The Summary count-up and the deal animation keep running.

---

## 4. Foundations

### 4.1 Breakpoints (one module, used by Tailwind and the single hook)

| Name   | Media query                                                               | Use                               |
| ------ | ------------------------------------------------------------------------- | --------------------------------- |
| base   | (none)                                                                    | phone portrait                    |
| `land` | `(orientation: landscape) and (max-height: 500px)`                        | phone landscape and short windows |
| `md`   | `(min-width: 768px) and (orientation: portrait)`                          | tablet portrait: one wider column |
| `wide` | `(min-width: 768px) and (orientation: landscape) and (min-height: 501px)` | tablet landscape, laptop, desktop |

Media queries choose the page layout. Container queries handle everything inside a component: the table, the pill grid, compact cards, the Scoreboard. Tailwind's `future.hoverOnlyWhenSupported` is turned on, so `hover:` only applies on devices that can hover.

### 4.2 Scaffold becomes a grid with named areas, one DOM tree

Scaffold keeps its props and gains areas: `head` (nav bar), `title`, `main`, `aside`, `bar`. Each screen puts its parts into areas and marks which one **fits** (takes the leftover height and never scrolls) and which one **scrolls**.

```
phone portrait          land / wide
┌──────────────┐        ┌───────────────────────────────┐
│ head         │        │ head                          │
│ title        │        ├──────────────────┬────────────┤
│ main (fits)  │        │ main             │ title      │
│ aside        │        │ (table, fits)    │ aside      │
│ bar          │        │                  │ (scrolls)  │
└──────────────┘        │                  │ bar        │
                        └──────────────────┴────────────┘
```

- **Breakpoints only rearrange areas** (`grid-template-areas`). The same elements stay mounted. This is what lets rotation keep state and running animations.
- The bar is part of the layout flow, so the content ends above it and nothing is hidden behind it. The ResizeObserver stays only to anchor the toast. It now also writes the bar's left edge and width, so in two-pane layouts the toast sits over the controls pane.
- The Scaffold root is a size container (`container-name: scaffold`), so screens can react to their real height (`@short:`) instead of the viewport height.
- **Large title:** shown in portrait. In `land` it is hidden and its text moves to a smaller heading at the top of the controls pane. Both headings stay mounted and CSS shows one at a time; the hidden one is `display: none`, so screen readers hear one heading.
- Content width: `wide` centres at max 72rem with `clamp(1rem, 3vw, 2.5rem)` side gutters plus the safe areas. Panes are roughly `minmax(0, 1.15fr) minmax(20rem, 26rem)`. `md` centres one column at max 40rem. The background (felt gradient, grain, ambient glow) always spans the full viewport.
- The `land` header is 48px (`h-12`); the targets inside it stay 44px.

### 4.3 Table: same maths, sized to fit its space

- `TD`, `posAt`, `angOf` and `seatPos` **do not change**. They become a design coordinate space.
- The table is an aspect-ratio box (`W / H`) inside a size container that fits both ways: `width: min(100cqw, 100cqh * W / H)`. It sits in a `flex-1 min-h-0` slot, so it takes whatever height is left.
- Seats, the felt and the arcs are placed in percentages of W and H. The arcs SVG uses a `viewBox`.
- Avatars, bubbles, the dealer chip, "first" tags and made/missed marks are sized from `--u = 100cqw / W`, with a floor and a ceiling. A tappable seat keeps its 44px hit area at any scale.
- Seat labels: at least `text-13`, stepping up on large tables. They keep `trunc` and gain the full name as the accessible name and a tooltip.
- **Moving elements** (deal cards, spin token, the arrow) are positioned by translating a full-size wrapper by `x/W·100%` and `y/H·100%`. That is transform-only and needs no measuring.
- **7 players:** label placement (not seat positions) is adjusted where needed, for example labels on the top seats sit above the avatar. The existing overlap test is extended to cover label vs. label and label vs. bubble at every viewport.
- The minimum scale is 0.72 of the design size, or 0.8 with seven players, whose 13px labels need the room (found by the overlap test, step 12). Below that, the area scrolls instead of shrinking further.
- In `wide`, the Bidding, Play and Summary tables use the `full` geometry (the mini table looks flat at large sizes). Phones keep today's choice.

### 4.4 Sheets and modals

| Sheet                             | Phone             | `md` and `wide`                               |
| --------------------------------- | ----------------- | --------------------------------------------- |
| Menu, Seat, Rename, Avatar, Share | bottom sheet      | centred modal, max width 28rem                |
| Scoreboard                        | full-height sheet | centred modal, `min(92vw, 64rem)` × max 86dvh |
| Rules, Upcoming, Edit             | full-height sheet | right-hand side panel, 28rem, full height     |
| Confirm, Repair save              | centred modal     | unchanged, max width 22rem                    |

- **Motion:** sheets slide up as today. Modals use scale 0.96 + opacity with `SPRING_POP`. Panels slide in from the right with the sheet spring. Under reduced motion, all of them use opacity only.
- Drag-to-dismiss only applies to the bottom sheet. Clicking the backdrop, Esc and the close button work everywhere. Focus trap and focus return (`useDialog`) are unchanged.
- **The Scoreboard** fills its width: player columns share the space evenly, headers show full names once a column is wide enough (a container query switches from the short name to the full one), and the round column stays sticky. All 7 players fit without sideways scrolling from 768px up.
- **Rules** text is capped at 65 characters per line.

### 4.5 Type, spacing and large text

- The type scale changes from px to rem (D4). Layout sizes written in px inside components change to rem as each component is touched.
- Steps at breakpoints, for example: large title `text-30` → `text-36` (`wide`); bidder name `text-26` → `text-32` (`wide`); the `land` heading `text-22`.
- Gaps between sections use `clamp()` against the Scaffold height, so they shrink first. The order is: gaps shrink, then the table scales down to its minimum, then compact versions appear (bidder card, Next-up card), then the area scrolls.
- **At 200% text:** scrolling is fine, but no clipped text, and the primary action stays visible. In `land`, the controls pane scrolls and its button stays pinned at the bottom of that pane.

### 4.6 Safe areas, viewport units, keyboard

- Add `--sal` and `--sar` next to `--sat` and `--sab`, and apply them to the header, panes, bar and sheets.
- `100dvh` for the app height, `svh` for anything that must never jump (minimum table sizes).
- Viewport meta: add `interactive-widget=resizes-content`. Chrome on Android then shrinks the layout when the keyboard opens.
- **iOS:** a `useVisualViewport` hook sets the app root's height to `visualViewport.height` while an input is focused, and removes it on blur. This is written once per keyboard change, not every frame.
- **Setup 2 with the keyboard open:** the table shrinks to its minimum, the large title hides (`@short`), and the input, Add and the prompt stay visible. The bar (Next is disabled while seats are empty) collapses while the keyboard is up. **Rename** gets the same treatment inside its sheet.

### 4.7 Overlays

- **Toast:** always just above the bar. In two-pane layouts it is centred over the controls pane, so it never covers the table or the primary action. It hides itself after 4s, as today.
- **Banner:** sits under the header across the `main` pane only, never over the bar or the bidder card. It hides after 1.6s, as today.
- **Update prompt:** at the top, inside the safe area, within the content width.
- **Confetti:** resizes its canvas when the viewport changes, starts from the centre of the podium, and scales its particle count with the area (150 to 300). It still never takes pointer events and is skipped under reduced motion.

---

## 5. Screen by screen

Each screen lists portrait / `land` / `md` / `wide`. "Fits" means it never scrolls at 360×640 and up.

### Home

- **Portrait:** as today. The suit orbit radius scales with its container instead of the fixed 138/82px.
- **land:** the orbit and wordmark on the left; the resume or demo card, "How to play" and New Game on the right.
- **md:** one column with a bigger orbit and wordmark (`text-96`).
- **wide:** the orbit and wordmark on the left, centred vertically; the card, link and New Game on the right, max width 26rem. New Game is in the bar area of the right pane, never stretched across the screen.

### Setup 1: how many players

- **Portrait:** count pills, then the table (fits, takes the leftover height), then direction and the info line. The "Use last group" chip wraps; it is no longer clipped.
- **land / wide:** the table on the left; on the right, the heading, the last-group chip, count pills, direction, info and Next.
- Count pills work with arrow keys (D9).

### Setup 2: who's at the table

- **Portrait:** the table (fits), the prompt (wraps, `text-21` → `text-19` when `@short`), input + Add, the error line and recent names. Recent names become **one row that scrolls sideways**, with a fade at the edge, so it never pushes the input off screen.
- **Keyboard open:** see §4.6.
- **land / wide:** the table on the left; on the right, the prompt, input, chips and Next. The keyboard covers the bottom of the screen, so the input sits at the **top** of the right pane in `land`.

### Setup 3: dealer and length

- **Portrait:** the table (fits). Then one compact card with the dealer line, Random and the drag hint. Then **game length as a segmented row that is always visible** (no accordion), labelled "Game length". Deal is in the bar.
- **land / wide:** the table on the left (drag and spin work with a mouse, because they use pointer events); on the right, the heading, dealer card, Random, game length and Deal.
- The test helper that opens the old accordion (`e2e/helpers.ts:24`) is updated in the same commit.

### Bidding

- **Portrait:** `main` = the table card (fits) with the deal line under it. `aside` = the bidder card: content height instead of fixed, full name wrapping, with a compact version when `@short` (48px avatar, `text-22` name). `bar` = meter, reason, pills, Start. The pill grid is always at most 2 rows (`ceil((cards+1)/2)` columns, max 6), and pills keep a 44px minimum.
- **Bidder card slide:** the old and new card share one grid cell instead of `absolute inset-0` in a fixed box, so the card's height follows its content and the slide (x ±44, opacity, scale) stays transform-only.
- **land:** the table on the left, full height. On the right: the bidder card (compact), meter, reason, pills (6 columns), Start pinned at the bottom.
- **wide:** the table on the left (`full` geometry); on the right, the bidder card, meter, reason, pills in **one row when the pane is wide enough** (`@md`, 11 pills at 44px+), and Start.
- Pills: arrow keys move between them, Enter or Space bids. The locked pill still announces why it is locked.

### Play

- **Portrait:** the table (fits, `full` geometry), the summary line, "who leads". Edit and Enter results in the bar.
- **land / wide:** the table on the left; on the right, the summary, who leads, Edit bids and Enter results.

### Results

- **Portrait:** the exact-tricks switch, then the list in `main` (scrolls only with 6–7 players). Rows are 56px tall (avatar 40px, controls stay 44px) and names wrap. The validation note and Confirm stay in the fixed bar.
- **land:** the list on the left (scrolls); on the right, the switch, the running tricks total, the note and Confirm.
- **wide:** the list on the left; on the right, the table with made/missed marks (D7), the switch, the note and Confirm.

### Summary

- **Portrait:** the leaderboard in `main` (scrolls with 6–7 players), the Next-up card in `aside`. When `@short`, Next-up **shrinks to one line** ("Round 5 · 6 cards ♥ · Riya deals, Kabir first") and the mini table hides. End game and Next round are in the bar.
- **land / wide:** the leaderboard on the left; on the right, the full Next-up card with the table, and the buttons.
- The count-up, rank reordering, crown, shine and sparks keep their timing. Because nothing remounts on rotation, the animation stages continue.

### Winner

- **Portrait:** trophy, podium, ranking, highlights (2 columns), Home. The whole content area scrolls. Rank rows show full names. Podium names stay short, with the full name as the accessible name and a tooltip.
- **land:** the podium on the left (fits); the ranking and highlights on the right (scroll). Share and Rematch in the right pane's bar.
- **md:** one column, highlights in 3 columns.
- **wide:** the podium on the left and the full ranking on the right, side by side; the highlights below them in a grid (`repeat(auto-fit, minmax(14rem, 1fr))`, which gives 3–5 columns). The page scrolls as one.

### Round Start (deal animation)

- **Portrait:** the title, card flip, trump line, the table (fits) and the deal text. The card flip height steps down when `@short`.
- **land / wide:** the title, card flip, trump line and deal text on the left; the table on the right. The deal cards fly using the % wrapper (§4.3).
- The skip hint reads "Tap to skip" on touch devices and "Click or press Space to skip" on hover devices. Both strings go in `src/strings`, and both elements are mounted with CSS showing one.

### Sheets

See §4.4. The Edit sheet's names wrap. Upcoming in the side panel lists more rounds before scrolling.

---

## 6. Build order (small commits, one concern each)

Each step ends with `npm run verify` green and the listed check passing. Commit messages are Conventional Commits with no co-author trailer.

| #     | Commit                                                                                                                 | Check before moving on                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | `chore: add verify script` (format:check, lint, typecheck, test)                                                       | `npm run verify` passes                                                                                    |
| 2     | `test(e2e): responsive audit harness in report mode, desktop project`                                                  | Runs the whole matrix and writes metrics + PNGs without failing                                            |
| 3     | `docs(reports): before contact sheets`                                                                                 | `reports/responsive/before-*.jpg` committed                                                                |
| 4     | `refactor: rename Phone to AppShell`                                                                                   | No behaviour change, all tests green                                                                       |
| 5     | `feat(theme): breakpoints module, container-query plugin, hover only on hover devices`                                 | Unit test: the breakpoint strings used by Tailwind and the hook are the same                               |
| 6     | `refactor(theme): type scale in rem`                                                                                   | Before/after screenshots at 390×844 identical                                                              |
| 7     | `feat(shell): full-bleed app, side safe areas, dvh, interactive-widget`                                                | No 430px column; the layout test with injected insets passes, including left and right                     |
| 8     | `refactor(scaffold): grid areas with fit and scroll regions`                                                           | Phone portrait unchanged except the bar is now in the flow; existing e2e green                             |
| 9     | `feat(scaffold): land, md and wide area layouts`                                                                       | Harness: no horizontal overflow on any screen at any viewport                                              |
| 10    | `feat(table): sized from its container, positions in percent`                                                          | Seat-maths unit tests unchanged and green; the overlap test passes at all viewports                        |
| 11    | `feat(table): deal cards and spin token move with a % wrapper`                                                         | RoundStart and Step 3 spin land on the right seat at 3 sizes (e2e position check)                          |
| 12    | `fix(table): 7-player labels and bubbles never overlap`                                                                | Extended overlap test passes at 3/5/7 players, every viewport                                              |
| 13    | `feat(sheet): modal and side-panel presentation from tablet width`                                                     | Esc, backdrop, focus trap and focus return pass in both projects                                           |
| 14    | `feat(board): Scoreboard uses the full width`                                                                          | 7 players with no sideways scroll at 768px+                                                                |
| 15    | `feat(ui): arrow-key navigation in pill groups and segmented controls`                                                 | Keyboard e2e on the desktop project                                                                        |
| 16    | `feat(ui): thin scrollbars on fine pointers`                                                                           | Screenshot check                                                                                           |
| 17–26 | One `feat(<screen>)` commit each: Home, Setup 1, Setup 2, Setup 3, Bidding, Play, Results, Summary, Winner, RoundStart | Harness passes for that screen at every viewport with 3/5/7 players                                        |
| 27    | `fix(ui): names wrap where the player is the focus, short names keep a full label`                                     | No `truncate` left on names, labels or headings (lint-style test grep)                                     |
| 28    | `feat(shell): keep inputs above the on-screen keyboard`                                                                | Keyboard simulation e2e (§7)                                                                               |
| 29    | `fix(ui): toast and banner placement in two-pane layouts`                                                              | Overlay e2e (§7)                                                                                           |
| 30    | `fix(confetti): resize with the viewport`                                                                              | Resizing mid-confetti: canvas matches the viewport                                                         |
| 31    | `test(e2e): responsive harness fails on violations; CI subset`                                                         | All green                                                                                                  |
| 32    | `docs(reports): after contact sheets` and `docs: architecture and design-system updates`                               | Before/after sheets committed; ARCHITECTURE (layout, dialogs) and DESIGN-SYSTEM (breakpoints, rem) updated |

The screen order in rows 17–26 follows a game: if the work stops halfway, the screens a player reaches first are already done.

---

## 7. Verification

### 7.1 Playwright projects

- **`phone`:** today's Pixel 5 profile (touch, coarse pointer). All existing specs stay here.
- **`desktop`:** Desktop Chrome (no touch, fine pointer, hover). Used for keyboard, hover and modal-presentation specs.

### 7.2 `e2e/responsive.spec.ts`

For every viewport in §3 × {3, 5, 7} players, with names up to the 14-character limit (for example "Bartholomew Jr", "Maximilian Ray"), it plays a game through every screen: Home, Setup 1–3, RoundStart, Bidding, Play, Results, Summary, Winner, and every sheet. On each screen it checks:

1. The primary action is fully inside the viewport and not covered (`elementFromPoint` at its centre hits it).
2. `documentElement.scrollWidth <= innerWidth` (no sideways page scroll).
3. No text element has `scrollWidth > clientWidth + 1` or `scrollHeight > clientHeight + 1` while its overflow is hidden (no clipped text). Short names are exempt only on seat labels, Scoreboard headers and the podium.
4. No overlap between seat labels and bid bubbles, made/missed marks or the dealer chip.
5. **One-screen rule:** at portrait ≥ 360×640 on the screens in §3 standard 1, every scroll region has `scrollHeight <= clientHeight`. A screen in the allowed list records why it scrolls.
6. It saves a PNG to `test-results/responsive/<viewport>/<players>/<screen>.png`.

**CI runs a subset** (360×640, 844×390, 1024×768, 1920×1080 with 7 players) so CI stays fast. `RESPONSIVE_FULL=1 npm run test:e2e` runs the whole matrix. `ci.yml` is not changed.

### 7.3 Other specs

- **Rotation:** mid-bidding, swap 390×844 ↔ 844×390 twice. The bids, the current bidder and the selected pill must be unchanged, and a node marker set before the swap must still be there afterwards (proves nothing remounted). **Mid-Summary**, with reduced motion off: swap 1.2s in; the count-up must finish on the right totals and the leaderboard order must match the standings. **Mid-RoundStart:** swap and check the deal still completes.
- **Large text:** root font size 130% and 200% at 360×640, 390×844 and 844×390, on every screen. Checks 1–3 must pass; scrolling is allowed.
- **Keyboard simulation:** Setup 2 and Rename with the input focused and the viewport cut to 360×380 (Android-style resize). The input and Add/Save stay visible.
- **Overlays:** at every viewport, the toast's box never overlaps the primary action or the bid pills; the banner never overlaps the bar or the bidder card.
- **Desktop keyboard:** Tab order on every screen goes header → content → bar. Arrow keys work in pill groups. Esc closes every sheet and modal and returns focus to the opener. The focused element always has a visible outline.
- **Hover:** in the `phone` project, no `:hover` style sticks after a tap (computed style check on a tapped button).

### 7.4 Visual review

The before and after contact sheets (one JPEG per device class, every screen, 7 players) are compared screen by screen. The checklist: gutters equal on both sides; panes line up on one baseline; no orphaned single word in headings; no large empty areas (a test also fails when the main content covers less than 55% of the viewport at `wide`); the table centred in its pane; buttons not stretched past 26rem.

### 7.5 Cannot be verified here

These will be reported as **unverified** and need a check on a real device:

- iPad Safari: modal and side-panel presentation, Split View widths.
- iOS Safari: keyboard behaviour and the `visualViewport` hook (Safari ignores `interactive-widget`), notch insets in landscape, the iOS text-size setting.
- Android Chrome: address-bar show and hide with `dvh`, and `interactive-widget`.
- Real orientation-change events. Playwright only resizes the viewport.
- Frame rate on low-end phones. It is measured only with Chrome's CPU throttling.

---

## 8. Risks

| Risk                                                                                                       | Mitigation                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Scaffold rewrite touches every screen at once                                                          | Step 8 keeps phone portrait identical, checked against the before screenshots, before any new layout is added.                                          |
| A size container needs a definite height; an unconstrained slot collapses to 0                             | Every table slot is `flex-1 min-h-0` inside a grid area of known height. The harness fails on any table smaller than its minimum.                       |
| `layoutId` (dealer chip, pill selection) inside percentage-positioned, resizing parents                    | Covered by the rotation spec. If it jumps on resize, the chip measures itself again on resize.                                                          |
| Elements shown in one layout and hidden in another (`display: none`) could be read twice by screen readers | Only short text is done this way, and the hidden element is `display: none`, so it is out of the accessibility tree. An axe check runs on every screen. |
| The mini table looks flat on big screens                                                                   | `wide` uses the `full` geometry (§4.3).                                                                                                                 |
| Container queries are unsupported on iOS 15                                                                | `@supports` fallback to today's fixed-size table (D11).                                                                                                 |

## 9. Out of scope

A marketing page, game rules, scoring, saved data, token values, CI workflow edits, and a native app shell.
