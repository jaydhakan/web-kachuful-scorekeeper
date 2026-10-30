# Architecture

Kachuful is a client-only PWA: Vite + React 18 + strict TypeScript + Tailwind 3 + Framer Motion. There is no backend; everything lives in `localStorage`.

## Layers

```
src/domain      pure TypeScript: types, card sequence, rotation, bidding rule, scoring, standings, stats, demo game
src/state       reducer + actions (types.ts), persistence + migrations, undo ring, provider (store.tsx)
src/hooks       useWakeLock, useHaptics, usePersistence, useDialog, useShare, useMediaQuery, useRovingFocus, useVisualViewport
src/components  ui/ (Glass, PrimaryButton, Seg, Scaffold, Sheet, Modal, Toast, Table …) and app shell (AppShell, UpdatePrompt)
src/screens     one file per screen (setup/ and round/ hold the multi-step flows); Winner is lazy
src/sheets      one file per sheet body; SheetHost chooses the body and captures it at mount
src/strings     every user-visible string (messages.ts is plain text used by domain/reducer)
src/theme       tokens.json (design system), extended.json (parity extras), palette, trump themes
src/lib         format helpers, table geometry, share image + text, clock
```

Dependencies point downward only: `domain` imports nothing from the UI; `state` imports `domain`; components import `state` and `domain`.

## State

One `useReducer` in `AppProvider`. Actions are a discriminated union (`state/types.ts`); the reducer is pure apart from `now()` (`lib/clock.ts`). Effects live in the provider and hooks, never in the reducer:

- toast (4 s), banner (1.6 s) and the "who bids next" advance (250 ms) are timers keyed on a counter in state;
- `usePersistence` writes `kachuful.v1`, `kachuful.undo` and `kachuful.screen` after every change;
- `useWakeLock` holds a screen lock while a game is active.

**Undo** is a ring of the 20 most recent snapshots (`state/undo.ts`), stored as JSON strings in `kachuful.undo`. Only actions committed with `{ undo: true }` push a snapshot (each bid, confirming a round, next round, ending the game, editing a round).

## Persistence and migrations

Keys (shapes unchanged from the prototype): `kachuful.v1` (the game), `kachuful.lastGroup`, `kachuful.recentNames`, `kachuful.undo`, `kachuful.screen`, plus `kachuful.v1.backup` for an unreadable save.

`schemaVersion` is written into the saved game. A save without it is the prototype's shape (version 0). `migrations[n]` upgrades version n to n + 1 (`state/migrations.ts`); add one when the saved shape changes. A save from a newer app, or one that fails the shape check, is treated as unreadable: the raw text is backed up, saving pauses, and the player chooses Reset or Keep backup. Quota errors drop the oldest undo snapshots first, then warn.

## Data quirks

- Totals are never stored; every score is derived from round data (`domain/scoring.ts`).
- A round's dealer, trump and first player derive from the index and `firstDealerIndex`. Direction only changes seat layout, never the rotation order.
- Avatar colours are stored as hex strings inside each saved player.
- A round has exactly as many tricks as cards and Made means winning exactly the bid, so the bids of the players marked Made never add up to more than the cards, and the rest must be shareable among players who missed without any of them hitting their own bid (`domain/tricks.ts`). The Results screen greys out a choice that cannot work, the reducer ignores it, the Edit sheet applies the same rule plus the dealer's forbidden total, and `resultsState` checks only real rounds (bids that do not add up to the cards).

## Layout

The app fills the viewport and rearranges itself by page layout, not by device. `src/theme/breakpoints.ts` is the one list (`land`, `md`, `wide`, `pane` = land or wide, `roomy` = md or wide, `fine`); Tailwind's `screens` and `useMediaQuery` both read it, so CSS and the few JavaScript checks cannot disagree. `land` is a phone on its side or any short window, `md` a tablet held upright, `wide` a tablet on its side, laptop or desktop.

**Scaffold** (`components/ui/Scaffold.tsx`) is a grid with one DOM tree for every orientation, so rotating never remounts a screen or loses state. A screen passes its main area, an optional `aside` (the controls), a `bar` and a `title`:

- One column on a phone or a tablet held upright (centred at 40rem); two panes in `pane` layouts when there is an `aside` (the body becomes a subgrid, the bar sits under the aside, centred at 72rem). The large title hides in two panes and a twin heading shows in the aside.
- `fit` makes the main area take the height left over without scrolling, so a fitted table can fill it. `collapseBar` tucks the bar away on a very short one-column screen (the keyboard being up).
- The scroll body is a plain block, not a flex column, because flex items stop vertical margins collapsing and move content.
- The root is a size container, so children can use `@h-short` / `@h-tiny` (the height of the Scaffold, not the window).
- The Scaffold publishes layout offsets (not bounding boxes: screens animate with transforms) as CSS variables to the two overlays that use them: the toast sits over the bar (`--bar-h/x/w`), the banner over the main pane (`--main-x/w`). Only the screen that set them may clear them.

**Table** (`components/ui/Table.tsx`, `lib/tableGeometry.ts`) is drawn on a fixed design grid (`TD`, `posAt`, `seatPos`, unchanged). Positions are percentages of the box (`toPct`) and sizes are `calc(N * var(--s))` (`dpx`), where `--s` is one grid pixel at the current size, capped at 1.5x. With `fit` the table fills its slot both ways and stops shrinking at `minScale` (0.72, or 0.8 with seven players); without it the size is the design size. Things that move between seats (deal cards, the spin token) sit in a `TablePin`, a full-size layer translated in percent, so they need no measuring. Seat labels cap their width at 64 grid pixels and ellipsize (the full name stays in the text and the tooltip); bid bubbles and chips move to the outer side of a seat so they stay clear of a neighbour's name, and crowded tables (seven players, the flat table) use the small round dealer chip instead of the "deals" pill.

**Keyboard.** The viewport meta sets `interactive-widget=resizes-content`, so Chrome on Android shrinks the layout when the keyboard opens. iOS Safari ignores it, so `useVisualViewport` sizes the app root to the visual viewport while a field has focus. Setup 2 steps its table aside on a very short portrait screen so the field and Add stay in view.

**JavaScript media queries** are used in three places and nowhere else: the enter and exit motion of sheets, and the table geometry (`full` or `mini`) of Bidding and Summary on wide screens, which CSS cannot switch. None of them is part of a `key`, so a change re-renders but never remounts.

**Audit.** `e2e/responsive.spec.ts` plays a game through every screen and sheet and `e2e/audit-rules.ts` decides what is a violation (a missing or covered primary action, anything past the screen edge, clipped text, overlaps, targets under 44px, a page that scrolls sideways, and a screen that should fit but scrolls on a portrait phone of 360x640 and up). It runs a four-viewport subset by default, the whole matrix with `RESPONSIVE_FULL=1`, and writes reports without failing with `RESPONSIVE=1` (`tools/responsive/report.mjs`).

## Motion

`SPRING`, `SPRING_POP`, `SPRING_SOFT`, `SPRING_SHEET` and `EASE = [0.32, 0.72, 0, 1]` live in `components/ui/motion.ts`. Animate transform and opacity. Known exceptions inherited from the prototype are listed in the Phase 2 proposal.

## Sheets and dialogs

`useDialog` gives sheets and modals a focus trap, Escape, focus return and an inert page behind them (`AppShell` sets `inert` on the content layer). Native `<dialog>` was evaluated and rejected: `::backdrop` can't join the spring enter/exit, and drag-to-dismiss would need rebuilding.

One `Sheet` has three presentations. On a phone it is a bottom (or full-height) sheet that can be dragged down. From tablet width (`MQ.roomy`) it becomes a centred modal, a wide modal (Scoreboard) or a right-hand panel (Rules, Upcoming, Edit), chosen by `SheetHost`. The layout is CSS (`roomy:` classes); `useMediaQuery` only picks the enter and exit motion, so rotating never remounts a dialog.

## Platform notes

- **Haptics:** `navigator.vibrate` works on Android Chrome and does not exist on iOS Safari, where `vibrate()` is a silent no-op. There is no workaround and none is attempted.
- **Wake lock:** supported on current Chrome and Safari 16.4+. It is re-acquired when the tab becomes visible and released when the game ends.
- **Share:** Web Share with a PNG file where `navigator.canShare({ files })` is true; otherwise the PNG is downloaded and the text summary copied. Both need a tap, so they live behind buttons.
- **Install and offline:** the service worker precaches the shell and fonts. Updates wait until the player taps "Reload".
