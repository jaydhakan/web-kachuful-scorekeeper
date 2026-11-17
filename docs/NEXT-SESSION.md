# Next session: where we left off (2026-11-17, 18:30 IST)

Read this first, then `docs/ACHIEVEMENTS-PLAN.md` and `docs/WOW-MOMENTS-PLAN.md` (both approved). These working docs,
`backend-requests.md` and `motion-preview.html` are committed on the feature branch **only so another session or laptop
has them**. **Delete all of them before merging to `main`** (CLAUDE.md: working docs are never committed to main).

Start a session with: "Read docs/NEXT-SESSION.md and continue."

---

## 1. Where things stand

| Track                                                               | Done                                                                                                                                                                  | Overall |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------: |
| **Achievements and awards for every game** (`ACHIEVEMENTS-PLAN.md`) | P0 plan, P1 frontend kit, P2 backend engine: done, reviewed. P3 Spades, P4 Kaali Teeri, P5 Ishaara: built in both repos, **not yet reviewed, fully tested or merged** |    ~75% |
| **Wow moments** (`WOW-MOMENTS-PLAN.md`)                             | Plan and preview approved. M0 foundations about half done (see §4)                                                                                                    |     ~8% |
| Part C must-dos (old plan)                                          | Frontend deploy confirmed live; nginx is fine for live streams; HTTP/2 enabled on the server                                                                          |  2 of 3 |

Nothing is on `main` yet. Production still runs `main` (frontend `3fe89e0`, backend `413fbd0`).

## 2. Branches (all pushed to GitHub)

Both repos use the same branch names. Each `feat/ach-<game>` branched from `feat/achievements-every-game` and must be
merged back into it.

| Branch                             | Frontend (`web-kachuful-scorekeeper`)                                                     | Backend (`backend-kachuful-scorekeeper`)                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `feat/achievements-every-game`     | P1 kit (9 commits) + these docs                                                           | P2 engine (8 commits, incl. `ce601cc` the feed never shows a Spades join code) |
| `feat/ach-spades`                  | 4 commits: rules + fixtures, strings/device/mock, pages, live moments + reel              | 2 commits: rules + loaders, tests                                              |
| `feat/ach-kt`                      | 7 commits: rules, fixtures, kit, mock, pages, live moments, winner reel                   | 4 commits: rules, fixtures, loaders, tests                                     |
| `feat/ach-ishaara`                 | 8 commits: rules, kit, mock, pages, turn moments, reel, e2e                               | 3 commits: fixtures, rules, loaders                                            |
| `feat/wow-moments` (frontend only) | 10 commits: M0 so far; the last is `wip(fx): the moment queue, unfinished and unverified` | —                                                                              |

On this laptop they are checked out as worktrees in `~/projects/PR/wt/` (`web-<game>`, `backend-<game>`, `web-wow`).
Each game's backend tests used their own database (`kachuful_test_spades`, `_kt`, `_ishaara` in the Docker Postgres)
and e2e used its own port (`E2E_PORT` 4174, 4175, 4176; wow 4177). On another laptop, just check out the branches.

## 3. Achievements: what's left, in order

1. **Check each game branch** (the agents were stopped by the usage limit before their final checks and reports, so
   treat all three as unverified):
   - Frontend: `npm run typecheck && npm run lint && npx vitest run`, `npm run build`, `npm run perf:budget`, and the
     game's e2e spec(s).
   - Backend: `uv run ruff check . && uv run ruff format --check . && uv run mypy app`, then pytest for the game
     (`-k "spades or progression"` etc.).
   - Known gaps to look for: **Spades** stopped while wiring "the nav and routes" (pages and live moments are committed;
     confirm the hub links and an e2e spec exist). **Kaali Teeri** stopped after the winner reel (e2e spec not seen).
     **Ishaara** backend reported 302 targeted tests green; its frontend has an e2e spec.
   - Golden-fixture gotchas: `tests/domain/test_spades_golden.py` and `test_ishaara_golden.py` collect fixtures by
     prefix (`spades-`, `ishaara-`) and must exclude the new achievement fixtures.
2. **Review** each against the plan's catalogue (§3 Spades, §4 Kaali Teeri, §5 Ishaara): codes, thresholds, who earns.
3. **Merge** `feat/ach-spades`, `feat/ach-kt`, `feat/ach-ishaara` into `feat/achievements-every-game` in both repos.
   Expected conflicts: backend `tests/fixtures/VERSION.md` (keep every paragraph) and possibly
   `tools/mock-api/progression/index.ts`.
4. **Full checks** on the merged branch: backend `make verify` (about 19 min on a busy machine; known local failures:
   the backup test, since local `pg_dump` 14 vs server 16, and two timeouts that pass alone); frontend
   `npm run test:e2e`, rerunning failures with `npx playwright test --last-failed --workers=1`.
5. **P6:** an Activity feed for every game (`?game=all`) on the Me page with each game's achievement count; update
   `docs/codebase/ARCHITECTURE.md` (the progression kit and registry) and `docs/codebase/TODO.md` (remove the nginx/SSE
   and "is the frontend live" items, now done; add anything left). The P1 build warns `INEFFECTIVE_DYNAMIC_IMPORT` for
   `kachuful/progression.ts` (harmless). The first load grew 0.2 KB (budget was already over).
6. **P7, ship:** delete the working docs, merge to `main` in both repos, push (pushing `main` deploys both; the backend
   deploy runs the migrations, so migration 0022 applies itself). Then on the server, for each new game:
   ```sh
   .venv/bin/python -m app.cli recompute-achievements --game spades      # then kaali-teeri, ishaara
   .venv/bin/python -m app.cli close-day --since 2026-09-01              # past days, every game
   .venv/bin/python -m app.cli close-season --since 2026-09              # past months, every game
   ```
   (run from the backend's current release directory; pick the `--since` dates from the oldest game of each kind).

## 4. Wow moments: what's left

M0 (branch `feat/wow-moments`) has: sounds moved to `src/fx/sound.ts` (Spades re-exports), seven new sounds with tiers,
the **Sounds and vibration** setting on the Me page (`baithak.fx`), vibration patterns, Spades' WAAPI helpers moved to
`src/fx/waapi.ts`, the new motion tokens, the shared stamp and sheen, and the reduced-motion fix that makes "♠ Spades
broken" and the bag "−100" readable.

Still to do in M0: finish and test the moment queue (`src/fx/moments.tsx`, WIP commit); the moments lab
(`/?lab=moments`, dev only); `.mat-toast` in the low-end and reduced-transparency resets; Confetti's own reduced-motion
guard; StreakCelebration's particles on WAAPI and a static shadow; `Counter`'s `swell: 'scale'` option.

Then: **rebase `feat/wow-moments` onto the merged `feat/achievements-every-game`** and build M1–M7 as the plan says
(the unlock card; the podium reveal on every podium in ceremony and board lengths; Spades, Kaali Teeri and Ishaara
moments as three parallel agents; perf fixes such as the 250ms re-render; docs). Decisions already made (plan §9):
sounds default "Big moments"; count-ups keep the weight swell on hero numbers and use a scale swell on rows; roast lines
are out.

## 5. Housekeeping

- Old branches left untouched (ask before deleting): frontend `feat/port`, `feat/responsive`,
  `wip/motion-winner-turn`, `docs/next-session-plan` (the older plan, now superseded by these docs), and three stale
  agent worktrees under `.claude/worktrees/` (Kaali Teeri WIP from 2026-11-09).
- When the work is merged: `git worktree remove` each `~/projects/PR/wt/*`, drop the test databases
  (`docker exec backend-kachuful-scorekeeper-db-1 psql -U kachuful -d postgres -c "DROP DATABASE kachuful_test_spades"`
  and the `_kt`, `_ishaara` ones), and delete the merged `feat/ach-*` branches.
- Server: `~/play-nginx.bak` is the nginx backup from before HTTP/2 (safe to delete once you're happy).
- Still only you can do: a real 4-phone Spades game in all four themes (Part C #3).
