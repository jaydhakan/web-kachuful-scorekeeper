# Task: Productionise "Kachuful" (Judgement card-game scorekeeper)

## Context
Kachuful is a mobile-first scorekeeper for the Judgement / Kachuful card game (3–7 players). It was prototyped as a single-file artifact (React 18 + Tailwind 3 + Framer Motion 11, bundled with esbuild against CDN globals). Readable source is in `source/` (NOT the minified HTML). Design system: `design-system/README.md` and `tokens.json` ("Midnight Card Room"). Treat both as the source of truth.

Goal: turn the prototype into a clean, maintainable, standards-compliant app in THIS repository, with zero change to game rules, scoring, data shapes or visual/motion design.

## Hard constraints
1. Do NOT change game logic behaviour. `source/src/logic.js` is the rules engine. Move it as-is into a pure module, then add tests that lock the current behaviour BEFORE refactoring.
2. Keep the persisted localStorage shape and keys (`kachuful.v1`, `kachuful.lastGroup`, `kachuful.recentNames`). Add a schema-version migration hook; do not break existing saves.
3. Keep the design tokens, the springs (`SPRING`, `SPRING_POP`, `EASE = [0.32,0.72,0,1]`), and animate only `transform`/`opacity`.
4. Follow this repo's existing conventions (lint, formatting, folder layout, naming, commit style) over anything below. Inspect the repo first and tell me what you found.

## Domain rules (must stay true; encode as tests)
- Players 3–7. Max cards: 10 for 3–5 players, 8 for 6, 7 for 7. Card sequence zig-zags 3→max→3 (max and 3 each repeat once).
- Trump rotates ♠ ♦ ♣ ♥. Dealer rotates by seat order and direction (cw/ccw); first bidder/leader is the player after the dealer.
- Dealer bids last and cannot bid `cards − sum(others)` when that value is in 0..cards.
- Score = max(bid,1)×10: positive if exact, negative otherwise. All players "made" is blocked. Exact-tricks mode validates the total equals cards.
- Ties use competition ranking. Undo keeps 20 snapshots. Editing a past round recalculates totals.
Demo game: 5 players, 6 finished rounds, round 7 in bidding. Verified totals: Kabir 60, Dev 30, Aarav 10, Riya −20, Meera −30.

## Target architecture
- Vite + React 18 + TypeScript (strict). Tailwind configured with the tokens (not CDN). Framer Motion via npm. Fonts: Bricolage Grotesque + DM Sans, self-hosted or via the repo's standard method.
- Suggested layout: `src/domain/` (pure TS: rules, scoring, standings, stats, types), `src/state/` (store + persistence + undo, split from UI), `src/components/ui/` (Glass, PrimaryButton, Seg, Sheet, Modal, Toast, Table…), `src/screens/` (one file per screen: Home, Setup/Step1-3, Bidding, Play, Results, Summary, Winner, RoundStart), `src/sheets/` (Rules, Scoreboard, EditRound, Upcoming, Menu, Seat, Rename, Avatar, Share), `src/styles/`.
- Split `screens.jsx` (~700 lines) and the `usePhone` god-hook into focused modules; replace prop/context sprawl with a typed store (reducer or Zustand, whichever the repo already uses).
- Define types for Game, Round, Player, UI state; no `any`.

## Quality bar
- Tests: Vitest for domain (rules, sequences, hook lock, scoring, ranking, edit-recalc, migration); React Testing Library for key flows (bid → play → results → summary); one Playwright smoke test at 390px.
- Accessibility: real buttons/roles, labels, focus rings, focus trap + Esc in sheets/modals, `aria-live` for toasts, 44px+ targets, WCAG AA contrast (check the muted text on glass), `prefers-reduced-motion`, `prefers-reduced-transparency`.
- Performance: lazy-load Winner/Share/Confetti, memoise Table seat math, verify 60fps on a mid-range Android, no layout-thrash.
- Lint/format/typecheck clean; CI-ready scripts (`dev`, `build`, `test`, `lint`, `typecheck`).

## Known gaps to fix or evaluate (from the prototype)
1. No tests exist at all. Add them first.
2. Share only shows a PNG to long-press; use Web Share API with file + fallback, and test it outside the artifact sandbox.
3. No PWA/offline. Add manifest + service worker (the artifact sandbox forbade it) so it works at the card table without signal.
4. Wake lock is requested but not re-acquired after tab visibility changes.
5. localStorage access has no quota/corruption recovery UX; add safe parse + "reset saved game" path.
6. Sheet/Modal accessibility (focus management) is incomplete.
7. Desktop landing shell (hero + tilt phone) is a showcase; decide with me whether production ships it or just the mobile app.
8. Haptics use `navigator.vibrate` only; fine on Android, no-op on iOS. Document it.
9. Consider i18n readiness (strings are inline) and a light theme (currently single dark look by design).
10. Edge cases to test: 7-player layout at 360px, duplicate names, editing a round after later rounds exist, undo across the summary screen, refresh mid-round.

## Process
1. Read the repo + conventions; report back a short plan and any conflicts with this brief.
2. Port domain + add tests (green) → port state → port UI component by component, comparing against the prototype visually.
3. Small commits, one concern each. Do not add dependencies beyond Vite/TS/Tailwind/Framer Motion/Vitest/RTL/Playwright (+ the repo's existing state lib) without asking.
4. Finish with: what changed, test results, anything deliberately left, and a short non-technical summary for managers.
