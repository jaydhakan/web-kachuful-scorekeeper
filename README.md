# Kachuful

Mobile-first scorekeeper for the Judgement / Kachuful card game. Guided seating, automatic dealer, trump and card-count rotation, the dealer's bid restriction, a live leaderboard, undo and winner stats, a history of every game, boards, player pages, achievements, daily awards, seasons and Wrapped. Signed in (invite only), games sync to the server and count on a global board, with live and recap links. React, TypeScript, Tailwind, Framer Motion. Works fully offline signed out; installs to the home screen.

## Scripts

| Command                                 | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                           | Dev server                                                       |
| `npm run dev:mock`                      | Dev server with the in-memory API (`tools/mock-api`)             |
| `npm run build`                         | Typecheck, then production build with the service worker         |
| `npm run preview`                       | Serve the build                                                  |
| `npm test`                              | Vitest (domain, state, hooks, React flows)                       |
| `npm run test:coverage`                 | Same, with coverage for `src/domain`                             |
| `npm run test:e2e`                      | Playwright against a fresh build (uses installed Chrome locally) |
| `npm run lint` · `typecheck` · `format` | ESLint, `tsc`, Prettier                                          |

The mock API signs in `jaydhakan11@gmail.com` / `kachuful` (admin) and `riya@example.com` / `riya`; the e2e server uses it too. The backend's golden fixtures live in [`contract/`](contract/README.md).

Parity against the original prototype: `node tools/parity/run.mjs` (writes `reports/parity/report.md`). Lighthouse: `node tools/lighthouse.mjs`.

## Docs

[CONTRIBUTING](CONTRIBUTING.md) · [Architecture](docs/codebase/ARCHITECTURE.md) · [Design system](docs/codebase/DESIGN-SYSTEM.md) · [Manual test checklist](docs/MANUAL-TEST.md)

`prototype/` is the read-only Claude.ai prototype this was ported from. Remove it after sign-off; it stays in git history.
