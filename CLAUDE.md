# Kachuful — working notes

Baithak: mobile-first scorekeepers for table games, used by people at a card table. A landing page at `/`; each game at
its own path (`/kachuful`, `/kaali-teeri`, `/ishaara`), registered in `src/platform/catalog.ts`. Signed out, everything lives on the device (`localStorage` for the current game, IndexedDB for the archive) and nothing touches the network. Signed in (invite only), games sync to the separate FastAPI backend in `../backend-kachuful-scorekeeper`. The API as built (its routes and schemas, `/docs` when running) is the contract; never change the API's behaviour to suit the app.

Conventions are written down: [`CONTRIBUTING.md`](CONTRIBUTING.md) (PR checklist, naming, comments, testing), [`docs/codebase/ARCHITECTURE.md`](docs/codebase/ARCHITECTURE.md) (layering, state, persistence), [`docs/codebase/DESIGN-SYSTEM.md`](docs/codebase/DESIGN-SYSTEM.md) (tokens). Open work is in [`docs/codebase/TODO.md`](docs/codebase/TODO.md).

## Stack — what this is NOT

**Vite + React 18 + strict TypeScript + Tailwind 3 + Framer Motion + Vitest + Playwright.** No router, no state library (typed `useReducer` + context), no data-fetching library, no i18n library, no component kit, no Tailwind v4, no CSS-in-JS.

## Commands — npm, not others

Only `package-lock.json` exists. Node 20+. `npm run typecheck` covers all of `src`, `e2e`, `tools` and the config files.

## E2E tests that fail under load (not regressions)

`npm run test:e2e` runs on half the CPU cores. A full run on a busy machine fails a few tests that **pass when run alone**. Which ones varies by run (6 workers: 7 failed; 3 workers: 2). Measured 2026-11-02 at `b9a6450`, 158 tests:

| Test                                                                                              | Fails with                                  | Why                                                                                                                                      |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `app.spec.ts` · accessibility (axe)                                                               | 30s test timeout                            | About 12 axe scans plus fixed waits: ~22s alone, so load pushes it past the 30s default                                                  |
| `targets.spec.ts` · every control is at least 44px (both viewports)                               | 30s test timeout                            | Walks every screen measuring targets: ~21–24s alone                                                                                      |
| `share.spec.ts` · a live link follows the table                                                   | 30s test timeout                            | Two pages following one game: ~9s alone                                                                                                  |
| `accounts.spec.ts` · admin invites someone; `results-rule.spec.ts` · the last player is filled in | 5s `expect` timeout                         | The next screen arrives late under load                                                                                                  |
| `themes.spec.ts` · yerba-sun: only this theme's fonts are downloaded                              | Instrument Sans counted as the theme's font | Probably the default theme's font request starting after the first `networkidle`, so it lands after the counter is reset (not confirmed) |

**How to pass:** after a full run, rerun only the failures, one at a time: `npx playwright test --last-failed --workers=1`. If a test still fails alone, it's real. CI hides these because it retries once (`retries: 1` in `playwright.config.ts`).

## Reuse before you write

| Need                        | Use                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Rules, scoring, ranking     | `src/games/<game>/domain` (pure; never import UI into it)                                              |
| Paths, games, landing       | `src/platform` (`route.ts`, `catalog.ts`, `PlatformRoot`, `landing/`)                                  |
| Who is signed in            | `src/sync/session.ts` (`useSession`, `signedInAs`)                                                     |
| Numbers and text formats    | `src/lib/format.ts` (`sgnN`, `fmt`, `trunc`, `agoTxt`)                                                 |
| User-visible strings        | `src/strings` (shared; `platform.ts` for the landing page) and `src/games/<game>/strings`              |
| Storage                     | `src/state/persistence.ts` — never call `localStorage` elsewhere                                       |
| Archive (IndexedDB)         | `src/state/archive.ts` — the only IndexedDB access                                                     |
| Network                     | `src/sync/` (+ `src/games/<game>/sync/`) — the only `fetch`/`EventSource`, signed in only              |
| Stats, boards, achievements | `src/games/kachuful/domain` (timeline, leaderboard, achievements, awards)                              |
| Ishaara's rules             | `src/games/ishaara/domain` (`applyAction`): the server runs them; the app never deals or holds the key |
| People (players, avatars)   | `src/people` (`Player`, `COLORS`, `nameKey`, `pidOf`) and `src/state/registry.ts`                      |
| Account and admin pages     | `src/platform/pages`                                                                                   |
| UI primitives               | `src/components/ui/`                                                                                   |
| Colours, themes, materials  | `src/styles/themes.css` + `src/styles/themes/<id>.css` (the only colour files) via Tailwind names      |

Ishaara is the server's game: signed in and online only; the key reaches only a clue-giver's phone, in memory, and never the table device. Data quirks: avatar colours are stored as hex in saved players; totals are derived, never stored; a saved game without `schemaVersion` is the original prototype's shape (the prototype itself is gone; it's in git history); `direction` changes seat layout only, not rotation.

## Rules

- **Git:** never push, force or touch CI unless asked. Conventional Commits, one concern each, no co-author trailer.
- **No new dependency** without asking first.
- **No temporary fixes.** Fix the root cause or say the fix belongs elsewhere.
- **Design tokens only.** No hex colours in components (lint enforces it) and no off-scale font sizes.
- **Game rules and scoring never change** without a failing characterisation test first.
- **Saved data is sacred:** keep keys and shapes; add a migration instead of editing a shape.
- **Comments: 1–3 lines**, non-obvious _why_ only.
- Touching more than ~3 files: outline the plan first.
- **Backend changes go in `backend-requests.md`, always.** When a task needs the API to change, write what is needed and why in `backend-requests.md` at the root, and build the app against it. It is the only handoff file (no HANDOFF.md or changelog). Once it exists, build the backend side in `../backend-kachuful-scorekeeper` in the same task, following that repo's CLAUDE.md, and only what `backend-requests.md` says.
- **`docs/codebase/TODO.md` is the repo's to-do list; keep it current.** Read it at the start of a task. When work is left undone (a follow-up, a skipped check, a known failure), add it there before finishing; when an item is done, remove it. It is committed, unlike working docs.
- **Working docs are temporary:** a task's plan (`docs/<TASK>-PLAN.md`) and `backend-requests.md` are written for the task. Delete them once the feature is done in both repos (built, tested, committed). Never commit them.
- Every screen needs loading, empty, no-results and error states where data can be missing.
- Accessibility is part of done: real buttons and labels, keyboard and focus handling, visible focus rings, 44px targets.
- Animate only `transform` and `opacity`; every animation has a reduced-motion fallback.
- Say plainly when something is stubbed, mocked or unverified.
- **Progress:** on a multi-step plan, report where the whole plan stands as a percentage at least every 5% (and what's next).
- **Parallel agents:** whenever pieces of work don't conflict (different files, frontend vs backend, independent screens, research vs build), run them as parallel subagents (2, 4 or 6 at once) instead of one after another. Give each a narrow brief with the files it owns, and review what each returns before building on it.
