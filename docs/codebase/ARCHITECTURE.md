# Architecture

Kachuful is an offline-first PWA: Vite + React 18 + strict TypeScript + Tailwind 3 + Framer Motion. Signed out, everything lives on the device and nothing touches the network. Signed in, games sync to the backend (`plan-backend.md`; §6 is the API contract).

## Layers

```
src/domain      pure TypeScript: types, card sequence, rotation, bidding rule, scoring, standings, stats, demo game;
                timeline (round/game facts), leaderboard, ranges, profile and head-to-head, achievements, awards,
                seasons, Wrapped, upload validation (the backend's golden fixtures come from these)
src/state       reducer + actions (types.ts), persistence + migrations, undo ring, provider (store.tsx),
                archive.ts (IndexedDB), registry.ts (players), useFacts (this device's stats)
src/sync        api.ts, endpoints.ts, engine.ts (push/pull), live.ts (SSE), useRemote (cache-first reads)
src/hooks       useWakeLock, useHaptics, usePersistence, useDialog, useShare, useMediaQuery, useRovingFocus, useVisualViewport
src/components  ui/ (Glass, PrimaryButton, Seg, Scaffold, Sheet, Modal, Toast, Table …) and app shell (AppShell, UpdatePrompt)
src/screens     one file per screen (setup/ and round/ hold the multi-step flows); Winner is lazy;
                pages/ holds the screens opened over the game (one lazy chunk for phone and desk)
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
- The most cards a player holds is `floor(52 × decks ÷ players)`, never above 10 (`maxFor`, `domain/cards.ts`); one deck seats 3 to 7, two decks 3 to 10 (`playerCounts`). The game stores `decks` (schema 2; a save without it was played with one deck) and `maxCards`; `lastGroup.decks` is optional for the same reason, and a group the saved decks cannot seat is not offered again. Scoring, the dealer restriction and trump rotation do not depend on decks. The one rule a second deck adds is that of two identical cards in a trick the first played wins; it is only in the Rules text, since the app does not track tricks.
- A round has exactly as many tricks as cards and Made means winning exactly the bid, so the bids of the players marked Made never add up to more than the cards, and the rest must be shareable among players who missed without any of them hitting their own bid (`domain/tricks.ts`). The Results screen greys out a choice that cannot work, the reducer ignores it, the Edit sheet applies the same rule plus the dealer's forbidden total, and `resultsState` checks only real rounds (bids that do not add up to the cards).

## Layout

The app fills the viewport and rearranges itself by page layout, not by device. `src/theme/breakpoints.ts` is the one list (`land`, `md`, `wide`, `pane` = land or wide, `roomy` = md or wide, `fine`); Tailwind's `screens` and `useMediaQuery` both read it, so CSS and the few JavaScript checks cannot disagree. `land` is a phone on its side or any short window, `md` a tablet held upright, `wide` a tablet on its side, laptop or desktop.

**Scaffold** (`components/ui/Scaffold.tsx`) is a grid with one DOM tree for every orientation, so rotating never remounts a screen or loses state. A screen passes its main area, an optional `aside` (the controls), a `bar` and a `title`:

- One column on a phone or a tablet held upright (centred at 40rem); two panes in `pane` layouts when there is an `aside` (the body becomes a subgrid, the bar sits under the aside, centred at 72rem). The large title hides in two panes and a twin heading shows in the aside.
- `fit` makes the main area take the height left over without scrolling, so a fitted table can fill it. `collapseBar` tucks the bar away on a very short one-column screen (the keyboard being up).
- The scroll body is a plain block, not a flex column, because flex items stop vertical margins collapsing and move content.
- The root is a size container, so children can use `@h-short` / `@h-tiny` (the height of the Scaffold, not the window).
- The Scaffold publishes layout offsets (not bounding boxes: screens animate with transforms) as CSS variables to the two overlays that use them: the toast sits over the bar (`--bar-h/x/w`), the banner over the main pane (`--main-x/w`). Only the screen that set them may clear them.

**Table** (`components/ui/Table.tsx`, `lib/tableGeometry.ts`) is drawn on a fixed design grid (`TD`, `posAt`, `seatPos`, unchanged). Positions are percentages of the box (`toPct`) and sizes are `calc(N * var(--s))` (`dpx`), where `--s` is one grid pixel at the current size, capped at 1.5x. With `fit` the table fills its slot both ways and stops shrinking at `minScale` (0.72, or 0.8 with seven players); without it the size is the design size. Things that move between seats (deal cards, the spin token) sit in a `TablePin`, a full-size layer translated in percent, so they need no measuring. Seat labels cap their width at 64 grid pixels and ellipsize (the full name stays in the text and the tooltip); bid bubbles and chips move to the outer side of a seat so they stay clear of a neighbour's name, and crowded tables (seven players, the flat table) use the small round dealer chip instead of the "deals" pill. From eight seats (two decks only) a table shows avatars without name labels (`showNames`; the name is the avatar's tooltip and accessible name), seats are spaced evenly along the edge instead of by angle (`angOf`), and a seat in the middle puts its dealer chip away from the next seat (`chipSide`). Setup step 1's table is only a preview of the seat count, so it may shrink to `PREVIEW_SCALE` to leave room for the deck and player pickers.

**Keyboard.** The viewport meta sets `interactive-widget=resizes-content`, so Chrome on Android shrinks the layout when the keyboard opens. iOS Safari ignores it, so `useVisualViewport` sizes the app root to the visual viewport while a field has focus. Setup 2 steps its table aside on a very short portrait screen so the field and Add stay in view.

**JavaScript media queries** are used in three places and nowhere else: the enter and exit motion of sheets, and the table geometry (`full` or `mini`) of Bidding and Summary on wide screens, which CSS cannot switch. None of them is part of a `key`, so a change re-renders but never remounts.

**Audit.** `e2e/responsive.spec.ts` plays a game through every screen and sheet and `e2e/audit-rules.ts` decides what is a violation (a missing or covered primary action, anything past the screen edge, clipped text, overlaps, targets under 44px, a page that scrolls sideways, and a screen that should fit but scrolls on a portrait phone of 360x640 and up). It runs a four-viewport subset by default, the whole matrix with `RESPONSIVE_FULL=1`, and writes reports without failing with `RESPONSIVE=1` (`tools/responsive/report.mjs`).

## Large-screen UI

From 768px wide and 501px tall (`MQ.big`) the app renders `screens/desk/DeskShell` instead of the phone shell; a phone on its side keeps the phone UI. It is its own lazy chunk, so phones never download it. Inside it, three Tailwind screens switch the layout of one DOM tree: `tp` (768–1023, top bar), `tl` (1024–1279, rail and two columns) and `dt` (1280 and up, rail and three panes). The phone screens' `md`/`wide` styles are no longer reached at these sizes.

- **Same state, same rules.** Desk screens use the store's actions and the domain. What the bidding and results screens derive lives in `screens/round/roundView.ts`, and editing a finished round in `hooks/useRoundEdit.ts`; phone and desk both read them.
- **One workspace.** Bidding, Play and Results are `Workspace`: the table (`size="wide"`, the 560×380 geometry in `TD.wide`) and the `ScorePanel` stay mounted; only the action pane changes, and focus moves into the new pane (the old one is inert while it animates out). A bid is picked, then locked in (Enter, the button, or the picked key again); the reducer is unchanged.
- **Scoreboard** is the `board` / `edit` sheet state drawn as a screen over the game, which stays mounted under it. **Rules** and **Upcoming** are right-hand drawers (`Drawer`, `useDialog`); the other sheets keep their centred-modal presentation.
- **Shortcuts.** `hooks/useShortcuts.ts` (0–9, Enter, Z or ⌘/Ctrl+Z, E, R, N, ?). Keys typed into a field, held keys and every key while a dialog is open are ignored, and Enter on a focused button is left to the button unless that option is already picked. `screens/desk/useDeskKeys.ts` also turns a screen's keys off while the Scoreboard, the deal animation or the repair prompt covers it, or while it animates out. Key hints show only with a fine pointer attached (`MQ.kbd`).

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

## Online (plan-frontend.md)

**Archive.** `state/archive.ts` is the only IndexedDB access: games (every game this device knows, never replaced), players (the registry), outbox, cache and inbox. It loads once and is read synchronously from memory; writes land in memory at once and on disk in the background, falling back to memory when IndexedDB is missing. The current game is copied in after every change, so starting a new game saves the old one to History. Schema 3 added `syncId` (old games: a hash of a per-device id, the game id and its creation time, so a game, its undo snapshots and its backup are one remote game), `rev`, `finishedAt` and `Round.doneAt`.

**Navigation.** `state.nav` is a stack of routes opened over the game screens (`screens/pages/Pages.tsx`, one lazy chunk). `useHistorySync` keeps one browser history entry per open screen and sheet, so system Back closes the top one. `?invite=`, `?reset=`, `?live=` and `?recap=` open their screen once at start and are removed from the address bar.

**Players.** `state/registry.ts`: one row per player, unique by name key. Signed out these are local; signed in they mirror the server's registry, and a new name is created on the server on the next sync. Games point at players by `Player.playerId`; older games are matched by name when read.

**Sync.** `sync/engine.ts` runs only while signed in: on start, coming online, becoming visible, 1.5 s after a change and every minute while work waits (backing off to 5 min). It pulls with one `bootstrap` call, pushes new players, then games whose players the server knows. A stale upload keeps the copy with more finished rounds and saves the other as a conflict copy; a rejected game stays local with the reason in the inbox. Server reads use `useRemote`: the cached answer renders first, then refreshes with `If-None-Match`.

**Mock API.** `tools/mock-api` serves the whole contract from memory for `npm run dev:mock` and the e2e server, reusing the domain for every number. It is a stand-in: the real server must match `contract/fixtures` instead.
