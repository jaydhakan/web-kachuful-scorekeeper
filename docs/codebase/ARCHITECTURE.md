# Architecture

Kachuful is a client-only PWA: Vite + React 18 + strict TypeScript + Tailwind 3 + Framer Motion. There is no backend; everything lives in `localStorage`.

## Layers

```
src/domain      pure TypeScript: types, card sequence, rotation, bidding rule, scoring, standings, stats, demo game
src/state       reducer + actions (types.ts), persistence + migrations, undo ring, provider (store.tsx)
src/hooks       useWakeLock, useHaptics, usePersistence, useDialog, useShare
src/components  ui/ (Glass, PrimaryButton, Seg, Scaffold, Sheet, Modal, Toast, Table …) and app shell (Phone, UpdatePrompt)
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

## Motion

`SPRING`, `SPRING_POP`, `SPRING_SOFT` and `EASE = [0.32, 0.72, 0, 1]` live in `components/ui/motion.ts`. Animate transform and opacity. Known exceptions inherited from the prototype are listed in the Phase 2 proposal.

## Sheets and dialogs

`useDialog` gives sheets and modals a focus trap, Escape, focus return and an inert page behind them (`Phone` sets `inert` on the content layer). Native `<dialog>` was evaluated and rejected: its top layer escapes the phone-width column, `::backdrop` can't join the spring enter/exit, and drag-to-dismiss would need rebuilding.

## Platform notes

- **Haptics:** `navigator.vibrate` works on Android Chrome and does not exist on iOS Safari, where `vibrate()` is a silent no-op. There is no workaround and none is attempted.
- **Wake lock:** supported on current Chrome and Safari 16.4+. It is re-acquired when the tab becomes visible and released when the game ends.
- **Share:** Web Share with a PNG file where `navigator.canShare({ files })` is true; otherwise the PNG is downloaded and the text summary copied. Both need a tap, so they live behind buttons.
- **Install and offline:** the service worker precaches the shell and fonts. Updates wait until the player taps "Reload".
