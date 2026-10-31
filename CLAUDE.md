# Kachuful — working notes

Mobile-first scorekeeper for the Judgement / Kachuful card game, used by people at a card table. Signed out, everything lives on the device (`localStorage` for the current game, IndexedDB for the archive) and nothing touches the network. Signed in (invite only), games sync to a FastAPI backend built separately from `plan-backend.md`; `plan-frontend.md` is this app's plan, and §6 of the backend plan is the API contract.

Conventions are written down: [`CONTRIBUTING.md`](CONTRIBUTING.md) (PR checklist, naming, comments, testing), [`docs/codebase/ARCHITECTURE.md`](docs/codebase/ARCHITECTURE.md) (layering, state, persistence), [`docs/codebase/DESIGN-SYSTEM.md`](docs/codebase/DESIGN-SYSTEM.md) (tokens).

## Stack — what this is NOT

**Vite + React 18 + strict TypeScript + Tailwind 3 + Framer Motion + Vitest + Playwright.** No router, no state library (typed `useReducer` + context), no data-fetching library, no i18n library, no component kit, no Tailwind v4, no CSS-in-JS.

## Commands — npm, not others

Only `package-lock.json` exists. Node 20+. `npm run typecheck` covers all of `src`, `e2e`, `tools` and the config files; `prototype/` is excluded and read-only.

## Reuse before you write

| Need                        | Use                                                              |
| --------------------------- | ---------------------------------------------------------------- |
| Rules, scoring, ranking     | `src/domain` (pure; never import UI into it)                     |
| Numbers and text formats    | `src/lib/format.ts` (`sgnN`, `fmt`, `trunc`, `agoTxt`)           |
| User-visible strings        | `src/strings`                                                    |
| Storage                     | `src/state/persistence.ts` — never call `localStorage` elsewhere |
| Archive (IndexedDB)         | `src/state/archive.ts` — the only IndexedDB access               |
| Network                     | `src/sync/` — the only `fetch`/`EventSource`, signed in only     |
| Stats, boards, achievements | `src/domain` (timeline, leaderboard, achievements, awards)       |
| UI primitives               | `src/components/ui/`                                             |
| Colours                     | Tailwind theme / CSS variables from `src/theme/tokens.json`      |

Data quirks: avatar colours are stored as hex in saved players; totals are derived, never stored; a saved game without `schemaVersion` is the prototype's shape; `direction` changes seat layout only, not rotation.

## Rules

- **Git:** never push, force or touch CI unless asked. Conventional Commits, one concern each, no co-author trailer.
- **No new dependency** without asking first.
- **No temporary fixes.** Fix the root cause or say the fix belongs elsewhere.
- **Design tokens only.** No hex colours in components (lint enforces it) and no off-scale font sizes.
- **Game rules and scoring never change** without a failing characterisation test first.
- **Saved data is sacred:** keep keys and shapes; add a migration instead of editing a shape.
- **Comments: 1–3 lines**, non-obvious _why_ only.
- Touching more than ~3 files: outline the plan first.
- Every screen needs loading, empty, no-results and error states where data can be missing.
- Accessibility is part of done: real buttons and labels, keyboard and focus handling, visible focus rings, 44px targets.
- Animate only `transform` and `opacity`; every animation has a reduced-motion fallback.
- Say plainly when something is stubbed, mocked or unverified.
- **Progress:** when a step of a multi-step plan is done, tell Jay where the whole plan stands as a percentage (and what's next).
