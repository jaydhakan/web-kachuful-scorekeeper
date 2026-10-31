# Kachuful

Mobile-first scorekeeper for the Judgement / Kachuful card game. Guided seating, automatic dealer, trump and card-count rotation, the dealer's bid restriction, a live leaderboard, undo and winner stats, a history of every game, boards, player pages, achievements, daily awards, seasons and Wrapped. Signed in (invite only), games sync to the server and count on a global board, with live and recap links. React, TypeScript, Tailwind, Framer Motion. Works fully offline signed out; installs to the home screen.

## Scripts

| Command                                 | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                           | Dev server; `/api`, `/r`, `/l` go to a local backend on :8000    |
| `npm run dev:mock`                      | Dev server with the in-memory API (`tools/mock-api`)             |
| `npm run build`                         | Typecheck, then production build with the service worker         |
| `npm run preview`                       | Serve the build                                                  |
| `npm test`                              | Vitest (domain, state, hooks, React flows)                       |
| `npm run test:coverage`                 | Same, with coverage for `src/domain`                             |
| `npm run test:e2e`                      | Playwright against a fresh build (uses installed Chrome locally) |
| `npm run lint` · `typecheck` · `format` | ESLint, `tsc`, Prettier                                          |

**Backend.** The API is the separate FastAPI backend; its `HANDOFF.md` describes it as built and is the contract. To run it locally: `cd ../backend-kachuful-scorekeeper && cp .env.example .env && make dev`, then `uv run python -m app.cli seed-demo --reset`. `npm run dev` proxies `/api`, `/r` and `/l` to it (`KACHUFUL_API` changes the target) and must run on `localhost:5173`, the backend's `APP_ORIGIN`.

**Accounts.** The backend's demo seed and the mock API have the same accounts: `admin@kachuful.test` / `admin-demo` (Jay, admin), `riya@kachuful.test` / `riya-demo`, `kabir@kachuful.test` / `kabir-demo`, and players Asha, Om, Neha, Dev, Zoya and Ishan (`<name>@kachuful.test`).

**e2e against the backend.** `npm run test:e2e` uses the mock. `E2E_API=local npx playwright test` runs the online specs (accounts, sync, global, share, photos) against the local backend, serving the app on `localhost:5173`, resetting the demo data before each test, one test at a time. The backend's golden fixtures live in [`contract/`](contract/README.md).

Parity against the original prototype: `node tools/parity/run.mjs` (writes `reports/parity/report.md`). Lighthouse: `node tools/lighthouse.mjs`.

## Docs

[CONTRIBUTING](CONTRIBUTING.md) · [Architecture](docs/codebase/ARCHITECTURE.md) · [Design system](docs/codebase/DESIGN-SYSTEM.md) · [Manual test checklist](docs/MANUAL-TEST.md)

`prototype/` is the read-only Claude.ai prototype this was ported from. Remove it after sign-off; it stays in git history.
