# Architecture

Baithak is an offline-first PWA hosting several table games (Kachuful, Kaali Teeri; Ishaara to come): Vite + React 18 + strict TypeScript + Tailwind 3 + Framer Motion. Signed out, everything lives on the device and nothing touches the network. Signed in, games sync to the backend (`../backend-kachuful-scorekeeper`; the API as built is the contract).

## Layers

```
src/games/kachuful/   everything that is Kachuful's own:
  domain/       pure TypeScript: types, card sequence, rotation, bidding rule, scoring, standings, stats, demo game;
                timeline (round/game facts), leaderboard, ranges, profile and head-to-head, achievements, awards,
                seasons, Wrapped, upload validation (the backend's golden fixtures come from these)
  state/        reducer + actions (types.ts), migrations, undo ring, provider (store.tsx), useFacts (this device's stats)
  sync/         engine.ts (push/pull), elsewhere/resume (a game open on another device)
  screens/      one file per screen (setup/ and round/ hold the multi-step flows, desk/ the large-screen UI); Winner is
                lazy; pages/ holds the screens opened over the game (one lazy chunk for phone and desk)
  sheets/       one file per sheet body; SheetHost chooses the body and captures it at mount
  components/   the shells (AppShell, PhoneShell) and Kachuful-only pieces (HomeOnline, TodayStrip, HostLive …)
  hooks/ lib/ strings/   useRoundEdit, usePersistence; route, final standings + share card and text; rules and achievement names
src/games/kaali-teeri/   the same layout for Kaali Teeri: domain/ (cards, auction, calls, scoring, stats, boards, validate;
                the backend's golden fixtures come from here), state/, screens/ (setup/, hand/, desk/, pages/, viewer/),
                sheets/, strings/, sync/ (engine on /api/kaali-teeri, boards, share links); index.tsx is its lazy root
src/platform/   route.ts (the first path segment names the game; go(), useGame), catalog.ts (GAMES: name, status, lazy
                root, peek() for the resume line), PlatformRoot (landing or the game, a load error with Retry), meta.ts
                (each page's preview tags), landing/; pages/ holds the account, sign-in, admin and credits pages
src/people/     Player, Direction, avatar colours and emoji, name and email keys, pidOf: one players registry for all games
src/state       persistence.ts (the only localStorage access), archive.ts (IndexedDB), registry.ts (players),
                prefs, theme store, useArchive
src/sync        api.ts (the only fetch), session.ts (who is signed in, for every game and the landing page),
                players.ts (pushing new players, shared by each game's engine), endpoints.ts + types.ts, live.ts (SSE), useRemote
                (cache-first reads), account, signout, prefs, status
src/hooks       useWakeLock, useHaptics, useDialog, useShare, useMediaQuery, useRovingFocus, useVisualViewport, useHistorySync
src/components  ui/ (Glass, PrimaryButton, Seg, Scaffold, Sheet, Modal, Toast, Table …) and shared app pieces
                (ServiceWorkerHost, UpdateGate, AccountChip, PhotoPicker, SyncDot, RemoteGate, ThemeSync); seating/ is
                Setup 2 for any game (useSeating, SeatingPicker, SeatingTable, AddPlayerForm, seat sheets, same-person check)
                plus SetupFrame and useSeatDrag; desk/ holds the large-screen parts both games use (DeskParts, Drawer,
                StepTracker, RailItem)
src/strings     user-visible strings shared by the app (`t`, hub, admin; messages.ts is plain text used by domain/reducer);
                a game's own strings sit in its strings/
src/theme       theme registry, colour-name map, palette, trump themes (look: src/styles/themes.css)
src/lib         format helpers, table geometry, clock, entry links, the share image (any game's standings)
```

Dependencies point downward only: `domain` imports nothing from the UI; `state` imports `domain`; components import `state` and `domain`. Games never import each other. Shared code (`src/` outside `games/`) still reaches into Kachuful in a few places (`Game` in the archive and API types, `persistence.ts`); the account pages also still live inside Kachuful's shell, and the landing page links to them with `/kachuful?open=account`.

## Paths and games

One app, one service worker, one manifest (`id: '/'`). `main.tsx` calls `startRoute()` before the first render: old links on `/` (`?live=`, `?recap=`, `?invite=`, `?reset=`) move to `/kachuful?…`, an unknown path goes to `/`. `PlatformRoot` shows the landing page or the game the path names, each a lazy chunk; a game's store, sync and archive mount only under its path. `go(id)` pushes the path (dropping a game's open-sheet history entries first), and system Back returns. Each game's `peek()` reads its saved game straight from storage for the landing page's resume line, without loading the game. The build writes one HTML file per page with its own preview tags (`page-meta` in `vite.config.ts`), and `preload-shell` modulepreloads the chunks of the path's game for the screen size.

## State

One `useReducer` in `AppProvider`. Actions are a discriminated union (`games/kachuful/state/types.ts`); the reducer is pure apart from `now()` (`lib/clock.ts`). Effects live in the provider and hooks, never in the reducer:

- toast (4 s), banner (1.6 s) and the "who bids next" advance (250 ms) are timers keyed on a counter in state;
- `usePersistence` writes `kachuful.v1`, `kachuful.undo` and `kachuful.screen` after every change;
- `useWakeLock` holds a screen lock while a game is active.

**Undo** is a ring of the 20 most recent snapshots (`games/kachuful/state/undo.ts`), stored as JSON strings in `kachuful.undo`. Only actions committed with `{ undo: true }` push a snapshot (each bid, confirming a round, next round, ending the game, editing a round).

## Persistence and migrations

Keys (shapes unchanged from the prototype): `kachuful.v1` (the game), `kachuful.lastGroup`, `kachuful.recentNames`, `kachuful.undo`, `kachuful.screen`, plus `kachuful.v1.backup` for an unreadable save.

Kaali Teeri (`games/kaali-teeri/state/persistence.ts`, through the same `storage`): `kaaliteeri.v1`, `kaaliteeri.undo`, `kaaliteeri.screen`, `kaaliteeri.lastGroup`, `kaaliteeri.prefs` (`{quick, countedBy}`, this device's) and `kaaliteeri.v1.backup`. Its saves start at schema 1 (`games/kaali-teeri/state/migrations.ts`, no steps yet); a save without a version is unreadable, since none was ever written. `peek()` reads `kaaliteeri.v1` for the landing card without the domain.

`schemaVersion` is written into the saved game. A save without it is the prototype's shape (version 0). `migrations[n]` upgrades version n to n + 1 (`games/kachuful/state/migrations.ts`); add one when the saved shape changes. A save from a newer app, or one that fails the shape check, is treated as unreadable: the raw text is backed up, saving pauses, and the player chooses Reset or Keep backup. Quota errors drop the oldest undo snapshots first, then warn.

## Data quirks

- Totals are never stored; every score is derived from round data (`games/kachuful/domain/scoring.ts`).
- A round's dealer, trump and first player derive from the index and `firstDealerIndex`. Direction only changes seat layout, never the rotation order.
- Avatar colours are stored as hex strings inside each saved player.
- The most cards a player holds is `floor(52 × decks ÷ players)`, never above 10 (`maxFor`, `games/kachuful/domain/cards.ts`); one deck seats 3 to 7, two decks 3 to 10 (`playerCounts`). The game stores `decks` (schema 2; a save without it was played with one deck) and `maxCards`; `lastGroup.decks` is optional for the same reason, and a group the saved decks cannot seat is not offered again. Scoring, the dealer restriction and trump rotation do not depend on decks. The one rule a second deck adds is that of two identical cards in a trick the first played wins; it is only in the Rules text, since the app does not track tricks.
- Cards per round follow the game's `order` (schema 4; older saves migrate to `up`): `up` deals 3 → max → 3, `down` deals max → 3 → max, the turning count dealt twice either way (`cardsFor`, `games/kachuful/domain/cards.ts`). Only the card counts change: the number of rounds, trump and dealer rotation are the same. The backend validates rounds with the same rule, so the golden fixtures include a down-first game.
- A round has exactly as many tricks as cards and Made means winning exactly the bid, so the bids of the players marked Made never add up to more than the cards, and the rest must be shareable among players who missed without any of them hitting their own bid (`games/kachuful/domain/tricks.ts`). The Results screen greys out a choice that cannot work, the reducer ignores it, the Edit sheet applies the same rule plus the dealer's forbidden total, and `resultsState` checks only real rounds (bids that do not add up to the cards).

## Layout

The app fills the viewport and rearranges itself by page layout, not by device. `src/theme/breakpoints.ts` is the one list (`land`, `md`, `wide`, `pane` = land or wide, `roomy` = md or wide, `fine`); Tailwind's `screens` and `useMediaQuery` both read it, so CSS and the few JavaScript checks cannot disagree. `land` is a phone on its side or any short window at least 4:3 wide (so an upright phone with the Android keyboard up stays one column), `md` a tablet held upright, `wide` a tablet on its side, laptop or desktop.

**Scaffold** (`components/ui/Scaffold.tsx`) is a grid with one DOM tree for every orientation, so rotating never remounts a screen or loses state. A screen passes its main area, an optional `aside` (the controls), a `bar` and a `title`:

- One column on a phone or a tablet held upright (centred at 40rem); two panes in `pane` layouts when there is an `aside` (the body becomes a subgrid, the bar sits under the aside, centred at 72rem). The large title hides in two panes and a twin heading shows in the aside.
- `fit` makes the main area take the height left over without scrolling, so a fitted table can fill it. `collapseBar` tucks the bar away on a very short one-column screen (the keyboard being up).
- The scroll body is a plain block, not a flex column, because flex items stop vertical margins collapsing and move content.
- The root is a size container, so children can use `@h-short` / `@h-tiny` (the height of the Scaffold, not the window).
- The Scaffold publishes layout offsets (not bounding boxes: screens animate with transforms) as CSS variables to the two overlays that use them: the toast sits over the bar (`--bar-h/x/w`), the banner over the main pane (`--main-x/w`). Only the screen that set them may clear them.

**Table** (`components/ui/Table.tsx`, `lib/tableGeometry.ts`) is drawn on a fixed design grid (`TD`, `posAt`, `seatPos`, unchanged). Positions are percentages of the box (`toPct`) and sizes are `calc(N * var(--s))` (`dpx`), where `--s` is one grid pixel at the current size, capped at 1.5x. With `fit` the table fills its slot both ways and stops shrinking at `minScale` (0.72, or 0.8 with seven players); without it the size is the design size. Things that move between seats (deal cards, the spin token) sit in a `TablePin`, a full-size layer translated in percent, so they need no measuring. Seat labels cap their width at 64 grid pixels and ellipsize (the full name stays in the text and the tooltip); bid bubbles and chips move to the outer side of a seat so they stay clear of a neighbour's name, and crowded tables (seven players, the flat table) use the small round dealer chip instead of the "deals" pill. From eight seats (two decks only) a table shows avatars without name labels (`showNames`; the name is the avatar's tooltip and accessible name), seats are spaced evenly along the edge instead of by angle (`angOf`), and a seat in the middle puts its dealer chip away from the next seat (`chipSide`). The table knows no game: a game passes bids, seat marks (`marks`, `pos`/`neg`; Kachuful maps made/missed with `seatMarks`), the first-player label and the centre. Setup step 1's table is only a preview of the seat count, so it may shrink to `PREVIEW_SCALE` to leave room for the deck and player pickers.

**Keyboard.** The viewport meta sets `interactive-widget=resizes-content`, so Chrome on Android shrinks the layout when the keyboard opens. iOS Safari ignores it, so `useVisualViewport` sizes the app root to the visual viewport while a field has focus. Setup 2 steps its table aside on a very short portrait screen so the field and Add stay in view.

**JavaScript media queries** are used in three places and nowhere else: the enter and exit motion of sheets, and the table geometry (`full` or `mini`) of Bidding and Summary on wide screens, which CSS cannot switch. None of them is part of a `key`, so a change re-renders but never remounts.

**Audit.** `e2e/responsive.spec.ts` plays a game through every screen and sheet and `e2e/audit-rules.ts` decides what is a violation (a missing or covered primary action, anything past the screen edge, clipped text, overlaps, targets under 44px, a page that scrolls sideways, and a screen that should fit but scrolls on a portrait phone of 360x640 and up). It runs a four-viewport subset by default, the whole matrix with `RESPONSIVE_FULL=1`, and writes reports without failing with `RESPONSIVE=1` (`tools/responsive/report.mjs`).

## Large-screen UI

From 768px wide and 501px tall (`MQ.big`) the app renders `games/kachuful/screens/desk/DeskShell` instead of the phone shell; a phone on its side keeps the phone UI. Each shell (`games/kachuful/components/PhoneShell` and `DeskShell`) is its own lazy chunk, so a device never downloads the other's; an inline script in `index.html` modulepreloads the one that matches (`preloadShell` in `vite.config.ts`), and code both load sits in one `shell-common` chunk. `tools/bundle.mjs` budgets each first load separately. Inside it, three Tailwind screens switch the layout of one DOM tree: `tp` (768–1023, top bar), `tl` (1024–1279, rail and two columns) and `dt` (1280 and up, rail and three panes). The phone screens' `md`/`wide` styles are no longer reached at these sizes.

- **Same state, same rules.** Desk screens use the store's actions and the domain. What the bidding and results screens derive lives in `games/kachuful/screens/round/roundView.ts`, and editing a finished round in `games/kachuful/hooks/useRoundEdit.ts`; phone and desk both read them.
- **One workspace.** Bidding, Play and Results are `Workspace`: the table (`size="wide"`, the 560×380 geometry in `TD.wide`) and the `ScorePanel` stay mounted; only the action pane changes, and focus moves into the new pane (the old one is inert while it animates out). A bid is picked, then locked in (Enter, the button, or the picked key again); the reducer is unchanged.
- **Scoreboard** is the `board` / `edit` sheet state drawn as a screen over the game, which stays mounted under it. **Rules** and **Upcoming** are right-hand drawers (`Drawer`, `useDialog`); the other sheets keep their centred-modal presentation.
- **Shortcuts.** `hooks/useShortcuts.ts` (0–9, Enter, Z or ⌘/Ctrl+Z, E, R, N, ?). Keys typed into a field, held keys and every key while a dialog is open are ignored, and Enter on a focused button is left to the button unless that option is already picked. `games/kachuful/screens/desk/useDeskKeys.ts` also turns a screen's keys off while the Scoreboard, the deal animation or the repair prompt covers it, or while it animates out. Key hints show only with a fine pointer attached (`MQ.kbd`).

## Motion

`SPRING`, `SPRING_POP`, `SPRING_SOFT`, `SPRING_SHEET` and `EASE = [0.32, 0.72, 0, 1]` live in `components/ui/motion.ts`. Animate transform and opacity. Known exceptions inherited from the prototype are listed in the Phase 2 proposal.

## Sheets and dialogs

`useDialog` gives sheets and modals a focus trap, Escape, focus return and an inert page behind them (`AppShell` sets `inert` on the content layer). Native `<dialog>` was evaluated and rejected: `::backdrop` can't join the spring enter/exit, and drag-to-dismiss would need rebuilding.

One `Sheet` has three presentations. On a phone it is a bottom (or full-height) sheet that can be dragged down. From tablet width (`MQ.roomy`) it becomes a centred modal, a wide modal (Scoreboard) or a right-hand panel (Rules, Upcoming, Edit), chosen by `SheetHost`. The layout is CSS (`roomy:` classes); `useMediaQuery` only picks the enter and exit motion, so rotating never remounts a dialog.

## Platform notes

- **Haptics:** `navigator.vibrate` works on Android Chrome and does not exist on iOS Safari, where `vibrate()` is a silent no-op. There is no workaround and none is attempted.
- **Wake lock:** supported on current Chrome and Safari 16.4+. It is re-acquired when the tab becomes visible and released when the game ends.
- **Share:** Web Share with a PNG file where `navigator.canShare({ files })` is true; otherwise the PNG is downloaded and the text summary copied. Both need a tap, so they live behind buttons.
- **Install and offline:** the service worker precaches the shell and fonts. The app asks for a new version at launch, on every return to the front, on coming online and hourly; a waiting version shows the update gate (`UpdateGate`), which can't be dismissed, and its one button reloads into it.

## Online

**Archive.** `state/archive.ts` is the only IndexedDB access: games (every Kachuful game this device knows, never replaced), ktGames (Kaali Teeri's, by the same rules; database version 2), players (the registry, shared by every game), outbox, cache and inbox. A version bump only adds missing stores (`upgradeDb`). Setup's suggestions (`people()`, `circle()`) count co-players from every game's store. It loads once and is read synchronously from memory; writes land in memory at once and on disk in the background, falling back to memory when IndexedDB is missing. The current game is copied in after every change, so starting a new game saves the old one to History. Schema 3 added `syncId` (old games: a hash of a per-device id, the game id and its creation time, so a game, its undo snapshots and its backup are one remote game), `rev`, `finishedAt` and `Round.doneAt`.

**Navigation.** `state.nav` is a stack of routes opened over the game screens (`games/kachuful/screens/pages/Pages.tsx`, one lazy chunk). `useHistorySync` keeps one browser history entry per open screen and sheet, so system Back closes the top one. `?invite=`, `?reset=`, `?live=` and `?recap=` open their screen once at start and are removed from the address bar.

**Players.** `state/registry.ts`: one row per player, unique by name key. Signed out these are local; signed in they mirror the server's registry, and a new player is created on the server on the next sync. Games point at players by `Player.playerId`; older games are matched by name when read. Signed in, setup suggests only the account's circle (`circle()`: players it created, people it played with on any device, ones it confirmed, its own); anyone else is added with an email and checked with `GET /api/players/check`. An email that belongs to a player asks "Is this Riya?" (a taken name alone reveals nobody). One email is one person: Yes seats them under the name typed, and if that name isn't one of theirs yet it is saved as an alias (`POST /api/players/{id}/aliases`, `confirmSame`). A player's aliases are kept in the registry row (`PlayerRec.aliases`). Setup finds a person by any of their names (`findPerson`, `answersTo`), shows one row per person with a picker for which name sits at the table, and never seats one person twice (`isSeated`). Boards show the main name. The admin, the creator or the player can make an alias the main name (`mainAlias`), and an admin merge turns every name the merged-away player had into an alias.

**Photos.** `components/ui/Avatar.tsx` draws a player: their photo (`photoUrl`, versioned and cached forever) over the emoji, else the emoji. A seat finds its photo in the registry by `playerId`; the signed-out live and recap viewers take it from the public summary. `components/PhotoPicker.tsx` squares and shrinks a picked photo to 256×256 on the phone (`lib/photo.ts`) and uploads it; it shows only for the admin, the player's creator and the player.

**Kaali Teeri sync.** `games/kaali-teeri/sync/engine.ts` follows Kachuful's rules on `/api/kaali-teeri/*` (uploads, stale copies, rejections in the shared inbox, tombstones) and pulls the games the account sat in into `ktGames`; its outbox ids start `ktput:` / `ktdel:`. Signed in, the leaderboard, player stats and head-to-head read the server (`sync/boards.ts`); signed out they compute from the device's games (`domain/boards.ts`, `stats.ts`). `/kaali-teeri?live=` and `?recap=` open the read-only viewer.

**Sync.** `games/kachuful/sync/engine.ts` runs only while signed in: on start, coming online, becoming visible, 1.5 s after a change and every minute while work waits (backing off to 5 min, or the server's `retryAfter` after a 429). It pulls with one `bootstrap` call (then `updatedSince`, the newest server `updatedAt` seen minus 5 s), pushes new players, then games whose players the server knows. A game goes up as it is to `PUT /api/games/{syncId}`. A stale upload keeps the copy with more finished rounds and saves the other as a conflict copy; a rejected game stays local with the reason in the inbox; a deleted one (410 or a tombstone) leaves the device. `409 same_player` takes the server's player and rewrites the games. Server reads use `useRemote`: the cached answer renders first, then refreshes with `If-None-Match`; closed days and seasons are never asked for again.

**API client.** `sync/api.ts` (fetch with the session cookie, `X-Kachuful: 1` on writes, errors as `ApiError`) and `sync/endpoints.ts` (one typed function per API call; types in `sync/types.ts`). `npm run dev` and `preview` proxy `/api`, `/r` and `/l` to the backend so the app and API share one origin, as nginx does in production.

**Mock API.** `tools/mock-api` serves the API from memory for `npm run dev:mock` and the e2e server, with the backend's demo accounts, reusing the domain for every number. It is a stand-in: the real server must match `contract/fixtures`, and the online e2e specs also run against it (`E2E_API=local`).
