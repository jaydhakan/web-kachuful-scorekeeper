# Baithak

Scorekeepers for the games played around one table, at play.vectanix.com. One installable app: a landing page at `/`
lists the games, each at its own path.

- **Kachuful** (`/kachuful`): the Judgement card game.
- **Kaali Teeri** (`/kaali-teeri`): 3 of Spades. 4–10 players with the deck taken out to deal evenly, the winning bid
  recorded (quick mode) or the full auction, trump and called partner cards, either side's points, slots and sweeps,
  First to 1000, history, leaderboard, player stats and head-to-head; phone and large-screen layouts.
- **Ishaara** (`/ishaara`): a two-team word game, Sun against Moon, that the server runs. The table screen shows 25
  words; each team's clue-giver sees the key on their own phone and sends one word and a number; guessers pick on the
  table. Typed clues are checked against the words still face down, the other clue-giver can rule a clue out, an
  optional turn timer, best of 3, history with clue logs, leaderboard, player stats and head-to-head. Signed in and
  online only.

Kachuful: guided seating, automatic dealer, trump and card-count rotation, the dealer's bid restriction, a live leaderboard, undo and winner stats, a history of every game, boards, player pages, achievements, daily awards, seasons and Wrapped. Signed in (invite only), games sync to the server and count on a global board, with live and recap links. React, TypeScript, Tailwind, Framer Motion. Works fully offline signed out; installs to the home screen.

## Scripts

| Command                                 | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                           | Dev server; `/api`, `/r`, `/l` go to a local backend on :8000    |
| `npm run dev:mock`                      | Dev server with the in-memory API (`tools/mock-api`)             |
| `npm run build`                         | Typecheck, then production build with the service worker         |
| `npm run preview`                       | Serve the build                                                  |
| `npm test`                              | Vitest (domain, state, hooks, React flows)                       |
| `npm run test:coverage`                 | Same, with coverage for every game's `domain/` and `src/people`  |
| `npm run test:e2e`                      | Playwright against a fresh build (uses installed Chrome locally) |
| `npm run lint` · `typecheck` · `format` | ESLint, `tsc`, Prettier                                          |

**Backend.** The API is the separate FastAPI backend; the API as built (its routes and schemas) is the contract. To run it locally: `cd ../backend-kachuful-scorekeeper && cp .env.example .env && make dev`, then `uv run python -m app.cli seed-demo --reset`. `npm run dev` proxies `/api`, `/r` and `/l` to it (`KACHUFUL_API` changes the target) and must run on `localhost:5173`, the backend's `APP_ORIGIN`.

**Accounts.** The backend's demo seed and the mock API have the same accounts: `admin@kachuful.test` / `admin-demo` (Jay, admin), `riya@kachuful.test` / `riya-demo`, `kabir@kachuful.test` / `kabir-demo`, and players Asha, Om, Neha, Dev, Zoya and Ishan (`<name>@kachuful.test`).

**e2e against the backend.** `npm run test:e2e` uses the mock. `E2E_API=local npx playwright test` runs the online specs (accounts, sync, global, share, photos, ishaara-play) against the local backend, serving the app on `localhost:5173`, resetting the demo data before each test, one test at a time. The backend's golden fixtures live in [`contract/`](contract/README.md).

Lighthouse: `node tools/lighthouse.mjs`.

**Hosting.** The build writes one HTML file per page (`index.html`, `kachuful/index.html`, `kaali-teeri/index.html`,
`ishaara/index.html`), each with its own title and link-preview tags; they all load the same app. nginx serves them with
`location / { try_files $uri $uri/index.html /index.html; }` (the `/api`, `/r` and `/l` proxies are unchanged).

Ishaara's live events (`/api/ishaara/games/<id>/events`) are Server-Sent Events. The backend sends
`X-Accel-Buffering: no` on them, as on the live-link events, so nginx streams them as they are; for a proxy that ignores
that header, add this block before the general `/api/` one (with the same upstream as that block):

```nginx
location ~ ^/api/ishaara/games/[^/]+/events$ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}
```

**Screenshots of every screen** (phone, tablet, desktop; signed out and signed in) for design review: start the backend, then `npx playwright test -c tools/screens`. They land in `screenshots/` (not committed), with `screenshots/overflow.txt` listing anything wider than the screen. **Smoothness:** `npm run build && node tools/trace.mjs` reports long tasks and, per transition, frames that missed 60 Hz at 4× CPU throttle (`CPU=6` for a slower phone), in `reports/lighthouse/trace-summary.md`.

## Docs

[CONTRIBUTING](CONTRIBUTING.md) · [Architecture](docs/codebase/ARCHITECTURE.md) · [Design system](docs/codebase/DESIGN-SYSTEM.md) · [Manual test checklist](docs/MANUAL-TEST.md)
