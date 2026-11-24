# Prompts for the next two sessions

Paste one of these into a new Claude Code session in the Claude desktop app, opened on this repo. Each session has the
terminal, the web and the built-in browser. Run them one after the other, in order. Session 1 changes the bundle,
which session 2 then measures against.

---

## Session 1: first-load performance and player photos

```
Read CLAUDE.md, docs/codebase/ARCHITECTURE.md and docs/codebase/TODO.md first (the "Performance" section). Check that
main matches origin/main, then work on a branch `fix/first-load-and-photos`.

PART A: get first load under budget, properly, with no budget bumps.
- `npm run perf:budget` fails and so does the CI check job. Budgets are in tools/budget.json. TODO.md has the
  history: the landing page loads about 182 KB of JS against 145, and every page is over. Most of the excess is the
  `shell-common` chunk, which holds Kachuful's shared code (medals, moments, banter, night, intel, SeatName) next to
  React and persistence/API code, so the landing page downloads Kachuful's code too.
- Measure first: build, and use a bundle visualiser or `tools/bundle.mjs` to list every chunk the landing page and
  each game's first page load, with the modules in each. Note that `tools/bundle.mjs` doesn't count the dynamic
  `motionMax` chunk (~12 KB) that loads before the first render; make it count it, so the number is honest.
- Then fix the structure: React and vendor code in a chunk of their own (Vite `manualChunks` or the route-level
  imports), keep each game's code out of the landing page, make the heavy reward and moment code lazy where it isn't
  needed for first paint, and check the CSS too (25.4 KB against 22). No new dependency without asking me first.
- Verify with `npm run perf:budget`, Lighthouse on the landing page and on /kachuful (mobile, throttled; use the
  built-in browser or the CLI), and the full e2e (`npm run test:e2e`). Report the before and after for every
  budget line. If a budget still can't be met, explain exactly why and what it would take; don't just raise it.

PART B: profile pictures load slowly, or not at all.
- What we see: a player's photo sometimes takes 5–10 seconds to show, and in some places it never shows (only the
  emoji does).
- Start at src/components/ui/Avatar.tsx: `AvatarFill`, `usePhoto` and `Avatar`. Things to check (hypotheses, not
  conclusions):
  - `loading="lazy"` on small, above-the-fold avatars.
  - No preloading or caching strategy, and how the service worker (vite.config.ts, PWA) treats photo URLs.
  - `usePhoto` falls back to the registry in the archive (IndexedDB), so any face that isn't a registry player and
    has no `photoUrl` (server summaries, online seats, live pages, other users' players, signed-out pages) shows
    only the emoji.
  - The photo's size, format and Cache-Control headers from the backend. In ../backend-kachuful-scorekeeper, look at
    GET /api/players/{id}/photo in app/api/players/route.py and app/render/photo.py; is a thumbnail served at seat
    size, or the full image?
- Audit EVERY place a player's face is drawn: every Avatar, AvatarFill and Dot call site and every custom seat (the
  felt table in components/ui/Table.tsx, the Spades online seats, Ishaara's screens, podiums, boards, the live pages,
  Wrapped, the feed, the Me page, the player pages and the admin pages). Produce a table: place, file, whether the
  photo shows, where its URL comes from, and the fix.
- Fix the root cause in the app. If the API must change (a thumbnail size, cache headers, photoUrl missing from a
  response), write it in backend-requests.md and build the backend side as CLAUDE.md says.
- Verify in the built-in browser against the mock API and the local backend, with throttled network: the photos
  should show on first paint when cached, and fast on a cold load.

Follow the repo rules: the progress % every 5%, parallel subagents for independent parts (e.g. part A and part B's
audit), Conventional Commits, update TODO.md, delete the generated output and working docs, and ask me before
merging or pushing.
```

---

## Session 2: Spades, every flow, freezes and rough edges

```
Read CLAUDE.md, docs/codebase/ARCHITECTURE.md and docs/codebase/TODO.md first (the "Spades" section lists what's
already known). Check that main matches origin/main.

The problem: online Spades freezes and stops sometimes. The table stops updating, a turn never arrives, or the screen
hangs, and overall it doesn't feel smooth or clear. I want a full review of every Spades flow, then a prioritised
fix list. Report first; build nothing until I approve the list.

Scope (both repos: this app and ../backend-kachuful-scorekeeper):
- Every flow, end to end:
  - the home page and the table list
  - creating a table, invites and seats, joining, the seat presence
  - the deal, bidding (including Nil and Blind Nil), playing cards (tap and drag), the trick resolution, the hand
    summary and the next hand
  - the game end and the winner screen, rematch
  - leaving and returning, reloading mid-hand, a phone locking and coming back, a weak network, switching tabs and apps
  - the timeouts and auto-play, the spectator/live view
  - the offline scorekeeper (table mode)
- The real-time path, with special care:
  - src/sync/sse.ts and the Spades link and state code in src/games/spades/online, the server's SSE and live
    viewer queue, and the events routes
  - reconnects (Last-Event-ID isn't sent), the 15s watchdog, the resync on return
  - ordering and rev checks, duplicate and missed events, optimistic updates and rollbacks, and races between a
    user action and an incoming event
  - backend locking and transactions per action, the DB pool, and what happens with 2 workers
- The client:
  - React re-renders per event and long tasks on the main thread
  - animations that block input, timers that leak, effects that never clean up
  - the state machine's dead ends: any state with no way forward
- The UX: every waiting state says what it waits for; errors are visible and recoverable; nothing is ever silently
  stuck.

How:
- Use parallel subagents (4–6, e.g. one per area: the realtime client, the backend live path, the gameplay screens,
  the table and session flows, the scorekeeper, the UX states). Each reads its code and reports findings with
  file:line, a failure scenario and a proposed fix. Verify each finding yourself before it goes on the list.
- Reproduce what you can: run the backend locally and play a 4-player game in 4 browser contexts (Playwright or the
  built-in browser), with throttled and dropped network, a tab put to sleep, and a server restart mid-hand. Write
  down every freeze you catch, with steps.
- Check the TODO.md Spades items (the freeze fixes from 2026-11-19, fix/live-queue-newest, the nginx SSE settings,
  Postgres max_connections) and say for each whether it's done, still needed, or wrong.

Deliver docs/SPADES-REVIEW.md (a working doc):
- What's wrong, grouped as freezes/stalls, correctness, performance, UX clarity and code health.
- For each: the severity, the evidence, the root cause and the fix, plus the effort.
- A proposed order of work. Mark what needs a backend change (it goes into backend-requests.md once approved) and
  what needs ops (nginx, VPS).
Then stop and ask me which items to build.

Follow the repo rules: the progress % every 5%, say plainly what is unverified, and delete the traces and screenshots
you make once you have what you need.
```
